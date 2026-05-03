import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, VerifiedBadge } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive, normalize, MIN_TOUCH_SIZE, HIT_SLOP, wp, hp } from '../../hooks/useResponsive';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { api } from '../../services/api';

export const ProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { isSmall, isTablet } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);

  useEffect(() => {
    fetchProfile();
    fetchLikesAndMatches();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      fetchLikesAndMatches();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      setProfileError(false);
      const profileData = await api.getProfile();
      setUser(profileData);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setProfileError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikesAndMatches = async () => {
    try {
      const [likes, matches] = await Promise.all([
        api.getLikes(),
        api.getMatches()
      ]);
      setLikesCount(Array.isArray(likes) ? likes.length : 0);
      setMatchesCount(Array.isArray(matches) ? matches.length : 0);
    } catch (error) {
      console.error('Failed to fetch likes/matches:', error);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getUserName = () => {
    if (!user) return 'User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.firstName || 'User';
  };

  const getUserLocation = () => {
    if (!user) return 'Location not set';
    if (user.city && user.country) {
      return `${user.city}, ${user.country}`;
    }
    return user.city || user.country || 'Location not set';
  };

  const getUserAge = () => {
    if (!user || !user.dateOfBirth) return null;
    return calculateAge(user.dateOfBirth);
  };

  const isUserVerified = () => {
    if (!user) return false;
    return user.verification?.isVerified || false;
  };

  const getFirstPhoto = () => {
    if (!user || !user.photos || user.photos.length === 0) return null;
    return user.photos[0]?.url || null;
  };

  const getAllPhotos = () => {
    if (!user || !user.photos || user.photos.length === 0) return [];
    return user.photos.map((p: any) => p?.url).filter(Boolean);
  };

  const getProfileStrength = () => {
    let score = 20;
    if (!user) return score;
    if (user.bio) score += 15;
    if (user.occupation) score += 15;
    if (user.education) score += 15;
    if (user.interests && user.interests.length > 0) score += 15;
    if (isUserVerified()) score += 20;
    return Math.min(score, 100);
  };

  // ── Floating hearts ─────────────────────────────────────────────────────
  // 6 hearts, each with random position, size, and staggered animation
  const HEARTS = [
    { x: '8%',  size: 10, delay: 0,    duration: 4200 },
    { x: '22%', size: 7,  delay: 800,  duration: 3800 },
    { x: '40%', size: 12, delay: 300,  duration: 5000 },
    { x: '58%', size: 8,  delay: 1200, duration: 4500 },
    { x: '74%', size: 10, delay: 600,  duration: 3600 },
    { x: '88%', size: 7,  delay: 1600, duration: 4800 },
  ];

  const heartAnims = useRef(HEARTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = heartAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(HEARTS[i].delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: HEARTS[i].duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  // Loading skeleton
  if (loading || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.backgroundGray }]} edges={['left', 'right', 'bottom']}>
        <LinearGradient colors={['#DC2626', '#9F1239']} style={styles.skeletonHero} />
        <View style={styles.skeletonContent}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: wp(40), marginTop: 8 }]} />
          {profileError ? (
            <>
              <Text style={{ color: COLORS.textSecondary, marginTop: 16, textAlign: 'center' }}>
                Could not load profile
              </Text>
              <TouchableOpacity
                onPress={() => { setLoading(true); fetchProfile(); }}
                style={{ marginTop: 12, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.skeletonLine, { width: wp(60), marginTop: 16, height: 8 }]} />
              <View style={[styles.skeletonLine, { width: wp(80), marginTop: 24, height: 80 }]} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const photoSize = wp(28);
  const profileStrength = getProfileStrength();
  // Compute trust score from verification fields since API doesn't return a raw trustScore
  const computeTrustScore = () => {
    let score = 0;
    if (user?.verification?.emailVerified) score += 20;
    if (user?.verification?.idVerified) score += 30;
    if (user?.verification?.selfieVerified) score += 25;
    if (user?.verification?.liveVerified) score += 25;
    return score;
  };
  const trustScore = computeTrustScore();
  const photoGridSize = (wp(100) - 48 - 16) / 3;

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        {/* ── Floating hearts overlay (behind everything, no touch) ── */}
        <View style={styles.heartsOverlay} pointerEvents="none">
          {HEARTS.map((h, i) => {
            const translateY = heartAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [0, -hp(55)],
            });
            const opacity = heartAnims[i].interpolate({
              inputRange: [0, 0.15, 0.75, 1],
              outputRange: [0, 0.55, 0.25, 0],
            });
            const scale = heartAnims[i].interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.6, 1, 0.8],
            });
            return (
              <Animated.Text
                key={i}
                style={[
                  styles.floatingHeart,
                  {
                    left: h.x as any,
                    fontSize: h.size,
                    opacity,
                    transform: [{ translateY }, { scale }],
                    bottom: 20,
                  },
                ]}
              >
                ♥
              </Animated.Text>
            );
          })}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Hero Gradient ── */}
            <View style={styles.heroWrapper}>
              <LinearGradient
                colors={['#FF6B6B', '#DC2626', '#9F1239']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                {/* Decorative circles for depth */}
                <View style={styles.heroCircle1} />
                <View style={styles.heroCircle2} />

                {/* Edit button top-right */}
                <TouchableOpacity
                  style={styles.heroEditButton}
                  hitSlop={HIT_SLOP}
                  accessibilityLabel="Edit profile"
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('ProfileSetup', { formData: user })}
                >
                  <Ionicons name="pencil" size={normalize(18)} color={COLORS.white} />
                </TouchableOpacity>

                {/* Avatar inside gradient */}
                <View style={styles.avatarWrapper}>
                  <Image
                    source={{ uri: getFirstPhoto() || 'https://via.placeholder.com/150' }}
                    style={[styles.avatar, { width: photoSize, height: photoSize, borderRadius: photoSize / 2 }]}
                  />
                  {isUserVerified() && (
                    <View style={styles.verifiedDot}>
                      <Ionicons name="checkmark-circle" size={normalize(22)} color={COLORS.success} />
                    </View>
                  )}
                </View>

                {/* Name + location inside gradient */}
                <View style={styles.heroNameBlock}>
                  <Text style={styles.heroName}>
                    {getUserName()}{getUserAge() ? `, ${getUserAge()}` : ''}
                  </Text>
                  <View style={styles.heroLocationRow}>
                    <Ionicons name="location" size={normalize(13)} color={COLORS.white} />
                    <Text style={styles.heroLocation}>{getUserLocation()}</Text>
                  </View>
                </View>

                {/* Wave curve at bottom */}
                <View style={styles.heroWave} />
              </LinearGradient>
            </View>


            {/* ── Profile Strength ── */}
            <View style={styles.strengthCard}>
              <View style={styles.strengthHeader}>
                <Text style={styles.strengthLabel}>Profile Strength</Text>
                <Text style={styles.strengthPercent}>{profileStrength}%</Text>
              </View>
              <View style={styles.strengthTrack}>
                <View style={[styles.strengthFill, { width: `${profileStrength}%` as any }]} />
              </View>
            </View>


            {/* ── About Me Card ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>About Me</Text>
                <TouchableOpacity
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('ProfileSetup', { formData: user })}
                >
                  <Ionicons name="pencil-outline" size={normalize(18)} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.bioText, !user.bio && styles.bioPlaceholder]}>
                {user.bio || 'Add a bio to let others know who you are...'}
              </Text>

              {/* Inline chips */}
              <View style={styles.chipsRow}>
                {user.occupation && (
                  <View style={styles.chip}>
                    <Ionicons name="briefcase-outline" size={normalize(13)} color={COLORS.textSecondary} />
                    <Text style={styles.chipText}>{user.occupation}</Text>
                  </View>
                )}
                {user.education && (
                  <View style={styles.chip}>
                    <Ionicons name="school-outline" size={normalize(13)} color={COLORS.textSecondary} />
                    <Text style={styles.chipText}>{user.education}</Text>
                  </View>
                )}
                {user.relationshipGoal && (
                  <View style={styles.chip}>
                    <Ionicons name="heart-outline" size={normalize(13)} color={COLORS.textSecondary} />
                    <Text style={styles.chipText}>{user.relationshipGoal}</Text>
                  </View>
                )}
              </View>

              {/* Interests */}
              {user.interests && user.interests.length > 0 && (
                <View style={styles.interestsList}>
                  {user.interests.map((interest: string, index: number) => (
                    <View key={index} style={styles.interestTag}>
                      <Text style={styles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ── Verification Card ── */}
            <View style={styles.card}>
              <LinearGradient
                colors={['rgba(16,185,129,0.15)', 'rgba(16,185,129,0.05)']}
                style={styles.verificationGradientHeader}
              >
                <View style={styles.verificationIconCircle}>
                  <Ionicons name="shield-checkmark" size={normalize(32)} color={COLORS.success} />
                </View>
                <View style={styles.verificationTextBlock}>
                  <Text style={[styles.verificationTitle, isUserVerified() ? styles.verifiedGreen : styles.verifiedAmber]}>
                    {isUserVerified() ? 'Verified ✓' : 'Verification Pending'}
                  </Text>
                  <Text style={styles.verificationSubtitle}>
                    {isUserVerified() ? 'Your profile is verified and trusted' : 'Complete verification to build trust'}
                  </Text>
                  {/* Trust score inline */}
                  <View style={styles.trustScoreRow}>
                    <View style={styles.trustScoreBar}>
                      <View style={[styles.trustScoreFill, { width: `${trustScore}%` as any }]} />
                    </View>
                    <Text style={styles.trustScoreText}>{trustScore}% Trust</Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.badgesRow}>
                {[
                  { label: 'ID Verified', active: user?.verification?.idVerified },
                  { label: 'Selfie Matched', active: user?.verification?.selfieVerified },
                  { label: 'Phone Verified', active: !!user?.phone },
                  ...(user?.verification?.liveVerified ? [{ label: 'Live Verified', active: true }] : []),
                ].map((badge, i) => (
                  <View key={i} style={[styles.verificationBadgePill, badge.active && styles.verificationBadgePillActive]}>
                    <Ionicons
                      name={badge.active ? 'checkmark-circle' : 'close-circle'}
                      size={normalize(14)}
                      color={badge.active ? COLORS.success : COLORS.textSecondary}
                    />
                    <Text style={[styles.badgePillText, badge.active && styles.badgePillTextActive]}>
                      {badge.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Discovery Preferences Card ── */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Discovery Preferences</Text>

              <TouchableOpacity
                style={styles.prefRow}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                onPress={() => navigation.navigate('Filters')}
              >
                <View style={styles.prefIconCircle}>
                  <Ionicons name="people" size={normalize(18)} color={COLORS.primary} />
                </View>
                <Text style={styles.prefLabel}>Show Me</Text>
                <View style={styles.prefRight}>
                  <Text style={styles.prefValue}>
                    {user.preferences?.interestedIn === 'FEMALE' ? 'Women' : user.preferences?.interestedIn === 'MALE' ? 'Men' : 'Men'}
                  </Text>
                  <Ionicons name="chevron-forward" size={normalize(16)} color={COLORS.textLight} />
                </View>
              </TouchableOpacity>

              <View style={styles.prefDivider} />

              <TouchableOpacity
                style={styles.prefRow}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                onPress={() => navigation.navigate('Filters')}
              >
                <View style={styles.prefIconCircle}>
                  <Ionicons name="calendar" size={normalize(18)} color={COLORS.primary} />
                </View>
                <Text style={styles.prefLabel}>Age Range</Text>
                <View style={styles.prefRight}>
                  <Text style={styles.prefValue}>
                    {user.preferences?.ageRangeMin ?? user.ageRangeMin ?? 18} - {user.preferences?.ageRangeMax ?? user.ageRangeMax ?? 50}
                  </Text>
                  <Ionicons name="chevron-forward" size={normalize(16)} color={COLORS.textLight} />
                </View>
              </TouchableOpacity>

              <View style={styles.prefDivider} />

              <TouchableOpacity
                style={styles.prefRow}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                onPress={() => navigation.navigate('Filters')}
              >
                <View style={styles.prefIconCircle}>
                  <Ionicons name="location" size={normalize(18)} color={COLORS.primary} />
                </View>
                <Text style={styles.prefLabel}>My City</Text>
                <View style={styles.prefRight}>
                  <Text style={styles.prefValue}>{user.city || 'Not set'}</Text>
                  <Ionicons name="chevron-forward" size={normalize(16)} color={COLORS.textLight} />
                </View>
              </TouchableOpacity>
            </View>

            {/* ── Photos Grid ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>My Photos</Text>
                {getAllPhotos().length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{getAllPhotos().length}</Text>
                  </View>
                )}
              </View>
              <View style={styles.photosGrid}>
                {getAllPhotos().map((photoUrl: string, index: number) => (
                  <TouchableOpacity key={index} style={[styles.photoItem, { width: photoGridSize, height: photoGridSize }]}>
                    <Image source={{ uri: photoUrl }} style={styles.photoThumbnail} />
                  </TouchableOpacity>
                ))}
                {/* Add photo button */}
                <TouchableOpacity
                  style={[styles.addPhotoItem, { width: photoGridSize, height: photoGridSize }]}
                  hitSlop={HIT_SLOP}
                  accessibilityLabel="Add photo"
                  accessibilityRole="button"
                  onPress={() => {}}
                >
                  <Ionicons name="add" size={normalize(28)} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Settings Row ── */}
            <TouchableOpacity
              style={styles.settingsRow}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={styles.settingsLeft}>
                <View style={styles.settingsIconCircle}>
                  <Ionicons name="settings-outline" size={normalize(20)} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.settingsLabel}>Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={normalize(20)} color={COLORS.textLight} />
            </TouchableOpacity>

            {/* ── Log Out ── */}
            <TouchableOpacity
              style={styles.logoutButton}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              onPress={() => {
                Alert.alert(
                  'Log Out',
                  'Are you sure you want to log out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Log Out',
                      style: 'destructive',
                      onPress: () => navigation.reset({
                        index: 0,
                        routes: [{ name: 'Welcome' }],
                      }),
                    },
                  ]
                );
              }}
            >
              <Ionicons name="log-out-outline" size={normalize(20)} color={COLORS.error} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            <Text style={styles.version}>TrustMatch v1.0.0</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  // ── Container ──
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: hp(4),
  },

  // ── Skeleton ──
  skeletonHero: {
    height: hp(22),
    width: '100%',
  },
  skeletonContent: {
    alignItems: 'center',
    paddingTop: wp(14) / 2 + 16,
    paddingHorizontal: 16,
  },
  skeletonAvatar: {
    width: wp(28),
    height: wp(28),
    borderRadius: wp(14),
    backgroundColor: '#E5E7EB',
    marginTop: -wp(14),
    marginBottom: 16,
  },
  skeletonLine: {
    height: 16,
    width: wp(50),
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },

  // ── Hero ──
  heroWrapper: {
    marginBottom: 16,
  },
  heroGradient: {
    height: hp(32),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: hp(4),
    paddingBottom: hp(5),
    overflow: 'hidden',
  },
  heroCircle1: {
    position: 'absolute',
    width: wp(60),
    height: wp(60),
    borderRadius: wp(30),
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -wp(15),
    left: -wp(10),
  },
  heroCircle2: {
    position: 'absolute',
    width: wp(40),
    height: wp(40),
    borderRadius: wp(20),
    backgroundColor: 'rgba(255,107,107,0.25)',
    top: hp(2),
    right: -wp(8),
  },
  heroEditButton: {
    position: 'absolute',
    top: hp(5),
    right: 16,
    width: normalize(38),
    height: normalize(38),
    borderRadius: normalize(19),
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.white,
    borderRadius: normalize(12),
    width: normalize(24),
    height: normalize(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNameBlock: {
    alignItems: 'center',
    gap: 4,
  },
  heroName: {
    fontSize: normalize(24),
    fontWeight: 'bold',
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginTop: 2,
  },
  heroLocation: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.white,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  heroWave: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: COLORS.backgroundGray,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },

  // ── Profile Strength ──
  strengthCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    ...SHADOWS.card,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  strengthLabel: {
    fontSize: normalize(FONTS.sizes.sm),
    fontWeight: '600',
    color: COLORS.text,
  },
  strengthPercent: {
    fontSize: normalize(FONTS.sizes.sm),
    fontWeight: '700',
    color: COLORS.primary,
  },
  strengthTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  strengthFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  // ── Generic Card ──
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: normalize(16),
    fontWeight: 'bold',
    color: COLORS.text,
  },

  // ── About Me ──
  bioText: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.text,
    lineHeight: normalize(22),
    marginBottom: 12,
  },
  bioPlaceholder: {
    fontStyle: 'italic',
    color: COLORS.textLight,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.backgroundGray,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
  },
  chipText: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.textSecondary,
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  interestTag: {
    backgroundColor: COLORS.primary + '26',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
  },
  interestText: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.primary,
    fontWeight: '500',
  },

  // ── Verification ──
  verificationGradientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  verificationIconCircle: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationTextBlock: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: normalize(FONTS.sizes.md),
    fontWeight: '700',
  },
  verifiedGreen: {
    color: COLORS.success,
  },
  verifiedAmber: {
    color: COLORS.warning,
  },
  verificationSubtitle: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verificationBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.full,
  },
  verificationBadgePillActive: {
    borderColor: COLORS.success,
  },
  badgePillText: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  badgePillTextActive: {
    color: COLORS.success,
  },

  trustScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  trustScoreBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(16,185,129,0.2)',
    overflow: 'hidden',
  },
  trustScoreFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.success,
  },
  trustScoreText: {
    fontSize: normalize(FONTS.sizes.xs),
    fontWeight: '700',
    color: COLORS.success,
  },

  // ── Discovery Preferences ──
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingVertical: 4,
  },
  prefIconCircle: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: COLORS.primary + '26',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prefLabel: {
    flex: 1,
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.text,
  },
  prefRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prefValue: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.primary,
    fontWeight: '600',
  },
  prefDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },

  // ── Photos Grid ──
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.white,
    fontWeight: '700',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  addPhotoItem: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Settings Row ──
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: MIN_TOUCH_SIZE,
    ...SHADOWS.card,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIconCircle: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: COLORS.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.text,
    fontWeight: '500',
  },

  // ── Logout ──
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(SPACING.sm),
    marginHorizontal: 16,
    minHeight: MIN_TOUCH_SIZE,
    paddingVertical: normalize(SPACING.md),
    marginTop: 8,
  },
  logoutText: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.error,
    fontWeight: '600',
  },

  // ── Floating hearts ──
  heartsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  floatingHeart: {
    position: 'absolute',
    color: '#FDA4AF',
  },

  // ── Version ──
  version: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: normalize(SPACING.xl),
  },
});
