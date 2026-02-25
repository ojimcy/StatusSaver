import {useEffect, useMemo, useCallback} from 'react';
import useStatusStore from '../store/useStatusStore';
import useSettingsStore from '../store/useSettingsStore';

export default function useStatuses() {
  const {statuses, loading, error, fetchStatuses} = useStatusStore();
  const selectedVariant = useSettingsStore(s => s.selectedVariant);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const images = useMemo(
    () =>
      statuses.filter(
        s => s.variant === selectedVariant && s.type === 'image',
      ),
    [statuses, selectedVariant],
  );

  const videos = useMemo(
    () =>
      statuses.filter(
        s => s.variant === selectedVariant && s.type === 'video',
      ),
    [statuses, selectedVariant],
  );

  const refresh = useCallback(() => {
    return fetchStatuses();
  }, [fetchStatuses]);

  return {
    images,
    videos,
    saved: statuses, // The saved tab will be managed by UI layer / separate persistence
    loading,
    error,
    refresh,
  };
}
