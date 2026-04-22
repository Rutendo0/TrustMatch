import React, { useState, useEffect } from 'react';
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
import { api } from '../../services/api';
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

// People who liked you
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

// People you liked
const MOCK_SENT_LIKES: LikeProfile[] = [
  {
    id: '6',
    name: 'Michael',
    age: 29,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    isVerified: true,
    likedAt: '1 hour ago',
    isBlurred: false,
  },
  {
    id: '7',
    name: 'David',
    age: 31,
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
    isVerified: true,
    likedAt: '3 hours ago',
    isBlurred: false,
  },
  {
    id: '8',
    name: 'James',
    age: 27,
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300',
    isVerified: true,
    likedAt: 'Yesterday',
    isBlurred: false,
  },
  {
    id: '9',
    name: 'Chris',
    age: 30,
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300',
    isVerified: false,
    likedAt: '2 days ago',
    isBlurred: false,
  },
];

type TabType = 'received' | 'sent';

export const LikesScreen: React.FC = () => {
  const [isPremium] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [receivedLikes, setReceivedLikes] = useState<LikeProfile[]>([]);
  const [sentLikes, setSentLikes] = useState<LikeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<{
    totalLikesReceived: number;
    likesReceivedLastWeek: number;
    likesTrend: number;
    superLikesReceived: number;
    totalMatches: number;
    profileViews: number;
  } | null>(null);

  useEffect(() => {
    fetchLikes();
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const data = await api.getProfileInsights();
      setInsights(data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    }
  };

  const fetchLikes = async () => {
    try {
      // Fetch both received and sent likes
      const [received, sent] = await Promise.all([
        api.getLikes(),
        api.getSentLikes()
      ]);
      
      // Map received likes
      const mappedReceived: LikeProfile[] = (received || []).map((user: any) => ({
        id: user.id,
        name: user.firstName || 'User',
        age: user.age || 25,
        photo: user.photos?.[0] || 'https://via.placeholder.com/300',
        isVerified: user.isVerified || false,
        likedAt: formatTime(user.likedAt),
        isBlurred: false,
      }));
      setReceivedLikes(mappedReceived);
      
      // Map sent likes
      const mappedSent: LikeProfile[] = (sent || []).map((user: any) => ({
        id: user.id,
        name: user.firstName || 'User',
        age: user.age || 25,
        photo: user.photos?.[0] || 'https://via.placeholder.com/300',
        isVerified: user.isVerified || false,
        likedAt: formatTime(user.likedAt),
        isBlurred: false,
      }));
      setSentLikes(mappedSent);
    } catch (error) {
      console.error('Failed to fetch likes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get the current list based on active tab
  const currentLikes = activeTab === 'received' ? receivedLikes : sentLikes;

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Show all likes without premium restriction
  const visibleLikes = currentLikes;
  const blurredCount = 0;

  const renderProfileCard = (profile: LikeProfile, index: number, isReceived: boolean) => {
    // No blur anymore - show all real likes
    const isBlurred = false;
    
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
          {!isReceived && (
            <View style={styles.sentBadge}>
              <Ionicons name="heart" size={14} color={COLORS.white} />
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
              <Text style={styles.likedAt}>
                {isReceived ? `Liked you ${profile.likedAt}` : `You liked ${profile.likedAt}`}
              </Text>
            </>
          )}
        </View>

        {!isBlurred && isReceived && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.rejectButton}>
              <Ionicons name="close" size={20} color={COLORS.error} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.likeButton}>
              <Ionicons name="heart" size={20} color={COLORS.success} />
            </TouchableOpacity>
          </View>
        )}

        {!isBlurred && !isReceived && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.undoButton}>
              <Ionicons name="arrow-undo" size={18} color={COLORS.textSecondary} />
              <Text style={styles.undoText}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Likes</Text>
        <View style={styles.likeCount}>
          <Ionicons name="heart" size={18} color={COLORS.primary} />
          <Text style={styles.likeCountText}>{insights?.totalLikesReceived ?? receivedLikes.length}</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Ionicons 
            name="heart" 
            size={20} 
            color={activeTab === 'received' ? COLORS.primary : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Who Likes You
          </Text>
          <View style={[styles.tabBadge, activeTab === 'received' && styles.activeTabBadge]}>
            <Text style={[styles.tabBadgeText, activeTab === 'received' && styles.activeTabBadgeText]}>
              {insights?.totalLikesReceived ?? receivedLikes.length}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Ionicons 
            name="paper-plane" 
            size={20} 
            color={activeTab === 'sent' ? COLORS.primary : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            You Liked
          </Text>
          <View style={[styles.tabBadge, activeTab === 'sent' && styles.activeTabBadge]}>
            <Text style={[styles.tabBadgeText, activeTab === 'sent' && styles.activeTabBadgeText]}>
              {sentLikes.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'received' && !isPremium && (
          <Card style={styles.premiumCard}>
            <View style={styles.premiumIcon}>
              <Ionicons name="diamond" size={32} color={COLORS.primary} />
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
          {activeTab === 'received' 
            ? receivedLikes.map((profile, index) => renderProfileCard(profile, index, true))
            : sentLikes.map((profile, index) => renderProfileCard(profile, index, false))
          }
        </View>

        {activeTab === 'received' && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Profile Insights</Text>
            
            <Card style={styles.insightCard}>
              <View style={styles.insightRow}>
                <View style={styles.insightIcon}>
                  <Ionicons name="eye" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightValue}>{insights?.profileViews ?? 0}</Text>
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
                  <Text style={styles.insightValue}>{insights?.likesReceivedLastWeek ?? 0}</Text>
                  <Text style={styles.insightLabel}>Likes Received (7 days)</Text>
                </View>
                <View style={styles.insightTrend}>
                  <Ionicons name={insights?.likesTrend && insights.likesTrend >= 0 ? "trending-up" : "trending-down"} size={16} color={insights?.likesTrend && insights.likesTrend >= 0 ? COLORS.success : COLORS.error} />
                  <Text style={[styles.trendText, { color: insights?.likesTrend && insights.likesTrend >= 0 ? COLORS.success : COLORS.error }]}>
                    {insights?.likesTrend ? (insights.likesTrend >= 0 ? `+${insights.likesTrend}%` : `${insights.likesTrend}%`) : '0%'}
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.insightCard}>
              <View style={styles.insightRow}>
                <View style={styles.insightIcon}>
                  <Ionicons name="star" size={24} color="#F59E0B" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightValue}>{insights?.superLikesReceived ?? 0}</Text>
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
        )}

        {activeTab === 'sent' && (
          <View style={styles.sentInfoSection}>
            <Card style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color={COLORS.info} />
              <Text style={styles.infoText}>
                These are people you've liked. If they like you back, you'll match!
              </Text>
            </Card>
          </View>
        )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.background,
  },
  activeTab: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  tabBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  activeTabBadge: {
    backgroundColor: COLORS.primary,
  },
  tabBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabBadgeText: {
    color: COLORS.white,
  },
  premiumCard: {
    margin: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  premiumIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
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
    backgroundColor: COLORS.primary,
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
  sentBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.xs,
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
    alignItems: 'center',
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
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  undoText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
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
  sentInfoSection: {
    padding: SPACING.lg,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
});
