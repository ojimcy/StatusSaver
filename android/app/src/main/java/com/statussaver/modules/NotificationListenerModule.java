package com.statussaver.modules;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.HashMap;
import java.util.Map;

/**
 * React Native bridge module for managing NotificationListenerService permissions
 * and providing event emitter support for WhatsApp notification events.
 *
 * This module:
 * - Checks if notification listener permission is granted
 * - Opens system settings for the user to enable notification access
 * - Provides event emitter support for WhatsAppNotificationService events
 */
public class NotificationListenerModule extends ReactContextBaseJavaModule
        implements LifecycleEventListener {

    private static final String MODULE_NAME = "NotificationListenerModule";

    // Event names (same as WhatsAppNotificationService)
    private static final String EVENT_MESSAGE = "onWhatsAppMessage";
    private static final String EVENT_MESSAGE_REMOVED = "onWhatsAppMessageRemoved";

    private int listenerCount = 0;

    public NotificationListenerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addLifecycleEventListener(this);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Provide constants to JavaScript.
     * Exposes event names so JS doesn't need to hardcode them.
     */
    @Nullable
    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> constants = new HashMap<>();
        constants.put("EVENT_MESSAGE", EVENT_MESSAGE);
        constants.put("EVENT_MESSAGE_REMOVED", EVENT_MESSAGE_REMOVED);
        return constants;
    }

    /**
     * Checks if the notification listener permission is granted.
     * Reads from Settings.Secure to determine if our service is enabled.
     */
    @ReactMethod
    public void isEnabled(Promise promise) {
        try {
            String enabledListeners = Settings.Secure.getString(
                    getReactApplicationContext().getContentResolver(),
                    "enabled_notification_listeners");

            if (enabledListeners == null || TextUtils.isEmpty(enabledListeners)) {
                promise.resolve(false);
                return;
            }

            // Our service component name
            ComponentName componentName = new ComponentName(
                    getReactApplicationContext(),
                    WhatsAppNotificationService.class);
            String flatComponentName = componentName.flattenToString();

            // Check if our service is in the enabled list
            boolean isEnabled = enabledListeners.contains(flatComponentName);
            promise.resolve(isEnabled);

        } catch (Exception e) {
            promise.reject("NOTIFICATION_CHECK_ERROR",
                    "Failed to check notification listener status: " + e.getMessage(), e);
        }
    }

    /**
     * Opens the system Notification Listener Settings screen.
     * The user must manually enable our app's notification access.
     */
    @ReactMethod
    public void requestPermission(Promise promise) {
        try {
            Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity available");
                return;
            }

            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);

            // We can't know if the user actually enabled it from here,
            // so we just resolve after opening settings.
            // The JS side should check isEnabled() when the app resumes.
            promise.resolve(true);

        } catch (Exception e) {
            promise.reject("NOTIFICATION_SETTINGS_ERROR",
                    "Failed to open notification listener settings: " + e.getMessage(), e);
        }
    }

    /**
     * Required by React Native to support event listeners.
     * Called when JS calls addListener() for this module's events.
     */
    @ReactMethod
    public void addListener(String eventName) {
        listenerCount++;
    }

    /**
     * Required by React Native to support event listeners.
     * Called when JS calls removeListeners() for this module's events.
     */
    @ReactMethod
    public void removeListeners(int count) {
        listenerCount -= count;
        if (listenerCount < 0) {
            listenerCount = 0;
        }
    }

    /**
     * Utility method to emit events from this module.
     * Can be used to forward events or emit module-specific events.
     */
    private void sendEvent(String eventName, @Nullable WritableMap params) {
        if (getReactApplicationContext().hasActiveReactInstance()) {
            getReactApplicationContext()
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        }
    }

    // LifecycleEventListener methods

    @Override
    public void onHostResume() {
        // When app comes back to foreground, we could emit a status check event.
        // This is useful after the user returns from notification settings.
    }

    @Override
    public void onHostPause() {
        // No action needed
    }

    @Override
    public void onHostDestroy() {
        // Clean up if needed
    }
}
