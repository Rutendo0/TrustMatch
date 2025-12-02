import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Button, Card } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { Dealbreakers } from '../../types/advanced';

type DealbreakersScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const DealbreakersScreen: React.FC<DealbreakersScreenProps> = ({
  navigation,
}) => {
  const [dealbreakers, setDealbreakers] = useState<Dealbreakers>({
    userId: 'current-user',
    smoking: 'any',
    drinking: 'any',
    religion: [],
    wantsKids: 'any',
    hasKids: 'any',
    maxDistance: 50,
    minAge: 18,
    maxAge: 50,
    education: [],
    dealbreakersStrict: false,
  });

  const smokingOptions = [
    { value: 'never', label: 'Never', icon: '🚭' },
    { value: 'sometimes', label: 'Sometimes', icon: '🚬' },
    { value: 'often', label: 'Often', icon: '💨' },
    { value: 'any', label: 'Any', icon: '✓' },
  ];

  const drinkingOptions = [
    { value: 'never', label: 'Never', icon: '🚫' },
    { value: 'social', label: 'Socially', icon: '🍷' },
    { value: 'regular', label: 'Regularly', icon: '🍺' },
    { value: 'any', label: 'Any', icon: '✓' },
  ];

  const kidsOptions = [
    { value: 'yes', label: 'Yes', icon: '👶' },
    { value: 'no', label: 'No', icon: '🚫' },
    { value: 'maybe', label: 'Maybe', icon: '🤔' },
    { value: 'any', label: 'Any', icon: '✓' },
  ];

  const hasKidsOptions = [
    { value: 'yes', label: 'Has kids', icon: '👨‍👧' },
    { value: 'no', label: 'No kids', icon: '👤' },
    { value: 'any', label: 'Any', icon: '✓' },
  ];

  const religions = [
    'Christian',
    'Catholic',
    'Jewish',
    'Muslim',
    'Hindu',
    'Buddhist',
    'Atheist',
    'Agnostic',
    'Spiritual',
    'Other',
  ];

  const educationLevels = [
    'High School',
    'Some College',
    "Bachelor's",
    "Master's",
    'PhD',
    'Trade School',
  ];

  const updateDealbreaker = (key: keyof Dealbreakers, value: any) => {
    setDealbreakers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'religion' | 'education', item: string) => {
    setDealbreakers((prev) => {
      const array = prev[key];
      if (array.includes(item)) {
        return { ...prev, [key]: array.filter((i) => i !== item) };
      } else {
        return { ...prev, [key]: [...array, item] };
      }
    });
  };

  const handleSave = () => {
    console.log('Saving dealbreakers:', dealbreakers);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dealbreakers</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Set your non-negotiables. Profiles that don't match these criteria will
          be hidden from your feed.
        </Text>

        <Card style={styles.strictCard}>
          <View style={styles.strictRow}>
            <View style={styles.strictInfo}>
              <Text style={styles.strictTitle}>Strict Mode</Text>
              <Text style={styles.strictDescription}>
                Only show profiles that match ALL your dealbreakers
              </Text>
            </View>
            <Switch
              value={dealbreakers.dealbreakersStrict}
              onValueChange={(value) =>
                updateDealbreaker('dealbreakersStrict', value)
              }
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={
                dealbreakers.dealbreakersStrict ? COLORS.primary : COLORS.textLight
              }
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Age Range</Text>
          <View style={styles.ageRangeContainer}>
            <Text style={styles.ageValue}>{dealbreakers.minAge}</Text>
            <Text style={styles.ageSeparator}>to</Text>
            <Text style={styles.ageValue}>{dealbreakers.maxAge}</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Min Age</Text>
            <Slider
              style={styles.slider}
              minimumValue={18}
              maximumValue={dealbreakers.maxAge - 1}
              value={dealbreakers.minAge}
              onValueChange={(value) =>
                updateDealbreaker('minAge', Math.round(value))
              }
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
          </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Max Age</Text>
            <Slider
              style={styles.slider}
              minimumValue={dealbreakers.minAge + 1}
              maximumValue={100}
              value={dealbreakers.maxAge}
              onValueChange={(value) =>
                updateDealbreaker('maxAge', Math.round(value))
              }
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Maximum Distance</Text>
          <View style={styles.distanceContainer}>
            <Text style={styles.distanceValue}>{dealbreakers.maxDistance} km</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={200}
            value={dealbreakers.maxDistance}
            onValueChange={(value) =>
              updateDealbreaker('maxDistance', Math.round(value))
            }
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.primary}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Smoking</Text>
          <View style={styles.optionsGrid}>
            {smokingOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  dealbreakers.smoking === option.value &&
                    styles.optionButtonSelected,
                ]}
                onPress={() => updateDealbreaker('smoking', option.value)}
              >
                <Text style={styles.optionEmoji}>{option.icon}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    dealbreakers.smoking === option.value &&
                      styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Drinking</Text>
          <View style={styles.optionsGrid}>
            {drinkingOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  dealbreakers.drinking === option.value &&
                    styles.optionButtonSelected,
                ]}
                onPress={() => updateDealbreaker('drinking', option.value)}
              >
                <Text style={styles.optionEmoji}>{option.icon}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    dealbreakers.drinking === option.value &&
                      styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Wants Kids</Text>
          <View style={styles.optionsGrid}>
            {kidsOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  dealbreakers.wantsKids === option.value &&
                    styles.optionButtonSelected,
                ]}
                onPress={() => updateDealbreaker('wantsKids', option.value)}
              >
                <Text style={styles.optionEmoji}>{option.icon}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    dealbreakers.wantsKids === option.value &&
                      styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Has Kids</Text>
          <View style={styles.optionsGrid}>
            {hasKidsOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  dealbreakers.hasKids === option.value &&
                    styles.optionButtonSelected,
                ]}
                onPress={() => updateDealbreaker('hasKids', option.value)}
              >
                <Text style={styles.optionEmoji}>{option.icon}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    dealbreakers.hasKids === option.value &&
                      styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Religion (Select acceptable)</Text>
          <View style={styles.tagsContainer}>
            {religions.map((religion) => (
              <TouchableOpacity
                key={religion}
                style={[
                  styles.tag,
                  dealbreakers.religion.includes(religion) && styles.tagSelected,
                ]}
                onPress={() => toggleArrayItem('religion', religion)}
              >
                <Text
                  style={[
                    styles.tagText,
                    dealbreakers.religion.includes(religion) &&
                      styles.tagTextSelected,
                  ]}
                >
                  {religion}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {dealbreakers.religion.length === 0 && (
            <Text style={styles.noSelectionHint}>
              No selection means any religion is acceptable
            </Text>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Education (Select acceptable)</Text>
          <View style={styles.tagsContainer}>
            {educationLevels.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.tag,
                  dealbreakers.education.includes(level) && styles.tagSelected,
                ]}
                onPress={() => toggleArrayItem('education', level)}
              >
                <Text
                  style={[
                    styles.tagText,
                    dealbreakers.education.includes(level) &&
                      styles.tagTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Button
          title="Save Dealbreakers"
          onPress={handleSave}
          size="large"
          style={styles.saveButton}
        />
      </ScrollView>
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
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  description: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  strictCard: {
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  strictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strictInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  strictTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  strictDescription: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  ageRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  ageValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  ageSeparator: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.md,
  },
  sliderContainer: {
    marginBottom: SPACING.sm,
  },
  sliderLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  distanceContainer: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  distanceValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionButton: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  tagSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  tagTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  noSelectionHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  saveButton: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
});
