import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Gradient Header */}
      <LinearGradient
        colors={[COLORS.primary, '#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="heart" size={36} color={COLORS.white} />
            </View>
            <Text style={styles.appName}>TrustMatch</Text>
            <Text style={styles.tagline}>Where Authentic Connections Begin</Text>
            
            {/* Trust Badge */}
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
              <Text style={styles.trustText}>99% Verified Profiles</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentInner}
        >
          <Text style={styles.sectionTitle}>Why Choose TrustMatch?</Text>
          
          <View style={styles.featureList}>
            <FeatureCard
              icon="shield-checkmark"
              iconColor="#10B981"
              title="100% Verified Users"
              description="ID verification + live selfie matching ensures real people"
            />
            <FeatureCard
              icon="trending-up"
              iconColor="#F59E0B"
              title="TrustScore Matching"
              description="AI-powered compatibility based on personality & values"
            />
            <FeatureCard
              icon="heart"
              iconColor="#EF4444"
              title="Quality Over Quantity"
              description="Fewer matches, but each one is genuine and compatible"
            />
            <FeatureCard
              icon="videocam"
              iconColor="#3B82F6"
              title="Safe Video Dates"
              description="Built-in video calling with safety features"
            />
          </View>
          
          <View style={styles.scrollSpacer} />
        </ScrollView>
      </View>

      {/* Footer with Gradient Buttons */}
      <SafeAreaView style={styles.footer}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.footerGradient}
        >
          <TouchableOpacity 
            style={styles.createButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Register')}
          >
            <LinearGradient
              colors={[COLORS.primary, '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>Create Account</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.signInButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.signInButtonText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
          
          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.link}>Terms</Text> and{' '}
            <Text style={styles.link}>Privacy</Text>
          </Text>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
};

const FeatureCard: React.FC<{
  icon: string;
  iconColor: string;
  title: string;
  description: string;
}> = ({ icon, iconColor, title, description }) => (
  <View style={styles.featureCard}>
    <View style={[styles.featureIcon, { backgroundColor: iconColor + '20' }]}>
      <Ionicons name={icon as any} size={24} color={iconColor} />
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
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingBottom: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  appName: {
    fontSize: FONTS.sizes.title + 4,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: SPACING.xs,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginTop: -SPACING.xl,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  featureList: {
    gap: SPACING.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  scrollSpacer: {
    height: SPACING.xxl,
  },
  footer: {
    backgroundColor: COLORS.background,
  },
  footerGradient: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  createButton: {
    width: '100%',
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  signInButton: {
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  signInButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  terms: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  link: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
