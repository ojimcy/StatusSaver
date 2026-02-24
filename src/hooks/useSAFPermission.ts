import {useState, useEffect, useCallback} from 'react';
import {Platform} from 'react-native';
import {
  getSAFPermissionStatus,
  getWhatsAppInstallStatus,
  requestSAFAccess,
  type WhatsAppVariant,
} from '../services/PermissionService';
import {isAndroid} from '../utils/platform';

interface SAFPermissionState {
  /** True if at least one installed variant is missing SAF permission */
  needsPermission: boolean;
  /** Installed variants that still need SAF permission granted */
  missingVariants: WhatsAppVariant[];
  /** Request SAF access for all missing variants sequentially, returns true if any were granted */
  grantAccess: () => Promise<boolean>;
}

export default function useSAFPermission(shouldCheck: boolean): SAFPermissionState {
  const [missingVariants, setMissingVariants] = useState<WhatsAppVariant[]>([]);

  useEffect(() => {
    if (!shouldCheck || !isAndroid || Number(Platform.Version) < 30) {
      setMissingVariants([]);
      return;
    }

    (async () => {
      const [installStatus, permStatus] = await Promise.all([
        getWhatsAppInstallStatus(),
        getSAFPermissionStatus(),
      ]);

      const missing: WhatsAppVariant[] = [];
      if (installStatus.whatsapp && !permStatus.whatsapp) {
        missing.push('regular');
      }
      if (installStatus.business && !permStatus.business) {
        missing.push('business');
      }
      setMissingVariants(missing);
    })();
  }, [shouldCheck]);

  const grantAccess = useCallback(async () => {
    let anyGranted = false;

    for (const variant of missingVariants) {
      const uri = await requestSAFAccess(variant);
      if (uri) {
        anyGranted = true;
      }
    }

    if (anyGranted) {
      // Re-check what's still missing
      const [installStatus, permStatus] = await Promise.all([
        getWhatsAppInstallStatus(),
        getSAFPermissionStatus(),
      ]);
      const stillMissing: WhatsAppVariant[] = [];
      if (installStatus.whatsapp && !permStatus.whatsapp) {
        stillMissing.push('regular');
      }
      if (installStatus.business && !permStatus.business) {
        stillMissing.push('business');
      }
      setMissingVariants(stillMissing);
    }

    return anyGranted;
  }, [missingVariants]);

  return {
    needsPermission: missingVariants.length > 0,
    missingVariants,
    grantAccess,
  };
}
