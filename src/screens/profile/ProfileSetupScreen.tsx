import React, { useState } from 'react';
import { api } from '../../services/api';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type ProfileSetupScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

interface Interest {
  id: string;
  name: string;
  icon: string;
  category: 'hobby' | 'music' | 'sports' | 'food' | 'travel' | 'art' | 'fitness' | 'technology' | 'other';
  isCustom?: boolean;
}

const AVAILABLE_INTERESTS: Interest[] = [
  // Hobbies
  { id: '1', name: 'Photography', icon: 'camera', category: 'hobby' },
  { id: '2', name: 'Reading', icon: 'book', category: 'hobby' },
  { id: '3', name: 'Cooking', icon: 'restaurant', category: 'food' },
  { id: '4', name: 'Gardening', icon: 'leaf', category: 'hobby' },
  { id: '5', name: 'Painting', icon: 'color-palette', category: 'art' },
  { id: '6', name: 'Writing', icon: 'pencil', category: 'art' },
  
  // Music
  { id: '7', name: 'Rock Music', icon: 'musical-notes', category: 'music' },
  { id: '8', name: 'Pop Music', icon: 'radio', category: 'music' },
  { id: '9', name: 'Jazz', icon: 'musical-note', category: 'music' },
  { id: '10', name: 'Classical', icon: 'headset', category: 'music' },
  
  // Sports
  { id: '11', name: 'Football', icon: 'football', category: 'sports' },
  { id: '12', name: 'Basketball', icon: 'basketball', category: 'sports' },
  { id: '13', name: 'Tennis', icon: 'tennisball', category: 'sports' },
  { id: '14', name: 'Swimming', icon: 'water', category: 'fitness' },
  
  // Fitness
  { id: '15', name: 'Gym', icon: 'fitness', category: 'fitness' },
  { id: '16', name: 'Yoga', icon: 'happy', category: 'fitness' },
  { id: '17', name: 'Running', icon: 'walk', category: 'fitness' },
  { id: '18', name: 'Hiking', icon: 'trail-sign', category: 'fitness' },
  
  // Food
  { id: '19', name: 'Italian', icon: 'pizza', category: 'food' },
  { id: '20', name: 'Asian', icon: 'restaurant', category: 'food' },
  { id: '21', name: 'Mexican', icon: 'nutrition', category: 'food' },
  { id: '22', name: 'Desserts', icon: 'ice-cream', category: 'food' },
  
  // Travel
  { id: '23', name: 'Beach', icon: 'umbrella', category: 'travel' },
  { id: '24', name: 'Mountains', icon: 'trail-sign', category: 'travel' },
  { id: '25', name: 'City Breaks', icon: 'business', category: 'travel' },
  { id: '26', name: 'Adventure', icon: 'compass', category: 'travel' },
  
  // Technology
  { id: '27', name: 'Gaming', icon: 'game-controller', category: 'technology' },
  { id: '28', name: 'Coding', icon: 'code', category: 'technology' },
  { id: '29', name: 'AI & Tech', icon: 'hardware-chip', category: 'technology' },
  { id: '30', name: 'Social Media', icon: 'share-social', category: 'technology' },
  
  // Other - Custom
  { id: 'other', name: 'Other', icon: 'add-circle', category: 'other', isCustom: true },
];

const CATEGORIES = [
  { key: 'hobby', label: 'Hobbies', icon: 'heart' },
  { key: 'music', label: 'Music', icon: 'musical-notes' },
  { key: 'sports', label: 'Sports', icon: 'football' },
  { key: 'fitness', label: 'Fitness', icon: 'fitness' },
  { key: 'food', label: 'Food', icon: 'restaurant' },
  { key: 'travel', label: 'Travel', icon: 'airplane' },
  { key: 'art', label: 'Arts', icon: 'color-palette' },
  { key: 'technology', label: 'Technology', icon: 'hardware-chip' },
  { key: 'other', label: 'Other', icon: 'add-circle' },
];

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  navigation,
  route,
}) => {
  const { formData } = route.params as { formData: any };
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInterestText, setCustomInterestText] = useState('');
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('');
  const [education, setEducation] = useState('');
  const [relationshipGoal, setRelationshipGoal] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  const steps = ['About You', 'Interests & Hobbies', 'Lifestyle', 'Goals & Values'];

  const toggleInterest = (interestId: string, interestName?: string) => {
    // Handle custom interest "Other" button
    if (interestId === 'other') {
      setShowCustomInput(true);
      return;
    }
    
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      } else if (prev.length < 12) {
        return [...prev, interestId];
      } else {
        Alert.alert('Maximum Reached', 'You can select up to 12 interests.');
        return prev;
      }
    });
  };

  const addCustomInterest = () => {
    if (customInterestText.trim() && selectedInterests.length < 12) {
      const newInterest = customInterestText.trim();
      setCustomInterests(prev => [...prev, newInterest]);
      setSelectedInterests(prev => [...prev, `custom_${newInterest}`]);
      setCustomInterestText('');
      setShowCustomInput(false);
    } else if (selectedInterests.length >= 12) {
      Alert.alert('Maximum Reached', 'You can select up to 12 interests.');
    }
  };

  const removeCustomInterest = (interest: string) => {
    setCustomInterests(prev => prev.filter(i => i !== interest));
    setSelectedInterests(prev => prev.filter(id => id !== `custom_${interest}`));
  };

  const getFilteredInterests = (category: string) => {
    return AVAILABLE_INTERESTS.filter(interest => interest.category === category);
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Combine regular and custom interests
      const allInterests = [...selectedInterests, ...customInterests];
      
      // Save profile data to server
      try {
        await api.updateProfile({
          bio,
          occupation,
          education,
          relationshipGoal,
          aboutMe,
          interests: allInterests,
        });
        
        console.log('Profile saved successfully');
        Alert.alert('Success', 'Your profile has been saved!');
      } catch (error: any) {
        console.error('Failed to save profile:', error);
        // Show user-friendly error message
        const errorMessage = error?.response?.data?.error || 'Failed to save profile. Please try again.';
        Alert.alert('Save Error', errorMessage);
      }
      
      // Complete setup - navigate to main tabs
      navigation.navigate('MainTabs', {
        profileData: {
          ...formData,
          interests: allInterests,
          customInterests: customInterests,
          bio,
          occupation,
          education,
          relationshipGoal,
          aboutMe,
        }
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return bio.length > 0 && occupation.length > 0;
      case 1:
        return selectedInterests.length >= 3;
      case 2:
        return education.length > 0;
      case 3:
        return relationshipGoal.length > 0;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Tell Us About Yourself</Text>
            <Text style={styles.stepSubtitle}>Share your story and what makes you unique</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={styles.bioInput}
                placeholder="Write a brief bio about yourself..."
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={200}
              />
              <Text style={styles.charCount}>{bio.length}/200</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Occupation</Text>
              <TextInput
                style={styles.textInput}
                placeholder="What do you do for work?"
                value={occupation}
                onChangeText={setOccupation}
              />
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What Are Your Interests?</Text>
            <Text style={styles.stepSubtitle}>Select 3-12 interests to help us find compatible matches</Text>
            
            <View style={styles.interestsContainer}>
              {CATEGORIES.map((category) => (
                <View key={category.key} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>
                    <Ionicons name={category.icon as any} size={16} color={COLORS.primary} /> {category.label}
                  </Text>
                  <View style={styles.interestsGrid}>
                    {getFilteredInterests(category.key).map((interest) => (
                      <TouchableOpacity
                        key={interest.id}
                        style={[
                          styles.interestChip,
                          selectedInterests.includes(interest.id) && styles.interestChipSelected
                        ]}
                        onPress={() => toggleInterest(interest.id, interest.name)}
                      >
                        <Ionicons 
                          name={interest.icon as any} 
                          size={16} 
                          color={selectedInterests.includes(interest.id) ? COLORS.white : COLORS.primary} 
                        />
                        <Text style={[
                          styles.interestText,
                          selectedInterests.includes(interest.id) && styles.interestTextSelected
                        ]}>
                          {interest.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Custom Interests Input */}
            {showCustomInput && (
              <View style={styles.customInterestContainer}>
                <TextInput
                  style={styles.customInterestInput}
                  placeholder="Enter your interest..."
                  value={customInterestText}
                  onChangeText={setCustomInterestText}
                  onSubmitEditing={addCustomInterest}
                />
                <TouchableOpacity 
                  style={styles.customInterestButton}
                  onPress={addCustomInterest}
                >
                  <Text style={styles.customInterestButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Show Custom Interests */}
            {customInterests.length > 0 && (
              <View style={styles.customInterestsDisplay}>
                <Text style={styles.customInterestsLabel}>Your custom interests:</Text>
                <View style={styles.customInterestsList}>
                  {customInterests.map((interest, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.customInterestChip}
                      onPress={() => removeCustomInterest(interest)}
                    >
                      <Text style={styles.customInterestChipText}>{interest}</Text>
                      <Ionicons name="close-circle" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            <Text style={styles.interestsCount}>
              {selectedInterests.length}/12 interests selected
            </Text>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Lifestyle</Text>
            <Text style={styles.stepSubtitle}>Help others get to know your lifestyle preferences</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Education</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Your education background"
                value={education}
                onChangeText={setEducation}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>About Me</Text>
              <TextInput
                style={styles.bioInput}
                placeholder="Tell us more about your personality and lifestyle..."
                value={aboutMe}
                onChangeText={setAboutMe}
                multiline
                maxLength={300}
              />
              <Text style={styles.charCount}>{aboutMe.length}/300</Text>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Goals & Values</Text>
            <Text style={styles.stepSubtitle}>What are you looking for in a relationship?</Text>
            
            <View style={styles.goalOptions}>
              {[
                'Serious relationship',
                'Marriage',
                'Friendship',
                'Casual dating',
                'Life partner',
                'Something casual but genuine'
              ].map((goal) => (
                <TouchableOpacity
                  key={goal}
                  style={[
                    styles.goalButton,
                    relationshipGoal === goal && styles.goalButtonSelected
                  ]}
                  onPress={() => setRelationshipGoal(goal)}
                >
                  <Text style={[
                    styles.goalText,
                    relationshipGoal === goal && styles.goalTextSelected
                  ]}>
                    {goal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.stepCounter}>
          Step {currentStep + 1} of {steps.length}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${((currentStep + 1) / steps.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.stepName}>{steps[currentStep]}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={currentStep === steps.length - 1 ? 'Complete Profile' : 'Continue'}
          onPress={handleNext}
          disabled={!canProceed()}
          size="large"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
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
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  stepCounter: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  stepName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  stepContent: {
    paddingVertical: SPACING.lg,
  },
  stepTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  stepSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    backgroundColor: COLORS.white,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    backgroundColor: COLORS.white,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  interestsContainer: {
    gap: SPACING.lg,
  },
  categorySection: {
    marginBottom: SPACING.md,
  },
  categoryTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  interestChipSelected: {
    backgroundColor: COLORS.primary,
  },
  interestText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  interestTextSelected: {
    color: COLORS.white,
  },
  interestsCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  customInterestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  customInterestInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.md,
  },
  customInterestButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  customInterestButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  customInterestsDisplay: {
    marginTop: SPACING.md,
  },
  customInterestsLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  customInterestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  customInterestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.xs,
  },
  customInterestChipText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
  },
  goalOptions: {
    gap: SPACING.sm,
  },
  goalButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  goalButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  goalText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    textAlign: 'center',
  },
  goalTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
});