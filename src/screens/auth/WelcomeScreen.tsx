import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/common';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>TM</Text>
          </View>
          <Text style={styles.appName}>TrustMatch</Text>
        </View>
        <Text style={styles.tagline}>Where Trust Meets Love</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.featureList}>
          <FeatureItem
            icon="🔒"
            title="AI-Verified Profiles"
            description="Every user verified with ID & live selfie"
          />
          <FeatureItem
            icon="🛡️"
            title="No Fake Accounts"
            description="Advanced duplicate detection technology"
          />
          <FeatureItem
            icon="❤️"
            title="Real Connections"
            description="Meet authentic people, build genuine relationships"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Create Account"
          onPress={() => navigation.navigate('Register')}
          size="large"
          style={styles.primaryButton}
        />
        <Button
          title="Sign In"
          onPress={() => navigation.navigate('Login')}
          variant="outline"
          size="large"
          style={styles.secondaryButton}
        />
        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={styles.link}>Terms of Service</Text> and{' '}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
};

const FeatureItem: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  appName: {
    fontSize: FONTS.sizes.title,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  tagline: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: SPACING.sm,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  featureList: {
    gap: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureIcon: {
    fontSize: 32,
    width: 50,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  footer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
  terms: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  link: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
