import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface MatchProfile {
  id: string;
  name: string;
  age: number;
  photo: string;
  interests: string[];
  compatibility: number;
  bio?: string;
}

interface SuggestedProfile {
  id: string;
  name: string;
  photo: string;
  compatibility: number;
}

interface MatchModalProps {
  visible: boolean;
  myProfile: { name: string; photo: string; interests: string[] };
  matchedProfile: MatchProfile;
  suggestions?: SuggestedProfile[];
  onSendMessage: () => void;
  onKeepSwiping: () => void;
}

const getSharedInterests = (mine: string[], theirs: string[]): string[] => {
  const theirSet = new Set(theirs.map(i => i.toLowerCase()));
  return mine.filter(i => theirSet.has(i.toLowerCase()));
};

const getCompatibilityReasons = (shared: string[], compatibility: number): string[] => {
  const reasons: string[] = [];
  if (shared.length > 0) {
    reasons.push(`You both love ${shared.slice(0, 2).join(' and ')}`);
  }
  if (compatibility >= 85) reasons.push('Your values and lifestyle align closely');
  if (compatibility >= 75) reasons.push('Similar relationship goals');
  if (shared.length >= 3) reasons.push(`${shared.length} interests in common`);
  if (reasons.length === 0) reasons.push('You both swiped right — chemistry is real!');
  return reasons.slice(0, 3);
};

export const MatchModal: React.FC<MatchModalProps> = ({
  visible,
  myProfile,
  matchedProfile,
  suggestions = [],
  onSendMessage,
  onKeepSwiping,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const heartAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      heartAnim.setValue(0);
      fadeAnim.setValue(0);

      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(heartAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [visible]);

  const shared = getSharedInterests(myProfile.interests, matchedProfile.interests);
  const reasons = getCompatibilityReasons(shared, matchedProfile.compatibility);

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#10B981';
    if (score >= 70) return '#3B82F6';
    return '#F59E0B';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <LinearGradient
        colors={['rgba(220,38,38,0.95)', 'rgba(159,18,57,0.98)', 'rgba(30,0,20,0.99)']}
        style={styles.overlay}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View style={[styles.header, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.matchTitle}>It's a Match! 🎉</Text>
            <Text style={styles.matchSubtitle}>
              You and {matchedProfile.name} liked each other
            </Text>
          </Animated.View>

          {/* Photos */}
          <Animated.View style={[styles.photosRow, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.photoWrap}>
              <Image source={{ uri: myProfile.photo }} style={styles.photo} />
              <LinearGradient colors={[COLORS.primary, COLORS.secondaryDark]} style={styles.photoBorder} />
            </View>

            <Animated.View style={[styles.heartCenter, {
              transform: [{ scale: heartAnim }],
            }]}>
              <LinearGradient colors={['#FF4B6E', '#c0003c']} style={styles.heartCircle}>
                <Ionicons name="heart" size={32} color="#fff" />
              </LinearGradient>
            </Animated.View>

            <View style={styles.photoWrap}>
              <Image source={{ uri: matchedProfile.photo }} style={styles.photo} />
              <LinearGradient colors={[COLORS.primary, COLORS.secondaryDark]} style={styles.photoBorder} />
            </View>
          </Animated.View>

          {/* Compatibility score */}
          <Animated.View style={[styles.scoreCard, { opacity: fadeAnim }]}>
            <View style={styles.scoreRow}>
              <Ionicons name="heart" size={20} color={getScoreColor(matchedProfile.compatibility)} />
              <Text style={[styles.scoreValue, { color: getScoreColor(matchedProfile.compatibility) }]}>
                {matchedProfile.compatibility}%
              </Text>
              <Text style={styles.scoreLabel}>Compatibility</Text>
            </View>

            {/* Score bar */}
            <View style={styles.scoreBarBg}>
              <Animated.View style={[styles.scoreBarFill, {
                width: `${matchedProfile.compatibility}%` as any,
                backgroundColor: getScoreColor(matchedProfile.compatibility),
              }]} />
            </View>
          </Animated.View>

          {/* Why you matched */}
          <Animated.View style={[styles.reasonsCard, { opacity: fadeAnim }]}>
            <View style={styles.reasonsHeader}>
              <Ionicons name="sparkles" size={18} color="#FFD700" />
              <Text style={styles.reasonsTitle}>Why you two matched</Text>
            </View>
            {reasons.map((reason, i) => (
              <View key={i} style={styles.reasonRow}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
            {shared.length > 0 && (
              <View style={styles.sharedInterests}>
                {shared.slice(0, 5).map((interest, i) => (
                  <View key={i} style={styles.interestChip}>
                    <Text style={styles.interestChipText}>{interest}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* People like you also liked */}
          {suggestions.length > 0 && (
            <Animated.View style={[styles.suggestionsCard, { opacity: fadeAnim }]}>
              <Text style={styles.suggestionsTitle}>People like you also liked</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsList}>
                {suggestions.map(s => (
                  <View key={s.id} style={styles.suggestionItem}>
                    <Image source={{ uri: s.photo }} style={styles.suggestionPhoto} />
                    <Text style={styles.suggestionName}>{s.name}</Text>
                    <Text style={styles.suggestionScore}>{s.compatibility}% match</Text>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Actions */}
          <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.messageBtn} onPress={onSendMessage} activeOpacity={0.85}>
              <LinearGradient colors={['#FF4B6E', '#c0003c']} style={styles.messageBtnGradient}>
                <Ionicons name="chatbubble" size={20} color="#fff" />
                <Text style={styles.messageBtnText}>Send a Message</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.keepSwipingBtn} onPress={onKeepSwiping} activeOpacity={0.8}>
              <Text style={styles.keepSwipingText}>Keep Swiping</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  matchTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  matchSubtitle: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  photoBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 63,
    zIndex: -1,
  },
  heartCenter: {
    zIndex: 10,
  },
  heartCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4B6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  scoreCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  scoreValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  scoreBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  reasonsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  reasonsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  reasonsTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: '#fff',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  reasonText: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  sharedInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  interestChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  interestChipText: {
    fontSize: FONTS.sizes.xs,
    color: '#fff',
    fontWeight: '500',
  },
  suggestionsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  suggestionsTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsList: {
    flexDirection: 'row',
  },
  suggestionItem: {
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  suggestionPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: SPACING.xs,
  },
  suggestionName: {
    fontSize: FONTS.sizes.sm,
    color: '#fff',
    fontWeight: '600',
  },
  suggestionScore: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  actions: {
    width: '100%',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  messageBtn: {
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    shadowColor: '#FF4B6E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  messageBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  messageBtnText: {
    color: '#fff',
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  keepSwipingBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  keepSwipingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
