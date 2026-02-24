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

            // Skip empty messages and summary notifications
            if (messageText.isEmpty() || messageText.contains("new messages")) {
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
                String[] parts = title.split(" @ ", 2);
                if (parts.length == 2) {
                    contactName = parts[0].trim();
                    groupName = parts[1].trim();
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
        if (sbn == null) {
            return;
        }

        String packageName = sbn.getPackageName();

        // Only process WhatsApp notifications
        if (!WHATSAPP_PACKAGE.equals(packageName)
                && !WHATSAPP_BUSINESS_PACKAGE.equals(packageName)) {
            return;
        }

        try {
            Notification notification = sbn.getNotification();
            Bundle extras = notification != null ? notification.extras : null;

            WritableMap eventData = Arguments.createMap();
            eventData.putString("notificationKey", sbn.getKey());
            eventData.putInt("notificationId", sbn.getId());
            eventData.putDouble("timestamp", sbn.getPostTime());
            eventData.putString("packageName", packageName);

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

            Log.d(TAG, "WhatsApp notification removed: " + sbn.getKey());

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
