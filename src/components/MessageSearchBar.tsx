import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {Search, X} from 'lucide-react-native';
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
        <View style={styles.searchIcon}>
          <Search size={18} color={theme.textSecondary} />
        </View>
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
            <X size={16} color={theme.textSecondary} />
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
});

export default MessageSearchBar;
