import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, VerifiedBadge } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - SPACING.lg * 3) / 2;

interface LikeProfile {
  id: string;
  name: string;
  age: number;
  photo: string;
  isVerified: boolean;
  likedAt: string;
  isBlurred: boolean;
}

const MOCK_LIKES: LikeProfile[] = [
  {
    id: '1',
    name: 'Sarah',
    age: 26,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
    isVerified: true,
    likedAt: '2 hours ago',
    isBlurred: false,
  },
  {
    id: '2',
    name: 'Emma',
    age: 24,
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300',
    isVerified: true,
    likedAt: '5 hours ago',
    isBlurred: true,
  },
  {
    id: '3',
    name: 'Jessica',
    age: 28,
    photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300',
    isVerified: true,
    likedAt: 'Yesterday',
    isBlurred: true,
  },
  {
    id: '4',
    name: 'Amanda',
    age: 25,
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
    isVerified: true,
    likedAt: 'Yesterday',
    isBlurred: true,
  },
  {
    id: '5',
    name: 'Nicole',
    age: 27,
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
    isVerified: true,
    likedAt: '2 days ago',
    isBlurred: true,
  },
];

export const LikesScreen: React.FC = () => {
  const [isPremium] = useState(false);
  const visibleLikes = isPremium ? MOCK_LIKES : MOCK_LIKES.slice(0, 1);
  const blurredCount = isPremium ? 0 : MOCK_LIKES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Who Likes You</Text>
        <View style={styles.likeCount}>
          <Ionicons name="heart" size={18} color={COLORS.primary} />
          <Text style={styles.likeCountText}>{MOCK_LIKES.length}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {!isPremium && (
          <Card style={styles.premiumCard}>
            <View style={styles.premiumIcon}>
              <Ionicons name="diamond" size={32} color="#8B5CF6" />
            </View>
            <Text style={styles.premiumTitle}>See All Your Likes</Text>
            <Text style={styles.premiumSubtitle}>
              Upgrade to Premium to see everyone who liked you and match instantly
            </Text>
            <Button
              title="Upgrade to Premium"
              onPress={() => {}}
              style={styles.premiumButton}
            />
          </Card>
        )}

        <View style={styles.grid}>
          {MOCK_LIKES.map((profile, index) => {
            const isBlurred = !isPremium && index > 0;
            
            return (
              <TouchableOpacity
                key={profile.id}
                style={styles.profileCard}
                disabled={isBlurred}
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: profile.photo }}
                    style={[styles.profileImage, isBlurred && styles.blurredImage]}
                    blurRadius={isBlurred ? 20 : 0}
                  />
                  {!isBlurred && profile.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                    </View>
                  )}
                  {isBlurred && (
                    <View style={styles.lockOverlay}>
                      <Ionicons name="lock-closed" size={24} color={COLORS.white} />
                    </View>
                  )}
                </View>
                
                <View style={styles.profileInfo}>
                  {isBlurred ? (
                    <Text style={styles.blurredName}>••••••, ••</Text>
                  ) : (
                    <>
                      <Text style={styles.profileName}>
                        {profile.name}, {profile.age}
                      </Text>
                      <Text style={styles.likedAt}>{profile.likedAt}</Text>
                    </>
                  )}
                </View>

                {!isBlurred && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.rejectButton}>
                      <Ionicons name="close" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.likeButton}>
                      <Ionicons name="heart" size={20} color={COLORS.success} />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Profile Insights</Text>
          
          <Card style={styles.insightCard}>
            <View style={styles.insightRow}>
              <View style={styles.insightIcon}>
                <Ionicons name="eye" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightValue}>156</Text>
                <Text style={styles.insightLabel}>Profile Views (7 days)</Text>
              </View>
              <View style={styles.insightTrend}>
                <Ionicons name="trending-up" size={16} color={COLORS.success} />
                <Text style={styles.trendText}>+23%</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.insightCard}>
            <View style={styles.insightRow}>
              <View style={styles.insightIcon}>
                <Ionicons name="heart" size={24} color={COLORS.error} />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightValue}>89</Text>
                <Text style={styles.insightLabel}>Likes Received (7 days)</Text>
              </View>
              <View style={styles.insightTrend}>
                <Ionicons name="trending-up" size={16} color={COLORS.success} />
                <Text style={styles.trendText}>+15%</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.insightCard}>
            <View style={styles.insightRow}>
              <View style={styles.insightIcon}>
                <Ionicons name="star" size={24} color="#F59E0B" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightValue}>12</Text>
                <Text style={styles.insightLabel}>Super Likes Received</Text>
              </View>
            </View>
          </Card>

          {!isPremium && (
            <View style={styles.premiumInsight}>
              <Ionicons name="lock-closed" size={20} color={COLORS.textSecondary} />
              <Text style={styles.premiumInsightText}>
                Upgrade to see who viewed your profile
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  likeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  likeCountText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  premiumCard: {
    margin: SPACING.lg,
    alignItems: 'center',
    backgroundColor: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  premiumIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  premiumTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  premiumSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  premiumButton: {
    backgroundColor: '#8B5CF6',
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  profileCard: {
    width: CARD_SIZE,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: CARD_SIZE * 1.2,
    resizeMode: 'cover',
  },
  blurredImage: {
    opacity: 0.7,
  },
  verifiedBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    padding: SPACING.sm,
  },
  profileName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  blurredName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  likedAt: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsSection: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  insightCard: {
    marginBottom: SPACING.sm,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  insightContent: {
    flex: 1,
  },
  insightValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  insightLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  insightTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.success,
  },
  premiumInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  premiumInsightText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
});
