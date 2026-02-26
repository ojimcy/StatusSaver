import React, {useEffect, useRef} from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import useMessages from '../hooks/useMessages';
import useTheme from '../hooks/useTheme';
import {spacing, fontSize, borderRadius} from '../theme/spacing';
import type {DeletedMessage} from '../types';

function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

function formatDateDivider(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const MessageDetailScreen = ({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) => {
  const {contactName} = route.params;
  const {theme} = useTheme();
  const {messages, fetchMessages, markContactRead, loading} = useMessages();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({
      title: contactName,
    });
    fetchMessages(contactName);
    markContactRead(contactName);
  }, [contactName, fetchMessages, markContactRead, navigation]);

  const renderMessage = ({
    item,
    index,
  }: {
    item: DeletedMessage;
    index: number;
  }) => {
    // Check if we need a date divider
    const showDivider =
      index === 0 ||
      new Date(messages[index - 1].timestamp).toDateString() !==
        new Date(item.timestamp).toDateString();

    return (
      <View>
        {showDivider && (
          <View style={styles.dateDivider}>
            <View
              style={[
                styles.dateDividerPill,
                {backgroundColor: theme.surface},
              ]}>
              <Text
                style={[styles.dateDividerText, {color: theme.textSecondary}]}>
                {formatDateDivider(item.timestamp)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.messageContainer}>
          <View
            style={[styles.messageBubble, {backgroundColor: theme.surface}]}>
            {item.isGroup && item.contactName && (
              <Text style={[styles.senderName, {color: theme.primaryLight}]}>
                {item.contactName}
              </Text>
            )}
            <Text style={[styles.messageText, {color: theme.text}]}>
              {item.messageText}
            </Text>
            <Text style={[styles.messageTime, {color: theme.textSecondary}]}>
              {formatMessageTime(item.timestamp)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={() => fetchMessages(contactName)}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({animated: false});
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.sm,
    flexGrow: 1,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dateDividerPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.xl,
  },
  dateDividerText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  messageContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs + 2,
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderTopLeftRadius: borderRadius.sm,
  },
  senderName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
});

export default MessageDetailScreen;
