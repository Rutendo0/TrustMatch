import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VerifiedBadge } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.lg * 2;
const CARD_HEIGHT = height * 0.65;
const SWIPE_THRESHOLD = width * 0.25;

interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  distance: string;
  photos: string[];
  isVerified: boolean;
  interests: string[];
}

const MOCK_PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Sarah',
    age: 28,
    bio: 'Coffee enthusiast ☕ | Love hiking and outdoor adventures | Looking for genuine connections',
    distance: '3 km away',
    photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'],
    isVerified: true,
    interests: ['Travel', 'Photography', 'Hiking'],
  },
  {
    id: '2',
    name: 'Emily',
    age: 25,
    bio: 'Artist and dreamer 🎨 | Dog mom | Here to find my person',
    distance: '5 km away',
    photos: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'],
    isVerified: true,
    interests: ['Art', 'Music', 'Dogs'],
  },
  {
    id: '3',
    name: 'Jessica',
    age: 30,
    bio: 'Foodie exploring the city 🍕 | Tech professional | Looking for someone to share adventures with',
    distance: '8 km away',
    photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400'],
    isVerified: true,
    interests: ['Food', 'Technology', 'Travel'],
  },
];

export const HomeScreen: React.FC = () => {
  const [profiles, setProfiles] = useState(MOCK_PROFILES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  };

  const swipeRight = () => {
    Animated.timing(position, {
      toValue: { x: width + 100, y: 0 },
      duration: 300,
      useNativeDriver: true,
    }).start(() => handleSwipeComplete('like'));
  };

  const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -width - 100, y: 0 },
      duration: 300,
      useNativeDriver: true,
    }).start(() => handleSwipeComplete('dislike'));
  };

  const handleSwipeComplete = (action: 'like' | 'dislike') => {
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex((prev) => prev + 1);
    console.log(`${action} on profile:`, profiles[currentIndex]?.name);
  };

  const handleActionButton = (action: 'dislike' | 'superlike' | 'like') => {
    if (action === 'like') {
      swipeRight();
    } else if (action === 'dislike') {
      swipeLeft();
    } else {
      console.log('Superlike!');
      swipeRight();
    }
  };

  const renderCard = (profile: Profile, index: number) => {
    if (index < currentIndex) return null;

    const isCurrentCard = index === currentIndex;
    const cardStyle = isCurrentCard
      ? {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
        }
      : {
          transform: [{ scale: nextCardScale }],
        };

    return (
      <Animated.View
        key={profile.id}
        style={[
          styles.card,
          cardStyle,
          { zIndex: profiles.length - index },
        ]}
        {...(isCurrentCard ? panResponder.panHandlers : {})}
      >
        <Image
          source={{ uri: profile.photos[0] }}
          style={styles.cardImage}
        />
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.cardGradient}
        />

        {isCurrentCard && (
          <>
            <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
              <Text style={styles.likeLabelText}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
              <Text style={styles.nopeLabelText}>NOPE</Text>
            </Animated.View>
          </>
        )}

        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName}>{profile.name}, {profile.age}</Text>
            {profile.isVerified && <VerifiedBadge isVerified size="medium" />}
          </View>
          <Text style={styles.cardDistance}>
            <Ionicons name="location" size={14} color={COLORS.white} /> {profile.distance}
          </Text>
          <Text style={styles.cardBio} numberOfLines={2}>{profile.bio}</Text>
          <View style={styles.interestsRow}>
            {profile.interests.slice(0, 3).map((interest, i) => (
              <View key={i} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    );
  };

  const currentProfile = profiles[currentIndex];

  if (currentIndex >= profiles.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="heart-dislike" size={80} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No More Profiles</Text>
          <Text style={styles.emptySubtitle}>
            Check back later for new matches in your area
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://via.placeholder.com/40' }}
          style={styles.profilePic}
        />
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>TrustMatch</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardsContainer}>
        {profiles.slice(currentIndex, currentIndex + 2).reverse().map((profile, i) =>
          renderCard(profile, currentIndex + (1 - i))
        )}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.dislikeButton]}
          onPress={() => handleActionButton('dislike')}
        >
          <Ionicons name="close" size={30} color={COLORS.error} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.superlikeButton]}
          onPress={() => handleActionButton('superlike')}
        >
          <Ionicons name="star" size={28} color="#3B82F6" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleActionButton('like')}
        >
          <Ionicons name="heart" size={30} color={COLORS.success} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    ...SHADOWS.large,
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
  likeLabel: {
    position: 'absolute',
    top: 50,
    left: 30,
    padding: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.success,
    borderRadius: BORDER_RADIUS.md,
    transform: [{ rotate: '-20deg' }],
  },
  likeLabelText: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  nopeLabel: {
    position: 'absolute',
    top: 50,
    right: 30,
    padding: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    transform: [{ rotate: '20deg' }],
  },
  nopeLabelText: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.error,
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
  cardName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  cardDistance: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.sm,
  },
  cardBio: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.sm,
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
  interestText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.lg,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  dislikeButton: {
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  superlikeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  likeButton: {
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.lg,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
