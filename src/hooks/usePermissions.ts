import {useState, useEffect, useCallback} from 'react';
import {AppState} from 'react-native';
import {
  checkStoragePermission,
  requestStoragePermission,
  requestSAFAccess,
  getWhatsAppInstallStatus,
} from '../services/PermissionService';
import {
  isNotificationListenerEnabled,
  requestNotificationAccess,
} from '../services/NotificationService';
import {isAndroid} from '../utils/platform';

export default function usePermissions() {
  const [storageGranted, setStorageGranted] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refreshPermissions(trigger: string) {
      try {
        const storage = await checkStoragePermission();
        if (!cancelled) {
          setStorageGranted(storage);
        }

        if (isAndroid) {
          const enabled = await isNotificationListenerEnabled();
          if (!cancelled) {
            setNotificationEnabled(enabled);
          }
          console.log(
            '[usePermissions]',
            `refreshPermissions(${trigger}) notificationEnabled=${enabled}`,
          );
        }
      } catch (error) {
        console.error(
          '[usePermissions]',
          `refreshPermissions(${trigger}) failed`,
          error,
        );
      }
    }

    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshPermissions('app-active');
      }
    });

    refreshPermissions('mount');

    return () => {
      cancelled = true;
      appStateSub.remove();
    };
  }, []);

  const requestStorage = useCallback(async () => {
    const granted = await requestStoragePermission();
    setStorageGranted(granted);
    return granted;
  }, []);

  const requestNotification = useCallback(() => {
    requestNotificationAccess();
  }, []);

  const requestSAF = useCallback(async () => {
    // Detect installed variants and request SAF for each
    const installStatus = await getWhatsAppInstallStatus();

    let lastUri: string | null = null;
    if (installStatus.whatsapp) {
      lastUri = await requestSAFAccess('regular');
    }
    if (installStatus.business) {
      const businessUri = await requestSAFAccess('business');
      if (businessUri) {
        lastUri = businessUri;
      }
    }
    return lastUri;
  }, []);

  return {
    storageGranted,
    notificationEnabled,
    requestStorage,
    requestNotification,
    requestSAF,
  };
}
