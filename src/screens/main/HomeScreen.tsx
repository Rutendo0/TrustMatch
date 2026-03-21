import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VerifiedBadge } from '../../components/common';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useResponsive, normalize, MIN_TOUCH_SIZE, HIT_SLOP } from '../../hooks/useResponsive';
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
    distance: '3 km away',
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
    distance: '5 km away',
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
    distance: '8 km away',
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
  const { width, height, wp, hp, normalize, isLandscape, isTablet } = useResponsive();
  
  // Set up header with filter button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Discover',
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: COLORS.background },
      headerTintColor: COLORS.text,
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('Filters')}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="options-outline" size={normalize(24)} color={COLORS.text} />
        </TouchableOpacity>
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

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Refresh profiles when screen comes into focus (e.g., after returning from filters)
  useFocusEffect(
    React.useCallback(() => {
      fetchProfiles();
    }, [])
  );

  const fetchProfiles = async () => {
    try {
      // Get user profile to access preferences
      let filters;
      try {
        const userProfile = await api.getProfile();
        filters = {
          gender: userProfile?.preferences?.showMe,
          ageMin: userProfile?.preferences?.ageRange?.min,
          ageMax: userProfile?.preferences?.ageRange?.max,
          distance: userProfile?.preferences?.distance,
        };
      } catch (profileError) {
        console.warn('Could not fetch user preferences:', profileError);
      }
      const data = await api.getDiscoverProfiles(10, filters);
      // Map API response to Profile interface
      const mappedProfiles: Profile[] = (data || []).map((p: any) => ({
        id: p?.id || Math.random().toString(),
        name: p?.firstName || p?.name || 'User',
        age: p?.age || 25,
        bio: p?.bio || 'No bio available',
        distance: p?.city ? `${p.city}` : 'Unknown distance',
        photos: p?.photos?.length > 0 ? p.photos : ['https://via.placeholder.com/400'],
        isVerified: p?.isVerified || false,
        trustScore: p?.trustScore || 85,
        compatibility: Math.floor(Math.random() * 30) + 70, // Random 70-100
        personalityType: 'N/A',
        interests: p?.interests || [],
        safetyFeatures: p?.isVerified ? ['Verified'] : [],
        verificationBadges: p?.isVerified ? ['Identity', 'Selfie'] : [],
      }));
      setProfiles(mappedProfiles);
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
      // Set empty profiles on error - user will see no profiles available
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const currentProfile = (profiles && profiles.length > 0) ? profiles[currentIndex] : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No more profiles nearby</Text>
          <Text style={styles.subText}>Check back later for new matches</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleLike = async () => {
    if (currentProfile) {
      setLikedProfiles(prev => [...prev, currentProfile.id]);
      try {
        await api.swipe(currentProfile.id, 'LIKE');
        console.log('Swipe sent: LIKE');
      } catch (error) {
        console.error('Failed to swipe:', error);
      }
    }
  };

  const handleDislike = async () => {
    if (currentProfile) {
      try {
        await api.swipe(currentProfile.id, 'DISLIKE');
        console.log('Swipe sent: DISLIKE');
      } catch (error) {
        console.error('Failed to swipe:', error);
      }
    }
  };

  const handleSuperLike = async () => {
    if (currentProfile) {
      try {
        await api.swipe(currentProfile.id, 'SUPERLIKE');
        console.log('Swipe sent: SUPERLIKE');
      } catch (error) {
        console.error('Failed to swipe:', error);
      }
    }
  };

  const goToNext = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentPhotoIndex(0);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setCurrentPhotoIndex(0);
    }
  };

  const viewFullProfile = () => {
    if (currentProfile) {
      navigation.navigate('ProfileDetail', { profile: currentProfile });
    }
  };

  const nextPhoto = () => {
    if (currentProfile && currentPhotoIndex < currentProfile.photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  const previousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

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

  if (currentIndex >= profiles.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.emptyState}>
          <Ionicons name="heart-dislike" size={responsiveIconSizes.emptyState} color={COLORS.textLight} />
          <Text style={dynamicStyles.emptyTitle}>No More Profiles</Text>
          <Text style={dynamicStyles.emptySubtitle}>
            Check back later for new matches in your area
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
        {/* Profile Card */}
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

          {/* Photo Navigation Indicators */}
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

          {/* Photo Navigation Arrows */}
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

      {/* Navigation and Action Buttons */}
      <View style={styles.actionContainer}>
        {/* Previous Button */}
        <TouchableOpacity
          style={[styles.navButton, styles.previousButton]}
          onPress={goToPrevious}
          disabled={currentIndex === 0}
          hitSlop={HIT_SLOP}
        >
          <Ionicons 
            name="chevron-back" 
            size={responsiveIconSizes.actionLarge} 
            color={currentIndex === 0 ? COLORS.textLight : COLORS.text} 
          />
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity
          style={[styles.likeButton]}
          onPress={handleLike}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="heart" size={responsiveIconSizes.actionLarge} color={COLORS.white} />
        </TouchableOpacity>

        {/* Next Button */}
        <TouchableOpacity
          style={[styles.navButton, styles.nextButton]}
          onPress={goToNext}
          disabled={currentIndex === profiles.length - 1}
          hitSlop={HIT_SLOP}
        >
          <Ionicons 
            name="chevron-forward" 
            size={responsiveIconSizes.actionLarge} 
            color={currentIndex === profiles.length - 1 ? COLORS.textLight : COLORS.text} 
          />
        </TouchableOpacity>
      </View>

      {/* Profile Counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {currentIndex + 1} of {profiles.length}
        </Text>
      </View>
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
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xl,
  },
  navButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  previousButton: {
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  nextButton: {
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  likeButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.large,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
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
});
