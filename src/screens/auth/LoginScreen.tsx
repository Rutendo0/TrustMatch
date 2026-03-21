import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components/common';
import { api } from '../../services/api';
import { registrationProgress } from '../../services/RegistrationProgressService';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  // Check for saved registration progress and redirect
  useEffect(() => {
    const checkProgress = async () => {
      const resumeStep = await registrationProgress.getResumeStep();
      if (resumeStep) {
        // User has incomplete registration - redirect to where they left off
        // But first check if this is an old saved state - clear it to let user login
        await registrationProgress.clearProgress();
        // Don't redirect - let user login if they're already verified
      }
    };
    checkProgress();
  }, [navigation]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      // Call the backend API to login
      await api.login(email, password);
      
      // Clear any saved registration progress since user is now logged in
      await registrationProgress.clearProgress();
      
      // Navigate to main app on success
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Invalid email or password. Please try again.';
      
      // Check if this is a verification-related error
      if (errorMessage.toLowerCase().includes('verification') || 
          errorMessage.toLowerCase().includes('verified')) {
        // Clear any stale registration progress
        await registrationProgress.clearProgress();
        
        // Show professional verification required message
        Alert.alert(
          'Verification Required',
          'You need to complete the verification process before logging in. This helps keep our community safe.',
          [
            {
              text: 'Complete Verification',
              onPress: () => {
                // Navigate to email verification with the user's email
                navigation.navigate('EmailVerification', { formData: { email } });
              },
            },
            {
              text: 'Go Back',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Login Failed', errorMessage);
      }
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              error={errors.password}
            />

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              size="large"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text 
                style={styles.link}
                onPress={() => navigation.navigate('Register')}
              >
                Sign Up
              </Text>
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
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  backButton: {
    marginBottom: SPACING.lg,
  },
  header: {
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  footer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  link: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
