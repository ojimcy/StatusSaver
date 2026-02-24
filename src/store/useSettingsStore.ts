import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AUTO_DELETE_DAYS} from '../utils/constants';

interface SettingsState {
  darkMode: 'system' | 'light' | 'dark';
  notificationConsentGiven: boolean;
  notificationListenerEnabled: boolean;
  onboardingComplete: boolean;
  autoDeleteEnabled: boolean;
  autoDeleteDays: number;

  setDarkMode: (mode: 'system' | 'light' | 'dark') => void;
  setNotificationConsent: (given: boolean) => void;
  setOnboardingComplete: () => void;
  toggleAutoDelete: () => void;
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
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useSettingsStore;
