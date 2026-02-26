import mobileAds, {
  InterstitialAd,
  RewardedAd,
  AppOpenAd,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import {
  AD_CONFIG,
  INTERSTITIAL_FREQUENCY,
  INTERSTITIAL_COOLDOWN_MS,
} from '../utils/constants';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [5000, 15000, 30000];
const APP_OPEN_MIN_BACKGROUND_MS = 30000;

type AdType = 'interstitial' | 'rewarded' | 'appOpen';

class AdManager {
  private static instance: AdManager;

  private interstitialAd: InterstitialAd | null = null;
  private rewardedAd: RewardedAd | null = null;
  private appOpenAd: AppOpenAd | null = null;

  private interstitialLoaded = false;
  private rewardedLoaded = false;
  private appOpenLoaded = false;

  private actionCount = 0;
  private lastInterstitialTime = 0;

  // Retry state
  private retryCounts: Record<AdType, number> = {
    interstitial: 0,
    rewarded: 0,
    appOpen: 0,
  };
  private retryTimers: Record<AdType, ReturnType<typeof setTimeout> | null> = {
    interstitial: null,
    rewarded: null,
    appOpen: null,
  };

  // App Open state
  private lastBackgroundTime = 0;
  private hasBeenBackgrounded = false;

  private constructor() {}

  static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      await mobileAds().initialize();
      this.loadInterstitial();
      this.loadRewarded();
      this.loadAppOpen();
    } catch (error) {
      console.error('AdManager.initialize failed:', error);
    }
  }

  getBannerAdUnitId(): string {
    return AD_CONFIG.bannerId;
  }

  // --- Retry logic ---

  private retryLoad(adType: AdType): void {
    const count = this.retryCounts[adType];
    if (count >= MAX_RETRY_ATTEMPTS) {
      console.warn(`AdManager: ${adType} retry limit reached`);
      return;
    }

    const delay = RETRY_DELAYS_MS[count];

    if (this.retryTimers[adType]) {
      clearTimeout(this.retryTimers[adType]!);
    }

    this.retryTimers[adType] = setTimeout(() => {
      this.retryCounts[adType]++;
      switch (adType) {
        case 'interstitial':
          this.loadInterstitial();
          break;
        case 'rewarded':
          this.loadRewarded();
          break;
        case 'appOpen':
          this.loadAppOpen();
          break;
      }
    }, delay);
  }

  // --- Interstitial ---

  loadInterstitial(): void {
    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(
        AD_CONFIG.interstitialId,
      );

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.interstitialLoaded = true;
        this.retryCounts.interstitial = 0;
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.interstitialLoaded = false;
        this.retryCounts.interstitial = 0;
        this.loadInterstitial();
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
        this.interstitialLoaded = false;
        this.retryLoad('interstitial');
      });

      this.interstitialAd.load();
    } catch (error) {
      console.error('AdManager.loadInterstitial failed:', error);
    }
  }

  showInterstitial(): boolean {
    const now = Date.now();
    const timeSinceLast = now - this.lastInterstitialTime;

    if (
      !this.interstitialLoaded ||
      !this.interstitialAd ||
      this.actionCount % INTERSTITIAL_FREQUENCY !== 0 ||
      timeSinceLast < INTERSTITIAL_COOLDOWN_MS
    ) {
      return false;
    }

    try {
      this.interstitialAd.show();
      this.lastInterstitialTime = now;
      return true;
    } catch (error) {
      console.error('AdManager.showInterstitial failed:', error);
      return false;
    }
  }

  // --- Rewarded ---

  loadRewarded(): void {
    try {
      this.rewardedAd = RewardedAd.createForAdRequest(AD_CONFIG.rewardedId);

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.rewardedLoaded = true;
        this.retryCounts.rewarded = 0;
      });

      this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.rewardedLoaded = false;
        this.retryCounts.rewarded = 0;
        this.loadRewarded();
      });

      this.rewardedAd.addAdEventListener(AdEventType.ERROR, () => {
        this.rewardedLoaded = false;
        this.retryLoad('rewarded');
      });

      this.rewardedAd.load();
    } catch (error) {
      console.error('AdManager.loadRewarded failed:', error);
    }
  }

  showRewarded(): Promise<boolean> {
    return new Promise(resolve => {
      if (!this.rewardedLoaded || !this.rewardedAd) {
        resolve(false);
        return;
      }

      let rewarded = false;

      const unsubReward = this.rewardedAd!.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          rewarded = true;
        },
      );

      const unsubClose = this.rewardedAd!.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          unsubReward();
          unsubClose();
          resolve(rewarded);
        },
      );

      try {
        this.rewardedAd!.show();
      } catch (error) {
        unsubReward();
        unsubClose();
        console.error('AdManager.showRewarded failed:', error);
        resolve(false);
      }
    });
  }

  // --- App Open ---

  loadAppOpen(): void {
    try {
      this.appOpenAd = AppOpenAd.createForAdRequest(AD_CONFIG.appOpenId);

      this.appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
        this.appOpenLoaded = true;
        this.retryCounts.appOpen = 0;
      });

      this.appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.appOpenLoaded = false;
        this.retryCounts.appOpen = 0;
        this.loadAppOpen();
      });

      this.appOpenAd.addAdEventListener(AdEventType.ERROR, () => {
        this.appOpenLoaded = false;
        this.retryLoad('appOpen');
      });

      this.appOpenAd.load();
    } catch (error) {
      console.error('AdManager.loadAppOpen failed:', error);
    }
  }

  onBackground(): void {
    this.lastBackgroundTime = Date.now();
    this.hasBeenBackgrounded = true;
  }

  showAppOpen(): boolean {
    if (!this.hasBeenBackgrounded) {
      return false;
    }

    const backgroundDuration = Date.now() - this.lastBackgroundTime;
    if (backgroundDuration < APP_OPEN_MIN_BACKGROUND_MS) {
      return false;
    }

    if (!this.appOpenLoaded || !this.appOpenAd) {
      return false;
    }

    try {
      this.appOpenAd.show();
      this.appOpenLoaded = false;
      return true;
    } catch (error) {
      console.error('AdManager.showAppOpen failed:', error);
      return false;
    }
  }

  // --- Action tracking ---

  recordAction(): void {
    this.actionCount++;
  }
}

export default AdManager;
