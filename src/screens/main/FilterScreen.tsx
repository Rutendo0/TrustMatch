import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '../../components/common';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { normalize, MIN_TOUCH_SIZE, HIT_SLOP } from '../../hooks/useResponsive';

interface FilterState {
  ageRange: [number, number];
  maxDistance: number;
  showVerifiedOnly: boolean;
  showWithPhotos: boolean;
  showOnlineOnly: boolean;
  minTrustScore: number;
  personalityTypes: string[];
  interests: string[];
  showMe: 'Men' | 'Women' | 'Everyone';
}

const PERSONALITY_TYPES = [
  { id: 'INTJ', label: 'INTJ' },
  { id: 'INTP', label: 'INTP' },
  { id: 'ENTJ', label: 'ENTJ' },
  { id: 'ENTP', label: 'ENTP' },
  { id: 'INFJ', label: 'INFJ' },
  { id: 'INFP', label: 'INFP' },
  { id: 'ENFJ', label: 'ENFJ' },
  { id: 'ENFP', label: 'ENFP' },
  { id: 'ISTJ', label: 'ISTJ' },
  { id: 'ISFJ', label: 'ISFJ' },
  { id: 'ESTJ', label: 'ESTJ' },
  { id: 'ESFJ', label: 'ESFJ' },
  { id: 'ISTP', label: 'ISTP' },
  { id: 'ISFP', label: 'ISFP' },
  { id: 'ESTP', label: 'ESTP' },
  { id: 'ESFP', label: 'ESFP' },
];

const AVAILABLE_INTERESTS = [
  'Travel', 'Photography', 'Hiking', 'Cooking', 'Music', 'Art',
  'Sports', 'Reading', 'Movies', 'Gaming', 'Fitness', 'Technology',
  'Food', 'Dogs', 'Cats', 'Dancing', 'Yoga', 'Wine', 'Coffee',
  'Shopping', 'Fashion', 'Cars', 'Business', 'Entrepreneurship',
];

export const FilterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [filters, setFilters] = useState<FilterState>({
    ageRange: [24, 35],
    maxDistance: 25,
    showVerifiedOnly: true,
    showWithPhotos: true,
    showOnlineOnly: false,
    minTrustScore: 70,
    personalityTypes: [],
    interests: [],
    showMe: 'Everyone',
  });

  const [hasChanges, setHasChanges] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const togglePersonalityType = (typeId: string) => {
    setFilters(prev => ({
      ...prev,
      personalityTypes: prev.personalityTypes.includes(typeId)
        ? prev.personalityTypes.filter(id => id !== typeId)
        : [...prev.personalityTypes, typeId]
    }));
    setHasChanges(true);
  };

  const toggleInterest = (interest: string) => {
    setFilters(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
    setHasChanges(true);
  };

  const resetFilters = () => {
    setFilters({
      ageRange: [18, 99],
      maxDistance: 100,
      showVerifiedOnly: false,
      showWithPhotos: false,
      showOnlineOnly: false,
      minTrustScore: 0,
      personalityTypes: [],
      interests: [],
      showMe: 'Everyone',
    });
    setHasChanges(false);
  };

  // Load current preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const profile = await api.getProfile();
      if (profile.preferences) {
        setFilters(prev => ({
          ...prev,
          ageRange: [profile.preferences.ageRangeMin || 18, profile.preferences.ageRangeMax || 99],
          maxDistance: profile.preferences.maxDistance || 25,
        }));
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const applyFilters = async () => {
    try {
      // Save preferences to server
      await api.updatePreferences({
        ageRangeMin: filters.ageRange[0],
        ageRangeMax: filters.ageRange[1],
        maxDistance: filters.maxDistance,
        interestedIn: filters.showMe === 'Everyone' ? undefined : filters.showMe,
      });
      console.log('Preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
    setHasChanges(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filters</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetFilters}
          hitSlop={HIT_SLOP}
        >
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Discovery Preferences */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Discovery Preferences</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Show Me</Text>
            <View style={styles.segmentControl}>
              {(['Men', 'Women', 'Everyone'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.segmentButton,
                    filters.showMe === option && styles.segmentButtonActive
                  ]}
                  onPress={() => updateFilter('showMe', option)}
                >
                  <Text style={[
                    styles.segmentText,
                    filters.showMe === option && styles.segmentTextActive
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Age Range</Text>
            <View style={styles.ageRangeContainer}>
              <Text style={styles.ageRangeText}>
                {filters.ageRange[0]} - {filters.ageRange[1]}
              </Text>
              <Slider
                style={styles.ageSlider}
                minimumValue={18}
                maximumValue={99}
                value={filters.ageRange[1]}
                onValueChange={(value: number) => updateFilter('ageRange', [filters.ageRange[0], Math.round(value)])}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
            </View>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Maximum Distance</Text>
            <View style={styles.distanceContainer}>
              <Text style={styles.distanceText}>{filters.maxDistance} km</Text>
              <Slider
                style={styles.distanceSlider}
                minimumValue={1}
                maximumValue={100}
                value={filters.maxDistance}
                onValueChange={(value: number) => updateFilter('maxDistance', Math.round(value))}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
            </View>
          </View>
        </Card>

        {/* Verification Filters */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Verification</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Verified Profiles Only</Text>
            <Switch
              value={filters.showVerifiedOnly}
              onValueChange={(value) => updateFilter('showVerifiedOnly', value)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={filters.showVerifiedOnly ? COLORS.primary : COLORS.textLight}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>With Photos Only</Text>
            <Switch
              value={filters.showWithPhotos}
              onValueChange={(value) => updateFilter('showWithPhotos', value)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={filters.showWithPhotos ? COLORS.primary : COLORS.textLight}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Online Only</Text>
            <Switch
              value={filters.showOnlineOnly}
              onValueChange={(value) => updateFilter('showOnlineOnly', value)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={filters.showOnlineOnly ? COLORS.primary : COLORS.textLight}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Minimum Trust Score</Text>
            <View style={styles.trustScoreContainer}>
              <Text style={styles.trustScoreText}>{filters.minTrustScore}%</Text>
              <Slider
                style={styles.trustScoreSlider}
                minimumValue={0}
                maximumValue={100}
                value={filters.minTrustScore}
                onValueChange={(value: number) => updateFilter('minTrustScore', Math.round(value))}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
            </View>
          </View>
        </Card>

        {/* Personality Types */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personality Types</Text>
          <Text style={styles.sectionSubtitle}>Choose preferred personality types</Text>
          
          <View style={styles.personalityGrid}>
            {PERSONALITY_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.personalityButton,
                  filters.personalityTypes.includes(type.id) && styles.personalityButtonActive
                ]}
                onPress={() => togglePersonalityType(type.id)}
              >
                <Text style={[
                  styles.personalityText,
                  filters.personalityTypes.includes(type.id) && styles.personalityTextActive
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Interests */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <Text style={styles.sectionSubtitle}>Select interests to find compatible matches</Text>
          
          <View style={styles.interestsGrid}>
            {AVAILABLE_INTERESTS.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestButton,
                  filters.interests.includes(interest) && styles.interestButtonActive
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text style={[
                  styles.interestText,
                  filters.interests.includes(interest) && styles.interestTextActive
                ]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.actionBar}>
        <Button
          title="Apply Filters"
          onPress={applyFilters}
          size="large"
          style={styles.applyButton}
          disabled={!hasChanges}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: normalize(FONTS.sizes.xl),
    fontWeight: 'bold',
    color: COLORS.text,
  },
  resetButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  sectionCard: {
    margin: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: normalize(FONTS.sizes.md),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLabel: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.text,
    flex: 1,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: 2,
  },
  segmentButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  ageRangeContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  ageRangeText: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  ageSlider: {
    width: '100%',
  },
  distanceContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  distanceText: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  distanceSlider: {
    width: '100%',
  },
  trustScoreContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  trustScoreText: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  trustScoreSlider: {
    width: '100%',
  },
  personalityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  personalityButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  personalityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  personalityText: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.text,
    fontWeight: '500',
  },
  personalityTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  interestButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  interestButtonActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  interestText: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.text,
    fontWeight: '500',
  },
  interestTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  actionBar: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
  },
  bottomPadding: {
    height: SPACING.xl,
  },
});