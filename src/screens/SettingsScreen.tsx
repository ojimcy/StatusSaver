import React, {useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import useSettingsStore from '../store/useSettingsStore';
import usePermissions from '../hooks/usePermissions';
import useTheme from '../hooks/useTheme';
import {spacing, fontSize, borderRadius} from '../theme/spacing';
import {isAndroid} from '../utils/platform';
import {deleteAllMessages, exportMessages} from '../services/MessageService';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';

const APP_VERSION = '1.0.0';

const SettingsScreen: React.FC = () => {
  const {theme} = useTheme();
  const {
    darkMode,
    setDarkMode,
    autoDeleteEnabled,
    autoDeleteDays,
    toggleAutoDelete,
  } = useSettingsStore();
  const {notificationEnabled, requestNotification} = usePermissions();

  const handleDarkModeChange = useCallback(
    (mode: 'system' | 'light' | 'dark') => {
      setDarkMode(mode);
    },
    [setDarkMode],
  );

  const handleExportMessages = useCallback(async () => {
    try {
      const exportText = await exportMessages();
      const path = `${RNFS.DocumentDirectoryPath}/deleted_messages_export.txt`;
      await RNFS.writeFile(path, exportText, 'utf8');
      await Share.open({
        url: `file://${path}`,
        type: 'text/plain',
        title: 'Export Deleted Messages',
        failOnCancel: false,
      });
    } catch (error) {
      if ((error as any)?.message !== 'User did not share') {
        Alert.alert('Export Failed', 'Unable to export messages.');
      }
    }
  }, []);

  const handleClearAllMessages = useCallback(() => {
    Alert.alert(
      'Clear All Messages',
      'This will permanently delete all captured messages. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllMessages();
              Alert.alert('Done', 'All messages have been deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear messages.');
            }
          },
        },
      ],
    );
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL('https://example.com/privacy');
  }, []);

  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionHeader, {color: theme.primaryLight}]}>
      {title}
    </Text>
  );

  const renderDarkModeOption = (
    label: string,
    mode: 'system' | 'light' | 'dark',
  ) => (
    <TouchableOpacity
      style={[styles.optionRow, {borderBottomColor: theme.border}]}
      onPress={() => handleDarkModeChange(mode)}>
      <Text style={[styles.optionText, {color: theme.text}]}>{label}</Text>
      <View
        style={[
          styles.radio,
          {borderColor: theme.textSecondary},
          darkMode === mode && {
            borderColor: theme.accent,
          },
        ]}>
        {darkMode === mode && (
          <View style={[styles.radioInner, {backgroundColor: theme.accent}]} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      contentContainerStyle={styles.content}>
      {/* Appearance */}
      {renderSectionHeader('Appearance')}
      <View style={[styles.section, {backgroundColor: theme.card}]}>
        {renderDarkModeOption('System Default', 'system')}
        {renderDarkModeOption('Light', 'light')}
        {renderDarkModeOption('Dark', 'dark')}
      </View>

      {/* Deleted Messages - Android only */}
      {isAndroid && (
        <>
          {renderSectionHeader('Deleted Messages')}
          <View style={[styles.section, {backgroundColor: theme.card}]}>
            <TouchableOpacity
              style={[styles.optionRow, {borderBottomColor: theme.border}]}
              onPress={requestNotification}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionText, {color: theme.text}]}>
                  Notification Access
                </Text>
                <Text
                  style={[styles.optionSubtext, {color: theme.textSecondary}]}>
                  {notificationEnabled ? 'Enabled' : 'Tap to enable'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: notificationEnabled
                      ? theme.success
                      : theme.error,
                  },
                ]}
              />
            </TouchableOpacity>

            <View style={[styles.optionRow, {borderBottomColor: theme.border}]}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionText, {color: theme.text}]}>
                  Auto-Delete Old Messages
                </Text>
                <Text
                  style={[styles.optionSubtext, {color: theme.textSecondary}]}>
                  Remove after {autoDeleteDays} days
                </Text>
              </View>
              <Switch
                value={autoDeleteEnabled}
                onValueChange={toggleAutoDelete}
                trackColor={{false: theme.border, true: theme.accent}}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={[styles.optionRow, {borderBottomColor: theme.border}]}
              onPress={handleExportMessages}>
              <Text style={[styles.optionText, {color: theme.text}]}>
                Export Messages
              </Text>
              <Text style={[styles.chevron, {color: theme.textSecondary}]}>
                {'\u203A'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionRow, {borderBottomWidth: 0}]}
              onPress={handleClearAllMessages}>
              <Text style={[styles.optionText, {color: theme.error}]}>
                Clear All Messages
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* About */}
      {renderSectionHeader('About')}
      <View style={[styles.section, {backgroundColor: theme.card}]}>
        <View style={[styles.optionRow, {borderBottomColor: theme.border}]}>
          <Text style={[styles.optionText, {color: theme.text}]}>
            App Version
          </Text>
          <Text style={[styles.optionValue, {color: theme.textSecondary}]}>
            {APP_VERSION}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.optionRow, {borderBottomColor: theme.border}]}
          onPress={handlePrivacyPolicy}>
          <Text style={[styles.optionText, {color: theme.text}]}>
            Privacy Policy
          </Text>
          <Text style={[styles.chevron, {color: theme.textSecondary}]}>
            {'\u203A'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.optionRow, {borderBottomWidth: 0}]}>
          <Text style={[styles.disclaimer, {color: theme.textSecondary}]}>
            This app is not affiliated with WhatsApp Inc.
          </Text>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  section: {
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: fontSize.lg,
  },
  optionSubtext: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  optionValue: {
    fontSize: fontSize.md,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chevron: {
    fontSize: fontSize.xxl,
    fontWeight: '300',
  },
  disclaimer: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});

export default SettingsScreen;
