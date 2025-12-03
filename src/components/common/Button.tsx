import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { normalize, MIN_TOUCH_SIZE } from '../../hooks/useResponsive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
}) => {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.white : COLORS.primary}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    gap: normalize(SPACING.sm),
    minHeight: MIN_TOUCH_SIZE,
  },
  primary: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.medium,
  },
  secondary: {
    backgroundColor: COLORS.background,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  smallSize: {
    paddingVertical: normalize(SPACING.sm),
    paddingHorizontal: normalize(SPACING.md),
    minHeight: MIN_TOUCH_SIZE,
  },
  mediumSize: {
    paddingVertical: normalize(SPACING.md),
    paddingHorizontal: normalize(SPACING.lg),
    minHeight: MIN_TOUCH_SIZE,
  },
  largeSize: {
    paddingVertical: normalize(SPACING.lg),
    paddingHorizontal: normalize(SPACING.xl),
    minHeight: MIN_TOUCH_SIZE + 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  primaryText: {
    color: COLORS.white,
  },
  secondaryText: {
    color: COLORS.primary,
  },
  outlineText: {
    color: COLORS.primary,
  },
  ghostText: {
    color: COLORS.primary,
  },
  smallText: {
    fontSize: normalize(FONTS.sizes.sm),
  },
  mediumText: {
    fontSize: normalize(FONTS.sizes.md),
  },
  largeText: {
    fontSize: normalize(FONTS.sizes.lg),
  },
  disabledText: {
    opacity: 0.7,
  },
});
