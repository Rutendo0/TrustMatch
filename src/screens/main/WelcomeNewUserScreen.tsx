import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

// Floating heart component
const FloatingHeart: React.FC<{
  size: number;
  startX: number;
  delay: number;
  duration: number;
  color: string;
}> = ({ size, startX, delay, duration, color }) => {
  const translateY = useRef(new Animated.Value(height * 0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(height * 0.6);
      opacity.setValue(0);
      scale.setValue(0.3);
      rotate.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -height * 0.1,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.delay(duration - 800),
            Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
          Animated.spring(scale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };
    animate();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '15deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        transform: [{ translateY }, { scale }, { rotate: spin }],
        opacity,
      }}
    >
      <Ionicons name="heart" size={size} color={color} />
    </Animated.View>
  );
};

const HEARTS = [
  { size: 28, startX: width * 0.08, delay: 0,    duration: 3200, color: '#FF4B6E' },
  { size: 18, startX: width * 0.22, delay: 600,  duration: 2800, color: '#FF8FA3' },
  { size: 36, startX: width * 0.42, delay: 200,  duration: 3600, color: '#FF4B6E' },
  { size: 22, startX: width * 0.62, delay: 900,  duration: 3000, color: '#FFB3C1' },
  { size: 30, startX: width * 0.78, delay: 400,  duration: 3400, color: '#FF4B6E' },
  { size: 16, startX: width * 0.88, delay: 1100, duration: 2600, color: '#FF8FA3' },
  { size: 24, startX: width * 0.15, delay: 1400, duration: 3100, color: '#FFB3C1' },
  { size: 20, startX: width * 0.55, delay: 700,  duration: 2900, color: '#FF4B6E' },
];

const STEPS = [
  {
    icon: 'flame' as const,
    color: '#FF4B6E',
    title: 'Discover',
    desc: 'Swipe through verified profiles on the Discover tab. ❤️ to like, ← → to browse.',
  },
  {
    icon: 'chatbubbles' as const,
    color: '#7C3AED',
    title: 'Chat',
    desc: 'When someone likes you back it\'s a match! Head to Messages to start a conversation.',
  },
  {
    icon: 'person-circle' as const,
    color: '#0EA5E9',
    title: 'Complete Your Profile',
    desc: 'Tap the Profile tab → Edit Profile to add your bio, interests and more photos.',
  },
  {
    icon: 'shield-checkmark' as const,
    color: '#10B981',
    title: 'Stay Safe',
    desc: 'Every profile is verified. Use the safety tools anytime if something feels off.',
  },
];

export const WelcomeNewUserScreen: React.FC<Props> = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  // Entrance animations
  const logoScale   = useRef(new Animated.Value(0)).current;
  const titleSlide  = useRef(new Animated.Value(40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide   = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity  = useRef(new Animated.Value(0)).current;

  // Step indicator pulse
  const stepPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fetch user's first name
    api.getProfile()
      .then(p => setFirstName(p?.firstName || ''))
      .catch(() => {});

    // Staggered entrance
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleSlide,   { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardSlide,   { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
      Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulse the active step dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(stepPulse, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(stepPulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      AsyncStorage.setItem('hasSeenWelcome', 'true');
      navigation.replace('MainTabs');
    }
  };

  const handleSkip = () => {
    AsyncStorage.setItem('hasSeenWelcome', 'true');
    navigation.replace('MainTabs');
  };

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1a0010', '#3d0020', '#6b0030', '#3d0020', '#1a0010']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Floating hearts */}
      {HEARTS.map((h, i) => (
        <FloatingHeart key={i} {...h} />
      ))}

      <SafeAreaView style={styles.safe}>
        {/* Skip */}
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
            <LinearGradient
              colors={['#FF4B6E', '#FF8FA3']}
              style={styles.logoCircle}
            >
              <Ionicons name="heart" size={48} color="#fff" />
            </LinearGradient>
          </Animated.View>

          {/* Greeting */}
          <Animated.View
            style={{
              transform: [{ translateY: titleSlide }],
              opacity: titleOpacity,
              alignItems: 'center',
            }}
          >
            <Text style={styles.greeting}>
              Welcome{firstName ? `,\n${firstName}` : ''} 💕
            </Text>
            <Text style={styles.tagline}>
              Your journey to a real connection{'\n'}starts right here.
            </Text>
          </Animated.View>

          {/* Step card */}
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ translateY: cardSlide }],
                opacity: cardOpacity,
              },
            ]}
          >
            {/* Step icon */}
            <View style={[styles.stepIconWrap, { backgroundColor: step.color + '22' }]}>
              <Ionicons name={step.icon} size={40} color={step.color} />
            </View>

            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>

            {/* Step dots */}
            <View style={styles.dots}>
              {STEPS.map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentStep && styles.dotActive,
                    i === currentStep && { transform: [{ scale: stepPulse }] },
                  ]}
                />
              ))}
            </View>
          </Animated.View>

          {/* CTA */}
          <Animated.View style={[styles.btnWrap, { opacity: btnOpacity }]}>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF4B6E', '#c0003c']}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.ctaText}>
                  {isLast ? "Let's Go! 🚀" : 'Next'}
                </Text>
                {!isLast && (
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                )}
              </LinearGradient>
            </TouchableOpacity>

            {isLast && (
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => {
                  AsyncStorage.setItem('hasSeenWelcome', 'true');
                  navigation.replace('MainTabs');
                  // Small delay so MainTabs mounts before navigating to Profile
                  setTimeout(() => navigation.navigate('Profile'), 300);
                }}
              >
                <Ionicons name="person-circle-outline" size={18} color="#FF8FA3" />
                <Text style={styles.profileBtnText}>Complete my profile first</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a0010',
  },
  safe: {
    flex: 1,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  logoWrap: {
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4B6E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  greeting: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,75,110,0.3)',
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    shadowColor: '#FF4B6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  stepIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  stepTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: '#fff',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  dots: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: '#FF4B6E',
    width: 24,
    borderRadius: 4,
  },
  btnWrap: {
    width: '100%',
    alignItems: 'center',
    gap: SPACING.md,
  },
  ctaBtn: {
    width: '100%',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    shadowColor: '#FF4B6E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  ctaText: {
    color: '#fff',
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  profileBtnText: {
    color: '#FF8FA3',
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
