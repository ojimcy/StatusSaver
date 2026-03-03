import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowLeft, Download, Check, Share2, Heart} from 'lucide-react-native';
import ImageViewer from '../components/ImageViewer';
import VideoPlayer from '../components/VideoPlayer';
import {spacing, fontSize} from '../theme/spacing';
import {saveToGallery, shareFile} from '../services/FileService';
import AdManager from '../services/AdService';
import useSettingsStore from '../store/useSettingsStore';

const ViewerScreen = ({navigation, route}: any) => {
  const insets = useSafeAreaInsets();
  const {file} = route.params;
  const [paused, setPaused] = useState(false);
  const [saved, setSaved] = useState(false);
  const favorited = useSettingsStore(s => s.favoriteIds.includes(file.id));
  const toggleFavorite = useSettingsStore(s => s.toggleFavorite);

  const handleSave = useCallback(async () => {
    const success = await saveToGallery(file);
    if (success) {
      setSaved(true);
      Alert.alert('Saved', 'Status saved to your gallery.');

      // Track action for interstitial frequency
      const adManager = AdManager.getInstance();
      adManager.recordAction();
      adManager.showInterstitial();
    } else {
      Alert.alert('Error', 'Failed to save status. Please try again.');
    }
  }, [file]);

  const handleShare = useCallback(async () => {
    await shareFile(file);
  }, [file]);

  const handleFavorite = useCallback(() => {
    toggleFavorite(file.id);
  }, [file.id, toggleFavorite]);

  const handleTogglePlay = useCallback(() => {
    setPaused(prev => !prev);
  }, []);

  const handleBack = useCallback(() => {
    const adManager = AdManager.getInstance();
    adManager.recordAction();
    adManager.showInterstitial();
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {file.type === 'image' ? (
        <ImageViewer uri={file.uri} />
      ) : (
        <VideoPlayer
          uri={file.uri}
          paused={paused}
          onTogglePlay={handleTogglePlay}
        />
      )}

      {/* Top bar with back button */}
      <View style={[styles.topBar, {paddingTop: insets.top}]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {file.type === 'image' ? 'Image' : 'Video'}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, {paddingBottom: insets.bottom}]}>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSave}
            disabled={saved}>
            {saved ? (
              <Check size={22} color="#25D366" />
            ) : (
              <Download size={22} color="#FFFFFF" />
            )}
            <Text
              style={[styles.actionLabel, saved && styles.actionLabelActive]}>
              {saved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={22} color="#FFFFFF" />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleFavorite}>
            <Heart
              size={22}
              color={favorited ? '#E91E63' : '#FFFFFF'}
              fill={favorited ? '#E91E63' : 'none'}
            />
            <Text style={[styles.actionLabel, favorited && {color: '#E91E63'}]}>
              {favorited ? 'Favorited' : 'Favorite'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    minWidth: 60,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
  },
  actionLabelActive: {
    color: '#25D366',
  },
});

export default ViewerScreen;
