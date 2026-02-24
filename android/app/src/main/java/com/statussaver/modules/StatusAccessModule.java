package com.statussaver.modules;

import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Environment;
import android.webkit.MimeTypeMap;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

public class StatusAccessModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "StatusAccessModule";

    // WhatsApp status directory paths
    private static final String LEGACY_STATUS_PATH =
            Environment.getExternalStorageDirectory().getAbsolutePath()
                    + "/WhatsApp/Media/.Statuses/";

    private static final String SCOPED_STATUS_PATH =
            Environment.getExternalStorageDirectory().getAbsolutePath()
                    + "/Android/media/com.whatsapp/WhatsApp/Media/.Statuses/";

    // WhatsApp Business status directory paths
    private static final String LEGACY_BUSINESS_STATUS_PATH =
            Environment.getExternalStorageDirectory().getAbsolutePath()
                    + "/WhatsApp Business/Media/.Statuses/";

    private static final String SCOPED_BUSINESS_STATUS_PATH =
            Environment.getExternalStorageDirectory().getAbsolutePath()
                    + "/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/.Statuses/";

    public StatusAccessModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Returns the correct status directory path based on Android version.
     */
    private String getStatusDirectoryPath() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ (API 30+): scoped storage path
            return SCOPED_STATUS_PATH;
        } else {
            // Android < 11: legacy direct access path
            return LEGACY_STATUS_PATH;
        }
    }

    /**
     * Determines the media type based on file extension.
     * Returns "image", "video", or "unknown".
     */
    private String getMediaType(String fileName) {
        if (fileName == null) {
            return "unknown";
        }

        String lowerName = fileName.toLowerCase();

        if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".png")
                || lowerName.endsWith(".gif") || lowerName.endsWith(".webp")) {
            return "image";
        }

        if (lowerName.endsWith(".mp4") || lowerName.endsWith(".3gp") || lowerName.endsWith(".mkv")
                || lowerName.endsWith(".avi") || lowerName.endsWith(".webm")) {
            return "video";
        }

        // Fallback: try using MimeTypeMap
        String extension = MimeTypeMap.getFileExtensionFromUrl(fileName);
        if (extension != null) {
            String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
            if (mimeType != null) {
                if (mimeType.startsWith("image/")) {
                    return "image";
                } else if (mimeType.startsWith("video/")) {
                    return "video";
                }
            }
        }

        return "unknown";
    }

    /**
     * Checks if a file should be excluded (hidden files, .nomedia, temp files).
     */
    private boolean shouldExcludeFile(File file) {
        if (file == null || !file.exists() || !file.isFile()) {
            return true;
        }

        String name = file.getName();

        // Exclude .nomedia files
        if (name.equals(".nomedia")) {
            return true;
        }

        // Exclude hidden files (starting with .)
        if (name.startsWith(".")) {
            return true;
        }

        // Exclude temp files (WhatsApp creates these while status is loading)
        if (name.endsWith(".tmp") || name.endsWith(".temp")) {
            return true;
        }

        // Exclude files with 0 size (incomplete downloads)
        if (file.length() == 0) {
            return true;
        }

        return false;
    }

    /**
     * Gets all status files from WhatsApp's .Statuses directory.
     * Returns an array of file metadata objects to JavaScript.
     *
     * Each object contains: path, name, type (image/video), size, lastModified
     */
    @ReactMethod
    public void getStatusFiles(Promise promise) {
        try {
            // Collect files from all WhatsApp variant directories
            String[] allPaths = {
                    SCOPED_STATUS_PATH, LEGACY_STATUS_PATH,
                    SCOPED_BUSINESS_STATUS_PATH, LEGACY_BUSINESS_STATUS_PATH
            };

            List<File> allFiles = new ArrayList<>();

            for (String path : allPaths) {
                File dir = new File(path);
                if (dir.exists() && dir.isDirectory()) {
                    File[] files = dir.listFiles();
                    if (files != null) {
                        for (File file : files) {
                            if (!shouldExcludeFile(file)) {
                                allFiles.add(file);
                            }
                        }
                    }
                }
            }

            if (allFiles.isEmpty()) {
                WritableArray emptyArray = Arguments.createArray();
                promise.resolve(emptyArray);
                return;
            }

            // Sort by last modified descending (newest first)
            java.util.Collections.sort(allFiles, new Comparator<File>() {
                @Override
                public int compare(File a, File b) {
                    return Long.compare(b.lastModified(), a.lastModified());
                }
            });

            WritableArray resultArray = Arguments.createArray();

            for (File file : allFiles) {
                WritableMap fileInfo = Arguments.createMap();
                fileInfo.putString("path", file.getAbsolutePath());
                fileInfo.putString("name", file.getName());
                fileInfo.putString("type", getMediaType(file.getName()));
                fileInfo.putDouble("size", file.length());
                fileInfo.putDouble("lastModified", file.lastModified());

                resultArray.pushMap(fileInfo);
            }

            promise.resolve(resultArray);

        } catch (SecurityException e) {
            promise.reject("PERMISSION_ERROR",
                    "Storage permission required to access status files", e);
        } catch (Exception e) {
            promise.reject("STATUS_ACCESS_ERROR",
                    "Failed to access status files: " + e.getMessage(), e);
        }
    }

    /**
     * Returns the path to the WhatsApp status directory.
     * Useful for the JS side to know which directory is being used.
     */
    @ReactMethod
    public void getStatusDirectoryPathAsync(Promise promise) {
        try {
            String primaryPath = getStatusDirectoryPath();
            File primaryDir = new File(primaryPath);

            if (primaryDir.exists() && primaryDir.isDirectory()) {
                promise.resolve(primaryPath);
                return;
            }

            // Try fallback
            String fallbackPath = primaryPath.equals(SCOPED_STATUS_PATH)
                    ? LEGACY_STATUS_PATH : SCOPED_STATUS_PATH;
            File fallbackDir = new File(fallbackPath);

            if (fallbackDir.exists() && fallbackDir.isDirectory()) {
                promise.resolve(fallbackPath);
                return;
            }

            promise.resolve(primaryPath); // Return primary even if not found
        } catch (Exception e) {
            promise.reject("PATH_ERROR", "Failed to get status directory path: " + e.getMessage(), e);
        }
    }

    /**
     * Checks if WhatsApp is installed on the device.
     * Returns { installed: boolean, whatsapp: boolean, business: boolean }
     */
    @ReactMethod
    public void checkWhatsAppInstalled(Promise promise) {
        try {
            PackageManager pm = getReactApplicationContext().getPackageManager();
            boolean hasWhatsApp = false;
            boolean hasBusiness = false;

            try {
                pm.getPackageInfo("com.whatsapp", PackageManager.GET_ACTIVITIES);
                hasWhatsApp = true;
            } catch (PackageManager.NameNotFoundException ignored) {}

            try {
                pm.getPackageInfo("com.whatsapp.w4b", PackageManager.GET_ACTIVITIES);
                hasBusiness = true;
            } catch (PackageManager.NameNotFoundException ignored) {}

            WritableMap result = Arguments.createMap();
            result.putBoolean("installed", hasWhatsApp || hasBusiness);
            result.putBoolean("whatsapp", hasWhatsApp);
            result.putBoolean("business", hasBusiness);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("CHECK_ERROR",
                    "Failed to check WhatsApp installation: " + e.getMessage(), e);
        }
    }

    /**
     * Returns whether scoped storage is required (Android 11+).
     */
    @ReactMethod
    public void requiresScopedStorage(Promise promise) {
        promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.R);
    }
}
