import {Platform} from 'react-native';
import type {AdConfig} from '../types';

// WhatsApp status directory paths (Android)
export const WHATSAPP_STATUS_PATHS = [
  // Pre-Android 11 paths
  '/storage/emulated/0/WhatsApp/Media/.Statuses',
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses',
  // WhatsApp Business
  '/storage/emulated/0/WhatsApp Business/Media/.Statuses',
  '/storage/emulated/0/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/.Statuses',
];

// SAF URI for Android 11+ (user selects via document picker)
export const SAF_WHATSAPP_BASE_URI =
  'content://com.android.externalstorage.documents/tree/primary%3AAndroid%2Fmedia%2Fcom.whatsapp%2FWhatsApp%2FMedia%2F.Statuses';

// AdMob ad unit IDs
const ANDROID_AD_IDS: AdConfig = {
  bannerId: 'ca-app-pub-7465595839328435/9019864334',
  interstitialId: 'ca-app-pub-7465595839328435/6393700992',
  rewardedId: 'ca-app-pub-7465595839328435/4070314626',
  appOpenId: 'ca-app-pub-7465595839328435/2701392630',
};

const IOS_AD_IDS: AdConfig = {
  bannerId: 'ca-app-pub-3940256099942544/2934735716',
  interstitialId: 'ca-app-pub-3940256099942544/4411468910',
  rewardedId: 'ca-app-pub-3940256099942544/1712485313',
  appOpenId: 'ca-app-pub-3940256099942544/5575463023',
};

export const AD_CONFIG: AdConfig =
  Platform.OS === 'android' ? ANDROID_AD_IDS : IOS_AD_IDS;

// App configuration
export const AUTO_DELETE_DAYS = 90;
export const INTERSTITIAL_FREQUENCY = 2;
export const INTERSTITIAL_COOLDOWN_MS = 60000;
