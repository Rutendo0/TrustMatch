import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VerifiedBadge } from '../../components/common';
import { MatchModal } from '../../components/match/MatchModal';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useResponsive, normalize, MIN_TOUCH_SIZE, HIT_SLOP } from '../../hooks/useResponsive';
import { useTheme } from '../../context/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  distance: string;
  photos: string[];
  isVerified: boolean;
  trustScore: number;
  compatibility: number;
  personalityType: string;
  interests: string[];
  safetyFeatures: string[];
  verificationBadges: string[];
}

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { width, height, wp, hp, normalize, isLandscape, isTablet } = useResponsive();

  // ── Stamp overlay state ──────────────────────────────────────────────────
  const [stampAnim] = useState(new Animated.Value(0));
  const [stampType, setStampType] = useState<'like' | 'nope' | null>(null);

  // Skeleton pulse animation
  const [skeletonAnim] = useState(new Animated.Value(0.4));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, { toValue: 0.8, duration: 600, useNativeDriver: true }),
        Animated.timing(skeletonAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [skeletonAnim]);

  const showStamp = useCallback(
    (type: 'like' | 'nope', callback: () => void) => {
      setStampType(type);
      stampAnim.setValue(0);
      Animated.sequence([
        Animated.timing(stampAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(150),
        Animated.timing(stampAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        setStampType(null);
        callback();
      });
    },
    [stampAnim]
  );

  // ── Header ───────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // ── Card dimensions ──────────────────────────────────────────────────────
  const cardDimensions = useMemo(() => {
    const cardHeight = isLandscape ? hp(70) : hp(55);
    const cardWidth = isLandscape
      ? Math.min(wp(50), height * 0.65)
      : wp(100) - SPACING.lg * 2;
    return { cardHeight, cardWidth };
  }, [width, height, isLandscape, wp, hp]);

  const { cardHeight, cardWidth } = cardDimensions;

  const responsiveFonts = useMemo(() => ({
    cardName: normalize(24),
    cardDistance: normalize(14),
    cardBio: normalize(15),
    interestText: normalize(12),
    logoText: normalize(20),
    emptyTitle: normalize(22),
    emptySubtitle: normalize(15),
  }), [normalize]);

  const responsiveIconSizes = useMemo(() => ({
    actionLarge: normalize(30),
    actionMedium: normalize(28),
    location: normalize(14),
    emptyState: normalize(80),
    filter: normalize(24),
    arrow: normalize(24),
  }), [normalize]);

  const actionButtonSize = useMemo(() => Math.max(MIN_TOUCH_SIZE, normalize(60)), [normalize]);

  // ── State ────────────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<{ name: string; photo: string; interests: string[] } | null>(null);
  const [matchModal, setMatchModal] = useState<{ visible: boolean; profile: Profile | null; matchId: string | null }>({ visible: false, profile: null, matchId: null });
  const [lastDisliked, setLastDisliked] = useState<{ profile: Profile; index: number } | null>(null);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => { fetchProfiles(); }, []);
  useFocusEffect(useCallback(() => { fetchProfiles(); }, []));

  // ── Memoised values ──────────────────────────────────────────────────────
  const currentProfile = useMemo(
    () => (profiles.length > 0 ? profiles[currentIndex] : null),
    [profiles, currentIndex]
  );

  const dynamicStyles = useMemo(() => StyleSheet.create({
    card: {
      width: cardWidth,
      height: cardHeight,
      borderRadius: BORDER_RADIUS.xl,
      overflow: 'hidden',
      backgroundColor: COLORS.white,
      ...SHADOWS.large,
    },
    cardName: {
      fontSize: responsiveFonts.cardName,
      fontWeight: 'bold',
      color: COLORS.white,
    },
    cardDistance: {
      fontSize: responsiveFonts.cardDistance,
      color: COLORS.white,
      opacity: 0.9,
      marginBottom: SPACING.sm,
    },
    cardBio: {
      fontSize: responsiveFonts.cardBio,
      color: COLORS.white,
      opacity: 0.9,
      marginBottom: SPACING.sm,
    },
    interestText: {
      fontSize: responsiveFonts.interestText,
      color: COLORS.white,
      fontWeight: '500',
    },
    logoText: {
      fontSize: responsiveFonts.logoText,
      fontWeight: 'bold',
      color: COLORS.primary,
    },
    headerButton: {
      width: Math.max(MIN_TOUCH_SIZE, 40),
      height: Math.max(MIN_TOUCH_SIZE, 40),
      borderRadius: Math.max(MIN_TOUCH_SIZE, 40) / 2,
      backgroundColor: COLORS.white,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.small,
    },
    profilePic: {
      width: Math.max(MIN_TOUCH_SIZE, 40),
      height: Math.max(MIN_TOUCH_SIZE, 40),
      borderRadius: Math.max(MIN_TOUCH_SIZE, 40) / 2,
      backgroundColor: COLORS.border,
    },
    emptyTitle: {
      fontSize: responsiveFonts.emptyTitle,
      fontWeight: 'bold',
      color: COLORS.text,
      marginTop: SPACING.lg,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: responsiveFonts.emptySubtitle,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginTop: SPACING.sm,
      paddingHorizontal: SPACING.xl,
    },
    skeletonCard: {
      width: cardWidth,
      height: cardHeight,
      borderRadius: BORDER_RADIUS.xl,
      backgroundColor: COLORS.border,
      overflow: 'hidden',
    },
  }), [cardWidth, cardHeight, responsiveFonts]);

  // ── API / callbacks ──────────────────────────────────────────────────────
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let filters = {};
      try {
        const userProfile = await api.getProfile();
        filters = {
          gender: userProfile?.preferences?.interestedIn,
          ageMin: userProfile?.preferences?.ageRangeMin ?? userProfile?.ageRangeMin,
          ageMax: userProfile?.preferences?.ageRangeMax ?? userProfile?.ageRangeMax,
        };
        setMyProfile({
          name: userProfile?.firstName || 'You',
          photo: userProfile?.photos?.[0]?.url || userProfile?.photos?.[0] || '',
          interests: userProfile?.interests || [],
        });
      } catch (profileError: any) {
        console.warn('Could not fetch user preferences:', profileError.message);
      }
      const data = await api.getDiscoverProfiles(10, filters);
      if (!data || data.length === 0) { setProfiles([]); setLoading(false); return; }
      const mappedProfiles: Profile[] = (data || []).map((p: any) => ({
        id: p?.id || Math.random().toString(),
        name: p?.firstName || p?.name || 'User',
        age: p?.age || 25,
        bio: p?.bio || 'No bio available',
        distance: p?.city || p?.country || 'Unknown location',
        photos: p?.photos?.length > 0 
          ? p.photos.map((ph: any) => typeof ph === 'string' ? ph : ph?.url).filter(Boolean)
          : ['https://via.placeholder.com/400'],
        isVerified: p?.isVerified || false,
        trustScore: p?.trustScore || 85,
        compatibility: p?.compatibility || p?.trustScore || Math.floor(Math.random() * 20) + 75,
        personalityType: 'N/A',
        interests: p?.interests || [],
        safetyFeatures: p?.isVerified ? ['Verified'] : [],
        verificationBadges: p?.isVerified ? ['Identity', 'Selfie'] : [],
      }));
      setProfiles(mappedProfiles);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Verification Required', 'Please complete all verification steps to start discovering profiles.', [
          { text: 'Complete Verification', onPress: () => navigation.navigate('ProfileSetup', { formData: {} }) },
          { text: 'Later' },
        ]);
      } else {
        Alert.alert('Could Not Load Profiles', error.response?.data?.error || error.message || 'Please check your connection and try again.', [
          { text: 'Retry', onPress: () => fetchProfiles() },
          { text: 'Cancel' },
        ]);
      }
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  const goToNext = useCallback(() => {
    setCurrentPhotoIndex(0);
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Last profile — reload to show disliked users again
      fetchProfiles();
    }
  }, [currentIndex, profiles.length, fetchProfiles]);

  const handleLike = useCallback(async () => {
    if (!currentProfile) return;
    setLikedProfiles(prev => [...prev, currentProfile.id]);
    try {
      const result = await api.swipe(currentProfile.id, 'LIKE');
      if (result?.isMatch) {
        setMatchModal({ visible: true, profile: currentProfile, matchId: result.matchId || null });
      } else {
        goToNext();
      }
    } catch (error: any) {
      Alert.alert('Like Failed', error.response?.data?.error || error.message || 'Could not like this profile.', [{ text: 'OK' }]);
      setLikedProfiles(prev => prev.filter(id => id !== currentProfile.id));
    }
  }, [currentProfile, goToNext]);

  const handleDislike = useCallback(async () => {
    if (!currentProfile) return;
    setLastDisliked({ profile: currentProfile, index: currentIndex });
    try { await api.swipe(currentProfile.id, 'DISLIKE'); } catch (error) { console.error('Failed to swipe:', error); }
    goToNext();
  }, [currentProfile, currentIndex, goToNext]);

  const handleUndo = useCallback(async () => {
    if (!lastDisliked) return;
    setProfiles(prev => { const updated = [...prev]; updated.splice(currentIndex, 0, lastDisliked.profile); return updated; });
    setLastDisliked(null);
  }, [lastDisliked, currentIndex]);

  const viewFullProfile = useCallback(() => {
    if (currentProfile) navigation.navigate('ProfileDetail', { profile: currentProfile });
  }, [currentProfile, navigation]);

  const nextPhoto = useCallback(() => {
    if (currentProfile && currentPhotoIndex < currentProfile.photos.length - 1) setCurrentPhotoIndex(prev => prev + 1);
  }, [currentPhotoIndex, currentProfile]);

  const previousPhoto = useCallback(() => {
    if (currentPhotoIndex > 0) setCurrentPhotoIndex(prev => prev - 1);
  }, [currentPhotoIndex]);

  // ── Progress bar value ───────────────────────────────────────────────────
  const progressFraction = profiles.length > 0 ? (currentIndex + 1) / profiles.length : 0;

  // ── NOW EARLY RETURNS ARE SAFE — ALL HOOKS HAVE RUN ─────────────────────

  // Loading skeleton
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
        <View style={styles.contentContainer}>
          <Animated.View style={[dynamicStyles.skeletonCard, { opacity: skeletonAnim }]}>
            {/* shimmer rows at bottom */}
            <View style={styles.skeletonInfo}>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
              <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (profiles.length === 0 || currentIndex >= profiles.length) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={responsiveIconSizes.emptyState} color={COLORS.textLight} />
          <Text style={dynamicStyles.emptyTitle}>You've seen everyone!</Text>
          <Text style={dynamicStyles.emptySubtitle}>Check back later or adjust your filters</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchProfiles} hitSlop={HIT_SLOP}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity hitSlop={HIT_SLOP} onPress={() => navigation.navigate('Profile')}>
          <Image
            source={{ uri: myProfile?.photo || 'https://via.placeholder.com/40' }}
            style={dynamicStyles.profilePic}
          />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={dynamicStyles.logoText}>TrustMatch</Text>
        </View>
        <TouchableOpacity style={dynamicStyles.headerButton} hitSlop={HIT_SLOP} onPress={() => navigation.navigate('Filters')}>
          <Ionicons name="options" size={responsiveIconSizes.filter} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Card area */}
      <View style={styles.contentContainer}>
        <View style={[dynamicStyles.card, styles.profileCard]}>
          {/* Photo */}
          <Image
            source={{ uri: currentProfile.photos[currentPhotoIndex] }}
            style={styles.cardImage}
          />

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.cardGradient}
          />

          {/* Photo indicators */}
          {currentProfile.photos.length > 1 && (
            <View style={styles.photoIndicators}>
              {currentProfile.photos.map((_, index) => (
                <View
                  key={index}
                  style={[styles.photoIndicator, index === currentPhotoIndex && styles.activePhotoIndicator]}
                />
              ))}
            </View>
          )}

          {/* Arrow buttons (kept alongside tap zones) */}
          {currentProfile.photos.length > 1 && (
            <>
              {currentPhotoIndex > 0 && (
                <TouchableOpacity style={styles.photoArrowLeft} onPress={previousPhoto} hitSlop={HIT_SLOP}>
                  <Ionicons name="chevron-back" size={responsiveIconSizes.arrow} color={COLORS.white} />
                </TouchableOpacity>
              )}
              {currentPhotoIndex < currentProfile.photos.length - 1 && (
                <TouchableOpacity style={styles.photoArrowRight} onPress={nextPhoto} hitSlop={HIT_SLOP}>
                  <Ionicons name="chevron-forward" size={responsiveIconSizes.arrow} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ── Tap zones overlay (top 60% of card) ── */}
          <View style={styles.tapZoneContainer} pointerEvents="box-none">
            {/* Left 40% — photo prev / card dislike */}
            <TouchableOpacity
              style={styles.tapZoneLeft}
              activeOpacity={1}
              onPress={() => {
                // top half of card = previous photo; bottom half = dislike stamp
                previousPhoto();
              }}
              onLongPress={() => showStamp('nope', handleDislike)}
            />
            {/* Middle 20% — view full profile */}
            <TouchableOpacity
              style={styles.tapZoneMiddle}
              activeOpacity={1}
              onPress={viewFullProfile}
            />
            {/* Right 40% — photo next / card like */}
            <TouchableOpacity
              style={styles.tapZoneRight}
              activeOpacity={1}
              onPress={() => {
                nextPhoto();
              }}
              onLongPress={() => showStamp('like', handleLike)}
            />
          </View>

          {/* ── Full-card tap zones (bottom 40% of card height) for like/dislike ── */}
          <View style={styles.tapZoneBottomContainer} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.tapZoneBottomLeft}
              activeOpacity={1}
              onPress={() => showStamp('nope', handleDislike)}
            />
            <TouchableOpacity
              style={styles.tapZoneBottomMiddle}
              activeOpacity={1}
              onPress={viewFullProfile}
            />
            <TouchableOpacity
              style={styles.tapZoneBottomRight}
              activeOpacity={1}
              onPress={() => showStamp('like', handleLike)}
            />
          </View>

          {/* ── Stamp overlay ── */}
          {stampType !== null && (
            <Animated.View
              style={[
                styles.stampOverlay,
                stampType === 'like' ? styles.stampLike : styles.stampNope,
                {
                  opacity: stampAnim,
                  transform: [{ rotate: stampType === 'like' ? '-15deg' : '15deg' }],
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.stampText}>
                {stampType === 'like' ? 'LIKE' : 'NOPE'}
              </Text>
              <Text style={styles.stampEmoji}>{stampType === 'like' ? '' : 'x'}</Text>
            </Animated.View>
          )}

          {/* Card info */}
          <View style={styles.cardInfo}>
            {/* Name + verified */}
            <View style={styles.nameRow}>
              <Text style={dynamicStyles.cardName}>{currentProfile.name}, {currentProfile.age}</Text>
              {currentProfile.isVerified && <VerifiedBadge isVerified size="medium" />}
            </View>

            {/* Trust score + compatibility */}
            <View style={styles.trustRow}>
              <View style={styles.trustScore}>
                <Ionicons name="shield-checkmark" size={14} color={COLORS.white} />
                <Text style={styles.trustScoreText}>{currentProfile.trustScore}% Trusted</Text>
              </View>
              <View style={styles.compatibility}>
                {/* Colored dot instead of heart icon */}
                <View style={styles.compatibilityDot} />
                <Text style={styles.compatibilityText}>{currentProfile.compatibility}% Match</Text>
              </View>
            </View>

            {/* Location */}
            <Text style={dynamicStyles.cardDistance}>
              <Ionicons name="location" size={responsiveIconSizes.location} color={COLORS.white} /> {currentProfile.distance}
            </Text>

            {/* Bio — 2 lines, no personalityType */}
            <Text style={dynamicStyles.cardBio} numberOfLines={2}>{currentProfile.bio}</Text>

            {/* Interests */}
            <View style={styles.interestsRow}>
              {currentProfile.interests.slice(0, 3).map((interest, i) => (
                <View key={i} style={styles.interestTag}>
                  <Text style={dynamicStyles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressFraction * 100}%` as any }]} />
        </View>
      </View>

      {/* Action buttons — no super like */}
      <View style={styles.actionContainer}>
        {/* Undo */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.undoBtn, !lastDisliked && styles.actionBtnDisabled]}
          onPress={handleUndo}
          disabled={!lastDisliked}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="arrow-undo" size={22} color={lastDisliked ? COLORS.warning : COLORS.textLight} />
        </TouchableOpacity>

        {/* Dislike */}
        <TouchableOpacity style={[styles.actionBtn, styles.dislikeBtn]} onPress={handleDislike} hitSlop={HIT_SLOP}>
          <Ionicons name="close" size={responsiveIconSizes.actionLarge} color={COLORS.error} />
        </TouchableOpacity>

        {/* Like — larger, stronger glow */}
        <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={handleLike} hitSlop={HIT_SLOP}>
          <Ionicons name="heart" size={responsiveIconSizes.actionLarge} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Match Modal */}
      {matchModal.profile && myProfile && (
        <MatchModal
          visible={matchModal.visible}
          myProfile={myProfile}
          matchedProfile={{
            id: matchModal.profile.id,
            name: matchModal.profile.name,
            age: matchModal.profile.age,
            photo: matchModal.profile.photos[0],
            interests: matchModal.profile.interests,
            compatibility: matchModal.profile.compatibility,
            bio: matchModal.profile.bio,
          }}
          suggestions={profiles
            .filter(p => p.id !== matchModal.profile!.id && p.id !== currentProfile?.id)
            .slice(0, 4)
            .map(p => ({ id: p.id, name: p.name, photo: p.photos[0], compatibility: p.compatibility }))}
          onSendMessage={() => {
            const { profile, matchId } = matchModal;
            setMatchModal({ visible: false, profile: null, matchId: null });
            if (matchId && profile) {
              navigation.navigate('Chat', { matchId, name: profile.name });
            } else {
              navigation.navigate('Messages');
            }
          }}
          onKeepSwiping={() => setMatchModal({ visible: false, profile: null, matchId: null })}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePicContainer: {
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Content ──────────────────────────────────────────────────────────────
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  profileCard: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },

  // ── Photo indicators ─────────────────────────────────────────────────────
  photoIndicators: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    gap: 4,
  },
  photoIndicator: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activePhotoIndicator: {
    backgroundColor: COLORS.white,
  },

  // ── Arrow buttons ────────────────────────────────────────────────────────
  photoArrowLeft: {
    position: 'absolute',
    left: 12,
    top: '40%',
    transform: [{ translateY: -20 }],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoArrowRight: {
    position: 'absolute',
    right: 12,
    top: '40%',
    transform: [{ translateY: -20 }],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tap zones (top 60% of card — photo navigation) ───────────────────────
  tapZoneContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    flexDirection: 'row',
  },
  tapZoneLeft: {
    width: '40%',
    height: '100%',
  },
  tapZoneMiddle: {
    width: '20%',
    height: '100%',
  },
  tapZoneRight: {
    width: '40%',
    height: '100%',
  },

  // ── Tap zones (bottom 40% of card — like/dislike) ────────────────────────
  tapZoneBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    flexDirection: 'row',
  },
  tapZoneBottomLeft: {
    width: '40%',
    height: '100%',
  },
  tapZoneBottomMiddle: {
    width: '20%',
    height: '100%',
  },
  tapZoneBottomRight: {
    width: '40%',
    height: '100%',
  },

  // ── Stamp overlay ────────────────────────────────────────────────────────
  stampOverlay: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  stampLike: {
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    borderColor: '#10B981',
    left: '10%',
  },
  stampNope: {
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    borderColor: COLORS.error,
    right: '10%',
  },
  stampText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 2,
  },
  stampEmoji: {
    fontSize: 22,
    color: COLORS.white,
    fontWeight: 'bold',
  },

  // ── Card info ────────────────────────────────────────────────────────────
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  trustRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
    flexWrap: 'wrap',
  },
  trustScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  trustScoreText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  compatibility: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(236, 72, 153, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  compatibilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FDE68A',
  },
  compatibilityText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  interestsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },

  // ── Progress bar ─────────────────────────────────────────────────────────
  progressBarContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  progressBarTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },

  // ── Action buttons ───────────────────────────────────────────────────────
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: SPACING.lg,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.medium,
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },
  undoBtn: {
    width: 52,
    height: 52,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.warning,
  },
  dislikeBtn: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  likeBtn: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },

  // ── Empty state ──────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  refreshButton: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.glow,
  },
  refreshButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Skeleton loader ──────────────────────────────────────────────────────
  skeletonInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  skeletonLine: {
    height: 16,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: '70%',
  },
  skeletonLineShort: {
    width: '40%',
    height: 12,
  },
  skeletonLineMedium: {
    width: '55%',
    height: 12,
  },
});
