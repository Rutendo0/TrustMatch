import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VerifiedBadge, Button } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { normalize, MIN_TOUCH_SIZE, HIT_SLOP } from '../../hooks/useResponsive';
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

interface ProfileDetailScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: {
    params: {
      profile: Profile;
    };
  };
}

export const ProfileDetailScreen: React.FC<ProfileDetailScreenProps> = ({ navigation, route }) => {
  const { profile } = route.params;
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const handleLike = () => {
    // Profile liked action
    navigation.goBack();
  };

  const handlePass = () => {
    // Profile passed action
    navigation.goBack();
  };

  const nextPhoto = () => {
    if (currentPhotoIndex < profile.photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  const previousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.name}'s Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.mainPhotoContainer}>
            <Image
              source={{ uri: profile.photos[currentPhotoIndex] }}
              style={styles.mainPhoto}
            />

            {/* Photo Navigation */}
            {profile.photos.length > 1 && (
              <>
                {currentPhotoIndex > 0 && (
                  <TouchableOpacity 
                    style={styles.photoArrowLeft} 
                    onPress={previousPhoto}
                    hitSlop={HIT_SLOP}
                  >
                    <Ionicons name="chevron-back" size={32} color={COLORS.white} />
                  </TouchableOpacity>
                )}
                {currentPhotoIndex < profile.photos.length - 1 && (
                  <TouchableOpacity 
                    style={styles.photoArrowRight} 
                    onPress={nextPhoto}
                    hitSlop={HIT_SLOP}
                  >
                    <Ionicons name="chevron-forward" size={32} color={COLORS.white} />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Photo Indicators */}
            {profile.photos.length > 1 && (
              <View style={styles.photoIndicators}>
                {profile.photos.map((_, index) => (
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

            {/* Gradient Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.photoGradient}
            />

            {/* Profile Info Overlay */}
            <View style={styles.photoInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{profile.name}, {profile.age}</Text>
                {profile.isVerified && <VerifiedBadge isVerified size="large" />}
              </View>
              
              <View style={styles.trustRow}>
                <View style={styles.trustScore}>
                  <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
                  <Text style={styles.trustScoreText}>{profile.trustScore}% Trusted</Text>
                </View>
                <View style={styles.compatibility}>
                  <Ionicons name="heart" size={16} color={COLORS.white} />
                  <Text style={styles.compatibilityText}>{profile.compatibility}% Match</Text>
                </View>
              </View>
              
              <Text style={styles.distance}>
                <Ionicons name="location" size={16} color={COLORS.white} /> {profile.distance}
              </Text>
            </View>
          </View>

          {/* Thumbnail Strip */}
          {profile.photos.length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailStrip}
              contentContainerStyle={styles.thumbnailContent}
            >
              {profile.photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.thumbnail,
                    index === currentPhotoIndex && styles.activeThumbnail
                  ]}
                  onPress={() => setCurrentPhotoIndex(index)}
                >
                  <Image source={{ uri: photo }} style={styles.thumbnailImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Profile Details */}
        <View style={styles.detailsSection}>
          {/* Personality & Bio */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
              <Text style={styles.infoTitle}>About</Text>
            </View>
            <Text style={styles.personalityType}>{profile.personalityType}</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>

          {/* Safety Features */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
              <Text style={styles.infoTitle}>Safety & Verification</Text>
            </View>
            <View style={styles.safetyGrid}>
              {profile.safetyFeatures.map((feature, index) => (
                <View key={index} style={styles.safetyBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  <Text style={styles.safetyText}>{feature}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.verificationBadges}>
              {profile.verificationBadges.map((badge, index) => (
                <View key={index} style={styles.verificationBadge}>
                  <Text style={styles.verificationText}>{badge}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Interests */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="heart" size={20} color={COLORS.secondary} />
              <Text style={styles.infoTitle}>Interests</Text>
            </View>
            <View style={styles.interestsGrid}>
              {profile.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.passButton}
          onPress={handlePass}
        >
          <Ionicons name="close" size={32} color={COLORS.error} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.likeButton}
          onPress={handleLike}
        >
          <Ionicons name="heart" size={32} color={COLORS.white} />
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: normalize(FONTS.sizes.lg),
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  photoSection: {
    backgroundColor: COLORS.white,
  },
  mainPhotoContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoArrowLeft: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoArrowRight: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
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
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  photoInfo: {
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
    marginBottom: SPACING.sm,
  },
  profileName: {
    fontSize: normalize(FONTS.sizes.xxl),
    fontWeight: 'bold',
    color: COLORS.white,
  },
  trustRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  trustScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
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
    backgroundColor: 'rgba(236, 72, 153, 0.8)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  compatibilityText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  distance: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.9,
  },
  thumbnailStrip: {
    backgroundColor: COLORS.white,
  },
  thumbnailContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnail: {
    borderColor: COLORS.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailsSection: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoTitle: {
    fontSize: normalize(FONTS.sizes.md),
    fontWeight: '600',
    color: COLORS.text,
  },
  personalityType: {
    color: COLORS.primary,
    fontSize: normalize(FONTS.sizes.sm),
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  bio: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.text,
    lineHeight: normalize(22),
  },
  safetyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  safetyText: {
    color: COLORS.success,
    fontSize: normalize(FONTS.sizes.xs),
    fontWeight: '500',
  },
  verificationBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  verificationBadge: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  verificationText: {
    color: COLORS.white,
    fontSize: normalize(FONTS.sizes.xs),
    fontWeight: '600',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  interestTag: {
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  interestText: {
    color: COLORS.secondary,
    fontSize: normalize(FONTS.sizes.xs),
    fontWeight: '500',
  },
  bottomPadding: {
    height: SPACING.xl,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.xl,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  passButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  likeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
});