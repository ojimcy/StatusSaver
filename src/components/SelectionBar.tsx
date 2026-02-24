import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import useTheme from '../hooks/useTheme';
import {spacing, fontSize, borderRadius} from '../theme/spacing';

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
          <Text style={styles.actionIcon}>{'\u2B07'}</Text>
          <Text style={styles.actionText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
          <Text style={styles.actionIcon}>{'\u2B06'}</Text>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={onCancel}>
          <Text style={styles.actionIcon}>{'\u2715'}</Text>
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
  actionIcon: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '500',
  },
});

export default SelectionBar;
