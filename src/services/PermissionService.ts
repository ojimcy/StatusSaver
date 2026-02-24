import {Platform, NativeModules} from 'react-native';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';

const {SAFModule, StatusAccessModule} = NativeModules;

export type WhatsAppVariant = 'regular' | 'business';

export interface SAFPermissionStatus {
  whatsapp: boolean;
  business: boolean;
}

export interface WhatsAppInstallStatus {
  installed: boolean;
  whatsapp: boolean;
  business: boolean;
}

export async function checkStoragePermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const result = await check(PERMISSIONS.IOS.PHOTO_LIBRARY);
      return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
    }

    // Android 13+ uses granular media permissions
    if (Platform.OS === 'android' && (Platform.Version as number) >= 33) {
      const imageResult = await check(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
      const videoResult = await check(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO);
      return (
        (imageResult === RESULTS.GRANTED || imageResult === RESULTS.LIMITED) &&
        (videoResult === RESULTS.GRANTED || videoResult === RESULTS.LIMITED)
      );
    }

    // Android < 13
    const result = await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('PermissionService.checkStoragePermission failed:', error);
    return false;
  }
}

export async function requestStoragePermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
      return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
    }

    // Android 13+ uses granular media permissions
    if (Platform.OS === 'android' && (Platform.Version as number) >= 33) {
      const imageResult = await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
      const videoResult = await request(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO);
      return (
        (imageResult === RESULTS.GRANTED || imageResult === RESULTS.LIMITED) &&
        (videoResult === RESULTS.GRANTED || videoResult === RESULTS.LIMITED)
      );
    }

    // Android < 13
    const result = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('PermissionService.requestStoragePermission failed:', error);
    return false;
  }
}

/**
 * Opens the SAF document picker for a specific WhatsApp variant.
 * Returns the persisted URI or null if cancelled.
 */
export async function requestSAFAccess(
  variant: WhatsAppVariant = 'regular',
): Promise<string | null> {
  try {
    if (Platform.OS !== 'android') {
      return null;
    }
    const result = await SAFModule.openDocumentTree(variant);
    if (result && result.granted) {
      return result.uri;
    }
    return null;
  } catch (error) {
    console.error('PermissionService.requestSAFAccess failed:', error);
    return null;
  }
}

/**
 * Returns true if at least one WhatsApp variant has SAF permission.
 */
export async function hasSAFPermission(): Promise<boolean> {
  try {
    if (Platform.OS !== 'android') {
      return false;
    }
    const result = await SAFModule.hasPersistedPermission();
    return result?.hasPermission ?? false;
  } catch (error) {
    console.error('PermissionService.hasSAFPermission failed:', error);
    return false;
  }
}

/**
 * Returns per-variant SAF permission status.
 */
export async function getSAFPermissionStatus(): Promise<SAFPermissionStatus> {
  try {
    if (Platform.OS !== 'android') {
      return {whatsapp: false, business: false};
    }
    const result = await SAFModule.hasPersistedPermission();
    return {
      whatsapp: result?.whatsapp ?? false,
      business: result?.business ?? false,
    };
  } catch (error) {
    console.error('PermissionService.getSAFPermissionStatus failed:', error);
    return {whatsapp: false, business: false};
  }
}

/**
 * Returns which WhatsApp variants are installed on the device.
 */
export async function getWhatsAppInstallStatus(): Promise<WhatsAppInstallStatus> {
  try {
    if (Platform.OS !== 'android') {
      return {installed: false, whatsapp: false, business: false};
    }
    const result = await StatusAccessModule.checkWhatsAppInstalled();
    return {
      installed: result?.installed ?? false,
      whatsapp: result?.whatsapp ?? false,
      business: result?.business ?? false,
    };
  } catch (error) {
    console.error('PermissionService.getWhatsAppInstallStatus failed:', error);
    return {installed: false, whatsapp: false, business: false};
  }
}
