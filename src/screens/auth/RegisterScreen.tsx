import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, DatePicker } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

type Step = 'basic' | 'personal' | 'verification' | 'photos';

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '' as 'male' | 'female' | '',
    interestedIn: '' as 'male' | 'female' | 'both' | '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateBasicStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePersonalStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      // Simple validation - just check basic format and age
      const dateParts = formData.dateOfBirth.split('/');
      if (dateParts.length !== 3) {
        newErrors.dateOfBirth = 'Please select a valid date';
        return;
      }
      
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10);
      const year = parseInt(dateParts[2], 10);
      
      // Basic range checks
      if (isNaN(day) || isNaN(month) || isNaN(year) || 
          day < 1 || day > 31 || 
          month < 1 || month > 12 || 
          year < 1950 || year > 2010) {
        newErrors.dateOfBirth = 'Please select a valid date';
        return;
      }
      
      // Create date and check if it's valid
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      
      // Verify the date makes sense
      if (birthDate > today) {
        newErrors.dateOfBirth = 'Birth date cannot be in the future';
        return;
      }
      
      // Calculate age
      let age = today.getFullYear() - year;
      if (month - 1 > today.getMonth() || (month - 1 === today.getMonth() && day > today.getDate())) {
        age--;
      }
      
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }
    
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }
    
    if (!formData.interestedIn) {
      newErrors.interestedIn = 'Please select who you are interested in';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 'basic' && validateBasicStep()) {
      setCurrentStep('personal');
    } else if (currentStep === 'personal' && validatePersonalStep()) {
      navigation.navigate('IDVerification', { formData });
    }
  };

  const handleBack = () => {
    if (currentStep === 'personal') {
      setCurrentStep('basic');
    } else {
      navigation.goBack();
    }
  };

  const renderBasicStep = () => (
    <>
      <Input
        label="Email"
        placeholder="Enter your email"
        value={formData.email}
        onChangeText={(value) => updateFormData('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
        icon="mail"
        error={errors.email}
      />

      <Input
        label="Phone Number"
        placeholder="Enter your phone number"
        value={formData.phone}
        onChangeText={(value) => updateFormData('phone', value)}
        keyboardType="phone-pad"
        icon="call"
        error={errors.phone}
      />

      <Input
        label="Password"
        placeholder="Create a password"
        value={formData.password}
        onChangeText={(value) => updateFormData('password', value)}
        secureTextEntry
        icon="lock-closed"
        error={errors.password}
      />

      <Input
        label="Confirm Password"
        placeholder="Confirm your password"
        value={formData.confirmPassword}
        onChangeText={(value) => updateFormData('confirmPassword', value)}
        secureTextEntry
        icon="lock-closed"
        error={errors.confirmPassword}
      />
    </>
  );

  const renderPersonalStep = () => (
    <>
      <View style={styles.nameRow}>
        <View style={styles.nameInput}>
          <Input
            label="First Name"
            placeholder="First name"
            value={formData.firstName}
            onChangeText={(value) => updateFormData('firstName', value)}
            autoCapitalize="words"
            error={errors.firstName}
          />
        </View>
        <View style={styles.nameInput}>
          <Input
            label="Last Name"
            placeholder="Last name"
            value={formData.lastName}
            onChangeText={(value) => updateFormData('lastName', value)}
            autoCapitalize="words"
            error={errors.lastName}
          />
        </View>
      </View>

      <DatePicker
        label="Date of Birth"
        value={formData.dateOfBirth}
        onDateChange={(date) => updateFormData('dateOfBirth', date)}
        error={errors.dateOfBirth}
      />

      <Text style={styles.sectionLabel}>I am a</Text>
      <View style={styles.optionRow}>
        {(['male', 'female'] as const).map((gender) => (
          <TouchableOpacity
            key={gender}
            style={[
              styles.optionButton,
              formData.gender === gender && styles.optionButtonSelected,
            ]}
            onPress={() => updateFormData('gender', gender)}
          >
            <Text
              style={[
                styles.optionText,
                formData.gender === gender && styles.optionTextSelected,
              ]}
            >
              {gender.charAt(0).toUpperCase() + gender.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

      <Text style={styles.sectionLabel}>Show me</Text>
      <View style={styles.optionRow}>
        {(['male', 'female', 'both'] as const).map((interest) => (
          <TouchableOpacity
            key={interest}
            style={[
              styles.optionButton,
              formData.interestedIn === interest && styles.optionButtonSelected,
            ]}
            onPress={() => updateFormData('interestedIn', interest)}
          >
            <Text
              style={[
                styles.optionText,
                formData.interestedIn === interest && styles.optionTextSelected,
              ]}
            >
              {interest === 'both' ? 'Everyone' : interest.charAt(0).toUpperCase() + interest.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.interestedIn && <Text style={styles.errorText}>{errors.interestedIn}</Text>}
    </>
  );

  const steps = ['basic', 'personal', 'verification', 'photos'];
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            {steps.map((step, index) => (
              <React.Fragment key={step}>
                <View
                  style={[
                    styles.progressDot,
                    index <= currentStepIndex && styles.progressDotActive,
                  ]}
                />
                {index < steps.length - 1 && (
                  <View
                    style={[
                      styles.progressLine,
                      index < currentStepIndex && styles.progressLineActive,
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>
              {currentStep === 'basic' ? 'Create Account' : 'About You'}
            </Text>
            <Text style={styles.subtitle}>
              {currentStep === 'basic'
                ? 'Enter your details to get started'
                : 'Tell us about yourself'}
            </Text>
          </View>

          <View style={styles.form}>
            {currentStep === 'basic' && renderBasicStep()}
            {currentStep === 'personal' && renderPersonalStep()}
          </View>

          <View style={styles.footer}>
            <Button
              title={currentStep === 'personal' ? 'Continue to Verification' : 'Next'}
              onPress={handleNext}
              loading={isLoading}
              size="large"
              style={styles.nextButton}
            />

            {currentStep === 'basic' && (
              <View style={styles.loginPrompt}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  header: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  form: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  nameInput: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: COLORS.white,
  },
  errorText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  footer: {
    marginTop: SPACING.xl,
  },
  nextButton: {
    width: '100%',
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  loginText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
