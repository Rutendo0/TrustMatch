import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { normalize } from '../../hooks/useResponsive';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
  fullScreen?: boolean;
  style?: any;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = COLORS.primary,
  text,
  overlay = false,
  fullScreen = false,
  style,
}) => {
  const spinner = (
    <View style={[
      styles.container,
      overlay && styles.overlayContainer,
      fullScreen && styles.fullScreen,
      style
    ]}>
      <View style={[
        styles.spinnerContainer,
        overlay && styles.overlaySpinnerContainer
      ]}>
        <ActivityIndicator 
          size={size} 
          color={color}
          style={styles.spinner}
        />
        {text && (
          <Text style={[
            styles.text,
            { color: overlay ? COLORS.white : COLORS.textSecondary }
          ]}>
            {text}
          </Text>
        )}
      </View>
    </View>
  );

  if (overlay) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        {spinner}
      </View>
    );
  }

  return spinner;
};

// Specific loading states for common use cases
export const LoadingOverlay: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <LoadingSpinner 
    text={text}
    overlay={true}
    size="large"
  />
);

export const InlineLoading: React.FC<{ text?: string }> = ({ text }) => (
  <View style={styles.inlineContainer}>
    <ActivityIndicator size="small" color={COLORS.primary} />
    {text && (
      <Text style={styles.inlineText}>{text}</Text>
    )}
  </View>
);

export const ButtonLoading: React.FC = () => (
  <ActivityIndicator 
    size="small" 
    color={COLORS.white}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  overlayContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  spinnerContainer: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  overlaySpinnerContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: 12,
    minWidth: 120,
  },
  spinner: {
    marginBottom: SPACING.sm,
  },
  text: {
    fontSize: normalize(FONTS.sizes.md),
    textAlign: 'center',
    fontWeight: '500',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  inlineText: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
});