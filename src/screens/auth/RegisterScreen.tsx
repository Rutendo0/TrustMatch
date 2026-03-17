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
import { Button, Input } from '../../components/common';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email';

    if (!phone) newErrors.phone = 'Phone number is required';
    else if (phone.replace(/\D/g, '').length < 7) newErrors.phone = 'Invalid phone number';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Min 8 characters';
    
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    
    // Navigate to ID verification with email/password/phone
    navigation.navigate('IDVerification', {
      formData: { email, password, phone }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
          </View>

          <View style={styles.form}>
            <Input 
              label="Email" 
              value={email} 
              onChangeText={setEmail} 
              placeholder="your@email.com" 
              keyboardType="email-address" 
              autoCapitalize="none" 
              error={errors.email} 
            />
            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 234 567 8900"
              keyboardType="phone-pad"
              error={errors.phone}
            />
            <Input 
              label="Password" 
              value={password} 
              onChangeText={setPassword} 
              placeholder="Create password (min 8 chars)" 
              secureTextEntry 
              error={errors.password} 
            />
            <Input 
              label="Confirm Password" 
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
              placeholder="Confirm password" 
              secureTextEntry 
              error={errors.confirmPassword} 
            />

            <Button title="Continue" onPress={handleContinue} loading={isLoading} size="large" />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.link} onPress={() => navigation.navigate('Login')}>Sign In</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: SPACING.lg },
  backButton: { marginBottom: SPACING.lg },
  header: { marginBottom: SPACING.xl },
  title: { fontSize: FONTS.sizes.xxxl, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  form: { flex: 1 },
  footer: { marginTop: SPACING.xl, alignItems: 'center' },
  footerText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
  link: { color: COLORS.primary, fontWeight: '600' },
});
