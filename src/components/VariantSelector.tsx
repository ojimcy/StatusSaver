import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import {ChevronDown} from 'lucide-react-native';
import useSettingsStore from '../store/useSettingsStore';
import useTheme from '../hooks/useTheme';
import {fontSize, spacing, borderRadius} from '../theme/spacing';
import type {WhatsAppVariant} from '../types';

const VARIANT_LABELS: Record<WhatsAppVariant, string> = {
  whatsapp: 'WhatsApp',
  business: 'WA Business',
};

export default function VariantSelector() {
  const {theme} = useTheme();
  const {selectedVariant, setSelectedVariant} = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({x: 0, y: 0, width: 0});
  const buttonRef = useRef<View>(null);

  const handlePress = () => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({x, y: y + height + 4, width});
      setOpen(true);
    });
  };

  const select = (variant: WhatsAppVariant) => {
    setSelectedVariant(variant);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        onPress={handlePress}
        style={[styles.button, {backgroundColor: theme.accent + '22'}]}
        activeOpacity={0.7}>
        <Text style={[styles.label, {color: theme.headerText}]}>
          {VARIANT_LABELS[selectedVariant]}
        </Text>
        <View style={styles.arrow}>
          <ChevronDown size={14} color={theme.headerText} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                top: anchor.y,
                right: spacing.md,
              },
            ]}>
            {(Object.keys(VARIANT_LABELS) as WhatsAppVariant[]).map(variant => (
              <TouchableOpacity
                key={variant}
                style={[
                  styles.option,
                  selectedVariant === variant && {
                    backgroundColor: theme.accent + '22',
                  },
                ]}
                onPress={() => select(variant)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.optionText,
                    {color: theme.text},
                    selectedVariant === variant && {
                      color: theme.accent,
                      fontWeight: '600',
                    },
                  ]}>
                  {VARIANT_LABELS[variant]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  arrow: {
    marginLeft: spacing.xs,
  },
  backdrop: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    minWidth: 150,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  optionText: {
    fontSize: fontSize.md,
  },
});
