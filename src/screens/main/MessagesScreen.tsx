import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { VerifiedBadge } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useResponsive, normalize, MIN_TOUCH_SIZE, HIT_SLOP } from '../../hooks/useResponsive';

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

const MOCK_MATCHES: Match[] = [
  {
    id: '1',
    name: 'Sarah',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    isVerified: true,
    trustScore: 95,
    aiModerationEnabled: true,
    safetyLevel: 'high',
    lastMessage: "Hey! How's your day going? 😊",
    lastMessageTime: '2m ago',
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: '2',
    name: 'Emily',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    isVerified: true,
    trustScore: 92,
    aiModerationEnabled: true,
    safetyLevel: 'high',
    lastMessage: 'That sounds amazing! Would love to go',
    lastMessageTime: '1h ago',
    isOnline: true,
  },
  {
    id: '3',
    name: 'Jessica',
    photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100',
    isVerified: true,
    trustScore: 98,
    aiModerationEnabled: true,
    safetyLevel: 'high',
    lastMessage: 'See you tomorrow!',
    lastMessageTime: 'Yesterday',
  },
];

const NEW_MATCHES: Match[] = [
  {
    id: '4',
    name: 'Amanda',
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
    isVerified: true,
    trustScore: 88,
    aiModerationEnabled: true,
    safetyLevel: 'medium',
    isNew: true,
  },
  {
    id: '5',
    name: 'Rachel',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    isVerified: true,
    trustScore: 91,
    aiModerationEnabled: true,
    safetyLevel: 'high',
    isNew: true,
  },
  {
    id: '6',
    name: 'Nicole',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    isVerified: true,
    trustScore: 94,
    aiModerationEnabled: true,
    safetyLevel: 'high',
    isNew: true,
  },
];

export const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const { normalize: rNormalize } = useResponsive();

  const filteredMatches = MOCK_MATCHES.filter(match =>
    match.name.toLowerCase().includes(searchQuery.toLowerCase())
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
          
          {/* Trust Score Indicator */}
          <View style={styles.trustIndicator}>
            <Ionicons name="shield-checkmark" size={12} color={COLORS.trustScore} />
            <Text style={styles.trustScoreText}>{item.trustScore}%</Text>
          </View>
          
          {/* AI Moderation Status */}
          {item.aiModerationEnabled && (
            <View style={styles.aiModerationBadge}>
              <Ionicons name="chatbubble-ellipses" size={10} color={COLORS.success} />
            </View>
          )}
          
          {/* Video Call & Audio Indicators */}
          <View style={styles.communicationIndicators}>
            <TouchableOpacity style={styles.videoCallIndicator} hitSlop={HIT_SLOP}>
              <Ionicons name="videocam" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontSize: normalize(FONTS.sizes.xxl) }]}>Messages</Text>
      </View>
      
      {/* Safety Status Bar */}
      <View style={styles.safetyStatusBar}>
        <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
        <Text style={styles.safetyStatusText}>AI Moderation Active • All messages are monitored for safety</Text>
        <View style={styles.safetyIndicator} />
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

      <View style={styles.newMatchesSection}>
        <Text style={[styles.sectionTitle, { fontSize: normalize(FONTS.sizes.md) }]}>New Matches</Text>
        <FlatList
          data={NEW_MATCHES}
          renderItem={renderNewMatch}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.newMatchesList}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      <View style={styles.conversationsSection}>
        <Text style={[styles.sectionTitle, { fontSize: normalize(FONTS.sizes.md) }]}>Conversations</Text>
        <FlatList
          data={filteredMatches}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.conversationsList}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={normalize(60)} color={COLORS.textLight} />
              <Text style={[styles.emptyTitle, { fontSize: normalize(FONTS.sizes.lg) }]}>
                No conversations yet
              </Text>
              <Text style={[styles.emptySubtitle, { fontSize: normalize(FONTS.sizes.sm) }]}>
                Start swiping to find your match!
              </Text>
            </View>
          }
          contentInsetAdjustmentBehavior="automatic"
        />
      </View>
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
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
