import {useEffect, useMemo, useCallback} from 'react';
import useStatusStore from '../store/useStatusStore';

export default function useStatuses() {
  const {statuses, loading, error, fetchStatuses} = useStatusStore();

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const images = useMemo(
    () => statuses.filter(s => s.type === 'image'),
    [statuses],
  );

  const videos = useMemo(
    () => statuses.filter(s => s.type === 'video'),
    [statuses],
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
