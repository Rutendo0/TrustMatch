import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
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

// Current user profile data
const CURRENT_USER = {
  id: 'current-user',
  name: 'Alex',
  age: 28,
  photos: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  ],
  isVerified: true,
};

const MOCK_PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Sarah',
    age: 28,
    bio: 'Coffee enthusiast ☕ | Love hiking and outdoor adventures | Looking for genuine connections',
    distance: 'Harare',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'
    ],
    isVerified: true,
    trustScore: 95,
    compatibility: 87,
    personalityType: 'ENFP',
    interests: ['Travel', 'Photography', 'Hiking'],
    safetyFeatures: ['Video Verified', 'ID Checked', 'Background Check'],
    verificationBadges: ['Identity', 'Selfie', 'Employment'],
  },
  {
    id: '2',
    name: 'Emily',
    age: 25,
    bio: 'Artist and dreamer 🎨 | Dog mom | Here to find my person',
    distance: 'Bulawayo',
    photos: [
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400'
    ],
    isVerified: true,
    trustScore: 92,
    compatibility: 89,
    personalityType: 'INFP',
    interests: ['Art', 'Music', 'Dogs'],
    safetyFeatures: ['Video Verified', 'ID Checked', 'Social Media'],
    verificationBadges: ['Identity', 'Selfie', 'Education'],
  },
  {
    id: '3',
    name: 'Jessica',
    age: 30,
    bio: 'Foodie exploring the city 🍕 | Tech professional | Looking for someone to share adventures with',
    distance: 'Mutare',
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'
    ],
    isVerified: true,
    trustScore: 98,
    compatibility: 91,
    personalityType: 'ENTJ',
    interests: ['Food', 'Technology', 'Travel'],
    safetyFeatures: ['Video Verified', 'ID Checked', 'Employment', 'Background Check'],
    verificationBadges: ['Identity', 'Selfie', 'Employment', 'Education'],
  },
];

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { width, height, wp, hp, normalize, isLandscape, isTablet } = useResponsive();

  // ALL HOOKS AT TOP - NO EARLY RETURNS BEFORE THIS POINT
  
  // Header setup
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Discover',
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: COLORS.background },
      headerTintColor: COLORS.text,
      headerRight: () => (
        <View style={{ marginRight: 16 }}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Filters')}
            hitSlop={HIT_SLOP}
          >
            <Ionicons name="options-outline" size={normalize(24)} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, normalize]);
  
  const cardDimensions = useMemo(() => {
    const cardHeight = isLandscape ? hp(75) : hp(60);
    const cardWidth = isLandscape 
      ? Math.min(wp(50), height * 0.65)
      : wp(100) - SPACING.lg * 2;
    return { cardHeight, cardWidth };
  }, [width, height, isLandscape, wp, hp]);

  const { cardHeight, cardWidth } = cardDimensions;

  const responsiveFonts = useMemo(() => ({
    cardName: normalize(24),
    cardDistance: normalize(14),
    cardBio: normalize(16),
    interestText: normalize(12),
    logoText: normalize(20),
    emptyTitle: normalize(20),
    emptySubtitle: normalize(16),
  }), [normalize]);

  const responsiveIconSizes = useMemo(() => ({
    actionLarge: normalize(30),
    actionMedium: normalize(28),
    location: normalize(14),
    emptyState: normalize(80),
    filter: normalize(24),
    arrow: normalize(24),
    photoIndicator: normalize(8),
  }), [normalize]);

  const actionButtonSize = useMemo(() => Math.max(MIN_TOUCH_SIZE, normalize(60)), [normalize]);

  // All state hooks
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<{ name: string; photo: string; interests: string[] } | null>(null);
  const [matchModal, setMatchModal] = useState<{ visible: boolean; profile: Profile | null; matchId: string | null }>({ visible: false, profile: null, matchId: null });
  const [lastDisliked, setLastDisliked] = useState<{ profile: Profile; index: number } | null>(null);

  // Effects
  useEffect(() => {
    fetchProfiles();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
    }, [])
  );

  // Memoized values & callbacks
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
    },
    emptySubtitle: {
      fontSize: responsiveFonts.emptySubtitle,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginTop: SPACING.sm,
    },
  }), [cardWidth, cardHeight, responsiveFonts]);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    console.log('Fetching discover profiles...');
    
    try {
      let filters = {};
      try {
        const userProfile = await api.getProfile();
        console.log('User profile loaded:', { 
          id: userProfile?.id, 
          firstName: userProfile?.firstName,
          preferences: userProfile?.preferences 
        });
        
        filters = {
          gender: userProfile?.preferences?.showMe,
          ageMin: userProfile?.preferences?.ageRange?.min,
          ageMax: userProfile?.preferences?.ageRange?.max,
        };
        
        // Store my profile for the match modal
        setMyProfile({
          name: userProfile?.firstName || 'You',
          photo: userProfile?.photos?.[0]?.url || userProfile?.photos?.[0] || '',
          interests: userProfile?.interests || [],
        });
      } catch (profileError: any) {
        console.warn('Could not fetch user preferences:', profileError);
        console.warn('Error details:', profileError.response?.data || profileError.message);
      }
      
      console.log('Fetching profiles with filters:', filters);
      const data = await api.getDiscoverProfiles(10, filters);
      console.log('Received profiles:', data?.length || 0);
      
      if (!data || data.length === 0) {
        console.log('No profiles returned from API');
        setProfiles([]);
        setLoading(false);
        return;
      }
      
      const mappedProfiles: Profile[] = (data || []).map((p: any) => ({
        id: p?.id || Math.random().toString(),
        name: p?.firstName || p?.name || 'User',
        age: p?.age || 25,
        bio: p?.bio || 'No bio available',
        distance: p?.city || p?.country || 'Unknown location',
        photos: p?.photos?.length > 0 ? p.photos : ['https://via.placeholder.com/400'],
        isVerified: p?.isVerified || false,
        trustScore: p?.trustScore || 85,
        compatibility: Math.floor(Math.random() * 30) + 70,
        personalityType: 'N/A',
        interests: p?.interests || [],
        safetyFeatures: p?.isVerified ? ['Verified'] : [],
        verificationBadges: p?.isVerified ? ['Identity', 'Selfie'] : [],
      }));
      
      console.log('Mapped profiles:', mappedProfiles.length);
      setProfiles(mappedProfiles);
    } catch (error: any) {
      console.error('Failed to fetch profiles:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // Check if it's a verification error
      if (error.response?.status === 403) {
        Alert.alert(
          'Verification Required',
          'Please complete all verification steps to start discovering profiles.',
          [
            { text: 'Complete Verification', onPress: () => navigation.navigate('ProfileSetup', { formData: {} }) },
            { text: 'Later' }
          ]
        );
      } else {
        // Show user-friendly error
        Alert.alert(
          'Could Not Load Profiles',
          error.response?.data?.error || error.message || 'Please check your connection and try again.',
          [
            { text: 'Retry', onPress: () => fetchProfiles() },
            { text: 'Cancel' }
          ]
        );
      }
      
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  const handleLike = useCallback(async () => {
    if (!currentProfile) return;
    
    console.log('Liking profile:', currentProfile.id);
    setLikedProfiles(prev => [...prev, currentProfile.id]);
    
    try {
      const result = await api.swipe(currentProfile.id, 'LIKE');
      console.log('Like result:', result);
      
      // If it's a mutual match, show the match modal
      if (result?.isMatch) {
        setMatchModal({ visible: true, profile: currentProfile, matchId: result.matchId || null });
      } else {
        // No match, just move to next profile
        goToNext();
      }
    } catch (error: any) {
      console.error('Failed to swipe:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Show error to user
      Alert.alert(
        'Like Failed',
        error.response?.data?.error || error.message || 'Could not like this profile. Please try again.',
        [{ text: 'OK' }]
      );
      
      // Remove from liked profiles since it failed
      setLikedProfiles(prev => prev.filter(id => id !== currentProfile.id));
    }
  }, [currentProfile, goToNext]);

  const handleDislike = useCallback(async () => {
    if (!currentProfile) return;
    // Save for undo
    setLastDisliked({ profile: currentProfile, index: currentIndex });
    try {
      await api.swipe(currentProfile.id, 'DISLIKE');
    } catch (error) {
      console.error('Failed to swipe:', error);
    }
    goToNext();
  }, [currentProfile, currentIndex]);

  const handleUndo = useCallback(async () => {
    if (!lastDisliked) return;
    // Re-insert the disliked profile at current position
    setProfiles(prev => {
      const updated = [...prev];
      updated.splice(currentIndex, 0, lastDisliked.profile);
      return updated;
    });
    setLastDisliked(null);
  }, [lastDisliked, currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentPhotoIndex(0);
    }
  }, [currentIndex, profiles.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setCurrentPhotoIndex(0);
    }
  }, [currentIndex]);

  const viewFullProfile = useCallback(() => {
    if (currentProfile) {
      navigation.navigate('ProfileDetail', { profile: currentProfile });
    }
  }, [currentProfile, navigation]);

  const nextPhoto = useCallback(() => {
    if (currentProfile! && currentPhotoIndex < currentProfile!.photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  }, [currentPhotoIndex, currentProfile]);

  const previousPhoto = useCallback(() => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  }, [currentPhotoIndex]);

  // NOW EARLY RETURNS ARE SAFE - ALL HOOKS HAVE RUN

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (profiles.length === 0 || currentIndex >= profiles.length) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No more profiles nearby</Text>
          <Text style={styles.subText}>Check back later for new matches</Text>
        </View>
      </SafeAreaView>
    );
  }

  // MAIN RENDER
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity 
          hitSlop={HIT_SLOP}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.profilePicContainer}>
            <Image
              source={{ uri: CURRENT_USER.photos[0] }}
              style={dynamicStyles.profilePic}
            />
            {CURRENT_USER.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
              </View>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={dynamicStyles.logoText}>TrustMatch</Text>
        </View>
        <TouchableOpacity 
          style={dynamicStyles.headerButton} 
          hitSlop={HIT_SLOP}
          onPress={() => navigation.navigate('Filters')}
        >
          <Ionicons name="options" size={responsiveIconSizes.filter} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <TouchableOpacity 
          style={[dynamicStyles.card, styles.profileCard]} 
          onPress={viewFullProfile}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: currentProfile.photos[currentPhotoIndex] }}
            style={styles.cardImage}
          />
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardGradient}
          />

          {currentProfile.photos.length > 1 && (
            <View style={styles.photoIndicators}>
              {currentProfile.photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.photoIndicator,
                    index === currentPhotoIndex && styles.activePhotoIndicator
                  ]}
                />
              ))}
            </View>
          )}

          {currentProfile.photos.length > 1 && (
            <>
              {currentPhotoIndex > 0 && (
                <TouchableOpacity 
                  style={styles.photoArrowLeft} 
                  onPress={previousPhoto}
                  hitSlop={HIT_SLOP}
                >
                  <Ionicons name="chevron-back" size={responsiveIconSizes.arrow} color={COLORS.white} />
                </TouchableOpacity>
              )}
              {currentPhotoIndex < currentProfile.photos.length - 1 && (
                <TouchableOpacity 
                  style={styles.photoArrowRight} 
                  onPress={nextPhoto}
                  hitSlop={HIT_SLOP}
                >
                  <Ionicons name="chevron-forward" size={responsiveIconSizes.arrow} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={dynamicStyles.cardName}>{currentProfile.name}, {currentProfile.age}</Text>
              {currentProfile.isVerified && <VerifiedBadge isVerified size="medium" />}
            </View>
            
            <View style={styles.trustRow}>
              <View style={styles.trustScore}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.trustScore} />
                <Text style={styles.trustScoreText}>{currentProfile.trustScore}% Trusted</Text>
              </View>
              <View style={styles.compatibility}>
                <Ionicons name="heart" size={16} color={COLORS.secondary} />
                <Text style={styles.compatibilityText}>{currentProfile.compatibility}% Match</Text>
              </View>
            </View>
            
            <Text style={dynamicStyles.cardDistance}>
              <Ionicons name="location" size={responsiveIconSizes.location} color={COLORS.white} /> {currentProfile.distance}
            </Text>
            
            <Text style={styles.personalityType}>{currentProfile.personalityType}</Text>
            
            <Text style={dynamicStyles.cardBio} numberOfLines={2}>{currentProfile.bio}</Text>
            
            <View style={styles.safetyRow}>
              {currentProfile.safetyFeatures.slice(0, 3).map((feature, i) => (
                <View key={i} style={styles.safetyBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                  <Text style={styles.safetyText}>{feature}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.interestsRow}>
              {currentProfile.interests.slice(0, 3).map((interest, i) => (
                <View key={i} style={styles.interestTag}>
                  <Text style={dynamicStyles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actionContainer}>
        {/* Undo button */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.undoBtn, !lastDisliked && styles.actionBtnDisabled]}
          onPress={handleUndo}
          disabled={!lastDisliked}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="arrow-undo" size={22} color={lastDisliked ? COLORS.warning : COLORS.textLight} />
        </TouchableOpacity>

        {/* Dislike */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.dislikeBtn]}
          onPress={handleDislike}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="close" size={responsiveIconSizes.actionLarge} color={COLORS.error} />
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.likeBtn]}
          onPress={handleLike}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="heart" size={responsiveIconSizes.actionLarge} color={COLORS.white} />
        </TouchableOpacity>

        {/* Super like */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.superLikeBtn]}
          onPress={async () => {
            if (!currentProfile) return;
            try { await api.swipe(currentProfile.id, 'SUPERLIKE'); } catch {}
            goToNext();
          }}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="star" size={22} color={COLORS.info} />
        </TouchableOpacity>
      </View>

      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {currentIndex + 1} of {profiles.length}
        </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: normalize(FONTS.sizes.lg),
    color: COLORS.text,
    marginBottom: normalize(SPACING.sm),
  },
  subText: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.textSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
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
    height: '50%',
  },
  photoIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  photoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activePhotoIndicator: {
    backgroundColor: COLORS.white,
  },
  photoArrowLeft: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoArrowRight: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  trustScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingVertical: SPACING.xs,
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
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  compatibilityText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  personalityType: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
  },
  safetyRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  safetyText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  interestsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  interestTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
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
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
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
    width: 48,
    height: 48,
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
    width: 76,
    height: 76,
    backgroundColor: COLORS.primary,
    ...SHADOWS.glow,
  },
  superLikeBtn: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.info,
  },
  counterContainer: {
    alignItems: 'center',
    paddingBottom: SPACING.lg,
  },
  counterText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
