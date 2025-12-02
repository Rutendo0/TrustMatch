import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface VerifiedBadgeProps {
  isVerified: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  isVerified,
  size = 'medium',
  showLabel = false,
}) => {
  const iconSizes = {
    small: 14,
    medium: 18,
    large: 24,
  };

  if (!isVerified && !showLabel) return null;

  return (
    <View style={[styles.container, !isVerified && styles.unverified]}>
      <Ionicons
        name={isVerified ? 'checkmark-circle' : 'alert-circle'}
        size={iconSizes[size]}
        color={isVerified ? COLORS.verified : COLORS.unverified}
      />
      {showLabel && (
        <Text
          style={[
            styles.label,
            styles[`${size}Label`],
            !isVerified && styles.unverifiedLabel,
          ]}
        >
          {isVerified ? 'Verified' : 'Unverified'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  unverified: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  label: {
    fontWeight: '600',
    color: COLORS.verified,
  },
  smallLabel: {
    fontSize: FONTS.sizes.xs,
  },
  mediumLabel: {
    fontSize: FONTS.sizes.sm,
  },
  largeLabel: {
    fontSize: FONTS.sizes.md,
  },
  unverifiedLabel: {
    color: COLORS.unverified,
  },
});
