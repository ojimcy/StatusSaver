import React, {useState, useCallback, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {AlertTriangle, ChevronRight, Smartphone, X, MessageCircle} from 'lucide-react-native';
import useMessages from '../hooks/useMessages';
import usePermissions from '../hooks/usePermissions';
import MessageCard from '../components/MessageCard';
import MessageSearchBar from '../components/MessageSearchBar';
import AdBanner from '../components/AdBanner';
import EmptyState from '../components/EmptyState';
import useTheme from '../hooks/useTheme';
import {spacing, fontSize, borderRadius} from '../theme/spacing';

const MessagesScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {theme} = useTheme();
  const {contacts, messages, loading, fetchContacts, search} = useMessages();
  const {notificationEnabled, requestNotification} = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState(contacts);
  const [searchResults, setSearchResults] = useState<
    {name: string; count: number; lastMessage: string}[]
  >([]);
  const isSearching = searchQuery.length > 0;

  // Filter contacts by name and search message content
  useEffect(() => {
    if (!searchQuery) {
      setFilteredContacts(contacts);
      setSearchResults([]);
      return;
    }

    // Client-side: filter contacts whose name matches
    const nameMatches = contacts.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredContacts(nameMatches);

    // Server-side: search message content in database
    search(searchQuery).then(() => {
      // After search, messages store has results - group them by contact
    });
  }, [contacts, searchQuery, search]);

  // Build search results from message content matches
  useEffect(() => {
    if (!isSearching || !messages.length) {
      setSearchResults([]);
      return;
    }

    // Group message results by contact, excluding contacts already shown by name match
    const nameMatchSet = new Set(filteredContacts.map(c => c.name));
    const contactMap = new Map<
      string,
      {name: string; count: number; lastMessage: string}
    >();

    for (const msg of messages) {
      const name = msg.groupName || msg.contactName;
      if (nameMatchSet.has(name)) {
        continue;
      }
      const existing = contactMap.get(name);
      if (existing) {
        existing.count++;
      } else {
        contactMap.set(name, {
          name,
          count: 1,
          lastMessage: msg.messageText,
        });
      }
    }

    setSearchResults(Array.from(contactMap.values()));
  }, [messages, isSearching, filteredContacts]);

  const handleContactPress = useCallback(
    (contactName: string) => {
      navigation.navigate('MessageDetail', {contactName});
    },
    [navigation],
  );

  const [whatsappWarningDismissed, setWhatsappWarningDismissed] =
    useState(false);

  const renderNotificationCard = () => {
    if (notificationEnabled) {
      return null;
    }

    return (
      <TouchableOpacity
        style={[styles.notificationCard, {backgroundColor: theme.surface}]}
        onPress={requestNotification}
        activeOpacity={0.7}>
        <View
          style={[styles.notificationIcon, {backgroundColor: theme.accent}]}>
          <AlertTriangle size={20} color="#FFFFFF" />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, {color: theme.text}]}>
            Enable Notification Access
          </Text>
          <Text
            style={[styles.notificationSubtitle, {color: theme.textSecondary}]}>
            Required to capture deleted messages. Tap to enable.
          </Text>
        </View>
        <ChevronRight size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    );
  };

  const renderWhatsAppNotificationWarning = () => {
    if (!notificationEnabled || whatsappWarningDismissed) {
      return null;
    }

    return (
      <View style={[styles.whatsappWarningCard, {backgroundColor: '#FFF8E1'}]}>
        <View style={styles.whatsappWarningHeader}>
          <View style={styles.whatsappWarningIcon}>
            <Smartphone size={18} color="#F57F17" />
          </View>
          <Text style={[styles.whatsappWarningTitle, {color: '#F57F17'}]}>
            WhatsApp Notifications Must Be On
          </Text>
          <TouchableOpacity
            onPress={() => setWhatsappWarningDismissed(true)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <X size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.whatsappWarningBody, {color: '#5D4037'}]}>
          This feature relies on WhatsApp notifications to capture messages. If
          WhatsApp notifications are turned off, muted, or silenced for a chat,
          those messages won't be captured.
        </Text>
        <Text style={[styles.whatsappWarningHint, {color: '#795548'}]}>
          Go to Settings {'>'} Apps {'>'} WhatsApp {'>'} Notifications and make
          sure they are enabled.
        </Text>
      </View>
    );
  };

  const renderItem = ({
    item,
  }: {
    item: {name: string; count: number; lastMessage: string};
  }) => (
    <MessageCard
      contactName={item.name}
      lastMessage={item.lastMessage}
      timestamp={Date.now()}
      unreadCount={item.count}
      onPress={() => handleContactPress(item.name)}
    />
  );

  const renderListHeader = () => (
    <View>
      {renderNotificationCard()}
      {renderWhatsAppNotificationWarning()}
      <MessageSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search contacts..."
      />
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return null;
    }

    return (
      <EmptyState
        icon={<MessageCircle size={64} color={theme.textSecondary} />}
        title="No Messages Yet"
        subtitle={
          notificationEnabled
            ? 'Deleted messages will appear here when someone deletes a message for everyone.'
            : 'Enable notification access to start capturing deleted messages.'
        }
      />
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <FlatList
        data={[...filteredContacts, ...searchResults]}
        renderItem={renderItem}
        keyExtractor={item => item.name}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        refreshing={loading}
        onRefresh={fetchContacts}
        contentContainerStyle={styles.listContent}
      />
      <AdBanner />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: fontSize.sm,
  },
  whatsappWarningCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  whatsappWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  whatsappWarningIcon: {
    marginRight: spacing.sm,
  },
  whatsappWarningTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  whatsappWarningBody: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  whatsappWarningHint: {
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

export default MessagesScreen;
