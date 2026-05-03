import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, AgeRangeInput } from '../../components/common';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { normalize, MIN_TOUCH_SIZE, HIT_SLOP } from '../../hooks/useResponsive';

interface FilterState {
  ageRange: [number, number];
  currentCity: string;
  additionalCity1: string;
  additionalCity2: string;
  showVerifiedOnly: boolean;
  showWithPhotos: boolean;
  showOnlineOnly: boolean;
  minTrustScore: number;
  personalityTypes: string[];
  interests: string[];
  showMe: 'Men' | 'Women';
}

const FILTER_PREFERENCES_KEY = 'trustmatch_filter_preferences_v1';

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
  const { colors } = useTheme();
  const [filters, setFilters] = useState<FilterState>({
    ageRange: [21, 50],
    currentCity: '',
    additionalCity1: '',
    additionalCity2: '',
    showVerifiedOnly: true,
    showWithPhotos: true,
    showOnlineOnly: false,
    minTrustScore: 70,
    personalityTypes: [],
    interests: [],
    showMe: 'Men',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

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
      ageRange: [18, 50],
      currentCity: '',
      additionalCity1: '',
      additionalCity2: '',
      showVerifiedOnly: false,
      showWithPhotos: false,
      showOnlineOnly: false,
      minTrustScore: 0,
      personalityTypes: [],
      interests: [],
      showMe: 'Men',
    });
    setHasChanges(false);
  };

  // Load current preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [profile, storedFiltersRaw] = await Promise.all([
        api.getProfile(),
        SecureStore.getItemAsync(FILTER_PREFERENCES_KEY),
      ]);
      console.log('Profile data for preferences:', JSON.stringify(profile, null, 2));

      // Parse stored filters first so we can use them for ageRange fallback
      let storedFilters: Partial<FilterState> = {};
      if (storedFiltersRaw) {
        try {
          storedFilters = JSON.parse(storedFiltersRaw) ?? {};
        } catch (parseError) {
          console.warn('Failed to parse saved filters, using defaults:', parseError);
        }
      }

      // Get age range — prefer locally stored (user explicitly set), fall back to API
      const ageMin = storedFilters?.ageRange?.[0] ?? profile.preferences?.ageRangeMin ?? profile.ageRangeMin ?? 18;
      const ageMax = storedFilters?.ageRange?.[1] ?? profile.preferences?.ageRangeMax ?? profile.ageRangeMax ?? 50;

      // Set showMe based on saved preference or user's gender
      let defaultShowMe: 'Men' | 'Women';
      if (profile.preferences?.interestedIn) {
        defaultShowMe = profile.preferences.interestedIn === 'MALE' ? 'Men' : 'Women';
      } else if (profile.gender) {
        defaultShowMe = profile.gender === 'FEMALE' ? 'Men' : 'Women';
      } else {
        defaultShowMe = 'Men';
      }

      const profileInterests = Array.isArray(profile.interests) ? profile.interests : [];

      setFilters(prev => ({
        ...prev,
        ...storedFilters,
        ageRange: [ageMin, ageMax],
        currentCity: storedFilters.currentCity ?? profile.city ?? '',
        additionalCity1: storedFilters.additionalCity1 ?? '',
        additionalCity2: storedFilters.additionalCity2 ?? '',
        showMe: defaultShowMe,
        interests: Array.isArray(storedFilters.interests)
          ? storedFilters.interests
          : profileInterests,
        personalityTypes: Array.isArray(storedFilters.personalityTypes)
          ? storedFilters.personalityTypes
          : [],
      }));

      setHasChanges(false);
      setPreferencesLoaded(true);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setPreferencesLoaded(true);
    }
  };

  const applyFilters = async () => {
    if (!filters.currentCity.trim()) {
      Alert.alert('City Required', 'Please enter your current city to find matches.');
      return;
    }

    try {
      // Derive interestedIn from the user's own gender (set during registration)
      let interestedIn = 'MALE';
      try {
        const profile = await api.getProfile();
        interestedIn = profile.gender === 'FEMALE' ? 'MALE' : 'FEMALE';
      } catch (e) {
        console.warn('Could not fetch user gender for preferences');
      }

      // Save age range and gender preference to server
      await api.updatePreferences({
        ageRangeMin: filters.ageRange[0],
        ageRangeMax: filters.ageRange[1],
        interestedIn,
      });

      // Save current city to profile
      await api.updateProfile({
        city: filters.currentCity.trim(),
        interests: filters.interests,
      });

      // Persist all filter fields locally including ageRange
      await SecureStore.setItemAsync(
        FILTER_PREFERENCES_KEY,
        JSON.stringify({
          ageRange: filters.ageRange,
          currentCity: filters.currentCity.trim(),
          additionalCity1: filters.additionalCity1.trim(),
          additionalCity2: filters.additionalCity2.trim(),
          showVerifiedOnly: filters.showVerifiedOnly,
          showWithPhotos: filters.showWithPhotos,
          showOnlineOnly: filters.showOnlineOnly,
          minTrustScore: filters.minTrustScore,
          personalityTypes: filters.personalityTypes,
          interests: filters.interests,
        })
      );

      console.log('Preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
    setHasChanges(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs' as any);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs' as any)}
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
          
          <View style={[styles.settingRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={[styles.settingLabel, { marginBottom: SPACING.md }]}>Age Range</Text>
            <AgeRangeInput
              minAge={filters.ageRange[0]}
              maxAge={filters.ageRange[1]}
              onMinChange={(val) => updateFilter('ageRange', [val, filters.ageRange[1]])}
              onMaxChange={(val) => updateFilter('ageRange', [filters.ageRange[0], val])}
              minLimit={18}
            />
            <Text style={styles.ageHint}>Minimum age is 18 years</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.locationSection}>
              <Text style={styles.settingLabel}>Location Matching</Text>
              <Text style={styles.locationSubtext}>
                Enter cities you want to match with. Your current city is required.
              </Text>

              <View style={styles.cityInputGroup}>
                <Text style={styles.cityInputLabel}>📍 Your Current City *</Text>
                <TextInput
                  style={styles.cityInput}
                  placeholder="e.g. Harare"
                  value={filters.currentCity}
                  onChangeText={(text) => updateFilter('currentCity', text)}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.cityInputGroup}>
                <Text style={styles.cityInputLabel}>🏙️ Additional City 1</Text>
                <TextInput
                  style={styles.cityInput}
                  placeholder="e.g. Bulawayo"
                  value={filters.additionalCity1}
                  onChangeText={(text) => updateFilter('additionalCity1', text)}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.cityInputGroup}>
                <Text style={styles.cityInputLabel}>🏙️ Additional City 2</Text>
                <TextInput
                  style={styles.cityInput}
                  placeholder="e.g. Mutare"
                  value={filters.additionalCity2}
                  onChangeText={(text) => updateFilter('additionalCity2', text)}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.locationHint}>
                You'll be matched with people in any of these cities.
              </Text>
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
  locationSection: {
    flex: 1,
    paddingVertical: SPACING.md,
  },
  locationSubtext: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  cityInputGroup: {
    marginBottom: SPACING.md,
  },
  cityInputLabel: {
    fontSize: normalize(FONTS.sizes.sm),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cityInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: normalize(FONTS.sizes.md),
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  locationHint: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  ageHint: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
});