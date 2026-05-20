import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Alert, Animated, PanResponder,
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
  aboutMe: string;
  occupation: string;
  education: string;
  city: string;
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

type HomeScreenProps = { navigation: NativeStackNavigationProp<any> };

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { width, height, wp, hp, normalize, isLandscape } = useResponsive();

  // ── Stamp overlay ────────────────────────────────────────────────────────
  const [stampAnim] = useState(new Animated.Value(0));
  const [stampType, setStampType] = useState<'like' | 'nope' | null>(null);

  // Skeleton pulse
  const [skeletonAnim] = useState(new Animated.Value(0.4));
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(skeletonAnim, { toValue: 0.8, duration: 600, useNativeDriver: true }),
      Animated.timing(skeletonAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [skeletonAnim]);

  const showStamp = useCallback((type: 'like' | 'nope', callback: () => void) => {
    setStampType(type);
    stampAnim.setValue(0);
    Animated.sequence([
      Animated.timing(stampAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(150),
      Animated.timing(stampAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => { setStampType(null); callback(); });
  }, [stampAnim]);

  // ── Swipe gesture ────────────────────────────────────────────────────────
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeY = useRef(new Animated.Value(0)).current;
  const SWIPE_THRESHOLD = 100;

  const resetSwipe = useCallback(() => {
    Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
    Animated.spring(swipeY, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
  }, [swipeX, swipeY]);

  // ── State ────────────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [myProfile, setMyProfile] = useState<{ name: string; photo: string; interests: string[] } | null>(null);
  const [matchModal, setMatchModal] = useState<{ visible: boolean; profile: Profile | null; matchId: string | null }>({ visible: false, profile: null, matchId: null });
  const [lastDisliked, setLastDisliked] = useState<{ profile: Profile; index: number } | null>(null);

  const currentProfile = useMemo(
    () => (profiles.length > 0 ? profiles[currentIndex] : null),
    [profiles, currentIndex]
  );

  // ── Header ───────────────────────────────────────────────────────────────
  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  // ── Card dimensions ──────────────────────────────────────────────────────
  const cardDimensions = useMemo(() => ({
    cardHeight: isLandscape ? hp(70) : hp(55),
    cardWidth: isLandscape ? Math.min(wp(50), height * 0.65) : wp(100) - SPACING.lg * 2,
  }), [width, height, isLandscape, wp, hp]);
  const { cardHeight, cardWidth } = cardDimensions;

  const responsiveFonts = useMemo(() => ({
    cardName: normalize(24), cardDistance: normalize(14), cardBio: normalize(15),
    interestText: normalize(12), logoText: normalize(20),
    emptyTitle: normalize(22), emptySubtitle: normalize(15),
  }), [normalize]);

  const responsiveIconSizes = useMemo(() => ({
    actionLarge: normalize(30), actionMedium: normalize(28), location: normalize(14),
    emptyState: normalize(80), filter: normalize(24), arrow: normalize(24),
  }), [normalize]);

  // ── API callbacks ────────────────────────────────────────────────────────
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const [userProfile, data] = await Promise.all([
        api.getProfile().catch(() => null),
        api.getDiscoverProfiles(10, {}).catch(() => []),
      ]);
      if (userProfile) {
        setMyProfile({
          name: userProfile?.firstName || 'You',
          photo: userProfile?.photos?.[0]?.url || userProfile?.photos?.[0] || '',
          interests: userProfile?.interests || [],
        });
      }
      if (!data || data.length === 0) { setProfiles([]); setLoading(false); return; }
      const isUUID = (v: any) => typeof v === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
      const mapped: Profile[] = (data || []).map((p: any) => ({
        id: p?.id ?? p?.userId ?? p?.user_id,
        name: p?.firstName || p?.name || 'User',
        age: p?.age || 25,
        bio: p?.bio || '',
        aboutMe: p?.aboutMe || p?.bio || '',
        occupation: p?.occupation || '',
        education: p?.education || '',
        city: p?.city || p?.country || '',
        distance: p?.city || p?.country || '',
        photos: p?.photos?.length > 0
          ? p.photos.map((ph: any) => typeof ph === 'string' ? ph : ph?.url).filter(Boolean)
          : ['https://via.placeholder.com/400'],
        isVerified: p?.isVerified || false,
        trustScore: p?.trustScore ?? 0,
        compatibility: p?.compatibility ?? 0,
        personalityType: 'N/A',
        interests: p?.interests || [],
        safetyFeatures: p?.isVerified ? ['Verified'] : [],
        verificationBadges: p?.isVerified ? ['Identity', 'Selfie'] : [],
      })).filter((p: Profile) => isUUID(p.id));
      setProfiles(mapped);
      setCurrentIndex(0);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Verification Required', 'Please complete all verification steps to start discovering profiles.', [
          { text: 'Complete Verification', onPress: () => navigation.navigate('ProfileSetup', { formData: {} }) },
          { text: 'Later' },
        ]);
      } else {
        Alert.alert('Could Not Load Profiles', error.response?.data?.error || error.message || 'Please check your connection.', [
          { text: 'Retry', onPress: () => fetchProfiles() }, { text: 'Cancel' },
        ]);
      }
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => { fetchProfiles(); }, []);
  useFocusEffect(useCallback(() => {
    if (profiles.length === 0) fetchProfiles();
  }, [profiles.length]));

  const goToNext = useCallback(() => {
    setCurrentPhotoIndex(0);
    setShowDetails(false);
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
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
    try { await api.swipe(currentProfile.id, 'DISLIKE'); } catch (e) { console.error('Dislike failed:', e); }
    goToNext();
  }, [currentProfile, currentIndex, goToNext]);

  const handleUndo = useCallback(() => {
    if (!lastDisliked) return;
    setProfiles(prev => { const u = [...prev]; u.splice(currentIndex, 0, lastDisliked.profile); return u; });
    setLastDisliked(null);
  }, [lastDisliked, currentIndex]);

  const viewFullProfile = useCallback(() => {
    if (currentProfile) navigation.navigate('ProfileDetail', { profile: currentProfile });
  }, [currentProfile, navigation]);

  const nextPhoto = useCallback(() => {
    if (currentProfile && currentPhotoIndex < currentProfile.photos.length - 1)
      setCurrentPhotoIndex(prev => prev + 1);
  }, [currentPhotoIndex, currentProfile]);

  const previousPhoto = useCallback(() => {
    if (currentPhotoIndex > 0) setCurrentPhotoIndex(prev => prev - 1);
  }, [currentPhotoIndex]);

  // ── Stable refs — fixes stale closure in panResponder ───────────────────
  const handleLikeRef = useRef(handleLike);
  const handleDislikeRef = useRef(handleDislike);
  useEffect(() => { handleLikeRef.current = handleLike; }, [handleLike]);
  useEffect(() => { handleDislikeRef.current = handleDislike; }, [handleDislike]);

  // ── PanResponder — uses refs so it always has latest handlers ────────────
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 8,
    onPanResponderMove: (_, gs) => { swipeX.setValue(gs.dx); swipeY.setValue(gs.dy * 0.15); },
    onPanResponderRelease: (_, gs) => {
      if (gs.dx > SWIPE_THRESHOLD) {
        Animated.timing(swipeX, { toValue: 500, duration: 250, useNativeDriver: true }).start(() => {
          swipeX.setValue(0); swipeY.setValue(0); showStamp('like', () => {});
        });
        handleLikeRef.current();
      } else if (gs.dx < -SWIPE_THRESHOLD) {
        Animated.timing(swipeX, { toValue: -500, duration: 250, useNativeDriver: true }).start(() => {
          swipeX.setValue(0); swipeY.setValue(0); showStamp('nope', () => {});
        });
        handleDislikeRef.current();
      } else {
        resetSwipe();
      }
    },
    onPanResponderTerminate: resetSwipe,
  }), [showStamp, resetSwipe, swipeX, swipeY]);

  const cardRotate = swipeX.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-12deg', '0deg', '12deg'], extrapolate: 'clamp' });
  const likeOpacity = swipeX.interpolate({ inputRange: [20, 80], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = swipeX.interpolate({ inputRange: [-80, -20], outputRange: [1, 0], extrapolate: 'clamp' });

  const dynamicStyles = useMemo(() => StyleSheet.create({
    card: { width: cardWidth, height: cardHeight, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', backgroundColor: COLORS.white, ...SHADOWS.large },
    cardName: { fontSize: responsiveFonts.cardName, fontWeight: 'bold', color: COLORS.white },
    cardDistance: { fontSize: responsiveFonts.cardDistance, color: COLORS.white, opacity: 0.9, marginBottom: SPACING.sm },
    cardBio: { fontSize: responsiveFonts.cardBio, color: COLORS.white, opacity: 0.9, marginBottom: SPACING.sm },
    interestText: { fontSize: responsiveFonts.interestText, color: COLORS.white, fontWeight: '500' },
    logoText: { fontSize: responsiveFonts.logoText, fontWeight: 'bold', color: COLORS.primary },
    headerButton: { width: Math.max(MIN_TOUCH_SIZE, 40), height: Math.max(MIN_TOUCH_SIZE, 40), borderRadius: Math.max(MIN_TOUCH_SIZE, 40) / 2, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOWS.small },
    profilePic: { width: Math.max(MIN_TOUCH_SIZE, 40), height: Math.max(MIN_TOUCH_SIZE, 40), borderRadius: Math.max(MIN_TOUCH_SIZE, 40) / 2, backgroundColor: COLORS.border },
    emptyTitle: { fontSize: responsiveFonts.emptyTitle, fontWeight: 'bold', color: COLORS.text, marginTop: SPACING.lg, textAlign: 'center' },
    emptySubtitle: { fontSize: responsiveFonts.emptySubtitle, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, paddingHorizontal: SPACING.xl },
    skeletonCard: { width: cardWidth, height: cardHeight, borderRadius: BORDER_RADIUS.xl, backgroundColor: COLORS.border, overflow: 'hidden' },
  }), [cardWidth, cardHeight, responsiveFonts]);

  const progressFraction = profiles.length > 0 ? (currentIndex + 1) / profiles.length : 0;

  // ── Early returns ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
        <View style={styles.contentContainer}>
          <Animated.View style={[dynamicStyles.skeletonCard, { opacity: skeletonAnim }]}>
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

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity hitSlop={HIT_SLOP} onPress={() => navigation.navigate('Profile')}>
          <Image source={{ uri: myProfile?.photo || 'https://via.placeholder.com/40' }} style={dynamicStyles.profilePic} />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={dynamicStyles.logoText}>TrustMatch</Text>
        </View>
        <TouchableOpacity style={dynamicStyles.headerButton} hitSlop={HIT_SLOP} onPress={() => navigation.navigate('Filters')}>
          <Ionicons name="options" size={responsiveIconSizes.filter} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Card */}
      <View style={styles.contentContainer}>
        <Animated.View
          style={[dynamicStyles.card, styles.profileCard, { transform: [{ translateX: swipeX }, { translateY: swipeY }, { rotate: cardRotate }] }]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[styles.swipeOverlay, styles.swipeOverlayLike, { opacity: likeOpacity }]} pointerEvents="none">
            <Text style={styles.swipeOverlayText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeOverlay, styles.swipeOverlayNope, { opacity: nopeOpacity }]} pointerEvents="none">
            <Text style={styles.swipeOverlayText}>NOPE</Text>
          </Animated.View>

          <Image source={{ uri: currentProfile.photos[currentPhotoIndex] }} style={styles.cardImage} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.cardGradient} />

          {currentProfile.photos.length > 1 && (
            <View style={styles.photoIndicators}>
              {currentProfile.photos.map((_, i) => (
                <View key={i} style={[styles.photoIndicator, i === currentPhotoIndex && styles.activePhotoIndicator]} />
              ))}
            </View>
          )}

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

          {/* Tap zones — top 60% for photo nav */}
          <View style={styles.tapZoneContainer} pointerEvents="none">
            <TouchableOpacity style={styles.tapZoneLeft} activeOpacity={1} onPress={previousPhoto} onLongPress={() => showStamp('nope', handleDislike)} />
            <TouchableOpacity style={styles.tapZoneMiddle} activeOpacity={1} onPress={viewFullProfile} />
            <TouchableOpacity style={styles.tapZoneRight} activeOpacity={1} onPress={nextPhoto} onLongPress={() => showStamp('like', handleLike)} />
          </View>

          {/* Tap zones — bottom 40% for like/dislike */}
          <View style={styles.tapZoneBottomContainer} pointerEvents="none">
            <TouchableOpacity style={styles.tapZoneBottomLeft} activeOpacity={1} onPress={() => showStamp('nope', handleDislike)} />
            <TouchableOpacity style={styles.tapZoneBottomMiddle} activeOpacity={1} onPress={viewFullProfile} />
            <TouchableOpacity style={styles.tapZoneBottomRight} activeOpacity={1} onPress={() => showStamp('like', handleLike)} />
          </View>

          {stampType !== null && (
            <Animated.View
              style={[styles.stampOverlay, stampType === 'like' ? styles.stampLike : styles.stampNope, { opacity: stampAnim, transform: [{ rotate: stampType === 'like' ? '-15deg' : '15deg' }] }]}
              pointerEvents="none"
            >
              <Text style={styles.stampText}>{stampType === 'like' ? 'LIKE' : 'NOPE'}</Text>
            </Animated.View>
          )}

          {/* Card info */}
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={dynamicStyles.cardName}>{currentProfile.name}, {currentProfile.age}</Text>
              {currentProfile.isVerified && <VerifiedBadge isVerified size="medium" />}
            </View>
            <View style={styles.trustRow}>
              <View style={styles.trustScore}>
                <Ionicons name="shield-checkmark" size={14} color={COLORS.white} />
                <Text style={styles.trustScoreText}>{currentProfile.trustScore}% Trusted</Text>
              </View>
              <View style={styles.compatibility}>
                <View style={styles.compatibilityDot} />
                <Text style={styles.compatibilityText}>{currentProfile.compatibility}% Match</Text>
              </View>
            </View>
            {!!currentProfile.city && (
              <Text style={dynamicStyles.cardDistance}>
                <Ionicons name="location" size={responsiveIconSizes.location} color={COLORS.white} /> {currentProfile.city}
              </Text>
            )}
            {!showDetails ? (
              <>
                {!!currentProfile.bio && <Text style={dynamicStyles.cardBio} numberOfLines={2}>{currentProfile.bio}</Text>}
                <View style={styles.interestsRow}>
                  {currentProfile.interests.slice(0, 3).map((interest, i) => (
                    <View key={i} style={styles.interestTag}>
                      <Text style={dynamicStyles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={styles.expandBtn} onPress={() => setShowDetails(true)}>
                  <Ionicons name="chevron-up" size={16} color={COLORS.white} />
                  <Text style={styles.expandBtnText}>View profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {!!currentProfile.aboutMe && <Text style={dynamicStyles.cardBio} numberOfLines={3}>{currentProfile.aboutMe}</Text>}
                {!!currentProfile.occupation && (
                  <View style={styles.detailRow}>
                    <Ionicons name="briefcase-outline" size={13} color={COLORS.white} />
                    <Text style={styles.detailText}>{currentProfile.occupation}</Text>
                  </View>
                )}
                {!!currentProfile.education && (
                  <View style={styles.detailRow}>
                    <Ionicons name="school-outline" size={13} color={COLORS.white} />
                    <Text style={styles.detailText}>{currentProfile.education}</Text>
                  </View>
                )}
                {currentProfile.interests.length > 0 && (
                  <View style={styles.interestsRow}>
                    {currentProfile.interests.slice(0, 5).map((interest, i) => (
                      <View key={i} style={styles.interestTag}>
                        <Text style={dynamicStyles.interestText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity style={styles.expandBtn} onPress={() => setShowDetails(false)}>
                  <Ionicons name="chevron-down" size={16} color={COLORS.white} />
                  <Text style={styles.expandBtnText}>Show less</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressFraction * 100}%` as any }]} />
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={[styles.actionBtn, styles.undoBtn, !lastDisliked && styles.actionBtnDisabled]} onPress={handleUndo} disabled={!lastDisliked} hitSlop={HIT_SLOP}>
          <Ionicons name="arrow-undo" size={22} color={lastDisliked ? COLORS.warning : COLORS.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.dislikeBtn]} onPress={handleDislike} hitSlop={HIT_SLOP}>
          <Ionicons name="close" size={responsiveIconSizes.actionLarge} color={COLORS.error} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={handleLike} hitSlop={HIT_SLOP}>
          <Ionicons name="heart" size={responsiveIconSizes.actionLarge} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Match Modal */}
      {matchModal.profile && myProfile && (
        <MatchModal
          visible={matchModal.visible}
          myProfile={myProfile}
          matchedProfile={{ id: matchModal.profile.id, name: matchModal.profile.name, age: matchModal.profile.age, photo: matchModal.profile.photos[0], interests: matchModal.profile.interests, compatibility: matchModal.profile.compatibility, bio: matchModal.profile.bio }}
          suggestions={profiles.filter(p => p.id !== matchModal.profile!.id && p.id !== currentProfile?.id).slice(0, 4).map(p => ({ id: p.id, name: p.name, photo: p.photos[0], compatibility: p.compatibility }))}
          onSendMessage={() => {
            const { profile, matchId } = matchModal;
            setMatchModal({ visible: false, profile: null, matchId: null });
            if (matchId && profile) navigation.navigate('Chat', { matchId, name: profile.name });
            else navigation.navigate('Messages');
          }}
          onKeepSwiping={() => setMatchModal({ visible: false, profile: null, matchId: null })}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  contentContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  profileCard: { position: 'relative' },
  swipeOverlay: { position: 'absolute', top: 60, zIndex: 10, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, borderWidth: 3 },
  swipeOverlayLike: { left: 20, borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.15)', transform: [{ rotate: '-15deg' }] },
  swipeOverlayNope: { right: 20, borderColor: COLORS.error, backgroundColor: 'rgba(220,38,38,0.15)', transform: [{ rotate: '15deg' }] },
  swipeOverlayText: { fontSize: 28, fontWeight: '900', color: COLORS.white, letterSpacing: 2 },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' },
  photoIndicators: { position: 'absolute', top: SPACING.sm, left: SPACING.sm, right: SPACING.sm, flexDirection: 'row', gap: 4 },
  photoIndicator: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  activePhotoIndicator: { backgroundColor: COLORS.white },
  photoArrowLeft: { position: 'absolute', left: 12, top: '40%', transform: [{ translateY: -20 }], width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  photoArrowRight: { position: 'absolute', right: 12, top: '40%', transform: [{ translateY: -20 }], width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  tapZoneContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%', flexDirection: 'row' },
  tapZoneLeft: { width: '40%', height: '100%' },
  tapZoneMiddle: { width: '20%', height: '100%' },
  tapZoneRight: { width: '40%', height: '100%' },
  tapZoneBottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', flexDirection: 'row' },
  tapZoneBottomLeft: { width: '40%', height: '100%' },
  tapZoneBottomMiddle: { width: '20%', height: '100%' },
  tapZoneBottomRight: { width: '40%', height: '100%' },
  stampOverlay: { position: 'absolute', top: '30%', alignSelf: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.lg, borderWidth: 3 },
  stampLike: { backgroundColor: 'rgba(16,185,129,0.85)', borderColor: '#10B981', left: '10%' },
  stampNope: { backgroundColor: 'rgba(220,38,38,0.85)', borderColor: COLORS.error, right: '10%' },
  stampText: { fontSize: 28, fontWeight: '900', color: COLORS.white, letterSpacing: 2 },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  trustRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xs, flexWrap: 'wrap' },
  trustScore: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: 'rgba(99,102,241,0.9)', paddingVertical: 4, paddingHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.full },
  trustScoreText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  compatibility: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: 'rgba(236,72,153,0.9)', paddingVertical: 4, paddingHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.full },
  compatibilityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FDE68A' },
  compatibilityText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  interestsRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginTop: SPACING.xs },
  interestTag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.full },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.xs, alignSelf: 'flex-start' },
  expandBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '600', opacity: 0.9 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  detailText: { color: COLORS.white, fontSize: 13, opacity: 0.9 },
  progressBarContainer: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm },
  progressBarTrack: { height: 3, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2, backgroundColor: COLORS.primary },
  actionContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING.md, paddingBottom: SPACING.lg, gap: SPACING.lg },
  actionBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.full, ...SHADOWS.medium },
  actionBtnDisabled: { opacity: 0.35 },
  undoBtn: { width: 52, height: 52, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.warning },
  dislikeBtn: { width: 64, height: 64, backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.error },
  likeBtn: { width: 80, height: 80, backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  refreshButton: { marginTop: SPACING.xl, backgroundColor: COLORS.primary, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xxl, borderRadius: BORDER_RADIUS.full, ...SHADOWS.glow },
  refreshButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  skeletonInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, gap: SPACING.sm },
  skeletonLine: { height: 16, borderRadius: BORDER_RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.3)', width: '70%' },
  skeletonLineShort: { width: '40%', height: 12 },
  skeletonLineMedium: { width: '55%', height: 12 },
});
