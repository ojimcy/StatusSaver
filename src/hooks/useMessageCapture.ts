import {useEffect, useRef} from 'react';
import type {EmitterSubscription} from 'react-native';
import {
  startListening,
  startListeningForRemoved,
  type WhatsAppMessageEvent,
  type WhatsAppMessageRemovedEvent,
} from '../services/NotificationService';
import {isNotificationListenerEnabled} from '../services/NotificationService';
import {
  bufferMessage,
  markDeleted,
  markDeletedByContact,
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

const DELETION_PATTERNS = [
  /this message was deleted/i,
  /you deleted this message/i,
  /message was deleted/i,
  /this message has been deleted/i,
];

function isDeletionText(text: string): boolean {
  return DELETION_PATTERNS.some(pattern => pattern.test(text));
}

export default function useMessageCapture(): void {
  const messageSubRef = useRef<EmitterSubscription | null>(null);
  const removedSubRef = useRef<EmitterSubscription | null>(null);
  const removalQueueRef = useRef<WhatsAppMessageRemovedEvent[]>([]);
  const removalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supportsDeletedMessages) {
      console.log(TAG, 'Platform does not support deleted messages, skipping');
      return;
    }

    let cancelled = false;
    let cleanupTimer: ReturnType<typeof setInterval> | null = null;

    async function processRemovalBatch(
      batch: WhatsAppMessageRemovedEvent[],
    ) {
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
        if (removals.length <= MAX_REMOVALS_PER_CONTACT) {
          for (const removed of removals) {
            try {
              const found = await markDeleted(removed.notificationKey);
              console.log(
                TAG,
                `markDeleted(removal) key=${removed.notificationKey} found=${found}`,
              );
            } catch (error) {
              console.error(TAG, 'markDeleted(removal) failed:', error);
            }
          }
        } else {
          console.log(
            TAG,
            `Skipping "${contact}" — ${removals.length} removals (likely chat opened)`,
          );
        }
      }
    }

    async function setup() {
      const enabled = await isNotificationListenerEnabled();
      console.log(TAG, `Notification listener enabled: ${enabled}`);
      if (!enabled || cancelled) {
        return;
      }

      // --- Method 1: text-based deletion detection ---
      messageSubRef.current = startListening(async (msg: WhatsAppMessageEvent) => {
        console.log(
          TAG,
          `MSG received: contact="${msg.contactName}" text="${msg.messageText.substring(0, 50)}" key=${msg.notificationKey} pkg=${msg.packageName}`,
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
              const fallback = await markDeletedByContact(msg.contactName);
              console.log(TAG, `markDeletedByContact fallback: found=${fallback}`);
            }
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
            `REVERT detected! contact="${msg.contactName}" deleted="${msg.deletedText.substring(0, 50)}"`,
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
            console.log(TAG, `Stored reverted deletion for "${msg.contactName}"`);
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
          console.log(TAG, `Buffered message id=${id} key=${msg.notificationKey}`);
        } catch (error) {
          console.error(TAG, 'bufferMessage failed:', error);
        }
      });

      // --- Method 2: debounced notification removal detection ---
      removedSubRef.current = startListeningForRemoved(removed => {
        console.log(
          TAG,
          `REMOVED event: key=${removed.notificationKey} title="${removed.title}" text="${removed.messageText?.substring(0, 50)}"`,
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

      // Periodically expire stale buffered entries
      cleanupTimer = setInterval(() => {
        expireBuffer(BUFFER_MAX_AGE_MS).catch(err =>
          console.error(TAG, 'buffer cleanup failed', err),
        );
      }, BUFFER_CLEANUP_INTERVAL_MS);

      expireBuffer(BUFFER_MAX_AGE_MS).catch(() => {});
      console.log(TAG, 'Setup complete — listening for messages and removals');
    }

    setup();

    return () => {
      cancelled = true;
      if (messageSubRef.current) {
        messageSubRef.current.remove();
        messageSubRef.current = null;
      }
      if (removedSubRef.current) {
        removedSubRef.current.remove();
        removedSubRef.current = null;
      }
      if (removalTimerRef.current) {
        clearTimeout(removalTimerRef.current);
      }
      if (cleanupTimer) {
        clearInterval(cleanupTimer);
      }
      removalQueueRef.current = [];
    };
  }, []);
}
