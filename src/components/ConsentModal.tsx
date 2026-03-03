import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {Check, X} from 'lucide-react-native';
import useTheme from '../hooks/useTheme';
import {spacing, fontSize, borderRadius} from '../theme/spacing';

interface ConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const CAPTURED_ITEMS = [
  'Message text from notifications',
  'Sender/contact name',
  'Group name (if applicable)',
  'Timestamp of the message',
];

const NOT_CAPTURED_ITEMS = [
  'Media files (photos, videos, audio)',
  'Messages from muted chats',
  'Messages sent while phone is off',
  'Any data sent to external servers',
];

const ConsentModal: React.FC<ConsentModalProps> = ({
  visible,
  onAccept,
  onDecline,
}) => {
  const {theme} = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, {backgroundColor: theme.card}]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, {color: theme.text}]}>
              Notification Access
            </Text>

            <Text style={[styles.description, {color: theme.textSecondary}]}>
              To capture deleted WhatsApp messages, this app needs access to
              your notifications. All data is stored locally on your device and
              never sent to any server.
            </Text>

            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              What is captured:
            </Text>
            {CAPTURED_ITEMS.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletIcon}>
                  <Check size={16} color={theme.accent} strokeWidth={3} />
                </View>
                <Text style={[styles.bulletText, {color: theme.text}]}>
                  {item}
                </Text>
              </View>
            ))}

            <Text
              style={[
                styles.sectionTitle,
                {color: theme.text, marginTop: spacing.md},
              ]}>
              What is NOT captured:
            </Text>
            {NOT_CAPTURED_ITEMS.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletIcon}>
                  <X size={16} color={theme.error} strokeWidth={3} />
                </View>
                <Text style={[styles.bulletText, {color: theme.text}]}>
                  {item}
                </Text>
              </View>
            ))}

            <Text
              style={[
                styles.disclaimer,
                {color: theme.textSecondary},
              ]}>
              You can disable this at any time in your device settings.
            </Text>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.declineButton,
                {backgroundColor: theme.surface},
              ]}
              onPress={onDecline}>
              <Text style={[styles.buttonText, {color: theme.textSecondary}]}>
                Decline
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.acceptButton,
                {backgroundColor: theme.accent},
              ]}
              onPress={onAccept}>
              <Text style={[styles.buttonText, {color: '#FFFFFF'}]}>
                Enable
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs + 2,
    paddingLeft: spacing.sm,
  },
  bulletIcon: {
    marginRight: spacing.sm,
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    fontSize: fontSize.md,
    flex: 1,
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {},
  acceptButton: {},
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});

export default ConsentModal;
