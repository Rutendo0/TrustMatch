import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components/common';
import { api } from '../../services/api';
import { registrationProgress } from '../../services/RegistrationProgressService';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

type EmailVerificationScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: any;
};

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { formData } = route.params as { formData: any };
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [displayedCode, setDisplayedCode] = useState<string | null>(null);

  // Send verification code on mount (after ID + Selfie verification is complete)
  useEffect(() => {
    const sendCode = async () => {
      try {
        const response = await api.sendEmailVerification();
        // If email fails to send, show the code from server response
        if (response.code) {
          setDisplayedCode(response.code);
        }
      } catch (error) {
        console.error('Failed to send verification code:', error);
        // Continue anyway - user can request a new code
      }
    };
    sendCode();
  }, []);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      // Verify the code — server returns 400 on failure (axios throws), 200 on success
      await api.verifyEmailCode(code);

      // Email verified — complete registration and activate account
      try {
        await api.completeRegistration();
      } catch (completeError) {
        console.error('Complete registration error:', completeError);
        // Continue even if complete fails - account activated on backend
      }

      // Clear registration progress since verification is complete
      await registrationProgress.clearProgress();
      
      // Proceed to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }]
      });

    } catch (error: any) {
      console.error('Verification error:', error);
      const msg =
        error.response?.data?.error ||
        error.message ||
        'Failed to verify code. Please try again.';
      Alert.alert('Invalid Code', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      // Request new code
      const response = await api.resendEmailCode();
      // If email fails to send, show the code from server response
      if (response.code) {
        setDisplayedCode(response.code);
        Alert.alert('Code Sent', `Your verification code is: ${response.code}`);
      } else {
        Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-unread-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to{'\n'}
            <Text style={styles.email}>{formData.email}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          {/* Show code if email failed to send (for testing) */}
          {displayedCode && (
            <View style={styles.codeDisplayBox}>
              <Text style={styles.codeDisplayLabel}>Verification Code (Email not available)</Text>
              <Text style={styles.codeDisplayText}>{displayedCode}</Text>
            </View>
          )}
          <Input
            label="Verification Code"
            value={code}
            onChangeText={setCode}
            placeholder="Enter 6-digit code"
            keyboardType="numeric"
            maxLength={6}
            autoCapitalize="none"
          />

          <Button
            title="Verify Email"
            onPress={handleVerify}
            loading={isLoading}
            size="large"
          />

          <TouchableOpacity 
            style={styles.resendButton} 
            onPress={handleResendCode}
            disabled={resending}
          >
            <Text style={styles.resendText}>
              {resending ? 'Sending...' : "Didn't receive the code? "}
              <Text style={styles.resendLink}>
                {resending ? '' : 'Resend'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.verified} />
          <Text style={styles.infoText}>
            This extra step keeps your account secure by verifying your email address.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flex: 1, padding: SPACING.lg },
  backButton: { marginBottom: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  email: { color: COLORS.primary, fontWeight: '600' },
  form: { flex: 1 },
  resendButton: { alignItems: 'center', marginTop: SPACING.lg },
  resendText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  resendLink: { color: COLORS.primary, fontWeight: '600' },
  infoBox: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: SPACING.sm, 
    backgroundColor: COLORS.verifiedBg, 
    padding: SPACING.md, 
    borderRadius: 12 
  },
  infoText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  codeDisplayBox: {
    backgroundColor: '#FFF3E0',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  codeDisplayLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  codeDisplayText: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: '#F57C00',
    letterSpacing: 4,
  },
});
