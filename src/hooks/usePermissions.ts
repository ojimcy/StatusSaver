import {useState, useEffect, useCallback} from 'react';
import {AppState} from 'react-native';
import {
  checkStoragePermission,
  requestStoragePermission,
  requestSAFAccess,
  getWhatsAppInstallStatus,
} from '../services/PermissionService';

export default function usePermissions() {
  const [storageGranted, setStorageGranted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refreshPermissions() {
      try {
        const storage = await checkStoragePermission();
        if (!cancelled) {
          setStorageGranted(storage);
        }
      } catch (error) {
        console.error('[usePermissions]', 'refreshPermissions failed', error);
      }
    }

    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshPermissions();
      }
    });

    refreshPermissions();

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
    requestStorage,
    requestSAF,
  };
}
