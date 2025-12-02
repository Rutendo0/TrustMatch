import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { VerifiedBadge } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

type MessagesScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

interface Match {
  id: string;
  name: string;
  photo: string;
  isVerified: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
}

const MOCK_MATCHES: Match[] = [
  {
    id: '1',
    name: 'Sarah',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    isVerified: true,
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
    lastMessage: 'That sounds amazing! Would love to go',
    lastMessageTime: '1h ago',
    isOnline: true,
  },
  {
    id: '3',
    name: 'Jessica',
    photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100',
    isVerified: true,
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
  },
  {
    id: '5',
    name: 'Rachel',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    isVerified: true,
  },
  {
    id: '6',
    name: 'Nicole',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    isVerified: true,
  },
];

export const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMatches = MOCK_MATCHES.filter(match =>
    match.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderNewMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.newMatchItem}
      onPress={() => navigation.navigate('Chat', { matchId: item.id, name: item.name })}
    >
      <View style={styles.newMatchImageContainer}>
        <Image source={{ uri: item.photo }} style={styles.newMatchImage} />
        {item.isVerified && (
          <View style={styles.newMatchBadge}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          </View>
        )}
      </View>
      <Text style={styles.newMatchName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderConversation = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => navigation.navigate('Chat', { matchId: item.id, name: item.name })}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.photo }} style={styles.avatar} />
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.conversationName}>{item.name}</Text>
            {item.isVerified && <VerifiedBadge isVerified size="small" />}
          </View>
          <Text style={styles.timeText}>{item.lastMessageTime}</Text>
        </View>
        <View style={styles.messageRow}>
          <Text
            style={[
              styles.lastMessage,
              item.unreadCount && styles.unreadMessage,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unreadCount && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search matches"
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.newMatchesSection}>
        <Text style={styles.sectionTitle}>New Matches</Text>
        <FlatList
          data={NEW_MATCHES}
          renderItem={renderNewMatch}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.newMatchesList}
        />
      </View>

      <View style={styles.conversationsSection}>
        <Text style={styles.sectionTitle}>Conversations</Text>
        <FlatList
          data={filteredMatches}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.conversationsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Start swiping to find your match!
              </Text>
            </View>
          }
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
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
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
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  newMatchesSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
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
    width: 75,
  },
  newMatchImageContainer: {
    position: 'relative',
    marginBottom: SPACING.xs,
  },
  newMatchImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
    fontSize: FONTS.sizes.sm,
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
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
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
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  timeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  unreadMessage: {
    color: COLORS.text,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
