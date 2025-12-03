import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface VerificationLevel {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  required: boolean;
  verifiedCount: number;
  totalCount: number;
}

interface VerifiedOnlyModeProps {
  onFilterChange: (filters: VerifiedFilters) => void;
  initialFilters?: VerifiedFilters;
}

export interface VerifiedFilters {
  verifiedOnly: boolean;
  minTrustScore: number;
  identityVerified: boolean;
  videoVerified: boolean;
  voiceVerified: boolean;
  backgroundVerified: boolean;
  highTrustOnly: boolean;
}

export const VerifiedOnlyMode: React.FC<VerifiedOnlyModeProps> = ({
  onFilterChange,
  initialFilters = {
    verifiedOnly: false,
    minTrustScore: 70,
    identityVerified: true,
    videoVerified: false,
    voiceVerified: false,
    backgroundVerified: false,
    highTrustOnly: false,
  },
}) => {
  const [filters, setFilters] = useState<VerifiedFilters>(initialFilters);
  const [verificationLevels, setVerificationLevels] = useState<VerificationLevel[]>([
    {
      id: 'identity',
      name: 'Identity Verified',
      description: 'Government ID + AI selfie verification',
      icon: 'shield-checkmark',
      required: true,
      verifiedCount: 1247,
      totalCount: 2103,
    },
    {
      id: 'video',
      name: 'Video Verification',
      description: 'Live video chat confirmation',
      icon: 'videocam',
      required: false,
      verifiedCount: 823,
      totalCount: 2103,
    },
    {
      id: 'voice',
      name: 'Voice Verification',
      description: 'Voice sample verification',
      icon: 'mic',
      required: false,
      verifiedCount: 456,
      totalCount: 2103,
    },
    {
      id: 'background',
      name: 'Background Check',
      description: 'Criminal record verification',
      icon: 'search',
      required: false,
      verifiedCount: 234,
      totalCount: 2103,
    },
  ]);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const updateFilter = (key: keyof VerifiedFilters, value: boolean | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getVerificationPercentage = (level: VerificationLevel) => {
    return Math.round((level.verifiedCount / level.totalCount) * 100);
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return COLORS.success;
    if (score >= 70) return COLORS.primary;
    if (score >= 50) return COLORS.warning;
    return COLORS.error;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.headerCard}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Verified-Only Mode</Text>
            <Text style={styles.subtitle}>
              Only see profiles that meet your verification standards
            </Text>
          </View>
        </View>

        <View style={styles.mainToggle}>
          <Text style={styles.toggleLabel}>Enable Verified-Only Mode</Text>
          <Switch
            value={filters.verifiedOnly}
            onValueChange={(value) => updateFilter('verifiedOnly', value)}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={filters.verifiedOnly ? COLORS.white : COLORS.textSecondary}
          />
        </View>
      </Card>

      {filters.verifiedOnly && (
        <>
          {/* Minimum Trust Score */}
          <Card style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Ionicons name="star" size={24} color={COLORS.warning} />
              <Text style={styles.filterTitle}>Minimum Trust Score</Text>
            </View>
            <Text style={styles.filterDescription}>
              Only show profiles with trust scores above this threshold
            </Text>
            
            <View style={styles.trustScoreContainer}>
              <View style={styles.trustScoreControls}>
                <TouchableOpacity
                  style={styles.scoreButton}
                  onPress={() => updateFilter('minTrustScore', Math.max(50, filters.minTrustScore - 10))}
                >
                  <Ionicons name="remove" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                
                <View style={styles.scoreDisplay}>
                  <Text style={[
                    styles.scoreValue,
                    { color: getTrustScoreColor(filters.minTrustScore) }
                  ]}>
                    {filters.minTrustScore}
                  </Text>
                  <Text style={styles.scoreLabel}>Trust Score</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.scoreButton}
                  onPress={() => updateFilter('minTrustScore', Math.min(100, filters.minTrustScore + 10))}
                >
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.scoreLevels}>
                <View style={styles.scoreLevel}>
                  <View style={[styles.levelDot, { backgroundColor: COLORS.success }]} />
                  <Text style={styles.levelLabel}>90-100: Elite</Text>
                </View>
                <View style={styles.scoreLevel}>
                  <View style={[styles.levelDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={styles.levelLabel}>70-89: High Trust</Text>
                </View>
                <View style={styles.scoreLevel}>
                  <View style={[styles.levelDot, { backgroundColor: COLORS.warning }]} />
                  <Text style={styles.levelLabel}>50-69: Good</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Verification Requirements */}
          <Card style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.filterTitle}>Verification Requirements</Text>
            </View>
            <Text style={styles.filterDescription}>
              Choose which verification levels are required
            </Text>

            <View style={styles.verificationList}>
              {verificationLevels.map((level) => (
                <View key={level.id} style={styles.verificationItem}>
                  <View style={styles.verificationInfo}>
                    <View style={styles.verificationIcon}>
                      <Ionicons name={level.icon} size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.verificationText}>
                      <View style={styles.verificationHeader}>
                        <Text style={styles.verificationName}>{level.name}</Text>
                        {level.required && (
                          <View style={styles.requiredBadge}>
                            <Text style={styles.requiredText}>Required</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.verificationDesc}>{level.description}</Text>
                      <Text style={styles.verificationStats}>
                        {level.verifiedCount.toLocaleString()} of {level.totalCount.toLocaleString()} users ({getVerificationPercentage(level)}%)
                      </Text>
                    </View>
                  </View>
                  
                  <Switch
                    value={filters[`${level.id}Verified` as keyof VerifiedFilters] as boolean}
                    onValueChange={(value) => 
                      updateFilter(`${level.id}Verified` as keyof VerifiedFilters, value)
                    }
                    disabled={level.required}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor={
                      (filters[`${level.id}Verified` as keyof VerifiedFilters] as boolean) 
                        ? COLORS.white 
                        : COLORS.textSecondary
                    }
                  />
                </View>
              ))}
            </View>
          </Card>

          {/* High Trust Only */}
          <Card style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Ionicons name="trophy" size={24} color={COLORS.warning} />
              <Text style={styles.filterTitle}>Elite Trust Mode</Text>
            </View>
            <Text style={styles.filterDescription}>
              Show only the highest trust users with perfect verification scores
            </Text>

            <View style={styles.eliteMode}>
              <View style={styles.eliteInfo}>
                <Text style={styles.eliteTitle}>Trust Score 95+</Text>
                <Text style={styles.eliteDescription}>
                  These users have passed all verification levels with flying colors
                </Text>
                <Text style={styles.eliteCount}>~156 users available</Text>
              </View>
              
              <Switch
                value={filters.highTrustOnly}
                onValueChange={(value) => updateFilter('highTrustOnly', value)}
                trackColor={{ false: COLORS.border, true: COLORS.warning }}
                thumbColor={filters.highTrustOnly ? COLORS.white : COLORS.textSecondary}
              />
            </View>
          </Card>

          {/* Impact Summary */}
          <Card style={styles.impactCard}>
            <View style={styles.impactHeader}>
              <Ionicons name="analytics" size={24} color={COLORS.primary} />
              <Text style={styles.impactTitle}>Filter Impact</Text>
            </View>
            
            <View style={styles.impactStats}>
              <View style={styles.impactStat}>
                <Text style={styles.impactValue}>~{Math.round(Math.random() * 300 + 200)}</Text>
                <Text style={styles.impactLabel}>Profiles Available</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactValue}>~{Math.round(Math.random() * 50 + 30)}%</Text>
                <Text style={styles.impactLabel}>of Total Users</Text>
              </View>
            </View>

            <View style={styles.impactNote}>
              <Ionicons name="information-circle" size={16} color={COLORS.primary} />
              <Text style={styles.impactNoteText}>
                Stricter filters reduce your match pool but increase quality and safety
              </Text>
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCard: {
    margin: SPACING.lg,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mainToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toggleLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  trustScoreContainer: {
    gap: SPACING.md,
  },
  trustScoreControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  scoreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  scoreDisplay: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scoreLevels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  verificationList: {
    gap: SPACING.md,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  verificationInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  verificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationText: {
    flex: 1,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 2,
  },
  verificationName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  requiredBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  requiredText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '500',
  },
  verificationDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  verificationStats: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  eliteMode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eliteInfo: {
    flex: 1,
  },
  eliteTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  eliteDescription: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  eliteCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  impactCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  impactTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  impactStats: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  impactStat: {
    alignItems: 'center',
  },
  impactValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  impactLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  impactNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  impactNoteText: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});