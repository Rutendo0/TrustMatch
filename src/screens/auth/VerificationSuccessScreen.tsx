import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const { width } = Dimensions.get('window');

type VerificationSuccessScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

interface CheckItem {
  key: string;
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  passed: boolean;
  score: number;
  detail?: string;
}

// Animated circular trust score ring
const TrustScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const animatedScore = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    Animated.timing(animatedScore, {
      toValue: score,
      duration: 1800,
      useNativeDriver: false,
    }).start();

    animatedScore.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });
    return () => animatedScore.removeAllListeners();
  }, [score]);

  const color =
    score >= 80 ? '#10B981' :
    score >= 60 ? '#F59E0B' :
    '#EF4444';

  const label =
    score >= 80 ? 'Excellent' :
    score >= 60 ? 'Good' :
    'Fair';

  return (
    <View style={styles.ringWrap}>
      <View style={[styles.ringOuter, { borderColor: color + '33' }]}>
        <View style={[styles.ringInner, { borderColor: color }]}>
          <Text style={[styles.ringScore, { color }]}>{displayScore}</Text>
          <Text style={styles.ringLabel}>TrustScore</Text>
        </View>
      </View>
      <View style={[styles.ringBadge, { backgroundColor: color }]}>
        <Text style={styles.ringBadgeText}>{label}</Text>
      </View>
    </View>
  );
};

// Single check row with slide-in animation
const CheckRow: React.FC<{ item: CheckItem; delay: number }> = ({ item, delay }) => {
  const slideX = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.checkRow,
        { transform: [{ translateX: slideX }], opacity },
        !item.passed && styles.checkRowFailed,
      ]}
    >
      <View style={[styles.checkIcon, { backgroundColor: item.passed ? '#10B98122' : '#EF444422' }]}>
        <Ionicons
          name={item.passed ? item.icon : 'close-circle-outline'}
          size={22}
          color={item.passed ? '#10B981' : '#EF4444'}
        />
      </View>
      <View style={styles.checkText}>
        <Text style={styles.checkLabel}>{item.label}</Text>
        <Text style={styles.checkSublabel}>
          {item.passed ? item.sublabel : 'Not completed'}
          {item.detail ? `  ·  ${item.detail}` : ''}
        </Text>
      </View>
      <View style={[styles.checkScore, { backgroundColor: item.passed ? '#10B98115' : '#EF444415' }]}>
        <Text style={[styles.checkScoreText, { color: item.passed ? '#10B981' : '#EF4444' }]}>
          {item.passed ? `+${item.score}` : '+0'}
        </Text>
      </View>
    </Animated.View>
  );
};

export const VerificationSuccessScreen: React.FC<VerificationSuccessScreenProps> = ({
  navigation,
  route,
}) => {
  const { trustScore = 0, verification = {} } = (route.params || {}) as {
    trustScore: number;
    verification: {
      idVerified?: boolean;
      selfieVerified?: boolean;
      emailVerified?: boolean;
      faceMatchScore?: number | null;
      idDocumentType?: string | null;
      photoCount?: number;
      breakdown?: {
        email: number;
        id: number;
        face: number;
        photos: number;
      };
    };
  };

  const headerScale = useRef(new Animated.Value(0)).current;
  const btnOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(headerScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(btnOpacity, { toValue: 1, duration: 500, delay: 1200, useNativeDriver: true }),
    ]).start();
  }, []);

  const bd = verification.breakdown;
  const faceMatch = verification.faceMatchScore != null
    ? `${Math.round(verification.faceMatchScore)}% match`
    : undefined;

  const docType = verification.idDocumentType
    ? verification.idDocumentType.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
    : 'ID Document';

  const checks: CheckItem[] = [
    {
      key: 'email',
      label: 'Email Verified',
      sublabel: 'Email address confirmed',
      icon: 'mail-outline',
      passed: true,           // always true — can't reach this screen without it
      score: 20,              // always 20 — the base everyone gets
    },
    {
      key: 'id',
      label: 'Identity Document',
      sublabel: `${docType} verified`,
      icon: 'card-outline',
      passed: !!verification.idVerified,
      score: bd?.id ?? (verification.idVerified ? 35 : 0),
    },
    {
      key: 'selfie',
      label: 'Face Verification',
      sublabel: 'Selfie matched your ID',
      icon: 'person-circle-outline',
      passed: !!verification.selfieVerified,
      score: bd?.face ?? 0,
      detail: faceMatch,
    },
    {
      key: 'photos',
      label: 'Profile Photo',
      sublabel: 'Main photo verified against selfie',
      icon: 'images-outline',
      passed: true,
      score: bd?.photos ?? 10,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f0fdf4', '#ffffff']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { transform: [{ scale: headerScale }] }]}>
          <View style={styles.successCircle}>
            <Ionicons name="shield-checkmark" size={52} color="#10B981" />
          </View>
          <Text style={styles.title}>You're Verified!</Text>
          <Text style={styles.subtitle}>
            Your identity has been confirmed. Here's your trust breakdown.
          </Text>
        </Animated.View>

        {/* Trust score ring */}
        <TrustScoreRing score={trustScore} />

        {/* Score breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Breakdown</Text>
          {checks.map((item, i) => (
            <CheckRow key={item.key} item={item} delay={400 + i * 150} />
          ))}
        </View>

        {/* CTA */}
        <Animated.View style={{ opacity: btnOpacity, width: '100%' }}>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'WelcomeNewUser' }],
              });
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>Start Finding Matches</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#10B98115',
    borderWidth: 3,
    borderColor: '#10B98133',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#064E3B',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  // Ring
  ringWrap: { alignItems: 'center', marginBottom: SPACING.xl },
  ringOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  ringScore: {
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 50,
  },
  ringLabel: {
    fontSize: FONTS.sizes.xs,
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  ringBadge: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  ringBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONTS.sizes.sm,
    letterSpacing: 0.5,
  },
  // Section
  section: { width: '100%', marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: '#374151',
    marginBottom: SPACING.md,
  },
  // Check rows
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    gap: SPACING.md,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  checkRowFailed: {
    borderColor: '#FEE2E2',
    shadowColor: '#EF4444',
  },
  checkIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { flex: 1 },
  checkLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  checkSublabel: {
    fontSize: FONTS.sizes.sm,
    color: '#6B7280',
  },
  checkScore: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  checkScoreText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.primarySoft,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: '#374151',
    lineHeight: 20,
  },
  // CTA
  ctaBtn: {
    width: '100%',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  ctaText: {
    color: '#fff',
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
