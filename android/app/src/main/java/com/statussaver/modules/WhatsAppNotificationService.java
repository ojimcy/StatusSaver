package com.statussaver.modules;

import android.app.Notification;
import android.graphics.Bitmap;
import android.os.Bundle;
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
import java.util.LinkedList;
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

    // WA Business group title format: "GroupName (N messages): SenderName"
    // or "GroupName (N messages): ~ SenderName"
    private static final Pattern WA_BUSINESS_GROUP_PATTERN =
            Pattern.compile("^(.+?)\\s*\\(\\d+\\s+messages?\\):\\s*~?\\s*(.+)$");

    // Max time between text change and revert to consider it a deletion (60 seconds)
    private static final long REVERT_WINDOW_MS = 60_000;

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

            // Emit event to React Native
            emitEvent(EVENT_MESSAGE, eventData);

            Log.d(TAG, "WhatsApp message captured from: " + contactName
                    + (isGroup ? " in " + groupName : ""));

        } catch (Exception e) {
            Log.e(TAG, "Error processing WhatsApp notification", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn, RankingMap rankingMap, int reason) {
        if (sbn == null) {
            return;
        }

        // Only react to app-initiated removals (WhatsApp itself cancelling the notification).
        // This filters out user swipes (REASON_CANCEL) and "clear all" (REASON_CANCEL_ALL).
        if (reason != REASON_APP_CANCEL) {
            return;
        }

        String packageName = sbn.getPackageName();

        // Only process WhatsApp notifications
        if (!WHATSAPP_PACKAGE.equals(packageName)
                && !WHATSAPP_BUSINESS_PACKAGE.equals(packageName)) {
            return;
        }

        try {
            // Skip group summary removals (not individual messages)
            if ((sbn.getNotification().flags & Notification.FLAG_GROUP_SUMMARY) != 0) {
                return;
            }

            Notification notification = sbn.getNotification();
            Bundle extras = notification != null ? notification.extras : null;

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

            Log.d(TAG, "WhatsApp notification removed (APP_CANCEL): " + sbn.getKey()
                    + " msSinceLastUpdate=" + msSinceLastUpdate);

        } catch (Exception e) {
            Log.e(TAG, "Error processing removed WhatsApp notification", e);
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
     */
    private void emitEvent(String eventName, WritableMap data) {
        try {
            ReactApplication reactApplication = (ReactApplication) getApplicationContext();
            ReactInstanceManager reactInstanceManager =
                    reactApplication.getReactNativeHost().getReactInstanceManager();
            ReactContext reactContext = reactInstanceManager.getCurrentReactContext();

            if (reactContext != null && reactContext.hasActiveReactInstance()) {
                reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit(eventName, data);
            } else {
                Log.w(TAG, "React context not available, event not emitted: " + eventName);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to emit event: " + eventName, e);
        }
    }
}
