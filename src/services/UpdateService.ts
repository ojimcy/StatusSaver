import {Platform} from 'react-native';

let inAppUpdates: import('sp-react-native-in-app-updates').default | null = null;

/**
 * Check for available updates via Google Play In-App Updates API.
 * Uses a flexible update by default (non-blocking banner).
 * Falls back silently if no update is available or on error.
 */
export async function checkForUpdate(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    if (!inAppUpdates) {
      const {default: SpInAppUpdates} = await import(
        'sp-react-native-in-app-updates'
      );
      inAppUpdates = new SpInAppUpdates(false);
    }

    const {IAUUpdateKind} = await import('sp-react-native-in-app-updates');
    const result = await inAppUpdates.checkNeedsUpdate();

    if (result.shouldUpdate) {
      await inAppUpdates.startUpdate({
        updateType: IAUUpdateKind.FLEXIBLE,
      });
    }
  } catch (error) {
    // Non-critical — don't block the app if update check fails
    console.warn('UpdateService.checkForUpdate failed:', error);
  }
}
