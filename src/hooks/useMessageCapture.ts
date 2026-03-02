import {useEffect, useRef} from 'react';
import {AppState} from 'react-native';
import type {AppStateStatus, EmitterSubscription} from 'react-native';
import {
  startListening,
  startListeningForRemoved,
  startListeningForDeleted,
  type WhatsAppMessageEvent,
  type WhatsAppMessageRemovedEvent,
  type WhatsAppMessageDeletedEvent,
} from '../services/NotificationService';
import {isNotificationListenerEnabled} from '../services/NotificationService';
import {
  bufferMessage,
  markDeleted,
  markDeletedWithRestore,
  storeMessage,
  expireBuffer,
} from '../services/MessageService';
import {supportsDeletedMessages} from '../utils/platform';

const TAG = '[MessageCapture]';

// How often to clean up stale buffered (non-deleted) messages (1 hour)
const BUFFER_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
// Max age for buffered messages that were never deleted (24 hours)
const BUFFER_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const REMOVAL_DEBOUNCE_MS = 800;
const MAX_REMOVALS_PER_CONTACT = 2;

// Only trust a notification removal as a deletion if the notification was
// updated (via onNotificationPosted) within this window before the removal.
// A "stale" removal (notification sitting unchanged for a long time) is almost
// certainly the user opening the chat, not a message deletion.
// Note: when WhatsApp processes "delete for everyone", it typically updates the
// notification before removing it, refreshing lastUpdateTime. 30s gives enough
// room for delayed processing (increased from 15s for regular WhatsApp).
const REMOVAL_RECENCY_THRESHOLD_MS = 30_000;

// When we have no tracking data (msSinceLastUpdate = -1, e.g. after service
// restart), allow a removal through if the notification was posted within
// this window. Beyond this, it's too risky (likely user opening chat).
const UNTRACKED_POST_RECENCY_MS = 2 * 60 * 1000; // 2 minutes

const DELETION_PATTERNS = [
  /this message was deleted/i,
  /you deleted this message/i,
  /message was deleted/i,
  /this message has been deleted/i,
  // Spanish
  /se eliminó este mensaje/i,
  /eliminaste este mensaje/i,
  // Portuguese
  /esta mensagem foi apagada/i,
  /você apagou essa mensagem/i,
  // French
  /ce message a été supprimé/i,
  /vous avez supprimé ce message/i,
  // German
  /diese nachricht wurde gelöscht/i,
  /du hast diese nachricht gelöscht/i,
  // Italian
  /questo messaggio è stato eliminato/i,
  /hai eliminato questo messaggio/i,
  // Arabic
  /تم حذف هذه الرسالة/,
  /لقد حذفت هذه الرسالة/,
  // Hindi
  /यह मैसेज डिलीट किया गया/,
  /आपने यह मैसेज डिलीट किया/,
  // Indonesian
  /pesan ini telah dihapus/i,
  /anda menghapus pesan ini/i,
  // Turkish
  /bu mesaj silindi/i,
  /bu mesajı sildiniz/i,
  // Russian
  /сообщение удалено/i,
  /вы удалили это сообщение/i,
];

function isDeletionText(text: string): boolean {
  return DELETION_PATTERNS.some(pattern => pattern.test(text));
}

export default function useMessageCapture(): void {
  const messageSubRef = useRef<EmitterSubscription | null>(null);
  const removedSubRef = useRef<EmitterSubscription | null>(null);
  const deletedSubRef = useRef<EmitterSubscription | null>(null);
  const removalQueueRef = useRef<WhatsAppMessageRemovedEvent[]>([]);
  const removalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenersActiveRef = useRef(false);

  useEffect(() => {
    if (!supportsDeletedMessages) {
      console.log(TAG, 'Platform does not support deleted messages, skipping');
      return;
    }

    let cancelled = false;

    function teardownCapture(reason: string): void {
      const hadActiveListeners = listenersActiveRef.current;

      if (messageSubRef.current) {
        messageSubRef.current.remove();
        messageSubRef.current = null;
      }
      if (removedSubRef.current) {
        removedSubRef.current.remove();
        removedSubRef.current = null;
      }
      if (deletedSubRef.current) {
        deletedSubRef.current.remove();
        deletedSubRef.current = null;
      }
      if (removalTimerRef.current) {
        clearTimeout(removalTimerRef.current);
        removalTimerRef.current = null;
      }
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }

      removalQueueRef.current = [];
      listenersActiveRef.current = false;

      if (hadActiveListeners) {
        console.log(TAG, `Capture listeners stopped: ${reason}`);
      }
    }

    async function processRemovalBatch(batch: WhatsAppMessageRemovedEvent[]) {
      console.log(TAG, `Processing removal batch: ${batch.length} items`);

      const byContact = new Map<string, WhatsAppMessageRemovedEvent[]>();
      for (const removed of batch) {
        const contact = removed.title || 'Unknown';
        const list = byContact.get(contact) || [];
        list.push(removed);
        byContact.set(contact, list);
      }

      for (const [contact, removals] of byContact) {
        console.log(TAG, `Contact "${contact}": ${removals.length} removals`);
        if (removals.length > MAX_REMOVALS_PER_CONTACT) {
          console.log(
            TAG,
            `Skipping "${contact}" — ${removals.length} removals (likely chat opened)`,
          );
          continue;
        }

        for (const removed of removals) {
          // Recency filter: only trust the removal as a deletion if the
          // notification was recently updated. A stale notification being
          // removed almost certainly means the user opened the chat.
          const ms = removed.msSinceLastUpdate;
          if (ms >= 0 && ms > REMOVAL_RECENCY_THRESHOLD_MS) {
            console.log(
              TAG,
              `Skipping removal key=${removed.notificationKey} — stale (${ms}ms since last update, likely chat opened)`,
            );
            continue;
          }

          // If msSinceLastUpdate is -1 (never tracked / service restarted),
          // allow through ONLY if the notification was posted very recently
          // AND there's just 1 removal for this contact (strong deletion signal).
          if (ms < 0) {
            const postAge = Date.now() - removed.timestamp;
            if (removals.length > 1 || postAge > UNTRACKED_POST_RECENCY_MS) {
              console.log(
                TAG,
                `Skipping removal key=${removed.notificationKey} — no tracking data (postAge=${postAge}ms, count=${removals.length})`,
              );
              continue;
            }
            console.log(
              TAG,
              `Allowing untracked removal key=${removed.notificationKey} — recently posted (${postAge}ms), single removal`,
            );
          }

          try {
            const found = await markDeleted(removed.notificationKey);
            console.log(
              TAG,
              `markDeleted(removal) key=${removed.notificationKey} found=${found} (${ms}ms since update)`,
            );
            if (!found) {
              console.log(
                TAG,
                `markDeleted(removal) miss key=${
                  removed.notificationKey
                } reason=${removed.removalReason ?? 'n/a'} title="${
                  removed.title
                }" text="${removed.messageText.substring(0, 50)}" pkg=${
                  removed.packageName ?? 'unknown'
                }`,
              );
            }
          } catch (error) {
            console.error(TAG, 'markDeleted(removal) failed:', error);
          }
        }
      }
    }

    function setupListeners(trigger: string): void {
      if (listenersActiveRef.current || cancelled) {
        return;
      }

      console.log(TAG, `Starting capture listeners (trigger=${trigger})`);

      // --- Method 1: text-based deletion detection ---
      messageSubRef.current = startListening(
        async (msg: WhatsAppMessageEvent) => {
          console.log(
            TAG,
            `MSG received: contact="${
              msg.contactName
            }" text="${msg.messageText.substring(0, 50)}" key=${
              msg.notificationKey
            } pkg=${msg.packageName}`,
          );

          if (isDeletionText(msg.messageText)) {
            console.log(
              TAG,
              `Deletion text detected! key=${msg.notificationKey} contact="${msg.contactName}"`,
            );
            try {
              const found = await markDeleted(msg.notificationKey);
              console.log(TAG, `markDeleted(text) by key: found=${found}`);
              if (!found) {
                console.log(
                  TAG,
                  `markDeleted(text) miss key=${msg.notificationKey} contact="${msg.contactName}" pkg=${msg.packageName}`,
                );
              }
              // Note: we intentionally do NOT fall back to markDeletedByContact()
              // because it would mark the latest message for the contact which
              // may be a completely different, unrelated message — causing false positives.
              // If the key doesn't match, the original was never captured (honest failure).
            } catch (error) {
              console.error(TAG, 'markDeleted(text) failed:', error);
            }
            return;
          }

          // --- Method 3: revert detection (1-on-1 chats) ---
          // Native detected text went A → B → A, meaning B was deleted.
          if (msg.isRevert && msg.deletedText) {
            console.log(
              TAG,
              `REVERT detected! contact="${
                msg.contactName
              }" deleted="${msg.deletedText.substring(0, 50)}"`,
            );
            try {
              // Store the deleted text as a confirmed deletion
              await storeMessage({
                contactName: msg.contactName,
                messageText: msg.deletedText,
                groupName: msg.groupName,
                isGroup: msg.isGroup,
                timestamp: msg.timestamp,
                isRead: false,
                thumbnailBase64: null,
                createdAt: Date.now(),
                packageName: msg.packageName || 'com.whatsapp',
              });
              console.log(
                TAG,
                `Stored reverted deletion for "${msg.contactName}"`,
              );
            } catch (error) {
              console.error(TAG, 'storeMessage(revert) failed:', error);
            }
          }

          // Buffer the current text (whether normal message or post-revert text)
          try {
            const id = await bufferMessage({
              contactName: msg.contactName,
              messageText: msg.messageText,
              groupName: msg.groupName,
              isGroup: msg.isGroup,
              timestamp: msg.timestamp,
              isRead: false,
              thumbnailBase64: msg.thumbnailBase64,
              createdAt: Date.now(),
              packageName: msg.packageName || 'com.whatsapp',
              notificationKey: msg.notificationKey,
            });
            console.log(
              TAG,
              `Buffered message id=${id} key=${msg.notificationKey}`,
            );
          } catch (error) {
            console.error(TAG, 'bufferMessage failed:', error);
          }
        },
      );

      // --- Method 2: debounced notification removal detection ---
      removedSubRef.current = startListeningForRemoved(removed => {
        console.log(
          TAG,
          `REMOVED event: key=${removed.notificationKey} title="${
            removed.title
          }" reason=${removed.removalReason ?? 'n/a'} msSinceUpdate=${
            removed.msSinceLastUpdate
          } text="${removed.messageText?.substring(0, 50)}"`,
        );
        removalQueueRef.current.push(removed);

        if (removalTimerRef.current) {
          clearTimeout(removalTimerRef.current);
        }
        removalTimerRef.current = setTimeout(() => {
          const batch = removalQueueRef.current.splice(0);
          if (batch.length > 0) {
            processRemovalBatch(batch);
          }
        }, REMOVAL_DEBOUNCE_MS);
      });

      // --- Method 4: MessagingStyle deletion detection (in-place updates) ---
      deletedSubRef.current = startListeningForDeleted(
        async (deleted: WhatsAppMessageDeletedEvent) => {
          console.log(
            TAG,
            `DELETED event (MessagingStyle): key=${
              deleted.notificationKey
            } contact="${
              deleted.contactName
            }" text="${deleted.deletedText.substring(0, 50)}"`,
          );
          try {
            // Try to restore the original text from the buffer
            const found = await markDeletedWithRestore(deleted.notificationKey);
            console.log(
              TAG,
              `markDeletedWithRestore key=${deleted.notificationKey} found=${found}`,
            );
            if (!found) {
              // Buffer miss — store the deleted text directly as a confirmed deletion
              await storeMessage({
                contactName: deleted.contactName,
                messageText: deleted.deletedText,
                groupName: deleted.groupName,
                isGroup: deleted.isGroup,
                timestamp: deleted.timestamp,
                isRead: false,
                thumbnailBase64: null,
                createdAt: Date.now(),
                packageName: deleted.packageName || 'com.whatsapp',
              });
              console.log(
                TAG,
                `Stored MessagingStyle deletion for "${deleted.contactName}"`,
              );
            }
          } catch (error) {
            console.error(
              TAG,
              'MessagingStyle deletion handling failed:',
              error,
            );
          }
        },
      );

      // Periodically expire stale buffered entries
      cleanupTimerRef.current = setInterval(() => {
        expireBuffer(BUFFER_MAX_AGE_MS).catch(err =>
          console.error(TAG, 'buffer cleanup failed', err),
        );
      }, BUFFER_CLEANUP_INTERVAL_MS);

      expireBuffer(BUFFER_MAX_AGE_MS).catch(err =>
        console.error(TAG, 'initial buffer cleanup failed', err),
      );
      listenersActiveRef.current = true;
      console.log(
        TAG,
        'Setup complete — listening for messages, removals, and deletions',
      );
    }

    async function syncCaptureState(trigger: string): Promise<void> {
      try {
        const enabled = await isNotificationListenerEnabled();
        if (cancelled) {
          return;
        }

        console.log(
          TAG,
          `Permission check (${trigger}) enabled=${enabled} active=${listenersActiveRef.current}`,
        );

        if (enabled) {
          setupListeners(trigger);
        } else {
          teardownCapture(`permission disabled (${trigger})`);
        }
      } catch (error) {
        console.error(TAG, `Permission check failed (${trigger})`, error);
      }
    }

    function handleAppStateChange(nextState: AppStateStatus): void {
      if (nextState === 'active') {
        syncCaptureState('app-active');
      }
    }

    const appStateSub = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    syncCaptureState('mount');

    return () => {
      cancelled = true;
      appStateSub.remove();
      teardownCapture('hook unmounted');
    };
  }, []);
}
