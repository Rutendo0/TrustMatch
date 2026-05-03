import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Keyboard,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { VerifiedBadge } from '../../components/common';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useResponsive, normalize, MIN_TOUCH_SIZE, HIT_SLOP } from '../../hooks/useResponsive';
import { useTheme } from '../../context/ThemeContext';

type MessagesScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

interface Match {
  id: string;
  name: string;
  photo: string;
  isVerified: boolean;
  trustScore: number;
  aiModerationEnabled: boolean;
  safetyLevel: 'high' | 'medium' | 'low';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isNew?: boolean;
}

export const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatches, setNewMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string>('');
  const searchInputRef = useRef<TextInput>(null);
  const { normalize: rNormalize } = useResponsive();

  // Re-fetch every time the screen comes into focus (e.g. after a new match)
  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [])
  );

  const fetchMatches = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      // Get current user ID to avoid showing unread badge for own messages
      let currentUserId = myUserId;
      if (!currentUserId) {
        try {
          const me = await api.getProfile();
          currentUserId = me.id;
          setMyUserId(me.id);
        } catch {}
      }

      const data = await api.getMatches();
      const newMatchesList: Match[] = [];
      const conversationsList: Match[] = [];
      
      data.forEach((m: any) => {
        const sentByOther = m.lastMessage?.senderId && m.lastMessage.senderId !== currentUserId;
        const match: Match = {
          id: m.id,
          name: m.user?.firstName || 'User',
          photo: m.user?.photo || m.user?.photos?.[0]?.url || m.user?.photos?.[0] || 'https://via.placeholder.com/100',
          isVerified: m.user?.isVerified || false,
          trustScore: 85,
          aiModerationEnabled: true,
          safetyLevel: 'high' as const,
          lastMessage: m.lastMessage?.content || undefined,
          lastMessageTime: m.lastMessage?.sentAt ? formatTime(m.lastMessage.sentAt) : '',
          unreadCount: (m.lastMessage && !m.lastMessage.isRead && sentByOther) ? 1 : 0,
          isOnline: m.user?.isOnline || false,
        };
        
        if (!m.lastMessage) {
          newMatchesList.push({ ...match, isNew: true });
        } else {
          conversationsList.push(match);
        }
      });
      
      setNewMatches(newMatchesList);
      setMatches(conversationsList);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setError('Could not load matches. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredMatches = (matches || []).filter(match =>
    match?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const newMatchImageSize = normalize(70);
  const newMatchContainerWidth = normalize(75);
  const avatarSize = normalize(60);
  const onlineIndicatorSize = normalize(14);

  const renderNewMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={[styles.newMatchItem, { width: newMatchContainerWidth, minHeight: MIN_TOUCH_SIZE }]}
      onPress={() => navigation.navigate('Chat', { matchId: item.id, name: item.name })}
      hitSlop={HIT_SLOP}
      activeOpacity={0.7}
    >
      <View style={styles.newMatchImageContainer}>
        <Image 
          source={{ uri: item.photo }} 
          style={[
            styles.newMatchImage, 
            { 
              width: newMatchImageSize, 
              height: newMatchImageSize, 
              borderRadius: newMatchImageSize / 2 
            }
          ]} 
        />
        {item.isVerified && (
          <View style={styles.newMatchBadge}>
            <Ionicons name="checkmark-circle" size={normalize(16)} color={COLORS.success} />
          </View>
        )}
      </View>
      <Text style={[styles.newMatchName, { fontSize: normalize(FONTS.sizes.sm) }]} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderConversation = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { minHeight: MIN_TOUCH_SIZE }]}
      onPress={() => navigation.navigate('Chat', { matchId: item.id, name: item.name })}
      hitSlop={HIT_SLOP}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: item.photo }} 
          style={[
            styles.avatar, 
            { 
              width: avatarSize, 
              height: avatarSize, 
              borderRadius: avatarSize / 2 
            }
          ]} 
        />
        {item.isOnline && (
          <View 
            style={[
              styles.onlineIndicator, 
              { 
                width: onlineIndicatorSize, 
                height: onlineIndicatorSize, 
                borderRadius: onlineIndicatorSize / 2 
              }
            ]} 
          />
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <View style={styles.nameContainer}>
            <Text style={[styles.conversationName, { fontSize: normalize(FONTS.sizes.md) }]}>
              {item.name}
            </Text>
            {item.isVerified && <VerifiedBadge isVerified size="small" />}
          </View>
          <Text style={[styles.timeText, { fontSize: normalize(FONTS.sizes.xs) }]}>
            {item.lastMessageTime}
          </Text>
        </View>
        <View style={styles.messageRow}>
          <Text
            style={[
              styles.lastMessage,
              { fontSize: normalize(FONTS.sizes.sm) },
              (item.unreadCount || 0) > 0 ? styles.unreadMessage : null,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {(item.unreadCount || 0) > 0 && (
            <View style={[styles.unreadBadge, { minWidth: normalize(20), height: normalize(20) }]}>
              <Text style={[styles.unreadCount, { fontSize: normalize(FONTS.sizes.xs) }]}>
                {item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontSize: normalize(FONTS.sizes.xxl), color: colors.text }]}>Messages</Text>
      </View>
      
      

      <View style={[styles.searchContainer, { minHeight: MIN_TOUCH_SIZE }]}>
        <Ionicons name="search" size={normalize(20)} color={COLORS.textSecondary} />
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, { fontSize: normalize(FONTS.sizes.md), minHeight: MIN_TOUCH_SIZE }]}
          placeholder="Search matches"
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={handleClearSearch}
            hitSlop={HIT_SLOP}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={normalize(20)} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Loading state */}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerStateText}>Loading your matches...</Text>
        </View>
      ) : error ? (
        /* Error state */
        <View style={styles.centerState}>
          <Ionicons name="wifi-outline" size={normalize(50)} color={COLORS.textLight} />
          <Text style={[styles.emptyTitle, { fontSize: normalize(FONTS.sizes.lg) }]}>
            Something went wrong
          </Text>
          <Text style={[styles.emptySubtitle, { fontSize: normalize(FONTS.sizes.sm) }]}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchMatches()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* New Matches row */}
          {newMatches.length > 0 && (
            <View style={styles.newMatchesSection}>
              <Text style={[styles.sectionTitle, { fontSize: normalize(FONTS.sizes.md) }]}>
                New Matches
              </Text>
              <FlatList
                data={newMatches}
                renderItem={renderNewMatch}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.newMatchesList}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}

          {/* Conversations list */}
          <View style={styles.conversationsSection}>
            {matches.length > 0 || newMatches.length > 0 ? (
              <Text style={[styles.sectionTitle, { fontSize: normalize(FONTS.sizes.md) }]}>
                {matches.length > 0 ? 'Conversations' : 'Start a conversation'}
              </Text>
            ) : null}
            <FlatList
              data={filteredMatches}
              renderItem={renderConversation}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.conversationsList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchMatches(true)}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={normalize(60)} color={COLORS.textLight} />
                  <Text style={[styles.emptyTitle, { fontSize: normalize(FONTS.sizes.lg) }]}>
                    {newMatches.length > 0
                      ? 'Tap a match above to say hi!'
                      : 'No matches yet'}
                  </Text>
                  <Text style={[styles.emptySubtitle, { fontSize: normalize(FONTS.sizes.sm) }]}>
                    {newMatches.length > 0
                      ? 'Your conversations will appear here once you start chatting.'
                      : 'Keep swiping to find your match!'}
                  </Text>
                </View>
              }
              contentInsetAdjustmentBehavior="automatic"
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  safetyStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  safetyStatusText: {
    flex: 1,
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.success,
    fontWeight: '500',
  },
  safetyIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    color: COLORS.text,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  newMatchesSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  newMatchesList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  newMatchItem: {
    alignItems: 'center',
  },
  newMatchImageContainer: {
    position: 'relative',
    marginBottom: SPACING.xs,
  },
  newMatchImage: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  newMatchBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  newMatchName: {
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  conversationsSection: {
    flex: 1,
  },
  conversationsList: {
    paddingHorizontal: SPACING.lg,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {},
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  conversationName: {
    fontWeight: '600',
    color: COLORS.text,
  },
  timeText: {
    color: COLORS.textSecondary,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  unreadMessage: {
    color: COLORS.text,
    fontWeight: '500',
  },
  trustIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.xs,
  },
  trustScoreText: {
    fontSize: 10,
    color: COLORS.trustScore,
    fontWeight: '600',
  },
  aiModerationBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 8,
    padding: 2,
    marginLeft: SPACING.xs,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: COLORS.white,
    fontWeight: '600',
  },
  communicationIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  videoCallIndicator: {
    padding: 2,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.background,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  centerStateText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.sm,
  },
  retryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FONTS.sizes.md,
  },
});
