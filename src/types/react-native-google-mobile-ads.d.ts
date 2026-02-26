declare module 'react-native-google-mobile-ads' {
  import {Component} from 'react';

  export interface AdEventListener {
    (): void;
  }

  export class InterstitialAd {
    static createForAdRequest(adUnitId: string, requestOptions?: any): InterstitialAd;
    addAdEventListener(event: string, listener: AdEventListener): () => void;
    load(): void;
    show(): void;
  }

  export class RewardedAd {
    static createForAdRequest(adUnitId: string, requestOptions?: any): RewardedAd;
    addAdEventListener(event: string, listener: AdEventListener): () => void;
    load(): void;
    show(): void;
  }

  export class AppOpenAd {
    static createForAdRequest(adUnitId: string, requestOptions?: any): AppOpenAd;
    addAdEventListener(event: string, listener: AdEventListener): () => void;
    load(): void;
    show(): Promise<void>;
  }

  export const AdEventType: {
    LOADED: string;
    CLOSED: string;
    ERROR: string;
    OPENED: string;
    CLICKED: string;
  };

  export const RewardedAdEventType: {
    LOADED: string;
    EARNED_REWARD: string;
  };

  export const TestIds: {
    BANNER: string;
    INTERSTITIAL: string;
    REWARDED: string;
    APP_OPEN: string;
  };

  export enum BannerAdSize {
    BANNER = 'BANNER',
    FULL_BANNER = 'FULL_BANNER',
    LARGE_BANNER = 'LARGE_BANNER',
    LEADERBOARD = 'LEADERBOARD',
    MEDIUM_RECTANGLE = 'MEDIUM_RECTANGLE',
    ANCHORED_ADAPTIVE_BANNER = 'ANCHORED_ADAPTIVE_BANNER',
  }

  export interface BannerAdProps {
    unitId: string;
    size: BannerAdSize;
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (error: any) => void;
    onAdOpened?: () => void;
    onAdClosed?: () => void;
  }

  export class BannerAd extends Component<BannerAdProps> {}

  interface MobileAdsInstance {
    initialize(): Promise<void>;
  }

  export default function mobileAds(): MobileAdsInstance;
}
