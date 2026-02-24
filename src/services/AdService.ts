import mobileAds, {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import {
  AD_CONFIG,
  INTERSTITIAL_FREQUENCY,
  INTERSTITIAL_COOLDOWN_MS,
} from '../utils/constants';

class AdManager {
  private static instance: AdManager;

  private interstitialAd: InterstitialAd | null = null;
  private rewardedAd: RewardedAd | null = null;
  private interstitialLoaded = false;
  private rewardedLoaded = false;

  private actionCount = 0;
  private lastInterstitialTime = 0;

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
    } catch (error) {
      console.error('AdManager.initialize failed:', error);
    }
  }

  getBannerAdUnitId(): string {
    return AD_CONFIG.bannerId;
  }

  loadInterstitial(): void {
    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(
        AD_CONFIG.interstitialId,
      );

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.interstitialLoaded = true;
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.interstitialLoaded = false;
        // Preload the next one
        this.loadInterstitial();
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
        this.interstitialLoaded = false;
      });

      this.interstitialAd.load();
    } catch (error) {
      console.error('AdManager.loadInterstitial failed:', error);
    }
  }

  /**
   * Shows interstitial if loaded AND frequency cap allows it
   * (every Nth action, with minimum time gap).
   */
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

  loadRewarded(): void {
    try {
      this.rewardedAd = RewardedAd.createForAdRequest(AD_CONFIG.rewardedId);

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.rewardedLoaded = true;
      });

      this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.rewardedLoaded = false;
        this.loadRewarded();
      });

      this.rewardedAd.addAdEventListener(AdEventType.ERROR, () => {
        this.rewardedLoaded = false;
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

  recordAction(): void {
    this.actionCount++;
  }
}

export default AdManager;
