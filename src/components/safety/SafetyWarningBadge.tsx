import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface SafetyWarningBadgeProps {
  type: 'warning' | 'caution' | 'info';
  message: string;
  reportCount?: number;
  onPress?: () => void;
}

export const SafetyWarningBadge: React.FC<SafetyWarningBadgeProps> = ({
  type,
  message,
  reportCount,
  onPress,
}) => {
  const config = {
    warning: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: COLORS.error,
      iconColor: COLORS.error,
      icon: 'warning' as const,
    },
    caution: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: '#F59E0B',
      iconColor: '#F59E0B',
      icon: 'alert-circle' as const,
    },
    info: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: '#3B82F6',
      iconColor: '#3B82F6',
      icon: 'information-circle' as const,
    },
  };

  const { backgroundColor, borderColor, iconColor, icon } = config[type];

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor, borderColor }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
      <View style={styles.content}>
        <Text style={[styles.message, { color: iconColor }]}>{message}</Text>
        {reportCount !== undefined && reportCount > 0 && (
          <Text style={styles.reportCount}>
            {reportCount} report{reportCount > 1 ? 's' : ''}
          </Text>
        )}
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={iconColor} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  reportCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
