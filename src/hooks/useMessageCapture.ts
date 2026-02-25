import {useEffect, useRef} from 'react';
import type {EmitterSubscription} from 'react-native';
import {
  startListening,
  startListeningForRemoved,
  type WhatsAppMessageEvent,
} from '../services/NotificationService';
import {isNotificationListenerEnabled} from '../services/NotificationService';
import {storeMessage} from '../services/MessageService';
import {supportsDeletedMessages} from '../utils/platform';

// How long to keep messages in the buffer before discarding (10 minutes)
const BUFFER_TTL_MS = 10 * 60 * 1000;
// How often to run the cleanup sweep (2 minutes)
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Patterns that indicate a message was deleted by the sender.
 * WhatsApp replaces the notification text with one of these when
 * "Delete for Everyone" is used.
 */
const DELETION_PATTERNS = [
  /this message was deleted/i,
  /you deleted this message/i,
  /message was deleted/i,
  /this message has been deleted/i,
];

function isDeletionText(text: string): boolean {
  return DELETION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Persist the original message to the database.
 */
async function persistOriginal(original: WhatsAppMessageEvent): Promise<void> {
  await storeMessage({
    contactName: original.contactName,
    messageText: original.messageText,
    groupName: original.groupName,
    isGroup: original.isGroup,
    timestamp: original.timestamp,
    isRead: false,
    thumbnailBase64: original.thumbnailBase64,
    createdAt: Date.now(),
    packageName: original.packageName || 'com.whatsapp',
  });
}

/**
 * App-level hook that listens for WhatsApp notification events
 * and persists only **deleted** messages to the local database.
 *
 * Detection methods:
 * 1. Text update — WhatsApp updates the notification text to "This message was
 *    deleted". We compare against the buffered original and persist it.
 * 2. Notification removal — the native side emits removal events filtered to
 *    app-initiated cancellations (REASON_APP_CANCEL). If the removed
 *    notification key is still in the buffer we persist it.
 *
 * Should be mounted once at the root of the app.
 */
export default function useMessageCapture(): void {
  const messageSubRef = useRef<EmitterSubscription | null>(null);
  const removedSubRef = useRef<EmitterSubscription | null>(null);
  const bufferRef = useRef<Map<string, WhatsAppMessageEvent>>(new Map());

  useEffect(() => {
    if (!supportsDeletedMessages) {
      return;
    }

    let cancelled = false;
    let cleanupTimer: ReturnType<typeof setInterval> | null = null;

    async function setup() {
      const enabled = await isNotificationListenerEnabled();
      if (!enabled || cancelled) {
        return;
      }

      const buffer = bufferRef.current;

      // Listen for every incoming WhatsApp notification
      messageSubRef.current = startListening(async msg => {
        // --- Detection method 1: text-based deletion ---
        if (isDeletionText(msg.messageText)) {
          // Try to find the original by the same notification key (update in-place)
          let original = buffer.get(msg.notificationKey);

          // Fallback: find the most recent buffered message from the same contact
          if (!original) {
            let latestTs = 0;
            let latestKey: string | null = null;
            for (const [key, buffered] of buffer.entries()) {
              if (
                buffered.contactName === msg.contactName &&
                buffered.timestamp > latestTs
              ) {
                latestTs = buffered.timestamp;
                latestKey = key;
                original = buffered;
              }
            }
            if (latestKey) {
              buffer.delete(latestKey);
            }
          } else {
            buffer.delete(msg.notificationKey);
          }

          if (original) {
            try {
              await persistOriginal(original);
            } catch (error) {
              console.error(
                'useMessageCapture: failed to store deleted message',
                error,
              );
            }
          }

          return; // Don't buffer the deletion notification itself
        }

        // Regular message — buffer it (keyed by notification key)
        buffer.set(msg.notificationKey, msg);
      });

      // --- Detection method 2: notification removal ---
      removedSubRef.current = startListeningForRemoved(async removed => {
        const original = buffer.get(removed.notificationKey);
        if (!original) {
          return; // not in buffer (already expired or unknown)
        }

        buffer.delete(removed.notificationKey);

        try {
          await persistOriginal(original);
        } catch (error) {
          console.error(
            'useMessageCapture: failed to store deleted message (removal)',
            error,
          );
        }
      });

      // Periodically purge stale entries from the buffer
      cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, msg] of buffer.entries()) {
          if (now - msg.timestamp > BUFFER_TTL_MS) {
            buffer.delete(key);
          }
        }
      }, CLEANUP_INTERVAL_MS);
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
      if (cleanupTimer) {
        clearInterval(cleanupTimer);
      }
      bufferRef.current.clear();
    };
  }, []);
}
