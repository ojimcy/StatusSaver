import InAppReview from 'react-native-in-app-review';
import useSettingsStore from '../store/useSettingsStore';

const REVIEW_TRIGGER_SAVE_COUNT = 5;

export function tryRequestReview(): void {
  const {totalSaves, reviewPrompted, markReviewPrompted} =
    useSettingsStore.getState();

  if (reviewPrompted || totalSaves < REVIEW_TRIGGER_SAVE_COUNT) {
    return;
  }

  if (!InAppReview.isAvailable()) {
    return;
  }

  markReviewPrompted();
  InAppReview.RequestInAppReview().catch(() => {});
}
