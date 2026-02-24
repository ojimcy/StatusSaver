# Share Extension - Manual Xcode Setup

The Share Extension target must be added manually in Xcode because `.pbxproj` files are too complex to edit programmatically. Follow these steps to complete the setup.

## Prerequisites

- Xcode 14+ installed
- The StatusSaver project builds successfully without the Share Extension

## Steps

### 1. Open the Workspace

Open `ios/StatusSaver.xcworkspace` in Xcode (NOT the `.xcodeproj`).

### 2. Add the Share Extension Target

1. In the Xcode project navigator, select the **StatusSaver** project (the blue icon at the top).
2. Go to **File > New > Target...**
3. Under **iOS > Application Extension**, select **Share Extension**.
4. Click **Next**.
5. Configure the target:
   - **Product Name:** `ShareExtension`
   - **Team:** Select your development team
   - **Organization Identifier:** `com.statussaver`
   - **Bundle Identifier:** `com.statussaver.ShareExtension`
   - **Language:** Swift
   - **Project:** StatusSaver
   - **Embed in Application:** StatusSaver
6. Click **Finish**.
7. If prompted to activate the scheme, click **Activate**.

### 3. Replace the Generated Files

Xcode generates default Share Extension files. Replace them with the custom ones already in `ios/ShareExtension/`:

1. In the Xcode project navigator, expand the **ShareExtension** group.
2. Delete the auto-generated `ShareViewController.swift` (move to trash).
3. Delete the auto-generated `Info.plist` (move to trash).
4. Right-click the **ShareExtension** group > **Add Files to "StatusSaver"...**
5. Navigate to `ios/ShareExtension/` and select:
   - `ShareViewController.swift`
   - `Info.plist`
   - `ShareExtension.entitlements`
6. Ensure **"Copy items if needed"** is unchecked (files are already in place).
7. Ensure the **ShareExtension** target is checked.
8. Click **Add**.

### 4. Add App Groups Capability to the Main App

1. Select the **StatusSaver** project in the navigator.
2. Select the **StatusSaver** target.
3. Go to the **Signing & Capabilities** tab.
4. Click **+ Capability**.
5. Search for and add **App Groups**.
6. Click the **+** under App Groups and enter: `group.com.statussaver.shared`
7. Verify that `StatusSaver.entitlements` is listed in **Build Settings > Code Signing Entitlements**.
   - If not, set it to `StatusSaver/StatusSaver.entitlements`.

### 5. Add App Groups Capability to the Share Extension

1. Select the **ShareExtension** target.
2. Go to the **Signing & Capabilities** tab.
3. Click **+ Capability**.
4. Search for and add **App Groups**.
5. Click the **+** under App Groups and enter: `group.com.statussaver.shared`
6. Verify that `ShareExtension.entitlements` is listed in **Build Settings > Code Signing Entitlements**.
   - If not, set it to `ShareExtension/ShareExtension.entitlements`.

### 6. Configure Build Settings

1. Select the **ShareExtension** target.
2. Go to **Build Settings**.
3. Set **iOS Deployment Target** to match the main app target (same as StatusSaver).
4. Ensure **SWIFT_VERSION** is set to **5.0** (or whatever version matches your Xcode).
5. Under **General**, verify:
   - **Bundle Identifier:** `com.statussaver.ShareExtension`
   - **Version** and **Build** match the main app.

### 7. Verify the Share Extension Info.plist

In the ShareExtension target's **Build Settings**, ensure:
- **Info.plist File** points to `ShareExtension/Info.plist`

### 8. Verify Embedding

1. Select the **StatusSaver** target.
2. Go to **General > Frameworks, Libraries, and Embedded Content** or **Build Phases > Embed App Extensions**.
3. Verify that `ShareExtension.appex` is listed.
4. If not, click **+** and add it.

## Testing the Share Extension

1. Build and run the **StatusSaver** scheme on a device or simulator.
2. Open WhatsApp (or Photos app for easier testing).
3. Select an image or video and tap the **Share** button.
4. Look for **"Save Status"** in the share sheet.
5. Tap it, then tap **Post**.
6. Open StatusSaver -- the shared media should appear in the Saved tab.

## Troubleshooting

### Share Extension not appearing in share sheet
- Ensure the Share Extension target is embedded in the main app.
- Ensure both targets have the same development team.
- Clean build folder (Product > Clean Build Folder) and rebuild.
- On a device, restart it to refresh the share sheet cache.

### "App Group container not found" or files not appearing
- Verify both targets have the **exact same** App Group ID: `group.com.statussaver.shared`
- Ensure the App Groups capability is enabled in the Apple Developer Portal for both the main app and extension App IDs.
- Check that entitlements files are correctly referenced in Build Settings.

### Build errors in ShareViewController.swift
- Ensure the deployment target is iOS 14.0+ (required for `UniformTypeIdentifiers` framework).
- Ensure Swift version is set to 5.0+.
