import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Download, Share2, X} from 'lucide-react-native';
import useTheme from '../hooks/useTheme';
import {spacing, fontSize, borderRadius} from '../theme/spacing';

const ICON_SIZE = 16;

interface SelectionBarProps {
  count: number;
  onSave: () => void;
  onShare: () => void;
  onCancel: () => void;
}

const SelectionBar: React.FC<SelectionBarProps> = ({
  count,
  onSave,
  onShare,
  onCancel,
}) => {
  const {theme} = useTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.primary}]}>
      <Text style={styles.countText}>
        {count} selected
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onSave}>
          <Download size={ICON_SIZE} color="#FFFFFF" />
          <Text style={styles.actionText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
          <Share2 size={ICON_SIZE} color="#FFFFFF" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={onCancel}>
          <X size={ICON_SIZE} color="#FFFFFF" />
          <Text style={styles.actionText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '500',
  },
});

export default SelectionBar;
