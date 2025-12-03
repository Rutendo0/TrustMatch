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
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

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
            <Ionicons name="shield-checkmark" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>TrustMatch</Text>
          <Text style={styles.tagline}>Where Authentic Connections Begin</Text>
          <View style={styles.trustBadge}>
            <Ionicons name="star" size={16} color={COLORS.warning} />
            <Text style={styles.trustText}>99% Verified Profiles</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Why Choose TrustMatch?</Text>
        <View style={styles.featureList}>
          <FeatureItem
            icon="shield-checkmark"
            iconLibrary="Ionicons"
            title="100% Verified Users"
            description="ID verification + live selfie matching ensures real people"
          />
          <FeatureItem
            icon="trending-up"
            iconLibrary="Ionicons"
            title="TrustScore Matching"
            description="AI-powered compatibility based on personality & values"
          />
          <FeatureItem
            icon="heart"
            iconLibrary="Ionicons"
            title="Quality Over Quantity"
            description="Fewer matches, but each one is genuine and compatible"
          />
          <FeatureItem
            icon="videocam"
            iconLibrary="Ionicons"
            title="Safe Video Dates"
            description="Built-in video calling with safety features"
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
  iconLibrary?: string;
  title: string;
  description: string;
}> = ({ icon, iconLibrary = 'emoji', title, description }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      {iconLibrary === 'Ionicons' ? (
        <Ionicons name={icon as any} size={24} color={COLORS.primary} />
      ) : (
        <Text style={styles.featureIconEmoji}>{icon}</Text>
      )}
    </View>
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
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  trustText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
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
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconEmoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
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
