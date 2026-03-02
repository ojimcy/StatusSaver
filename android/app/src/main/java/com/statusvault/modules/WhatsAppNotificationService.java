package com.statusvault.modules;

import android.app.Notification;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.os.Parcelable;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Base64;
import android.util.Log;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * NotificationListenerService that captures WhatsApp notifications.
 *
 * This service intercepts WhatsApp notifications to capture messages before
 * they can be deleted by the sender. It extracts message text, contact/group
 * names, timestamps, and any attached thumbnails.
 *
 * The service emits events to React Native:
 * - "onWhatsAppMessage": when a new WhatsApp notification arrives
 * - "onWhatsAppMessageRemoved": when a WhatsApp notification is removed
 */
public class WhatsAppNotificationService extends NotificationListenerService {

    private static final String TAG = "WhatsAppNotifService";
    private static final String WHATSAPP_PACKAGE = "com.whatsapp";
    private static final String WHATSAPP_BUSINESS_PACKAGE = "com.whatsapp.w4b";

    // Event names emitted to React Native
    private static final String EVENT_MESSAGE = "onWhatsAppMessage";
    private static final String EVENT_MESSAGE_REMOVED = "onWhatsAppMessageRemoved";
    private static final String EVENT_MESSAGE_DELETED = "onWhatsAppMessageDeleted";

    // WA Business group title format: "GroupName (N messages): SenderName"
    // or "GroupName (N messages): ~ SenderName"
    private static final Pattern WA_BUSINESS_GROUP_PATTERN =
            Pattern.compile("^(.+?)\\s*\\(\\d+\\s+messages?\\):\\s*~?\\s*(.+)$");

    // Max time between text change and revert to consider it a deletion (120 seconds)
    private static final long REVERT_WINDOW_MS = 120_000;

    // Max age for textHistory entries before they are pruned (10 minutes)
    private static final long TEXT_HISTORY_MAX_AGE_MS = 10 * 60_000;

    /**
     * Per-key text history for detecting message reverts (1-on-1 deletion detection).
     * When WhatsApp "Delete for Everyone" is used in a 1-on-1 chat, the notification
     * text reverts to the previous message (A → B → A) instead of showing
     * "This message was deleted". We detect this revert pattern here.
     */
    private static class TextEntry {
        final String text;
        final long timestamp;
        TextEntry(String text, long timestamp) {
            this.text = text;
            this.timestamp = timestamp;
        }
    }
    private final HashMap<String, LinkedList<TextEntry>> textHistory = new HashMap<>();

    /**
     * Tracks the last time each notification key was updated via onNotificationPosted.
     * Used to determine if a subsequent removal is likely a deletion (recent update)
     * or just the user opening the chat (stale notification removed).
     */
    private final HashMap<String, Long> lastUpdateTime = new HashMap<>();

    /**
     * Tracks per-notification MessagingStyle message sets for detecting in-place
     * deletions. Key: notification key, Value: set of message text snippets.
     * When WhatsApp updates a notification in-place and a message disappears
     * from the set, it was likely deleted.
     */
    private final HashMap<String, HashSet<String>> messageSetByKey = new HashMap<>();

    /** Max age for stale messageSetByKey entries before pruning (15 minutes). */
    private static final long MESSAGE_SET_MAX_AGE_MS = 15 * 60_000;
    /** Tracks when each messageSetByKey entry was last updated. */
    private final HashMap<String, Long> messageSetTimestamps = new HashMap<>();

    /**
     * Queue for events that couldn't be emitted because the React context wasn't
     * available (app killed / in background). Events are replayed in order once
     * the context becomes available.
     */
    private static class QueuedEvent {
        final String eventName;
        final HashMap<String, Object> data;
        QueuedEvent(String eventName, WritableMap data) {
            this.eventName = eventName;
            // Copy the WritableMap into a plain HashMap so it survives beyond the
            // ReadableMap lifecycle.  We reconstruct a WritableMap on replay.
            this.data = data.toHashMap();
        }
    }
    private final LinkedList<QueuedEvent> pendingEvents = new LinkedList<>();
    private static final int MAX_PENDING_EVENTS = 50;

    /**
     * Called when the listener is connected (service start/restart).
     * Seeds lastUpdateTime from active WhatsApp notifications so that
     * removal detection works immediately after a service restart.
     */
    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) {
                Log.d(TAG, "onListenerConnected: no active notifications");
                return;
            }

            long now = System.currentTimeMillis();
            int seeded = 0;
            for (StatusBarNotification sbn : active) {
                String pkg = sbn.getPackageName();
                if (!WHATSAPP_PACKAGE.equals(pkg)
                        && !WHATSAPP_BUSINESS_PACKAGE.equals(pkg)) {
                    continue;
                }
                // Skip group summaries
                if ((sbn.getNotification().flags & Notification.FLAG_GROUP_SUMMARY) != 0) {
                    continue;
                }
                // Seed with the notification's post time so the recency calculation
                // is relative to when the notification was actually posted, not "now".
                lastUpdateTime.put(sbn.getKey(), sbn.getPostTime());

                // Also seed text history for revert detection (1-on-1 chats)
                Bundle extras = sbn.getNotification().extras;
                if (extras != null) {
                    CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
                    CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
                    if (text != null && title != null && !title.toString().contains(" @ ")) {
                        // Likely a 1-on-1 chat — seed text history
                        String key = sbn.getKey();
                        LinkedList<TextEntry> history = textHistory.get(key);
                        if (history == null) {
                            history = new LinkedList<>();
                            textHistory.put(key, history);
                        }
                        if (history.isEmpty() || !text.toString().equals(history.getLast().text)) {
                            history.addLast(new TextEntry(text.toString(), sbn.getPostTime()));
                        }
                    }

                    // Seed MessagingStyle message set for in-place deletion detection
                    HashSet<String> msgSet = extractMessagingStyleMessages(extras);
                    if (msgSet != null) {
                        messageSetByKey.put(sbn.getKey(), msgSet);
                        messageSetTimestamps.put(sbn.getKey(), now);
                    }
                }
                seeded++;
            }
            Log.d(TAG, "onListenerConnected: seeded " + seeded + " WhatsApp notification timestamps");
        } catch (Exception e) {
            Log.e(TAG, "Error in onListenerConnected", e);
        }
    }

    /**
     * Extracts individual message texts from a MessagingStyle notification's EXTRA_MESSAGES.
     * Returns null if not available (API < 24 or no MessagingStyle messages).
     */
    private HashSet<String> extractMessagingStyleMessages(Bundle extras) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N || extras == null) {
            return null;
        }
        try {
            Parcelable[] messages = extras.getParcelableArray(Notification.EXTRA_MESSAGES);
            if (messages == null || messages.length == 0) {
                return null;
            }
            HashSet<String> texts = new HashSet<>();
            for (Parcelable msg : messages) {
                if (msg instanceof Bundle) {
                    CharSequence text = ((Bundle) msg).getCharSequence("text");
                    if (text != null && text.length() > 0) {
                        texts.add(text.toString());
                    }
                }
            }
            return texts.isEmpty() ? null : texts;
        } catch (Exception e) {
            Log.w(TAG, "Failed to extract MessagingStyle messages", e);
            return null;
        }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) {
            return;
        }

        String packageName = sbn.getPackageName();

        // Only process WhatsApp and WhatsApp Business notifications
        if (!WHATSAPP_PACKAGE.equals(packageName)
                && !WHATSAPP_BUSINESS_PACKAGE.equals(packageName)) {
            return;
        }

        try {
            // Skip group summary notifications (the bundled "X messages from Y chats" ones)
            if ((sbn.getNotification().flags & Notification.FLAG_GROUP_SUMMARY) != 0) {
                return;
            }

            Notification notification = sbn.getNotification();
            if (notification == null) {
                return;
            }

            Bundle extras = notification.extras;
            if (extras == null) {
                return;
            }

            // Extract message text
            CharSequence textSequence = extras.getCharSequence(Notification.EXTRA_TEXT);
            String messageText = textSequence != null ? textSequence.toString() : "";

            // Skip empty messages and summary/aggregate notifications
            if (messageText.isEmpty()) {
                return;
            }
            String msgLower = messageText.toLowerCase();
            if (msgLower.matches(".*\\d+ new messages?.*")
                    || msgLower.matches(".*\\d+ messages? from \\d+ chats?.*")
                    || msgLower.matches(".*\\d+ new message.*")
                    || msgLower.equals("checking for new messages")
                    || msgLower.equals("downloading messages")
                    || msgLower.startsWith("waiting for message")) {
                return;
            }

            // Extract contact/group title
            CharSequence titleSequence = extras.getCharSequence(Notification.EXTRA_TITLE);
            String title = titleSequence != null ? titleSequence.toString() : "Unknown";

            // Parse group messages - WhatsApp format: "Contact @ GroupName"
            // For regular messages, title is just the contact name
            String contactName = title;
            String groupName = null;
            boolean isGroup = false;

            if (title.contains(" @ ")) {
                // Standard WhatsApp format: "Contact @ GroupName"
                String[] parts = title.split(" @ ", 2);
                if (parts.length == 2) {
                    contactName = parts[0].trim();
                    groupName = parts[1].trim();
                    isGroup = true;
                }
            } else {
                // WA Business format: "GroupName (N messages): SenderName"
                Matcher matcher = WA_BUSINESS_GROUP_PATTERN.matcher(title);
                if (matcher.matches()) {
                    groupName = matcher.group(1).trim();
                    contactName = matcher.group(2).trim();
                    isGroup = true;
                }
            }

            // Get timestamp
            long timestamp = sbn.getPostTime();

            // Extract thumbnail/picture if present
            String thumbnailBase64 = null;
            Bitmap picture = null;

            // Try EXTRA_PICTURE first (used for media messages)
            try {
                Object pictureObj = extras.get(Notification.EXTRA_PICTURE);
                if (pictureObj instanceof Bitmap) {
                    picture = (Bitmap) pictureObj;
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed to extract notification picture", e);
            }

            // Try EXTRA_LARGE_ICON as fallback (contact photo)
            if (picture == null) {
                try {
                    Object iconObj = extras.get(Notification.EXTRA_LARGE_ICON);
                    if (iconObj instanceof Bitmap) {
                        picture = (Bitmap) iconObj;
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Failed to extract large icon", e);
                }
            }

            // Convert bitmap to base64 if available
            if (picture != null) {
                try {
                    thumbnailBase64 = bitmapToBase64(picture);
                } catch (Exception e) {
                    Log.w(TAG, "Failed to convert bitmap to base64", e);
                }
            }

            // Build the event data
            WritableMap eventData = Arguments.createMap();
            eventData.putString("contactName", contactName);
            eventData.putString("messageText", messageText);
            eventData.putDouble("timestamp", timestamp);
            eventData.putBoolean("isGroup", isGroup);
            eventData.putString("packageName", packageName);

            if (groupName != null) {
                eventData.putString("groupName", groupName);
            } else {
                eventData.putNull("groupName");
            }

            if (thumbnailBase64 != null) {
                eventData.putString("thumbnailBase64", thumbnailBase64);
            } else {
                eventData.putNull("thumbnailBase64");
            }

            // Notification key for tracking removal
            eventData.putString("notificationKey", sbn.getKey());
            eventData.putInt("notificationId", sbn.getId());

            // --- Revert detection for 1-on-1 chats ---
            // WhatsApp doesn't show "This message was deleted" in notifications;
            // it reverts to the previous message text. Detect pattern: A → B → A.
            if (!isGroup) {
                String key = sbn.getKey();
                long now = System.currentTimeMillis();

                // Prune stale textHistory entries to prevent memory leaks
                // (since we no longer clear history on notification removal)
                textHistory.entrySet().removeIf(entry -> {
                    LinkedList<TextEntry> h = entry.getValue();
                    if (h.isEmpty()) return true;
                    return (now - h.getLast().timestamp) > TEXT_HISTORY_MAX_AGE_MS;
                });

                LinkedList<TextEntry> history = textHistory.get(key);
                if (history == null) {
                    history = new LinkedList<>();
                    textHistory.put(key, history);
                }

                boolean isRevert = false;
                String deletedText = null;

                if (history.size() >= 2) {
                    TextEntry last = history.getLast();
                    // Only detect reverts within a time window
                    if ((now - last.timestamp) < REVERT_WINDOW_MS) {
                        // Check if current text matches any entry before the last
                        for (int i = history.size() - 2; i >= 0; i--) {
                            if (messageText.equals(history.get(i).text)) {
                                isRevert = true;
                                deletedText = last.text;
                                // Trim history to the revert point
                                while (history.size() > i + 1) {
                                    history.removeLast();
                                }
                                break;
                            }
                        }
                    }
                }

                // Update history (only if not a revert and text actually changed)
                if (!isRevert) {
                    if (history.isEmpty() || !messageText.equals(history.getLast().text)) {
                        history.addLast(new TextEntry(messageText, now));
                        if (history.size() > 5) {
                            history.removeFirst();
                        }
                    }
                }

                if (isRevert && deletedText != null) {
                    eventData.putBoolean("isRevert", true);
                    eventData.putString("deletedText", deletedText);
                    Log.d(TAG, "Revert detected for " + contactName
                            + ": \"" + deletedText + "\" was deleted");
                }
            }

            // Track when this notification was last updated
            lastUpdateTime.put(sbn.getKey(), System.currentTimeMillis());

            // --- MessagingStyle in-place deletion detection ---
            // When WhatsApp updates a notification in-place (same key) and a message
            // disappears from the MessagingStyle message list, it was likely deleted.
            HashSet<String> currentMsgSet = extractMessagingStyleMessages(extras);
            if (currentMsgSet != null) {
                String key = sbn.getKey();
                HashSet<String> previousMsgSet = messageSetByKey.get(key);

                if (previousMsgSet != null) {
                    // Find messages that were in the previous set but not in the current set
                    for (String prevText : previousMsgSet) {
                        if (!currentMsgSet.contains(prevText)) {
                            Log.d(TAG, "MessagingStyle deletion detected: \"" + prevText + "\" disappeared from key=" + key);
                            WritableMap deletedData = Arguments.createMap();
                            deletedData.putString("notificationKey", key);
                            deletedData.putString("deletedText", prevText);
                            deletedData.putString("contactName", contactName);
                            deletedData.putString("packageName", packageName);
                            deletedData.putDouble("timestamp", timestamp);
                            if (groupName != null) {
                                deletedData.putString("groupName", groupName);
                            } else {
                                deletedData.putNull("groupName");
                            }
                            deletedData.putBoolean("isGroup", isGroup);
                            emitEvent(EVENT_MESSAGE_DELETED, deletedData);
                        }
                    }
                }

                // Update tracked set
                messageSetByKey.put(key, currentMsgSet);
                messageSetTimestamps.put(key, System.currentTimeMillis());

                // Prune stale entries
                long now2 = System.currentTimeMillis();
                Iterator<Map.Entry<String, Long>> it = messageSetTimestamps.entrySet().iterator();
                while (it.hasNext()) {
                    Map.Entry<String, Long> entry = it.next();
                    if ((now2 - entry.getValue()) > MESSAGE_SET_MAX_AGE_MS) {
                        messageSetByKey.remove(entry.getKey());
                        it.remove();
                    }
                }
            }

            // Emit event to React Native
            emitEvent(EVENT_MESSAGE, eventData);

            Log.d(TAG, "WhatsApp message captured from: " + contactName
                    + (isGroup ? " in " + groupName : ""));

        } catch (Exception e) {
            Log.e(TAG, "Error processing WhatsApp notification", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // API < 26 fallback (no reason provided). Forward to shared handler.
        handleNotificationRemoved(sbn, -1);
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn, RankingMap rankingMap, int reason) {
        handleNotificationRemoved(sbn, reason);
    }

    private void handleNotificationRemoved(StatusBarNotification sbn, int reason) {
        if (sbn == null) {
            return;
        }

        // Whitelist: only pass through removal reasons that could indicate a deletion.
        //  - REASON_APP_CANCEL (8): app explicitly cancelled — WA Business deletion
        //  - REASON_CANCEL (2): regular WhatsApp now uses this during deletion
        //  - -1: legacy API (no reason provided)
        // Everything else (click, clear-all, regrouping, optimization) is NOT a deletion.
        // Notably, REASON_GROUP_SUMMARY_CANCELED (12) fires when WhatsApp regroups
        // its notification stack — these happen seconds after posting and look like
        // deletions to the recency filter, causing mass false positives.
        if (reason != REASON_APP_CANCEL && reason != REASON_CANCEL && reason != -1) {
            Log.d(TAG, "Skipping non-deletion removal key=" + sbn.getKey()
                    + " reason=" + reasonToString(reason) + " (" + reason + ")");
            return;
        }

        if (reason == -1) {
            Log.d(TAG, "Notification removal with unknown reason (legacy API) key=" + sbn.getKey());
        } else {
            Log.d(TAG, "Notification removal key=" + sbn.getKey()
                    + " reason=" + reasonToString(reason) + " (" + reason + ")");
        }

        String packageName = sbn.getPackageName();

        // Only process WhatsApp notifications
        if (!WHATSAPP_PACKAGE.equals(packageName)
                && !WHATSAPP_BUSINESS_PACKAGE.equals(packageName)) {
            return;
        }

        try {
            Notification notification = sbn.getNotification();
            if (notification == null) {
                return;
            }

            // Skip group summary removals (not individual messages)
            if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) {
                return;
            }

            Bundle extras = notification.extras;

            // Skip system notification removals
            if (extras != null) {
                CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
                if (text != null) {
                    String textLower = text.toString().toLowerCase();
                    if (textLower.equals("checking for new messages")
                            || textLower.equals("downloading messages")
                            || textLower.startsWith("waiting for message")
                            || textLower.matches(".*\\d+ new messages?.*")
                            || textLower.matches(".*\\d+ messages? from \\d+ chats?.*")) {
                        return;
                    }
                }
            }

            WritableMap eventData = Arguments.createMap();
            eventData.putString("notificationKey", sbn.getKey());
            eventData.putInt("notificationId", sbn.getId());
            eventData.putDouble("timestamp", sbn.getPostTime());
            eventData.putString("packageName", packageName);
            eventData.putInt("removalReason", reason);

            // Include how long ago this notification was last updated.
            // A recent update followed by removal strongly indicates deletion.
            // A stale notification being removed likely means the user opened the chat.
            Long lastUpdate = lastUpdateTime.get(sbn.getKey());
            long msSinceLastUpdate = -1;
            if (lastUpdate != null) {
                msSinceLastUpdate = System.currentTimeMillis() - lastUpdate;
            }
            eventData.putDouble("msSinceLastUpdate", msSinceLastUpdate);

            // Include message text if available (helps identify which message was removed)
            if (extras != null) {
                CharSequence textSequence = extras.getCharSequence(Notification.EXTRA_TEXT);
                CharSequence titleSequence = extras.getCharSequence(Notification.EXTRA_TITLE);

                eventData.putString("messageText",
                        textSequence != null ? textSequence.toString() : "");
                eventData.putString("title",
                        titleSequence != null ? titleSequence.toString() : "");
            } else {
                eventData.putString("messageText", "");
                eventData.putString("title", "");
            }

            emitEvent(EVENT_MESSAGE_REMOVED, eventData);

            // Clean up tracking data for this key (but NOT textHistory —
            // it may be needed for revert detection if WhatsApp regroups notifications).
            lastUpdateTime.remove(sbn.getKey());
            messageSetByKey.remove(sbn.getKey());
            messageSetTimestamps.remove(sbn.getKey());

            Log.d(TAG, "WhatsApp notification removed: " + sbn.getKey()
                    + " reason=" + reasonToString(reason) + " (" + reason + ")"
                    + " msSinceLastUpdate=" + msSinceLastUpdate);

        } catch (Exception e) {
            Log.e(TAG, "Error processing removed WhatsApp notification", e);
        }
    }

    private String reasonToString(int reason) {
        switch (reason) {
            case -1:
                return "UNKNOWN_LEGACY";
            case REASON_APP_CANCEL:
                return "APP_CANCEL";
            case REASON_CANCEL:
                return "CANCEL";
            case REASON_CANCEL_ALL:
                return "CANCEL_ALL";
            case REASON_CLICK:
                return "CLICK";
            case REASON_LISTENER_CANCEL:
                return "LISTENER_CANCEL";
            case REASON_GROUP_SUMMARY_CANCELED:
                return "GROUP_SUMMARY_CANCELED";
            case REASON_GROUP_OPTIMIZATION:
                return "GROUP_OPTIMIZATION";
            case REASON_PACKAGE_CHANGED:
                return "PACKAGE_CHANGED";
            default:
                return "OTHER";
        }
    }

    /**
     * Converts a Bitmap to a base64-encoded string.
     * Uses JPEG compression with 80% quality to keep size manageable.
     */
    private String bitmapToBase64(Bitmap bitmap) {
        if (bitmap == null) {
            return null;
        }

        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();
        return Base64.encodeToString(byteArray, Base64.NO_WRAP);
    }

    /**
     * Emits an event to the React Native JavaScript layer via RCTDeviceEventEmitter.
     * If the React context is not available, the event is queued and replayed
     * when the context becomes available (on the next emitEvent call or
     * when onNotificationPosted triggers with an active context).
     */
    private void emitEvent(String eventName, WritableMap data) {
        try {
            ReactApplication reactApplication = (ReactApplication) getApplicationContext();
            ReactInstanceManager reactInstanceManager =
                    reactApplication.getReactNativeHost().getReactInstanceManager();
            ReactContext reactContext = reactInstanceManager.getCurrentReactContext();

            if (reactContext != null && reactContext.hasActiveReactInstance()) {
                // Replay any queued events first (in order)
                drainPendingEvents(reactContext);
                // Then emit the current event
                reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit(eventName, data);
            } else {
                // Queue the event for later replay
                synchronized (pendingEvents) {
                    if (pendingEvents.size() >= MAX_PENDING_EVENTS) {
                        pendingEvents.removeFirst(); // drop oldest
                    }
                    pendingEvents.addLast(new QueuedEvent(eventName, data));
                }
                Log.w(TAG, "React context not available, event queued ("
                        + pendingEvents.size() + " pending): " + eventName);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to emit event: " + eventName, e);
        }
    }

    /**
     * Replays all queued events that were captured while the React context
     * was unavailable.
     */
    private void drainPendingEvents(ReactContext reactContext) {
        synchronized (pendingEvents) {
            if (pendingEvents.isEmpty()) {
                return;
            }
            Log.d(TAG, "Replaying " + pendingEvents.size() + " queued events");
            while (!pendingEvents.isEmpty()) {
                QueuedEvent queued = pendingEvents.removeFirst();
                try {
                    WritableMap map = Arguments.createMap();
                    for (HashMap.Entry<String, Object> entry : queued.data.entrySet()) {
                        String key = entry.getKey();
                        Object value = entry.getValue();
                        if (value == null) {
                            map.putNull(key);
                        } else if (value instanceof String) {
                            map.putString(key, (String) value);
                        } else if (value instanceof Double) {
                            map.putDouble(key, (Double) value);
                        } else if (value instanceof Boolean) {
                            map.putBoolean(key, (Boolean) value);
                        } else if (value instanceof Integer) {
                            map.putInt(key, (Integer) value);
                        }
                    }
                    reactContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit(queued.eventName, map);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to replay queued event: " + queued.eventName, e);
                }
            }
        }
    }
}
