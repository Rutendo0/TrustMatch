import React, { useState, useRef, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useResponsive, MIN_TOUCH_SIZE, HIT_SLOP } from '../../hooks/useResponsive';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

interface Message {
  id: string;
  text?: string;
  audio?: string; // audio file URI
  audioDuration?: number; // duration in seconds
  senderId: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'audio';
  isPlaying?: boolean;
}

const CURRENT_USER_ID = 'me';

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    text: 'Hey! I saw we matched. How are you doing?',
    senderId: 'other',
    timestamp: new Date(Date.now() - 3600000),
    status: 'read',
    type: 'text',
  },
  {
    id: '2',
    text: "Hi! I'm doing great, thanks for reaching out! 😊",
    senderId: CURRENT_USER_ID,
    timestamp: new Date(Date.now() - 3500000),
    status: 'read',
    type: 'text',
  },
  {
    id: '3',
    text: 'I noticed you love hiking. Do you have a favorite trail?',
    senderId: 'other',
    timestamp: new Date(Date.now() - 3400000),
    status: 'read',
    type: 'text',
  },
  {
    id: '4',
    text: 'Yes! I love the mountain trails. There\'s this amazing spot with a lake view at the top.',
    senderId: CURRENT_USER_ID,
    timestamp: new Date(Date.now() - 3300000),
    status: 'read',
    type: 'text',
  },
  {
    id: '5',
    text: 'That sounds amazing! Would love to go sometime',
    senderId: 'other',
    timestamp: new Date(Date.now() - 300000),
    status: 'read',
    type: 'text',
  },
];

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { matchId, name } = route.params as { matchId: string; name: string };
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { isSmall, isTablet, height } = useResponsive();

  const keyboardVerticalOffset = Platform.select({
    ios: isSmall ? 60 : isTablet ? 80 : 70,
    android: 0,
  }) ?? 0;

  // Audio recording and playback functions
  const startAudioRecording = async () => {
    try {
      // Request microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is required for audio recording.');
        return;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 30) { // Max 30 seconds
            stopAudioRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Recording Error', 'Failed to start audio recording. Please try again.');
    }
  };

  const stopAudioRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        
        if (uri) {
          // Get recording duration
          const status = await recordingRef.current.getStatusAsync();
          const duration = status.durationMillis ? Math.round(status.durationMillis / 1000) : recordingDuration;

          // Send audio message
          const audioMessage: Message = {
            id: Date.now().toString(),
            audio: uri,
            audioDuration: duration,
            senderId: CURRENT_USER_ID,
            timestamp: new Date(),
            status: 'sent',
            type: 'audio',
          };
          
          setMessages((prev) => [...prev, audioMessage]);
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
        
        recordingRef.current = null;
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Recording Error', 'Failed to save audio recording. Please try again.');
    } finally {
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const playAudioMessage = async (messageId: string, audioUri: string) => {
    try {
      // Stop current playing audio if any
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Set current playing message
      setCurrentPlayingId(messageId);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isPlaying: true } : { ...msg, isPlaying: false }
      ));

      // Create and play sound
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.isPlaying) {
          setCurrentPlayingId(null);
          setMessages(prev => prev.map(msg => ({ ...msg, isPlaying: false })));
        }
      });

      await sound.playAsync();

    } catch (error) {
      console.error('Failed to play audio', error);
      Alert.alert('Playback Error', 'Failed to play audio message. Please try again.');
      setCurrentPlayingId(null);
      setMessages(prev => prev.map(msg => ({ ...msg, isPlaying: false })));
    }
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (soundRef.current) {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      senderId: CURRENT_USER_ID,
      timestamp: new Date(),
      status: 'sent',
      type: 'text',
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const startVideoCall = () => {
    navigation.navigate('VideoCall', {
      matchId,
      userName: name,
      userPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      isIncoming: false
    });
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
          {item.type === 'audio' ? (
            <TouchableOpacity 
              style={styles.audioMessage}
              onPress={() => item.audio && playAudioMessage(item.id, item.audio)}
              disabled={!item.audio}
            >
              <Ionicons 
                name={item.isPlaying ? "pause" : "play"} 
                size={20} 
                color={isMe ? COLORS.white : COLORS.text} 
              />
              <View style={styles.audioTextContainer}>
                <Text style={[styles.audioText, isMe && styles.myMessageText]}>
                  Voice message
                </Text>
                {item.audioDuration && (
                  <Text style={[styles.audioDuration, isMe && styles.myMessageText]}>
                    {item.audioDuration}s
                  </Text>
                )}
                {item.isPlaying && (
                  <View style={styles.waveformContainer}>
                    <View style={styles.waveformDot} />
                    <View style={styles.waveformDot} />
                    <View style={styles.waveformDot} />
                    <View style={styles.waveformDot} />
                    <View style={styles.waveformDot} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, isMe && styles.myMessageText]}>
              {item.text}
            </Text>
          )}
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
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileInfo} hitSlop={HIT_SLOP}>
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

        <TouchableOpacity style={styles.videoCallButton} hitSlop={HIT_SLOP} onPress={startVideoCall}>
          <Ionicons name="videocam" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.moreButton} hitSlop={HIT_SLOP}>
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        />

        <SafeAreaView edges={['bottom']} style={styles.inputSafeArea}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton} hitSlop={HIT_SLOP}>
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
              <TouchableOpacity style={styles.emojiButton} hitSlop={HIT_SLOP}>
                <Ionicons name="happy-outline" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {inputText.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendMessage}
                hitSlop={HIT_SLOP}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.audioButton,
                  isRecording && [
                    styles.audioButtonRecording,
                    styles.recordingPulse
                  ],
                ]}
                onPress={isRecording ? stopAudioRecording : startAudioRecording}
                hitSlop={HIT_SLOP}
              >
                <Ionicons
                  name={isRecording ? "square" : "mic"}
                  size={20}
                  color={isRecording ? COLORS.white : COLORS.primary}
                />
                {isRecording && (
                  <Text style={styles.recordingDuration}>
                    {recordingDuration}s
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
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
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: MIN_TOUCH_SIZE,
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
  videoCallButton: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
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
  audioMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  audioTextContainer: {
    flexDirection: 'column',
    gap: 2,
  },
  audioText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  audioDuration: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveformDot: {
    width: 2,
    height: 8,
    backgroundColor: COLORS.textSecondary,
    borderRadius: 1,
  },
  playButton: {
    padding: SPACING.xs,
  },
  statusContainer: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputSafeArea: {
    backgroundColor: COLORS.white,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  attachButton: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
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
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
    minHeight: MIN_TOUCH_SIZE,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    paddingVertical: Platform.OS === 'ios' ? SPACING.xs : 0,
    minHeight: 24,
    maxHeight: 100,
  },
  emojiButton: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    borderRadius: MIN_TOUCH_SIZE / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioButton: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    borderRadius: MIN_TOUCH_SIZE / 2,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  audioButtonRecording: {
    backgroundColor: COLORS.error,
  },
  recordingPulse: {
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 3,
  },
  recordingDuration: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    fontWeight: '600',
  },
});
