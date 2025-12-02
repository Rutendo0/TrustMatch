import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface AntiGhostSystemProps {
  matchName: string;
  daysSinceReply: number;
  onSendNudge: () => void;
  onGracefulExit: () => void;
  onDismiss: () => void;
}

export const AntiGhostSystem: React.FC<AntiGhostSystemProps> = ({
  matchName,
  daysSinceReply,
  onSendNudge,
  onGracefulExit,
  onDismiss,
}) => {
  const getMessage = () => {
    if (daysSinceReply <= 2) {
      return `${matchName} hasn't replied in ${daysSinceReply} day${daysSinceReply > 1 ? 's' : ''}`;
    } else if (daysSinceReply <= 5) {
      return `It's been ${daysSinceReply} days since ${matchName} replied`;
    } else {
      return `No response from ${matchName} for ${daysSinceReply} days`;
    }
  };

  const getSuggestion = () => {
    if (daysSinceReply <= 2) {
      return 'Send a friendly nudge?';
    } else if (daysSinceReply <= 5) {
      return 'Maybe try a different approach?';
    } else {
      return 'Consider a graceful goodbye?';
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="time" size={20} color={COLORS.warning} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.message}>{getMessage()}</Text>
          <Text style={styles.suggestion}>{getSuggestion()}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss}>
          <Ionicons name="close" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        {daysSinceReply <= 3 && (
          <TouchableOpacity style={styles.nudgeButton} onPress={onSendNudge}>
            <Ionicons name="hand-right" size={18} color={COLORS.primary} />
            <Text style={styles.nudgeText}>Send Nudge</Text>
          </TouchableOpacity>
        )}

        {daysSinceReply > 3 && (
          <TouchableOpacity style={styles.exitButton} onPress={onGracefulExit}>
            <Ionicons name="exit" size={18} color={COLORS.textSecondary} />
            <Text style={styles.exitText}>Send Goodbye</Text>
          </TouchableOpacity>
        )}
      </View>

      {daysSinceReply > 7 && (
        <View style={styles.expireWarning}>
          <Ionicons name="alert-circle" size={14} color={COLORS.error} />
          <Text style={styles.expireText}>
            This match will expire in {14 - daysSinceReply} days if no response
          </Text>
        </View>
      )}
    </Card>
  );
};

export const NudgeMessage: React.FC<{ type: 'nudge' | 'goodbye' }> = ({ type }) => {
  const content = type === 'nudge' 
    ? {
        emoji: '👋',
        title: 'Friendly Nudge',
        message: "Hey! Just checking in - would love to hear from you when you get a chance!",
      }
    : {
        emoji: '💫',
        title: 'Graceful Goodbye',
        message: "It seems like we're not connecting at the moment. No hard feelings - wishing you the best in your search!",
      };

  return (
    <View style={styles.nudgeMessageContainer}>
      <View style={[
        styles.nudgeMessageBubble, 
        type === 'goodbye' && styles.goodbyeMessageBubble
      ]}>
        <Text style={styles.nudgeEmoji}>{content.emoji}</Text>
        <Text style={styles.nudgeTitle}>{content.title}</Text>
        <Text style={styles.nudgeContent}>{content.message}</Text>
      </View>
    </View>
  );
};

export const MatchExpiredBanner: React.FC<{
  matchName: string;
  onUnmatch: () => void;
}> = ({ matchName, onUnmatch }) => (
  <View style={styles.expiredBanner}>
    <Ionicons name="hourglass" size={24} color={COLORS.textSecondary} />
    <View style={styles.expiredContent}>
      <Text style={styles.expiredTitle}>Match Expired</Text>
      <Text style={styles.expiredText}>
        Your conversation with {matchName} has expired due to inactivity
      </Text>
    </View>
    <TouchableOpacity style={styles.unmatchButton} onPress={onUnmatch}>
      <Text style={styles.unmatchText}>Remove</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  message: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  suggestion: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  nudgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  nudgeText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exitText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  expireWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.3)',
  },
  expireText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
  },
  nudgeMessageContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  nudgeMessageBubble: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    maxWidth: '80%',
  },
  goodbyeMessageBubble: {
    backgroundColor: COLORS.background,
  },
  nudgeEmoji: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  nudgeTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  nudgeContent: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    margin: SPACING.md,
    gap: SPACING.md,
  },
  expiredContent: {
    flex: 1,
  },
  expiredTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  expiredText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  unmatchButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  unmatchText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    fontWeight: '500',
  },
});
