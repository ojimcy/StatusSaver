import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import {CheckSquare, Download, Share2, Heart, MessageCircle} from 'lucide-react-native';
import useTheme from '../hooks/useTheme';
import {fontSize, spacing, borderRadius} from '../theme/spacing';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MENU_HEIGHT_ESTIMATE = 200;
const ICON_SIZE = 20;

interface StatusContextMenuProps {
  visible: boolean;
  anchor: {x: number; y: number};
  onClose: () => void;
  onSelect: () => void;
  onSave: () => void;
  onRepost: () => void;
  onShare: () => void;
  onFavorite: () => void;
  isFavorited: boolean;
}

const StatusContextMenu: React.FC<StatusContextMenuProps> = ({
  visible,
  anchor,
  onClose,
  onSelect,
  onSave,
  onRepost,
  onShare,
  onFavorite,
  isFavorited,
}) => {
  const {theme} = useTheme();

  // Position menu above if it would overflow below the screen
  const menuTop =
    anchor.y + MENU_HEIGHT_ESTIMATE > SCREEN_HEIGHT
      ? anchor.y - MENU_HEIGHT_ESTIMATE
      : anchor.y;

  const items = [
    {
      key: 'select',
      label: 'Select',
      icon: <CheckSquare size={ICON_SIZE} color={theme.text} />,
      onPress: onSelect,
    },
    {
      key: 'save',
      label: 'Save',
      icon: <Download size={ICON_SIZE} color={theme.text} />,
      onPress: onSave,
    },
    {
      key: 'repost',
      label: 'Repost to WhatsApp',
      icon: <MessageCircle size={ICON_SIZE} color="#25D366" />,
      onPress: onRepost,
      color: '#25D366',
    },
    {
      key: 'share',
      label: 'Share',
      icon: <Share2 size={ICON_SIZE} color={theme.text} />,
      onPress: onShare,
    },
    {
      key: 'favorite',
      label: isFavorited ? 'Unfavorite' : 'Favorite',
      icon: (
        <Heart
          size={ICON_SIZE}
          color={isFavorited ? '#E91E63' : theme.text}
          fill={isFavorited ? '#E91E63' : 'none'}
        />
      ),
      onPress: onFavorite,
      color: isFavorited ? '#E91E63' : theme.text,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              top: menuTop,
              left: anchor.x,
            },
          ]}>
          {items.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.option}
              onPress={() => {
                item.onPress();
                onClose();
              }}
              activeOpacity={0.7}>
              <View style={styles.iconWrapper}>{item.icon}</View>
              <Text
                style={[
                  styles.optionText,
                  {color: item.color ?? theme.text},
                ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    minWidth: 160,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  iconWrapper: {
    width: 24,
    alignItems: 'center',
  },
  optionText: {
    fontSize: fontSize.md,
  },
});

export default StatusContextMenu;
