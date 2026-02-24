import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import useTheme from '../hooks/useTheme';
import {spacing, fontSize, borderRadius} from '../theme/spacing';

interface MessageSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const MessageSearchBar: React.FC<MessageSearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search messages...',
}) => {
  const {theme} = useTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.surface}]}>
      <View
        style={[
          styles.inputContainer,
          {backgroundColor: theme.card, borderColor: theme.border},
        ]}>
        <Text style={[styles.searchIcon, {color: theme.textSecondary}]}>
          {'\u2315'}
        </Text>
        <TextInput
          style={[styles.input, {color: theme.text}]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onChangeText('')}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={[styles.clearIcon, {color: theme.textSecondary}]}>
              {'\u2715'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  searchIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  clearIcon: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});

export default MessageSearchBar;
