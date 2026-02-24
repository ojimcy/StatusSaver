import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {BannerAd, BannerAdSize} from 'react-native-google-mobile-ads';
import {AD_CONFIG} from '../utils/constants';

const AD_BANNER_HEIGHT = 60;

const AdBanner: React.FC = () => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  if (adError) {
    return null;
  }

  return (
    <View style={[styles.container, !adLoaded && styles.placeholder]}>
      <BannerAd
        unitId={AD_CONFIG.bannerId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={() => setAdError(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  placeholder: {
    height: AD_BANNER_HEIGHT,
  },
});

export default AdBanner;
