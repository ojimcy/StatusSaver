import React, {useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import {ChevronRight} from 'lucide-react-native';
import useSettingsStore from '../store/useSettingsStore';
import useTheme from '../hooks/useTheme';
import {spacing, fontSize, borderRadius} from '../theme/spacing';

const APP_VERSION = '1.0.0';

const SettingsScreen: React.FC = () => {
  const {theme} = useTheme();
  const {
    darkMode,
    setDarkMode,
  } = useSettingsStore();

  const handleDarkModeChange = useCallback(
    (mode: 'system' | 'light' | 'dark') => {
      setDarkMode(mode);
    },
    [setDarkMode],
  );

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL('https://ojimcy.github.io/statusvault-legal/privacy-policy.html');
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
          <ChevronRight size={20} color={theme.textSecondary} />
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
  optionText: {
    fontSize: fontSize.lg,
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
