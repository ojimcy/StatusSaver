package com.statussaver.modules;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * React Native package that registers all custom native modules for the StatusSaver app.
 *
 * Registered modules:
 * - StatusAccessModule: file access for WhatsApp statuses
 * - SAFModule: Storage Access Framework for Android 11+ scoped storage
 * - NotificationListenerModule: bridge for notification listener permission and events
 */
public class NativeModulesPackage implements ReactPackage {

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new StatusAccessModule(reactContext));
        modules.add(new SAFModule(reactContext));
        modules.add(new NotificationListenerModule(reactContext));
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
