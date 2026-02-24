import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import useTheme from '../hooks/useTheme';
import {spacing, fontSize, borderRadius} from '../theme/spacing';

interface MessageCardProps {
  contactName: string;
  lastMessage: string;
  timestamp: number;
  unreadCount: number;
  onPress: () => void;
}

const AVATAR_COLORS = [
  '#075E54',
  '#128C7E',
  '#25D366',
  '#34B7F1',
  '#E91E63',
  '#9C27B0',
  '#FF9800',
  '#607D8B',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
}

const MessageCard: React.FC<MessageCardProps> = ({
  contactName,
  lastMessage,
  timestamp,
  unreadCount,
  onPress,
}) => {
  const {theme} = useTheme();
  const avatarColor = getAvatarColor(contactName);

  return (
    <TouchableOpacity
      style={[styles.container, {borderBottomColor: theme.border}]}
      onPress={onPress}
      activeOpacity={0.6}>
      <View style={[styles.avatar, {backgroundColor: avatarColor}]}>
        <Text style={styles.avatarText}>{getInitial(contactName)}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[styles.name, {color: theme.text}]}
            numberOfLines={1}>
            {contactName}
          </Text>
          <Text
            style={[
              styles.timestamp,
              {color: unreadCount > 0 ? theme.accent : theme.textSecondary},
            ]}>
            {formatTimestamp(timestamp)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, {color: theme.textSecondary}]}
            numberOfLines={1}>
            {lastMessage}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, {backgroundColor: theme.accent}]}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.sm,
  },
  timestamp: {
    fontSize: fontSize.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    fontSize: fontSize.md,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs + 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});

export default MessageCard;
