import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import useTheme from '../hooks/useTheme';
import {spacing, borderRadius, fontSize} from '../theme/spacing';
import type {StatusFile} from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SPACING = spacing.xs;
const NUM_COLUMNS = 3;
const ITEM_SIZE =
  (SCREEN_WIDTH - spacing.sm * 2 - ITEM_SPACING * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

interface StatusCardProps {
  file: StatusFile;
  onPress: () => void;
  onLongPress: () => void;
  selected: boolean;
  selectionMode: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({
  file,
  onPress,
  onLongPress,
  selected,
  selectionMode,
}) => {
  const {theme} = useTheme();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}>
      <View style={styles.imageWrapper}>
        <FastImage
          style={styles.image}
          source={{uri: file.uri, priority: FastImage.priority.normal}}
          resizeMode={FastImage.resizeMode.cover}
        />

        {file.type === 'video' && (
          <View style={styles.videoOverlay}>
            <View style={styles.playIcon}>
              <Text style={styles.playIconText}>{'  \u25B6'}</Text>
            </View>
          </View>
        )}

        {selectionMode && (
          <View style={styles.selectionOverlay}>
            <View
              style={[
                styles.checkbox,
                selected && {
                  backgroundColor: theme.accent,
                  borderColor: theme.accent,
                },
              ]}>
              {selected && <Text style={styles.checkmark}>{'\u2713'}</Text>}
            </View>
          </View>
        )}

        {selected && <View style={styles.selectedTint} />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginBottom: ITEM_SPACING,
  },
  imageWrapper: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  selectionOverlay: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  selectedTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(37, 211, 102, 0.25)',
    borderRadius: borderRadius.md,
  },
});

export {ITEM_SIZE, ITEM_SPACING, NUM_COLUMNS};
export default StatusCard;
