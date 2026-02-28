package com.statusvault.modules;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import android.webkit.MimeTypeMap;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.List;

public class SAFModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "SAFModule";
    private static final int REQUEST_CODE_OPEN_DOCUMENT_TREE = 42;

    // SAF document URIs for WhatsApp variants
    private static final String WHATSAPP_STATUS_URI =
            "content://com.android.externalstorage.documents/document/primary%3AAndroid%2Fmedia%2Fcom.whatsapp%2FWhatsApp%2FMedia%2F.Statuses";

    private static final String WHATSAPP_BUSINESS_STATUS_URI =
            "content://com.android.externalstorage.documents/document/primary%3AAndroid%2Fmedia%2Fcom.whatsapp.w4b%2FWhatsApp%20Business%2FMedia%2F.Statuses";

    private Promise pendingPromise;

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == REQUEST_CODE_OPEN_DOCUMENT_TREE) {
                if (pendingPromise == null) {
                    return;
                }

                if (resultCode == Activity.RESULT_OK && data != null) {
                    Uri treeUri = data.getData();
                    if (treeUri != null) {
                        try {
                            // Take persistable permission so we can access it after reboot
                            ContentResolver resolver = getReactApplicationContext().getContentResolver();
                            int takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION
                                    | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                            resolver.takePersistableUriPermission(treeUri, takeFlags);

                            WritableMap result = Arguments.createMap();
                            result.putString("uri", treeUri.toString());
                            result.putBoolean("granted", true);
                            pendingPromise.resolve(result);
                        } catch (Exception e) {
                            pendingPromise.reject("SAF_PERMISSION_ERROR",
                                    "Failed to persist URI permission: " + e.getMessage(), e);
                        }
                    } else {
                        pendingPromise.reject("SAF_NO_URI", "No URI returned from document picker");
                    }
                } else {
                    // User cancelled or denied
                    WritableMap result = Arguments.createMap();
                    result.putString("uri", "");
                    result.putBoolean("granted", false);
                    pendingPromise.resolve(result);
                }

                pendingPromise = null;
            }
        }
    };

    public SAFModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(activityEventListener);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Checks if a persisted URI belongs to WhatsApp Business.
     */
    private boolean isBusinessUri(String uriStr) {
        return uriStr.contains("com.whatsapp.w4b")
                || uriStr.contains("WhatsApp%20Business")
                || uriStr.contains("WhatsApp Business");
    }

    /**
     * Checks if a persisted URI belongs to any WhatsApp variant's status folder.
     */
    private boolean isWhatsAppStatusUri(String uriStr) {
        return uriStr.contains("WhatsApp") || uriStr.contains("whatsapp")
                || uriStr.contains(".Statuses") || uriStr.contains("Statuses");
    }

    /**
     * Opens the SAF document tree picker for a specific WhatsApp variant.
     * @param variant "regular" for WhatsApp, "business" for WhatsApp Business
     */
    @ReactMethod
    public void openDocumentTree(String variant, Promise promise) {
        try {
            Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity available");
                return;
            }

            pendingPromise = promise;

            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                    | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);

            // Pre-navigate to the appropriate WhatsApp status folder (Android 8.0+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                String targetUri = "business".equals(variant)
                        ? WHATSAPP_BUSINESS_STATUS_URI
                        : WHATSAPP_STATUS_URI;
                Uri initialUri = Uri.parse(targetUri);
                intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, initialUri);
            }

            activity.startActivityForResult(intent, REQUEST_CODE_OPEN_DOCUMENT_TREE);
        } catch (Exception e) {
            pendingPromise = null;
            promise.reject("SAF_OPEN_ERROR",
                    "Failed to open document tree picker: " + e.getMessage(), e);
        }
    }

    /**
     * Returns per-variant permission status.
     * Result: { whatsapp: boolean, business: boolean }
     */
    @ReactMethod
    public void hasPersistedPermission(Promise promise) {
        try {
            ContentResolver resolver = getReactApplicationContext().getContentResolver();
            List<UriPermission> permissions = resolver.getPersistedUriPermissions();

            boolean hasWhatsApp = false;
            boolean hasBusiness = false;

            if (permissions != null) {
                for (UriPermission permission : permissions) {
                    String uriStr = permission.getUri().toString();
                    if (!isWhatsAppStatusUri(uriStr)) {
                        continue;
                    }
                    // Check Business first since "com.whatsapp" is a substring of "com.whatsapp.w4b"
                    if (isBusinessUri(uriStr)) {
                        hasBusiness = true;
                    } else {
                        hasWhatsApp = true;
                    }
                }
            }

            WritableMap result = Arguments.createMap();
            result.putBoolean("whatsapp", hasWhatsApp);
            result.putBoolean("business", hasBusiness);
            // Keep backwards compat
            result.putBoolean("hasPermission", hasWhatsApp || hasBusiness);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("SAF_PERMISSION_CHECK_ERROR",
                    "Failed to check persisted permissions: " + e.getMessage(), e);
        }
    }

    /**
     * Lists all files from ALL persisted WhatsApp SAF URIs (regular + business).
     * Returns a combined array of file metadata objects.
     */
    @ReactMethod
    public void getPersistedFiles(Promise promise) {
        try {
            ContentResolver resolver = getReactApplicationContext().getContentResolver();
            List<UriPermission> permissions = resolver.getPersistedUriPermissions();

            List<Uri> treeUris = new ArrayList<>();

            if (permissions != null) {
                for (UriPermission permission : permissions) {
                    String uriStr = permission.getUri().toString();
                    if (isWhatsAppStatusUri(uriStr)) {
                        treeUris.add(permission.getUri());
                    }
                }
            }

            if (treeUris.isEmpty()) {
                promise.reject("SAF_NO_PERMISSION",
                        "No persisted permission found. Please grant folder access first.");
                return;
            }

            WritableArray resultArray = Arguments.createArray();

            String[] projection = new String[]{
                    DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                    DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                    DocumentsContract.Document.COLUMN_MIME_TYPE,
                    DocumentsContract.Document.COLUMN_SIZE,
                    DocumentsContract.Document.COLUMN_LAST_MODIFIED
            };

            for (Uri treeUri : treeUris) {
                Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(
                        treeUri, DocumentsContract.getTreeDocumentId(treeUri));

                Cursor cursor = null;
                try {
                    cursor = resolver.query(childrenUri, projection, null, null, null);

                    if (cursor != null) {
                        while (cursor.moveToNext()) {
                            String documentId = cursor.getString(0);
                            String displayName = cursor.getString(1);
                            String mimeType = cursor.getString(2);
                            long size = cursor.isNull(3) ? 0 : cursor.getLong(3);
                            long lastModified = cursor.isNull(4) ? 0 : cursor.getLong(4);

                            // Skip .nomedia, hidden files, and temp files
                            if (displayName == null || displayName.equals(".nomedia")
                                    || displayName.startsWith(".")
                                    || displayName.endsWith(".tmp")
                                    || displayName.endsWith(".temp")) {
                                continue;
                            }

                            // Skip directories
                            if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mimeType)) {
                                continue;
                            }

                            // Skip files with 0 size
                            if (size == 0) {
                                continue;
                            }

                            // Build the content URI for this document
                            Uri documentUri = DocumentsContract.buildDocumentUriUsingTree(
                                    treeUri, documentId);

                            // Determine media type
                            String mediaType = "unknown";
                            if (mimeType != null) {
                                if (mimeType.startsWith("image/")) {
                                    mediaType = "image";
                                } else if (mimeType.startsWith("video/")) {
                                    mediaType = "video";
                                }
                            }

                            WritableMap fileInfo = Arguments.createMap();
                            fileInfo.putString("uri", documentUri.toString());
                            fileInfo.putString("name", displayName);
                            fileInfo.putString("type", mediaType);
                            fileInfo.putString("mimeType", mimeType != null ? mimeType : "");
                            fileInfo.putDouble("size", size);
                            fileInfo.putDouble("lastModified", lastModified);

                            resultArray.pushMap(fileInfo);
                        }
                    }
                } catch (SecurityException e) {
                    // One URI failed but continue with others
                } finally {
                    if (cursor != null) {
                        cursor.close();
                    }
                }
            }

            promise.resolve(resultArray);

        } catch (SecurityException e) {
            promise.reject("SAF_SECURITY_ERROR",
                    "Permission denied when accessing files: " + e.getMessage(), e);
        } catch (Exception e) {
            promise.reject("SAF_FILE_ERROR",
                    "Failed to list files from SAF: " + e.getMessage(), e);
        }
    }

    /**
     * Releases all persisted URI permissions related to WhatsApp status.
     * Useful for "reset permissions" feature in settings.
     */
    @ReactMethod
    public void releasePersistedPermission(Promise promise) {
        try {
            ContentResolver resolver = getReactApplicationContext().getContentResolver();
            List<UriPermission> permissions = resolver.getPersistedUriPermissions();
            boolean released = false;

            if (permissions != null) {
                for (UriPermission permission : permissions) {
                    String uriStr = permission.getUri().toString();
                    if (isWhatsAppStatusUri(uriStr)) {
                        int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION
                                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                        resolver.releasePersistableUriPermission(permission.getUri(), flags);
                        released = true;
                    }
                }
            }

            promise.resolve(released);
        } catch (Exception e) {
            promise.reject("SAF_RELEASE_ERROR",
                    "Failed to release persisted permissions: " + e.getMessage(), e);
        }
    }
}
