import {create} from 'zustand';
import type {StatusFile} from '../types';
import {getStatuses} from '../services/StatusService';

interface StatusState {
  statuses: StatusFile[];
  loading: boolean;
  selectedIds: string[];
  error: string | null;

  fetchStatuses: () => Promise<void>;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
}

const useStatusStore = create<StatusState>((set, get) => ({
  statuses: [],
  loading: false,
  selectedIds: [],
  error: null,

  fetchStatuses: async () => {
    set({loading: true, error: null});
    try {
      const statuses = await getStatuses();
      set({statuses, loading: false});
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to load statuses',
        loading: false,
      });
    }
  },

  toggleSelection: (id: string) => {
    const {selectedIds} = get();
    if (selectedIds.includes(id)) {
      set({selectedIds: selectedIds.filter(s => s !== id)});
    } else {
      set({selectedIds: [...selectedIds, id]});
    }
  },

  clearSelection: () => {
    set({selectedIds: []});
  },

  selectAll: () => {
    const {statuses} = get();
    set({selectedIds: statuses.map(s => s.id)});
  },
}));

export default useStatusStore;
