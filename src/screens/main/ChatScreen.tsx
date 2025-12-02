import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

const CURRENT_USER_ID = 'me';

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    text: 'Hey! I saw we matched. How are you doing?',
    senderId: 'other',
    timestamp: new Date(Date.now() - 3600000),
    status: 'read',
  },
  {
    id: '2',
    text: "Hi! I'm doing great, thanks for reaching out! 😊",
    senderId: CURRENT_USER_ID,
    timestamp: new Date(Date.now() - 3500000),
    status: 'read',
  },
  {
    id: '3',
    text: 'I noticed you love hiking. Do you have a favorite trail?',
    senderId: 'other',
    timestamp: new Date(Date.now() - 3400000),
    status: 'read',
  },
  {
    id: '4',
    text: 'Yes! I love the mountain trails. There\'s this amazing spot with a lake view at the top.',
    senderId: CURRENT_USER_ID,
    timestamp: new Date(Date.now() - 3300000),
    status: 'read',
  },
  {
    id: '5',
    text: 'That sounds amazing! Would love to go sometime',
    senderId: 'other',
    timestamp: new Date(Date.now() - 300000),
    status: 'read',
  },
];

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { matchId, name } = route.params as { matchId: string; name: string };
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      senderId: CURRENT_USER_ID,
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === CURRENT_USER_ID;
    const showTimestamp =
      index === 0 ||
      messages[index - 1].senderId !== item.senderId ||
      item.timestamp.getTime() - messages[index - 1].timestamp.getTime() > 300000;

    return (
      <View style={styles.messageContainer}>
        {showTimestamp && (
          <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.myMessage : styles.theirMessage,
          ]}
        >
          <Text style={[styles.messageText, isMe && styles.myMessageText]}>
            {item.text}
          </Text>
        </View>
        {isMe && index === messages.length - 1 && (
          <View style={styles.statusContainer}>
            <Ionicons
              name={
                item.status === 'read'
                  ? 'checkmark-done'
                  : item.status === 'delivered'
                  ? 'checkmark-done'
                  : 'checkmark'
              }
              size={14}
              color={item.status === 'read' ? COLORS.primary : COLORS.textLight}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileInfo}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }}
            style={styles.avatar}
          />
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{name}</Text>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            </View>
            <Text style={styles.status}>Online</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textLight}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity style={styles.emojiButton}>
              <Ionicons name="happy-outline" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() && styles.sendButtonActive,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? COLORS.white : COLORS.textLight}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  name: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  status: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
  },
  moreButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  messageContainer: {
    marginBottom: SPACING.xs,
  },
  timestamp: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    textAlign: 'center',
    marginVertical: SPACING.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: SPACING.xs,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background,
    borderBottomLeftRadius: SPACING.xs,
  },
  messageText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  myMessageText: {
    color: COLORS.white,
  },
  statusContainer: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    paddingVertical: SPACING.xs,
    maxHeight: 100,
  },
  emojiButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.primary,
  },
});
