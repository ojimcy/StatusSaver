import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AUTO_DELETE_DAYS} from '../utils/constants';
import type {WhatsAppVariant} from '../types';

interface SettingsState {
  darkMode: 'system' | 'light' | 'dark';
  notificationConsentGiven: boolean;
  notificationListenerEnabled: boolean;
  onboardingComplete: boolean;
  autoDeleteEnabled: boolean;
  autoDeleteDays: number;
  selectedVariant: WhatsAppVariant;
  favoriteIds: string[];

  setDarkMode: (mode: 'system' | 'light' | 'dark') => void;
  setNotificationConsent: (given: boolean) => void;
  setOnboardingComplete: () => void;
  toggleAutoDelete: () => void;
  setSelectedVariant: (variant: WhatsAppVariant) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      darkMode: 'system',
      notificationConsentGiven: false,
      notificationListenerEnabled: false,
      onboardingComplete: false,
      autoDeleteEnabled: true,
      autoDeleteDays: AUTO_DELETE_DAYS,
      selectedVariant: 'whatsapp',
      favoriteIds: [],

      setDarkMode: (mode: 'system' | 'light' | 'dark') => {
        set({darkMode: mode});
      },

      setNotificationConsent: (given: boolean) => {
        set({notificationConsentGiven: given});
      },

      setOnboardingComplete: () => {
        set({onboardingComplete: true});
      },

      toggleAutoDelete: () => {
        const {autoDeleteEnabled} = get();
        set({autoDeleteEnabled: !autoDeleteEnabled});
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
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useSettingsStore;
