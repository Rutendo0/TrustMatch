import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { normalize, MIN_TOUCH_SIZE } from '../../hooks/useResponsive';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  maxLength?: number;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  icon,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  style,
  accessibilityLabel,
  accessibilityHint,
  maxLength,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focused,
          error && styles.error,
          disabled && styles.disabled,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={normalize(20)}
            color={isFocused ? COLORS.primary : COLORS.textSecondary}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, multiline && styles.multiline]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          maxLength={maxLength}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={normalize(20)}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: normalize(SPACING.md),
  },
  label: {
    fontSize: normalize(FONTS.sizes.sm),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: normalize(SPACING.xs),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: normalize(SPACING.md),
    minHeight: MIN_TOUCH_SIZE,
  },
  focused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  error: {
    borderColor: COLORS.error,
  },
  disabled: {
    backgroundColor: COLORS.background,
    opacity: 0.7,
  },
  icon: {
    marginRight: normalize(SPACING.sm),
  },
  input: {
    flex: 1,
    paddingVertical: normalize(SPACING.md),
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.text,
    minHeight: MIN_TOUCH_SIZE,
  },
  multiline: {
    minHeight: normalize(100),
    textAlignVertical: 'top',
  },
  eyeIcon: {
    padding: normalize(SPACING.xs),
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.error,
    marginTop: normalize(SPACING.xs),
  },
});
