import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VerifiedBadge } from '../../components/common';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 2 - SPACING.md) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.45;

interface LikeProfile {
  id: string;
  name: string;
  age: number;
  photo: string;
  isVerified: boolean;
  likedAt: string;
}

interface Insights {
  totalLikesReceived: number;
  likesReceivedLastWeek: number;
  likesTrend: number;
  superLikesReceived: number;
  totalMatches: number;
  profileViews: number;
}

type TabType = 'received' | 'sent';

// ─── Stat pill ────────────────────────────────────────────────────────────────
const StatPill: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: number;
  label: string;
  trend?: number;
}> = ({ icon, iconColor, value, label, trend }) => (
  <View style={styles.statPill}>
    <View style={[styles.statIconWrap, { backgroundColor: iconColor + '18' }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {trend !== undefined && (
      <View style={styles.trendWrap}>
        <Ionicons
          name={trend >= 0 ? 'trending-up' : 'trending-down'}
          size={12}
          color={trend >= 0 ? COLORS.success : COLORS.error}
        />
        <Text style={[styles.trendText, { color: trend >= 0 ? COLORS.success : COLORS.error }]}>
          {trend >= 0 ? `+${trend}%` : `${trend}%`}
        </Text>
      </View>
    )}
  </View>
);

// ─── Profile card ─────────────────────────────────────────────────────────────
const ProfileCard: React.FC<{
  profile: LikeProfile;
  isReceived: boolean;
  onLike?: (profileId: string) => void;
  onPass?: (profileId: string) => void;
  onUndo?: (profileId: string) => void;
  onViewProfile?: (profile: LikeProfile) => void;
}> = ({ profile, isReceived, onLike, onPass, onUndo, onViewProfile }) => (
  <View style={styles.card}>
    <View style={styles.cardImageWrap}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onViewProfile?.(profile)} style={StyleSheet.absoluteFill}>
        <Image source={{ uri: profile.photo }} style={styles.cardImage} />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.45 }}
          end={{ x: 0, y: 1 }}
        />
      </TouchableOpacity>

      {profile.isVerified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
        </View>
      )}

      {!isReceived && (
        <View style={styles.sentBadge}>
          <Ionicons name="heart" size={12} color="#fff" />
        </View>
      )}

      <TouchableOpacity style={styles.cardOverlay} onPress={() => onViewProfile?.(profile)} activeOpacity={0.9}>
        <Text style={styles.cardName} numberOfLines={1}>
          {profile.name}, {profile.age}
        </Text>
        <View style={styles.cardTimeRow}>
          <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.75)" />
          <Text style={styles.cardTime}>{profile.likedAt}</Text>
        </View>
      </TouchableOpacity>
    </View>

    {isReceived ? (
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.passBtn} 
          activeOpacity={0.8}
          onPress={() => onPass?.(profile.id)}
        >
          <Ionicons name="close" size={20} color={COLORS.error} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.likeBtn} 
          activeOpacity={0.8}
          onPress={() => onLike?.(profile.id)}
        >
          <Ionicons name="heart" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.undoBtn} 
          activeOpacity={0.8}
          onPress={() => onUndo?.(profile.id)}
        >
          <Ionicons name="arrow-undo" size={15} color={COLORS.textSecondary} />
          <Text style={styles.undoBtnText}>Undo</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ isReceived: boolean }> = ({ isReceived }) => (
  <View style={styles.emptyWrap}>
    <LinearGradient
      colors={[COLORS.primarySoft, '#fff']}
      style={styles.emptyIconCircle}
    >
      <Ionicons
        name={isReceived ? 'heart-outline' : 'paper-plane-outline'}
        size={40}
        color={COLORS.primary}
      />
    </LinearGradient>
    <Text style={styles.emptyTitle}>
      {isReceived ? 'No likes yet' : "You haven't liked anyone yet"}
    </Text>
    <Text style={styles.emptySubtitle}>
      {isReceived
        ? 'Keep your profile fresh and keep swiping — likes will come!'
        : 'Head to Discover and start swiping to find your match.'}
    </Text>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
export const LikesScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [receivedLikes, setReceivedLikes] = useState<LikeProfile[]>([]);
  const [sentLikes, setSentLikes] = useState<LikeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(diff / 86_400_000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return date.toLocaleDateString();
  };

  const loadData = useCallback(async () => {
    try {
      console.log('Loading likes data...');
      
      const [received, sent, insightsData] = await Promise.all([
        api.getLikes(),
        api.getSentLikes(),
        api.getProfileInsights(),
      ]);

      console.log('Received likes:', received?.length || 0);
      console.log('Sent likes:', sent?.length || 0);
      console.log('Sent likes data:', sent);

      setReceivedLikes(
        (received || []).map((u: any) => ({
          id: u.id,
          name: u.firstName || 'User',
          age: u.age || 25,
          photo: u.photos?.[0]?.url || u.photos?.[0] || 'https://via.placeholder.com/300',
          isVerified: u.isVerified || false,
          likedAt: formatTime(u.likedAt),
        }))
      );

      const mappedSentLikes = (sent || []).map((u: any) => ({
        id: u.id,
        name: u.firstName || 'User',
        age: u.age || 25,
        photo: u.photos?.[0]?.url || u.photos?.[0] || 'https://via.placeholder.com/300',
        isVerified: u.isVerified || false,
        likedAt: formatTime(u.likedAt),
      }));
      
      console.log('Mapped sent likes:', mappedSentLikes);
      setSentLikes(mappedSentLikes);

      setInsights(insightsData);
    } catch (err: any) {
      console.error('Failed to load likes:', err);
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLikeBack = async (profileId: string) => {
    try {
      const result = await api.swipe(profileId, 'LIKE');
      
      // Remove from received likes
      setReceivedLikes(prev => prev.filter(p => p.id !== profileId));
      
      // Show match modal if it's a match
      if (result?.isMatch) {
        Alert.alert(
          '🎉 It\'s a Match!',
          `You and ${receivedLikes.find(p => p.id === profileId)?.name} liked each other!`,
          [{ text: 'Send Message', onPress: () => {/* Navigate to chat */} }, { text: 'Keep Swiping' }]
        );
      }
      
      // Reload data to update counts
      loadData();
    } catch (error: any) {
      console.error('Failed to like back:', error);
      Alert.alert('Error', 'Failed to like. Please try again.');
    }
  };

  const handlePass = async (profileId: string) => {
    try {
      await api.swipe(profileId, 'DISLIKE');
      
      // Remove from received likes
      setReceivedLikes(prev => prev.filter(p => p.id !== profileId));
      
      // Reload data
      loadData();
    } catch (error: any) {
      console.error('Failed to pass:', error);
      Alert.alert('Error', 'Failed to pass. Please try again.');
    }
  };

  const handleUndo = async (profileId: string) => {
    Alert.alert(
      'Undo Like',
      'This feature is coming soon! For now, you can unmatch from the Messages screen.',
      [{ text: 'OK' }]
    );
  };

  const handleViewProfile = (profile: LikeProfile) => {
    navigation?.navigate('ProfileDetail', {
      profile: {
        id: profile.id,
        name: profile.name,
        age: profile.age,
        bio: '',
        aboutMe: '',
        occupation: '',
        education: '',
        distance: '',
        photos: [profile.photo],
        isVerified: profile.isVerified,
        trustScore: 85,
        compatibility: 0,
        personalityType: '',
        interests: [],
        safetyFeatures: [],
        verificationBadges: [],
      },
    });
  };

  const currentList = activeTab === 'received' ? receivedLikes : sentLikes;
  const totalReceived = insights?.totalLikesReceived ?? receivedLikes.length;

  const pairs: [LikeProfile, LikeProfile | null][] = [];
  for (let i = 0; i < currentList.length; i += 2) {
    pairs.push([currentList[i], currentList[i + 1] ?? null]);
  }

  const renderRow = ({ item }: { item: [LikeProfile, LikeProfile | null] }) => (
    <View style={styles.row}>
      <ProfileCard 
        profile={item[0]} 
        isReceived={activeTab === 'received'}
        onLike={handleLikeBack}
        onPass={handlePass}
        onUndo={handleUndo}
        onViewProfile={handleViewProfile}
      />
      {item[1] && (
        <ProfileCard 
          profile={item[1]} 
          isReceived={activeTab === 'received'}
          onLike={handleLikeBack}
          onPass={handlePass}
          onUndo={handleUndo}
          onViewProfile={handleViewProfile}
        />
      )}
      {!item[1] && <View style={{ width: CARD_WIDTH }} />}
    </View>
  );

  const ListHeader = () => (
    <>
      <View style={styles.statsBar}>
        <StatPill icon="eye-outline" iconColor={COLORS.info} value={insights?.profileViews ?? 0} label="Views" />
        <View style={styles.statsDivider} />
        <StatPill icon="heart" iconColor={COLORS.primary} value={totalReceived} label="Likes" trend={insights?.likesTrend} />
        <View style={styles.statsDivider} />
        <StatPill icon="people" iconColor={COLORS.success} value={insights?.totalMatches ?? 0} label="Matches" />
      </View>

      {activeTab === 'sent' && sentLikes.length > 0 && (
        <View style={styles.hintBar}>
          <Ionicons name="information-circle" size={16} color={COLORS.info} />
          <Text style={styles.hintText}>Like them back to match instantly!</Text>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundGray }]} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="heart" size={22} color="#fff" />
          <Text style={styles.headerTitle}>Likes</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{totalReceived}</Text>
        </View>
      </LinearGradient>

      <View style={styles.tabBar}>
        {(['received', 'sent'] as TabType[]).map((tab) => {
          const active = activeTab === tab;
          const count = tab === 'received' ? totalReceived : sentLikes.length;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab === 'received' ? 'heart' : 'paper-plane'}
                size={16}
                color={active ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab === 'received' ? 'Who Likes You' : 'You Liked'}
              </Text>
              {count > 0 && (
                <View style={[styles.tabCount, active && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading likes…</Text>
        </View>
      ) : (
        <FlatList
          data={pairs}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderRow}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<EmptyState isReceived={activeTab === 'received'} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  headerBadgeText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: 10, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.backgroundGray,
  },
  tabBtnActive: { backgroundColor: COLORS.primarySoft },
  tabLabel: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  tabLabelActive: { color: COLORS.primary },
  tabCount: {
    backgroundColor: COLORS.border, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full, minWidth: 22, alignItems: 'center',
  },
  tabCountActive: { backgroundColor: COLORS.primary },
  tabCountText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  tabCountTextActive: { color: '#fff' },
  statsBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.xl, paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    ...SHADOWS.card,
  },
  statPill: { flex: 1, alignItems: 'center', gap: 3 },
  statIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  trendWrap: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },
  trendText: { fontSize: 10, fontWeight: '700' },
  statsDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  hintBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.infoLight, marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md, borderLeftWidth: 3, borderLeftColor: COLORS.info,
  },
  hintText: { fontSize: FONTS.sizes.sm, color: COLORS.info, fontWeight: '500' },
  listContent: { paddingBottom: SPACING.xxl },
  row: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.md, marginBottom: SPACING.md },
  card: { width: CARD_WIDTH, borderRadius: BORDER_RADIUS.xl, backgroundColor: COLORS.white, overflow: 'hidden', ...SHADOWS.medium },
  cardImageWrap: { width: '100%', height: CARD_HEIGHT, position: 'relative' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  verifiedBadge: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 2 },
  sentBadge: { position: 'absolute', top: SPACING.sm, left: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full, padding: 5 },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.sm },
  cardName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: '#fff' },
  cardTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  cardTime: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  cardActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.white,
  },
  passBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  likeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.glow },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md },
  undoBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  emptyWrap: { alignItems: 'center', paddingTop: SPACING.xxl, paddingHorizontal: SPACING.xl },
  emptyIconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm, textAlign: 'center' },
  emptySubtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
});
