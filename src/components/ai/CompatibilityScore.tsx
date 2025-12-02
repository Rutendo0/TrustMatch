import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface CompatibilityScoreProps {
  overallScore: number;
  breakdown: {
    personality: number;
    interests: number;
    values: number;
    lifestyle: number;
    communication: number;
  };
  highlights: string[];
  challenges?: string[];
  compact?: boolean;
}

export const CompatibilityScore: React.FC<CompatibilityScoreProps> = ({
  overallScore,
  breakdown,
  highlights,
  challenges,
  compact = false,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return '#3B82F6';
    if (score >= 40) return '#F59E0B';
    return COLORS.error;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Perfect Match!';
    if (score >= 80) return 'Great Match';
    if (score >= 70) return 'Good Match';
    if (score >= 60) return 'Potential Match';
    return 'Low Compatibility';
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.compactScore, { borderColor: getScoreColor(overallScore) }]}>
          <Ionicons name="heart" size={12} color={getScoreColor(overallScore)} />
          <Text style={[styles.compactScoreText, { color: getScoreColor(overallScore) }]}>
            {overallScore}%
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreValue, { color: getScoreColor(overallScore) }]}>
            {overallScore}%
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.scoreLabel, { color: getScoreColor(overallScore) }]}>
            {getScoreLabel(overallScore)}
          </Text>
          <Text style={styles.subtitle}>AI-calculated compatibility</Text>
        </View>
        <Ionicons name="sparkles" size={24} color={COLORS.primary} />
      </View>

      <View style={styles.breakdownContainer}>
        <Text style={styles.sectionTitle}>Compatibility Breakdown</Text>
        
        {Object.entries(breakdown).map(([key, value]) => (
          <View key={key} style={styles.breakdownItem}>
            <View style={styles.breakdownLabel}>
              <Ionicons
                name={
                  key === 'personality' ? 'person' :
                  key === 'interests' ? 'heart' :
                  key === 'values' ? 'star' :
                  key === 'lifestyle' ? 'sunny' :
                  'chatbubble'
                }
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.breakdownText}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${value}%`,
                      backgroundColor: getScoreColor(value),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.breakdownValue, { color: getScoreColor(value) }]}>
                {value}%
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.highlightsContainer}>
        <Text style={styles.sectionTitle}>Why You'd Match</Text>
        {highlights.map((highlight, index) => (
          <View key={index} style={styles.highlightItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.highlightText}>{highlight}</Text>
          </View>
        ))}
      </View>

      {challenges && challenges.length > 0 && (
        <View style={styles.challengesContainer}>
          <Text style={styles.sectionTitle}>Potential Challenges</Text>
          {challenges.map((challenge, index) => (
            <View key={index} style={styles.challengeItem}>
              <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
              <Text style={styles.challengeText}>{challenge}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  compactContainer: {
    alignItems: 'center',
  },
  compactScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    backgroundColor: COLORS.white,
  },
  compactScoreText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  headerText: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  breakdownContainer: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    width: 120,
  },
  breakdownText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownValue: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  highlightsContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  highlightText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  challengesContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  challengeText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
});
