import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { TrustScore } from '../../types/advanced';

interface TrustScoreBadgeProps {
  trustScore: TrustScore;
  compact?: boolean;
  onPress?: () => void;
}

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({
  trustScore,
  compact = false,
  onPress,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const levelConfig = {
    basic: {
      color: COLORS.textSecondary,
      icon: 'shield-outline' as const,
      label: 'Basic',
      description: 'Email verified only',
    },
    verified: {
      color: '#3B82F6',
      icon: 'shield-checkmark' as const,
      label: 'Verified',
      description: 'ID & Selfie verified',
    },
    trusted: {
      color: COLORS.success,
      icon: 'shield' as const,
      label: 'Trusted',
      description: 'Full verification + good behavior',
    },
    premium: {
      color: '#8B5CF6',
      icon: 'diamond' as const,
      label: 'Premium Trust',
      description: 'Highest trust level',
    },
  };

  const config = levelConfig[trustScore.level];

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactBadge, { borderColor: config.color }]}
        onPress={() => setShowDetails(true)}
      >
        <Ionicons name={config.icon} size={14} color={config.color} />
        <Text style={[styles.compactText, { color: config.color }]}>
          {trustScore.score}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity onPress={() => setShowDetails(true)}>
        <Card style={[styles.badge, { borderColor: config.color }]}>
          <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>
          <View style={styles.content}>
            <Text style={[styles.label, { color: config.color }]}>
              {config.label}
            </Text>
            <Text style={styles.score}>Trust Score: {trustScore.score}/100</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </Card>
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trust Score Details</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.scoreHeader}>
              <View style={[styles.largeIcon, { backgroundColor: `${config.color}20` }]}>
                <Ionicons name={config.icon} size={40} color={config.color} />
              </View>
              <Text style={[styles.levelLabel, { color: config.color }]}>
                {config.label}
              </Text>
              <Text style={styles.levelDescription}>{config.description}</Text>
              <View style={styles.scoreDisplay}>
                <Text style={[styles.scoreNumber, { color: config.color }]}>
                  {trustScore.score}
                </Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
            </View>

            <View style={styles.factorsList}>
              <Text style={styles.sectionTitle}>Verification Factors</Text>
              
              <FactorItem
                label="ID Verified"
                verified={trustScore.factors.idVerified}
              />
              <FactorItem
                label="Selfie Verified"
                verified={trustScore.factors.selfieVerified}
              />
              <FactorItem
                label="Liveness Check"
                verified={trustScore.factors.livenessVerified}
              />
              <FactorItem
                label="Voice Verified"
                verified={trustScore.factors.voiceVerified}
              />
              <FactorItem
                label="Phone Verified"
                verified={trustScore.factors.phoneVerified}
              />
              <FactorItem
                label="Email Verified"
                verified={trustScore.factors.emailVerified}
              />

              <View style={styles.divider} />

              <View style={styles.behaviorScore}>
                <Text style={styles.behaviorLabel}>Behavior Score</Text>
                <View style={styles.behaviorBar}>
                  <View
                    style={[
                      styles.behaviorFill,
                      { width: `${trustScore.factors.behaviorScore}%` },
                    ]}
                  />
                </View>
                <Text style={styles.behaviorValue}>
                  {trustScore.factors.behaviorScore}%
                </Text>
              </View>

              <View style={styles.accountAge}>
                <Text style={styles.accountAgeLabel}>Account Age</Text>
                <Text style={styles.accountAgeValue}>
                  {trustScore.factors.accountAge} days
                </Text>
              </View>
            </View>

            {trustScore.badges.length > 0 && (
              <View style={styles.badgesSection}>
                <Text style={styles.sectionTitle}>Earned Badges</Text>
                <View style={styles.badgesList}>
                  {trustScore.badges.map((badge, index) => (
                    <View key={index} style={styles.earnedBadge}>
                      <Ionicons name="ribbon" size={16} color={COLORS.primary} />
                      <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const FactorItem: React.FC<{ label: string; verified: boolean }> = ({
  label,
  verified,
}) => (
  <View style={styles.factorItem}>
    <Ionicons
      name={verified ? 'checkmark-circle' : 'close-circle'}
      size={20}
      color={verified ? COLORS.success : COLORS.textLight}
    />
    <Text style={[styles.factorLabel, !verified && styles.factorLabelUnverified]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    backgroundColor: COLORS.white,
  },
  compactText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  score: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: SPACING.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scoreHeader: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  largeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  levelLabel: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  levelDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: SPACING.md,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: FONTS.sizes.xl,
    color: COLORS.textSecondary,
  },
  factorsList: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  factorLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  factorLabelUnverified: {
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  behaviorScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  behaviorLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    width: 120,
  },
  behaviorBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  behaviorFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  behaviorValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.success,
    width: 40,
    textAlign: 'right',
  },
  accountAge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountAgeLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  accountAgeValue: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  badgesSection: {
    paddingHorizontal: SPACING.lg,
  },
  badgesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
