import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {WhatsAppVariant} from '../types';

interface SettingsState {
  darkMode: 'system' | 'light' | 'dark';
  onboardingComplete: boolean;
  selectedVariant: WhatsAppVariant;
  favoriteIds: string[];
  totalSaves: number;
  reviewPrompted: boolean;

  setDarkMode: (mode: 'system' | 'light' | 'dark') => void;
  setOnboardingComplete: () => void;
  setSelectedVariant: (variant: WhatsAppVariant) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  incrementSaveCount: () => number;
  markReviewPrompted: () => void;
}

const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      darkMode: 'system',
      onboardingComplete: false,
      selectedVariant: 'whatsapp',
      favoriteIds: [],
      totalSaves: 0,
      reviewPrompted: false,

      setDarkMode: (mode: 'system' | 'light' | 'dark') => {
        set({darkMode: mode});
      },

      setOnboardingComplete: () => {
        set({onboardingComplete: true});
      },

      setSelectedVariant: (variant: WhatsAppVariant) => {
        set({selectedVariant: variant});
      },

      toggleFavorite: (id: string) => {
        const {favoriteIds} = get();
        if (favoriteIds.includes(id)) {
          set({favoriteIds: favoriteIds.filter(fid => fid !== id)});
        } else {
          set({favoriteIds: [...favoriteIds, id]});
        }
      },

      isFavorite: (id: string) => {
        return get().favoriteIds.includes(id);
      },

      incrementSaveCount: () => {
        const next = get().totalSaves + 1;
        set({totalSaves: next});
        return next;
      },

      markReviewPrompted: () => {
        set({reviewPrompted: true});
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useSettingsStore;
