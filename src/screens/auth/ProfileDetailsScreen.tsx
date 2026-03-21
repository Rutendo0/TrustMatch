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
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

type ProfileDetailsScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: {
    params: {
      email: string;
      password: string;
      phone: string;
    };
  };
};

export const ProfileDetailsScreen: React.FC<ProfileDetailsScreenProps> = ({ navigation, route }) => {
  const { email, password, phone } = route.params;
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!gender) newErrors.gender = 'Gender is required';
    
    // Check age is 18+
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      // Try to register - if user already exists, this will return a token (login)
      try {
        await api.register({
          email,
          password,
          phone,
          firstName,
          lastName,
          dateOfBirth,
          gender,
          interestedIn: gender === 'MALE' ? 'FEMALE' : 'MALE',
          deviceFingerprint: `device_${Date.now()}`,
          platform: 'mobile',
        });
      } catch (registerError: any) {
        // If user exists, try to login to get token
        if (registerError.response?.status === 400 || registerError.response?.status === 401) {
          await api.login(email, password);
        } else {
          throw registerError;
        }
      }
      
      // Navigate to ID verification with form data
      navigation.navigate('IDVerification', {
        formData: {
          email,
          password,
          phone,
          firstName,
          lastName,
          dateOfBirth,
          gender,
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      // Still proceed to ID verification even if registration fails
      // The user can complete verification and we'll handle account creation
      navigation.navigate('IDVerification', {
        formData: {
          email,
          password,
          phone,
          firstName,
          lastName,
          dateOfBirth,
          gender,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>About You</Text>
            <Text style={styles.subtitle}>
              Tell us a bit about yourself to find your perfect match
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              error={errors.firstName}
              autoCapitalize="words"
            />

            <Input
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              error={errors.lastName}
              autoCapitalize="words"
            />

            <DatePicker
              label="Date of Birth"
              value={dateOfBirth}
              onDateChange={setDateOfBirth}
              placeholder="Select your date of birth"
              error={errors.dateOfBirth}
            />

            <View style={styles.genderContainer}>
              <Text style={styles.label}>Gender</Text>
              {errors.gender && (
                <Text style={styles.errorText}>{errors.gender}</Text>
              )}
              <View style={styles.genderOptions}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    gender === 'MALE' && styles.genderButtonActive,
                  ]}
                  onPress={() => setGender('MALE')}
                >
                  <Ionicons 
                    name="male" 
                    size={24} 
                    color={gender === 'MALE' ? COLORS.white : COLORS.primary} 
                  />
                  <Text style={[
                    styles.genderButtonText,
                    gender === 'MALE' && styles.genderButtonTextActive,
                  ]}>
                    Male
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    gender === 'FEMALE' && styles.genderButtonActive,
                  ]}
                  onPress={() => setGender('FEMALE')}
                >
                  <Ionicons 
                    name="female" 
                    size={24} 
                    color={gender === 'FEMALE' ? COLORS.white : COLORS.primary} 
                  />
                  <Text style={[
                    styles.genderButtonText,
                    gender === 'FEMALE' && styles.genderButtonTextActive,
                  ]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Continue"
              onPress={handleContinue}
              loading={isLoading}
              disabled={isLoading}
            />
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  backButton: {
    marginBottom: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  genderContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  genderButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  genderButtonTextActive: {
    color: COLORS.white,
  },
  footer: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
});
