import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { normalize } from '../../hooks/useResponsive';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: {
    title: string;
    onPress: () => void;
  };
  secondaryAction?: {
    title: string;
    onPress: () => void;
  };
  iconSize?: number;
  style?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'heart-outline',
  title,
  subtitle,
  action,
  secondaryAction,
  iconSize = 80,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={icon} 
          size={normalize(iconSize)} 
          color={COLORS.textLight} 
        />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      
      {(action || secondaryAction) && (
        <View style={styles.actionsContainer}>
          {action && (
            <Button
              title={action.title}
              onPress={action.onPress}
              size="medium"
              style={styles.primaryAction}
            />
          )}
          {secondaryAction && (
            <TouchableOpacity 
              style={styles.secondaryAction}
              onPress={secondaryAction.onPress}
              accessibilityLabel={secondaryAction.title}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryActionText}>
                {secondaryAction.title}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// Predefined empty states for common scenarios
export const NoMatchesEmpty: React.FC = () => (
  <EmptyState
    icon="heart-dislike-outline"
    title="No matches yet"
    subtitle="Keep swiping to find your perfect match!"
    action={{
      title: "Discover People",
      onPress: () => {
        // Navigate to home/discover screen
      }
    }}
  />
);

export const NoMessagesEmpty: React.FC = () => (
  <EmptyState
    icon="chatbubbles-outline"
    title="No conversations yet"
    subtitle="Start matching to begin meaningful conversations"
    action={{
      title: "Find Matches",
      onPress: () => {
        // Navigate to home/discover screen
      }
    }}
  />
);

export const NoLikesEmpty: React.FC = () => (
  <EmptyState
    icon="heart-outline"
    title="No likes yet"
    subtitle="When someone likes you, they'll appear here"
    action={{
      title: "Start Swiping",
      onPress: () => {
        // Navigate to home/discover screen
      }
    }}
  />
);

export const NoProfileViewsEmpty: React.FC = () => (
  <EmptyState
    icon="eye-outline"
    title="No profile views"
    subtitle="Complete your profile to attract more attention"
    action={{
      title: "Complete Profile",
      onPress: () => {
        // Navigate to profile screen
      }
    }}
    secondaryAction={{
      title: "Improve Photos",
      onPress: () => {
        // Navigate to photo editing
      }
    }}
  />
);

export const NetworkErrorEmpty: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon="wifi-outline"
    title="Connection problem"
    subtitle="Check your internet connection and try again"
    action={
      onRetry ? {
        title: "Try Again",
        onPress: onRetry
      } : undefined
    }
  />
);

export const SearchEmptyState: React.FC<{ query: string; onClear: () => void }> = ({
  query,
  onClear,
}) => (
  <EmptyState
    icon="search-outline"
    title="No results found"
    subtitle={`No matches found for "${query}"`}
    action={{
      title: "Clear Search",
      onPress: onClear
    }}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
    opacity: 0.6,
  },
  title: {
    fontSize: normalize(FONTS.sizes.xl),
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: normalize(22),
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  actionsContainer: {
    gap: SPACING.md,
    alignItems: 'center',
  },
  primaryAction: {
    minWidth: normalize(160),
  },
  secondaryAction: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minHeight: normalize(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.primary,
    fontWeight: '500',
  },
});