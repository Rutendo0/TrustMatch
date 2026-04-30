import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, Alert, ScrollView, Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { socketService } from '../../services/socketService';
import { EmergencyButton } from '../../components/safety/EmergencyButton';
import { useResponsive, MIN_TOUCH_SIZE, HIT_SLOP } from '../../hooks/useResponsive';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Reaction { emoji: string; userId: string }

interface Message {
  id: string;
  text?: string;
  gif?: string;        // GIF URL
  sticker?: string;    // sticker emoji or URL
  audio?: string;
  audioDuration?: number;
  senderId: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'audio' | 'gif' | 'sticker';
  isPlaying?: boolean;
  reactions?: Reaction[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

const STICKERS = ['😍', '🥰', '😘', '💕', '💖', '🌹', '✨', '🎉', '👋', '🤗', '😎', '🙈'];

// Curated GIF-like animated sticker packs (using emoji combos as placeholders)
const GIF_PACKS = [
  { id: '1', label: 'Hi there! 👋', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif' },
  { id: '2', label: 'LOL 😂', url: 'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif' },
  { id: '3', label: 'Love it ❤️', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { id: '4', label: 'Wow 😮', url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif' },
  { id: '5', label: 'Thinking 🤔', url: 'https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif' },
  { id: '6', label: 'Dance 💃', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif' },
];

// AI icebreakers generated from shared interests
const generateIcebreakers = (sharedInterests: string[], otherName: string): string[] => {
  const base = [
    `Hey ${otherName}! What's the best thing that happened to you this week? 😊`,
    `If you could travel anywhere tomorrow, where would you go? ✈️`,
    `What's your go-to comfort food after a long day? 🍕`,
    `Morning person or night owl? ☀️🦉`,
  ];
  const interest = sharedInterests[0];
  if (interest) {
    base.unshift(`I saw we both love ${interest}! What got you into it? 🎯`);
    if (sharedInterests[1]) {
      base.unshift(`${interest} AND ${sharedInterests[1]}? We have so much to talk about! Where do we even start? 😄`);
    }
  }
  return base.slice(0, 4);
};

// ─── Shared interests banner ──────────────────────────────────────────────────
const SharedInterestsBanner: React.FC<{ interests: string[]; onDismiss: () => void }> = ({ interests, onDismiss }) => {
  if (interests.length === 0) return null;
  return (
    <View style={bannerStyles.container}>
      <Ionicons name="sparkles" size={14} color={COLORS.primary} />
      <Text style={bannerStyles.text} numberOfLines={1}>
        You both love: {interests.slice(0, 3).join(' · ')}
      </Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={HIT_SLOP}>
        <Ionicons name="close" size={14} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};
const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primarySoft, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  text: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '600' },
});

// ─── Icebreaker bar ───────────────────────────────────────────────────────────
const IcebreakerBar: React.FC<{ suggestions: string[]; onPick: (s: string) => void; onDismiss: () => void }> = ({ suggestions, onPick, onDismiss }) => (
  <View style={iceStyles.wrap}>
    <View style={iceStyles.header}>
      <Ionicons name="bulb-outline" size={14} color={COLORS.warning} />
      <Text style={iceStyles.title}>AI Icebreakers</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={HIT_SLOP}>
        <Ionicons name="close" size={14} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={iceStyles.list}>
      {suggestions.map((s, i) => (
        <TouchableOpacity key={i} style={iceStyles.chip} onPress={() => onPick(s)} activeOpacity={0.8}>
          <Text style={iceStyles.chipText} numberOfLines={2}>{s}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);
const iceStyles = StyleSheet.create({
  wrap: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  title: { flex: 1, fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.warning },
  list: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
  chip: { backgroundColor: COLORS.backgroundGray, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, maxWidth: 200, borderWidth: 1, borderColor: COLORS.border },
  chipText: { fontSize: FONTS.sizes.xs, color: COLORS.text, lineHeight: 16 },
});

// ─── Reaction picker ──────────────────────────────────────────────────────────
const ReactionPicker: React.FC<{ onPick: (emoji: string) => void; onClose: () => void }> = ({ onPick, onClose }) => (
  <View style={rxStyles.container}>
    {REACTION_EMOJIS.map(e => (
      <TouchableOpacity key={e} style={rxStyles.btn} onPress={() => { onPick(e); onClose(); }}>
        <Text style={rxStyles.emoji}>{e}</Text>
      </TouchableOpacity>
    ))}
  </View>
);
const rxStyles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, gap: SPACING.xs, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  btn: { padding: SPACING.xs },
  emoji: { fontSize: 22 },
});

// ─── GIF / Sticker picker modal ───────────────────────────────────────────────
const MediaPicker: React.FC<{
  visible: boolean;
  onClose: () => void;
  onGif: (url: string) => void;
  onSticker: (emoji: string) => void;
}> = ({ visible, onClose, onGif, onSticker }) => {
  const [tab, setTab] = useState<'gif' | 'sticker'>('sticker');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={mpStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={mpStyles.sheet}>
        <View style={mpStyles.tabs}>
          {(['sticker', 'gif'] as const).map(t => (
            <TouchableOpacity key={t} style={[mpStyles.tab, tab === t && mpStyles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[mpStyles.tabText, tab === t && mpStyles.tabTextActive]}>{t === 'sticker' ? '😊 Stickers' : '🎬 GIFs'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tab === 'sticker' ? (
          <View style={mpStyles.grid}>
            {STICKERS.map(s => (
              <TouchableOpacity key={s} style={mpStyles.stickerBtn} onPress={() => { onSticker(s); onClose(); }}>
                <Text style={mpStyles.stickerText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <ScrollView contentContainerStyle={mpStyles.gifGrid}>
            {GIF_PACKS.map(g => (
              <TouchableOpacity key={g.id} style={mpStyles.gifBtn} onPress={() => { onGif(g.url); onClose(); }}>
                <Image source={{ uri: g.url }} style={mpStyles.gifImg} />
                <Text style={mpStyles.gifLabel}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};
const mpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, maxHeight: 320, paddingBottom: SPACING.xl },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.md, gap: SPACING.md },
  stickerBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.backgroundGray, borderRadius: BORDER_RADIUS.md },
  stickerText: { fontSize: 28 },
  gifGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.md, gap: SPACING.sm },
  gifBtn: { width: 100, alignItems: 'center' },
  gifImg: { width: 100, height: 70, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.border },
  gifLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
});

// ─── Main ChatScreen ──────────────────────────────────────────────────────────
export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { matchId, name } = route.params as { matchId: string; name: string };
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [myUserId, setMyUserId] = useState('');
  const [otherUserId, setOtherUserId] = useState('');
  const [otherUserPhoto, setOtherUserPhoto] = useState<string | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [sharedInterests, setSharedInterests] = useState<string[]>([]);
  const [showBanner, setShowBanner] = useState(true);
  const [showIcebreakers, setShowIcebreakers] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null); // messageId
  const [showReadReceipts, setShowReadReceipts] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isSmall, isTablet } = useResponsive();

  // Load my profile + match profile for shared interests and photo
  useEffect(() => {
    const init = async () => {
      try {
        const me = await api.getProfile();
        setMyUserId(me.id);
        const myInterests: string[] = me.interests || [];

        // Get the other user's profile from the match
        try {
          const matches = await api.getMatches();
          const match = matches.find((m: any) => m.id === matchId);
          if (match?.user) {
            setOtherUserId(match.user.id || '');
            setOtherUserPhoto(match.user.photo || null);
            // Consider online if lastActive within last 5 minutes
            const lastActive = match.user.lastActive ? new Date(match.user.lastActive) : null;
            const isOnline = lastActive
              ? (Date.now() - lastActive.getTime()) < 5 * 60 * 1000
              : false;
            setOtherUserOnline(isOnline);
            const otherInterests: string[] = match.user.interests || [];
            const shared = myInterests.filter((i: string) =>
              otherInterests.map((x: string) => x.toLowerCase()).includes(i.toLowerCase())
            );
            setSharedInterests(shared);
            setIcebreakers(generateIcebreakers(shared, name));
          } else {
            setIcebreakers(generateIcebreakers([], name));
          }
        } catch {
          setIcebreakers(generateIcebreakers([], name));
        }
      } catch {}
    };
    init();
  }, [matchId, name]);

  // Socket setup
  useEffect(() => {
    fetchMessages();
    socketService.joinMatch(matchId);

    const unsubMsg = socketService.onNewMessage(({ matchId: mid, message }) => {
      if (mid !== matchId) return;
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, {
          id: message.id,
          text: message.content,
          senderId: message.senderId,
          timestamp: new Date(message.createdAt),
          status: 'delivered',
          type: (message.type?.toLowerCase() || 'text') as Message['type'],
        }];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      socketService.markRead(matchId);
    });

    const unsubRead = socketService.onMessageRead(({ matchId: mid }) => {
      if (mid !== matchId) return;
      setMessages(prev => prev.map(m => ({ ...m, status: 'read' as const })));
    });

    const unsubTyping = socketService.onTyping(({ matchId: mid, isTyping: t }) => {
      if (mid !== matchId) return;
      setOtherTyping(t);
    });

    const unsubOnline = socketService.onUserOnline(({ userId }) => {
      if (userId === otherUserId) setOtherUserOnline(true);
    });

    const unsubOffline = socketService.onUserOffline(({ userId }) => {
      if (userId === otherUserId) setOtherUserOnline(false);
    });

    return () => {
      unsubMsg(); unsubRead(); unsubTyping(); unsubOnline(); unsubOffline();
      socketService.leaveMatch(matchId);
    };
  }, [matchId, otherUserId]);

  const fetchMessages = async () => {
    try {
      const data = await api.getMessages(matchId);
      setMessages(data.map((m: any) => ({
        id: m.id,
        text: m.content,
        senderId: m.senderId,
        timestamp: new Date(m.createdAt),
        status: m.readAt ? 'read' : 'delivered',
        type: (m.type?.toLowerCase() || 'text') as Message['type'],
        audio: m.audioUrl,
        audioDuration: m.duration,
      })));
      await api.markMessagesAsRead(matchId);
      socketService.markRead(matchId);
    } catch (e) {
      console.error('fetchMessages:', e);
    } finally {
      setLoading(false);
    }
  };

  const sendText = async (text: string) => {
    if (!text.trim()) return;
    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = { id: tempId, text, senderId: myUserId || 'me', timestamp: new Date(), status: 'sent', type: 'text' };
    setMessages(prev => [...prev, optimistic]);
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const saved = await api.sendMessage(matchId, text, 'TEXT');
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: saved.id, status: 'delivered' } : m));
      socketService.sendMessage(matchId, text, 'TEXT');
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Alert.alert('Error', 'Failed to send message.');
    }
  };

  const sendGif = (url: string) => {
    const msg: Message = { id: `temp_${Date.now()}`, gif: url, senderId: myUserId || 'me', timestamp: new Date(), status: 'sent', type: 'gif' };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    // Send as text with GIF URL for now (server stores as TEXT type)
    api.sendMessage(matchId, url, 'TEXT').catch(() => {});
  };

  const sendSticker = (emoji: string) => {
    const msg: Message = { id: `temp_${Date.now()}`, sticker: emoji, senderId: myUserId || 'me', timestamp: new Date(), status: 'sent', type: 'sticker' };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    api.sendMessage(matchId, emoji, 'TEXT').catch(() => {});
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const existing = m.reactions || [];
      // Toggle: remove if same user already reacted with same emoji
      const already = existing.find(r => r.userId === myUserId && r.emoji === emoji);
      const reactions = already
        ? existing.filter(r => !(r.userId === myUserId && r.emoji === emoji))
        : [...existing, { emoji, userId: myUserId }];
      return { ...m, reactions };
    }));
    setReactionTarget(null);
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (!isTyping) { setIsTyping(true); socketService.setTyping(matchId, true); }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.setTyping(matchId, false);
    }, 2000);
  };

  // Audio
  const startAudioRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Microphone access needed.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => { if (prev >= 30) { stopAudioRecording(); return prev; } return prev + 1; });
      }, 1000);
    } catch { Alert.alert('Error', 'Could not start recording.'); }
  };

  const stopAudioRecording = async () => {
    try {
      if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        if (uri) {
          const st = await recordingRef.current.getStatusAsync();
          const dur = st.durationMillis ? Math.round(st.durationMillis / 1000) : recordingDuration;
          const msg: Message = { id: `temp_${Date.now()}`, audio: uri, audioDuration: dur, senderId: myUserId || 'me', timestamp: new Date(), status: 'sent', type: 'audio' };
          setMessages(prev => [...prev, msg]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
        recordingRef.current = null;
      }
    } catch { Alert.alert('Error', 'Could not save recording.'); }
    finally { setIsRecording(false); setRecordingDuration(0); }
  };

  const playAudio = async (messageId: string, uri: string) => {
    try {
      if (soundRef.current) { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null; }
      setMessages(prev => prev.map(m => ({ ...m, isPlaying: m.id === messageId })));
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(s => {
        if (s.isLoaded && !s.isPlaying) setMessages(prev => prev.map(m => ({ ...m, isPlaying: false })));
      });
      await sound.playAsync();
    } catch { setMessages(prev => prev.map(m => ({ ...m, isPlaying: false }))); }
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      soundRef.current?.stopAsync().then(() => soundRef.current?.unloadAsync());
      recordingRef.current?.stopAndUnloadAsync();
    };
  }, []);

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const keyboardOffset = Platform.select({ ios: isSmall ? 60 : isTablet ? 80 : 70, android: 0 }) ?? 0;

  // ── Render message ──────────────────────────────────────────────────────────
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === myUserId || item.senderId === 'me';
    const prev = messages[index - 1];
    const showTs = !prev || prev.senderId !== item.senderId || item.timestamp.getTime() - prev.timestamp.getTime() > 300000;
    const isLast = index === messages.length - 1;

    return (
      <View style={s.msgWrap}>
        {showTs && <Text style={s.timestamp}>{formatTime(item.timestamp)}</Text>}

        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => setReactionTarget(item.id)}
          style={[s.bubble, isMe ? s.myBubble : s.theirBubble]}
        >
          {/* GIF */}
          {item.type === 'gif' && item.gif && (
            <Image source={{ uri: item.gif }} style={s.gifImg} resizeMode="cover" />
          )}
          {/* Sticker */}
          {item.type === 'sticker' && (
            <Text style={s.stickerText}>{item.sticker}</Text>
          )}
          {/* Audio */}
          {item.type === 'audio' && (
            <TouchableOpacity style={s.audioRow} onPress={() => item.audio && playAudio(item.id, item.audio)}>
              <View style={[s.playBtn, isMe && s.playBtnMe]}>
                <Ionicons name={item.isPlaying ? 'pause' : 'play'} size={18} color={isMe ? COLORS.primary : COLORS.white} />
              </View>
              <View>
                <Text style={[s.audioLabel, isMe && s.myText]}>Voice message</Text>
                {item.audioDuration !== undefined && (
                  <Text style={[s.audioDur, isMe && s.myText]}>{item.audioDuration}s</Text>
                )}
              </View>
              {item.isPlaying && (
                <View style={s.waveform}>
                  {[1,2,3,4,5].map(i => <View key={i} style={[s.wave, { height: 4 + i * 3 }]} />)}
                </View>
              )}
            </TouchableOpacity>
          )}
          {/* Text */}
          {item.type === 'text' && (
            <Text style={[s.msgText, isMe && s.myText]}>{item.text}</Text>
          )}
        </TouchableOpacity>

        {/* Reactions */}
        {item.reactions && item.reactions.length > 0 && (
          <View style={[s.reactionsRow, isMe && s.reactionsRowMe]}>
            {Object.entries(
              item.reactions.reduce((acc: Record<string, number>, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc;
              }, {})
            ).map(([emoji, count]) => (
              <TouchableOpacity key={emoji} style={s.reactionBadge} onPress={() => addReaction(item.id, emoji)}>
                <Text style={s.reactionEmoji}>{emoji}</Text>
                {count > 1 && <Text style={s.reactionCount}>{count}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reaction picker popup */}
        {reactionTarget === item.id && (
          <View style={[s.reactionPickerWrap, isMe && s.reactionPickerWrapMe]}>
            <ReactionPicker onPick={e => addReaction(item.id, e)} onClose={() => setReactionTarget(null)} />
          </View>
        )}

        {/* Read receipt */}
        {isMe && isLast && showReadReceipts && (
          <View style={s.receipt}>
            <Ionicons
              name={item.status === 'read' ? 'checkmark-done' : 'checkmark-done'}
              size={13}
              color={item.status === 'read' ? COLORS.primary : COLORS.textLight}
            />
            {item.status === 'read' && <Text style={s.receiptText}>Seen</Text>}
          </View>
        )}
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.white }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.profileInfo}
          hitSlop={HIT_SLOP}
          onPress={() => otherUserId ? navigation.navigate('ProfileDetail', {
            profile: { id: otherUserId, name, age: 0, bio: '', aboutMe: '', occupation: '', education: '', distance: '', photos: otherUserPhoto ? [otherUserPhoto] : [], isVerified: false, trustScore: 85, compatibility: 0, personalityType: '', interests: [], safetyFeatures: [], verificationBadges: [] },
          }) : undefined}
        >
          <View style={s.avatarWrap}>
            {otherUserPhoto ? (
              <Image source={{ uri: otherUserPhoto }} style={s.avatarImage} />
            ) : (
              <Ionicons name="person-circle" size={40} color={COLORS.primary} />
            )}
            {otherUserOnline && <View style={s.onlineDot} />}
          </View>
          <View>
            <View style={s.nameRow}>
              <Text style={s.name}>{name}</Text>
              <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
            </View>
            <Text style={s.onlineStatus}>
              {otherTyping ? 'typing…' : otherUserOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} hitSlop={HIT_SLOP}
          onPress={() => navigation.navigate('VideoCall', { matchId, userName: name, userPhoto: '', isIncoming: false })}>
          <Ionicons name="videocam" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} hitSlop={HIT_SLOP}
          onPress={() => setShowReadReceipts(v => !v)}>
          <Ionicons name={showReadReceipts ? 'eye' : 'eye-off'} size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <EmergencyButton matchId={matchId} />
      </View>

      {/* Shared interests banner */}
      {showBanner && sharedInterests.length > 0 && (
        <SharedInterestsBanner interests={sharedInterests} onDismiss={() => setShowBanner(false)} />
      )}

      {/* Icebreaker bar */}
      {showIcebreakers && (
        <IcebreakerBar
          suggestions={icebreakers}
          onPick={s => { setInputText(s); setShowIcebreakers(false); }}
          onDismiss={() => setShowIcebreakers(false)}
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={keyboardOffset}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            messages.length === 0 && !loading ? (
              <View style={s.emptyChat}>
                <Text style={s.emptyChatEmoji}>👋</Text>
                <Text style={s.emptyChatText}>Say hi to {name}!</Text>
                <TouchableOpacity style={s.icebreakerHint} onPress={() => setShowIcebreakers(true)}>
                  <Ionicons name="bulb-outline" size={14} color={COLORS.warning} />
                  <Text style={s.icebreakerHintText}>Need an icebreaker?</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />

        <SafeAreaView edges={['bottom']} style={s.inputSafe}>
          {otherTyping && (
            <View style={s.typingBar}>
              <Text style={s.typingText}>{name} is typing…</Text>
            </View>
          )}
          <View style={s.inputRow}>
            {/* Media / icebreaker button */}
            <TouchableOpacity style={s.iconBtn} hitSlop={HIT_SLOP} onPress={() => setShowMediaPicker(true)}>
              <Ionicons name="happy-outline" size={26} color={COLORS.primary} />
            </TouchableOpacity>

            {/* Icebreaker bulb */}
            <TouchableOpacity style={s.iconBtn} hitSlop={HIT_SLOP} onPress={() => setShowIcebreakers(v => !v)}>
              <Ionicons name="bulb-outline" size={22} color={COLORS.warning} />
            </TouchableOpacity>

            <View style={s.textBox}>
              <TextInput
                style={s.textInput}
                placeholder="Type a message…"
                placeholderTextColor={COLORS.textLight}
                value={inputText}
                onChangeText={handleTyping}
                multiline
                maxLength={1000}
              />
            </View>

            {inputText.trim() ? (
              <TouchableOpacity style={s.sendBtn} onPress={() => sendText(inputText)} hitSlop={HIT_SLOP}>
                <Ionicons name="send" size={18} color={COLORS.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.micBtn, isRecording && s.micBtnActive]}
                onPress={isRecording ? stopAudioRecording : startAudioRecording}
                hitSlop={HIT_SLOP}
              >
                <Ionicons name={isRecording ? 'square' : 'mic'} size={20} color={isRecording ? COLORS.white : COLORS.primary} />
                {isRecording && <Text style={s.recDur}>{recordingDuration}s</Text>}
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* GIF / Sticker picker */}
      <MediaPicker
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onGif={sendGif}
        onSticker={sendSticker}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: MIN_TOUCH_SIZE, height: MIN_TOUCH_SIZE, alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: MIN_TOUCH_SIZE },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2, borderColor: COLORS.white,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  onlineStatus: { fontSize: FONTS.sizes.xs, color: COLORS.success },
  iconBtn: { width: MIN_TOUCH_SIZE, height: MIN_TOUCH_SIZE, alignItems: 'center', justifyContent: 'center' },

  list: { padding: SPACING.md, gap: SPACING.xs, paddingBottom: SPACING.xl },
  msgWrap: { marginBottom: SPACING.xs },
  timestamp: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, textAlign: 'center', marginVertical: SPACING.sm },
  bubble: { maxWidth: '80%', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.lg },
  myBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.backgroundGray, borderBottomLeftRadius: 4 },
  msgText: { fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 22 },
  myText: { color: COLORS.white },

  gifImg: { width: 180, height: 120, borderRadius: BORDER_RADIUS.md },
  stickerText: { fontSize: 48 },

  audioRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  playBtnMe: { backgroundColor: 'rgba(255,255,255,0.25)' },
  audioLabel: { fontSize: FONTS.sizes.sm, color: COLORS.text },
  audioDur: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  wave: { width: 3, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 2 },

  reactionsRow: { flexDirection: 'row', gap: 4, marginTop: 4, alignSelf: 'flex-start', paddingLeft: SPACING.sm },
  reactionsRowMe: { alignSelf: 'flex-end', paddingLeft: 0, paddingRight: SPACING.sm },
  reactionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.border, gap: 2 },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  reactionPickerWrap: { position: 'absolute', bottom: 40, left: 0, zIndex: 100 },
  reactionPickerWrapMe: { left: undefined, right: 0 },

  receipt: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-end', marginTop: 2, paddingRight: SPACING.sm },
  receiptText: { fontSize: 10, color: COLORS.primary },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyChatText: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.md },
  icebreakerHint: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.warningLight, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.full },
  icebreakerHintText: { fontSize: FONTS.sizes.sm, color: COLORS.warning, fontWeight: '600' },

  inputSafe: { backgroundColor: COLORS.white },
  typingBar: { paddingHorizontal: SPACING.lg, paddingVertical: 4, backgroundColor: COLORS.white },
  typingText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.sm, paddingTop: SPACING.sm, paddingBottom: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, gap: SPACING.xs },
  textBox: { flex: 1, backgroundColor: COLORS.backgroundGray, borderRadius: BORDER_RADIUS.xl, paddingHorizontal: SPACING.md, paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs, minHeight: MIN_TOUCH_SIZE, maxHeight: 120 },
  textInput: { fontSize: FONTS.sizes.md, color: COLORS.text, minHeight: 24, maxHeight: 100 },
  sendBtn: { width: MIN_TOUCH_SIZE, height: MIN_TOUCH_SIZE, borderRadius: MIN_TOUCH_SIZE / 2, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  micBtn: { width: MIN_TOUCH_SIZE, height: MIN_TOUCH_SIZE, borderRadius: MIN_TOUCH_SIZE / 2, backgroundColor: COLORS.backgroundGray, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  micBtnActive: { backgroundColor: COLORS.error },
  recDur: { fontSize: FONTS.sizes.xs, color: COLORS.white, fontWeight: '600' },
});
