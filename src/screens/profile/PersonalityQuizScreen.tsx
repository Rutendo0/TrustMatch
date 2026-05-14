import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type PersonalityQuizScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

// ── MBTI abbreviation legend shown before the quiz ───────────────────────────
const MBTI_LEGEND = [
  { abbr: 'I', full: 'Introvert',   desc: 'Energised by alone time' },
  { abbr: 'E', full: 'Extrovert',   desc: 'Energised by social time' },
  { abbr: 'N', full: 'Intuitive',   desc: 'Focuses on ideas & future' },
  { abbr: 'S', full: 'Sensing',     desc: 'Focuses on facts & present' },
  { abbr: 'T', full: 'Thinking',    desc: 'Decides with logic' },
  { abbr: 'F', full: 'Feeling',     desc: 'Decides with emotions' },
  { abbr: 'J', full: 'Judging',     desc: 'Prefers structure & plans' },
  { abbr: 'P', full: 'Perceiving',  desc: 'Prefers flexibility & spontaneity' },
];

// ── Questions — each maps to a specific MBTI axis or trait ───────────────────
interface Question {
  id: string;
  axis: 'IE' | 'NS' | 'TF' | 'JP' | 'loveLanguage' | 'attachment';
  // For MBTI axes: high score (4-5) → first letter, low score (1-2) → second letter
  highLabel: string; // what a high score means
  lowLabel: string;  // what a low score means
  question: string;
}

const QUESTIONS: Question[] = [
  // I/E axis
  {
    id: 'ie1',
    axis: 'IE',
    highLabel: 'E',
    lowLabel: 'I',
    question: 'I feel energised after spending time with a large group of people.',
  },
  {
    id: 'ie2',
    axis: 'IE',
    highLabel: 'E',
    lowLabel: 'I',
    question: 'I prefer going out to social events over staying home on weekends.',
  },
  // N/S axis
  {
    id: 'ns1',
    axis: 'NS',
    highLabel: 'N',
    lowLabel: 'S',
    question: 'I enjoy thinking about abstract ideas and future possibilities more than concrete facts.',
  },
  {
    id: 'ns2',
    axis: 'NS',
    highLabel: 'N',
    lowLabel: 'S',
    question: 'I trust my gut feeling over proven methods when making decisions.',
  },
  // T/F axis
  {
    id: 'tf1',
    axis: 'TF',
    highLabel: 'T',
    lowLabel: 'F',
    question: 'When solving a problem I focus on logic and facts rather than how people feel.',
  },
  {
    id: 'tf2',
    axis: 'TF',
    highLabel: 'T',
    lowLabel: 'F',
    question: 'I find it easy to stay detached and objective in emotional situations.',
  },
  // J/P axis
  {
    id: 'jp1',
    axis: 'JP',
    highLabel: 'J',
    lowLabel: 'P',
    question: 'I prefer having a clear plan rather than keeping my options open.',
  },
  {
    id: 'jp2',
    axis: 'JP',
    highLabel: 'J',
    lowLabel: 'P',
    question: 'I feel uncomfortable when things are left unresolved or unscheduled.',
  },
  // Love language
  {
    id: 'll1',
    axis: 'loveLanguage',
    highLabel: 'wordsOfAffirmation',
    lowLabel: '',
    question: 'Hearing "I love you" and verbal compliments means a lot to me.',
  },
  {
    id: 'll2',
    axis: 'loveLanguage',
    highLabel: 'qualityTime',
    lowLabel: '',
    question: 'I feel most loved when my partner gives me their full, undivided attention.',
  },
  {
    id: 'll3',
    axis: 'loveLanguage',
    highLabel: 'physicalTouch',
    lowLabel: '',
    question: 'Physical affection (hugs, holding hands) is very important to me.',
  },
  {
    id: 'll4',
    axis: 'loveLanguage',
    highLabel: 'actsOfService',
    lowLabel: '',
    question: 'I appreciate it most when someone helps me with tasks or does things for me.',
  },
  {
    id: 'll5',
    axis: 'loveLanguage',
    highLabel: 'receivingGifts',
    lowLabel: '',
    question: 'Thoughtful gifts, big or small, make me feel truly cared for.',
  },
  // Attachment
  {
    id: 'att1',
    axis: 'attachment',
    highLabel: 'secure',
    lowLabel: '',
    question: 'I find it easy to get close to others and trust them.',
  },
  {
    id: 'att2',
    axis: 'attachment',
    highLabel: 'anxious',
    lowLabel: '',
    question: 'I often worry that my partner does not care about me as much as I care about them.',
  },
  {
    id: 'att3',
    axis: 'attachment',
    highLabel: 'avoidant',
    lowLabel: '',
    question: 'I prefer to keep emotional distance and rely mainly on myself.',
  },
];

const SCALE = [
  { label: 'Strongly Disagree', value: 1 },
  { label: 'Disagree',          value: 2 },
  { label: 'Neutral',           value: 3 },
  { label: 'Agree',             value: 4 },
  { label: 'Strongly Agree',    value: 5 },
];

// ── Result calculation — purely from answers, no random ──────────────────────
function calculateResults(answers: Record<string, number>) {
  // MBTI: average score per axis, ≥3 → first letter, <3 → second letter
  const axisAvg = (ids: string[]) => {
    const vals = ids.map(id => answers[id] ?? 3);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const ie = axisAvg(['ie1', 'ie2']); // ≥3 → E, <3 → I
  const ns = axisAvg(['ns1', 'ns2']); // ≥3 → N, <3 → S
  const tf = axisAvg(['tf1', 'tf2']); // ≥3 → T, <3 → F
  const jp = axisAvg(['jp1', 'jp2']); // ≥3 → J, <3 → P

  const mbtiType =
    (ie >= 3 ? 'E' : 'I') +
    (ns >= 3 ? 'N' : 'S') +
    (tf >= 3 ? 'T' : 'F') +
    (jp >= 3 ? 'J' : 'P');

  // Big Five — derived from MBTI axes (approximate mapping)
  const bigFive = {
    Openness:          Math.round(((answers['ns1'] ?? 3) + (answers['ns2'] ?? 3)) / 2 / 5 * 100),
    Conscientiousness: Math.round(((answers['jp1'] ?? 3) + (answers['jp2'] ?? 3)) / 2 / 5 * 100),
    Extraversion:      Math.round(((answers['ie1'] ?? 3) + (answers['ie2'] ?? 3)) / 2 / 5 * 100),
    Agreeableness:     Math.round((6 - ((answers['tf1'] ?? 3) + (answers['tf2'] ?? 3)) / 2) / 5 * 100),
    Neuroticism:       Math.round(((answers['att2'] ?? 3)) / 5 * 100),
  };

  // Love language — highest score wins
  const loveScores: Record<string, number> = {
    'Words of Affirmation': answers['ll1'] ?? 0,
    'Quality Time':         answers['ll2'] ?? 0,
    'Physical Touch':       answers['ll3'] ?? 0,
    'Acts of Service':      answers['ll4'] ?? 0,
    'Receiving Gifts':      answers['ll5'] ?? 0,
  };
  const topLoveLanguage = Object.entries(loveScores).sort(([, a], [, b]) => b - a)[0][0];

  // Attachment — highest score wins
  const attachmentScores: Record<string, number> = {
    secure:   answers['att1'] ?? 0,
    anxious:  answers['att2'] ?? 0,
    avoidant: answers['att3'] ?? 0,
  };
  const attachmentStyle = Object.entries(attachmentScores).sort(([, a], [, b]) => b - a)[0][0];

  return { mbtiType, bigFive, loveScores, topLoveLanguage, attachmentStyle };
}

// ── MBTI type descriptions ────────────────────────────────────────────────────
const MBTI_DESCRIPTIONS: Record<string, string> = {
  INTJ: 'The Architect — strategic, independent, and driven by long-term goals.',
  INTP: 'The Thinker — analytical, curious, and loves exploring ideas.',
  ENTJ: 'The Commander — decisive, ambitious, and natural leader.',
  ENTP: 'The Debater — innovative, quick-witted, and loves a good challenge.',
  INFJ: 'The Advocate — insightful, principled, and deeply empathetic.',
  INFP: 'The Mediator — idealistic, creative, and guided by values.',
  ENFJ: 'The Protagonist — charismatic, empathetic, and inspiring.',
  ENFP: 'The Campaigner — enthusiastic, creative, and sociable.',
  ISTJ: 'The Logistician — reliable, practical, and detail-oriented.',
  ISFJ: 'The Defender — caring, loyal, and dedicated to others.',
  ESTJ: 'The Executive — organised, direct, and values tradition.',
  ESFJ: 'The Consul — warm, social, and loves taking care of others.',
  ISTP: 'The Virtuoso — practical, observant, and great in a crisis.',
  ISFP: 'The Adventurer — gentle, artistic, and lives in the moment.',
  ESTP: 'The Entrepreneur — energetic, bold, and action-oriented.',
  ESFP: 'The Entertainer — spontaneous, fun-loving, and enthusiastic.',
};

// ── Legend screen shown before quiz starts ────────────────────────────────────
const LegendScreen: React.FC<{ onStart: () => void; onBack: () => void }> = ({ onStart, onBack }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Personality Types</Text>
      <View style={{ width: 24 }} />
    </View>
    <ScrollView contentContainerStyle={styles.legendScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.legendIntro}>
        <Ionicons name="sparkles" size={36} color={COLORS.primary} />
        <Text style={styles.legendTitle}>What do the letters mean?</Text>
        <Text style={styles.legendSubtitle}>
          Your personality type is a 4-letter code. Each letter is one of two opposites on a scale.
          Here's what each abbreviation stands for:
        </Text>
      </View>

      <View style={styles.legendGrid}>
        {MBTI_LEGEND.map(item => (
          <View key={item.abbr} style={styles.legendItem}>
            <View style={styles.legendAbbrBox}>
              <Text style={styles.legendAbbr}>{item.abbr}</Text>
            </View>
            <View style={styles.legendTextBlock}>
              <Text style={styles.legendFull}>{item.full}</Text>
              <Text style={styles.legendDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.legendExample}>
        <Text style={styles.legendExampleTitle}>Example: INFJ</Text>
        <Text style={styles.legendExampleText}>
          <Text style={{ fontWeight: '700', color: COLORS.primary }}>I</Text>ntrovert ·{' '}
          <Text style={{ fontWeight: '700', color: COLORS.primary }}>N</Text>tuitive ·{' '}
          <Text style={{ fontWeight: '700', color: COLORS.primary }}>F</Text>eeling ·{' '}
          <Text style={{ fontWeight: '700', color: COLORS.primary }}>J</Text>udging
        </Text>
        <Text style={styles.legendExampleDesc}>
          "The Advocate — insightful, principled, and deeply empathetic."
        </Text>
      </View>

      <Button
        title="Start Quiz"
        onPress={onStart}
        size="large"
        style={{ marginTop: SPACING.xl, marginBottom: SPACING.xxl }}
        icon={<Ionicons name="arrow-forward" size={20} color={COLORS.white} />}
      />
    </ScrollView>
  </SafeAreaView>
);

// ── Main component ────────────────────────────────────────────────────────────
export const PersonalityQuizScreen: React.FC<PersonalityQuizScreenProps> = ({ navigation }) => {
  const [screen, setScreen] = useState<'legend' | 'quiz' | 'results'>('legend');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const question = QUESTIONS[currentQuestion];
  const progress = (currentQuestion / QUESTIONS.length) * 100;

  const handleAnswer = (value: number) => {
    const updated = { ...answers, [question.id]: value };
    setAnswers(updated);
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setScreen('results');
    }
  };

  // ── Legend ────────────────────────────────────────────────────────────────
  if (screen === 'legend') {
    return (
      <LegendScreen
        onStart={() => setScreen('quiz')}
        onBack={() => navigation.goBack()}
      />
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (screen === 'results') {
    const { mbtiType, bigFive, loveScores, topLoveLanguage, attachmentStyle } = calculateResults(answers);
    const mbtiDesc = MBTI_DESCRIPTIONS[mbtiType] || `Type ${mbtiType}`;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.resultsHeader}>
            <Ionicons name="sparkles" size={40} color={COLORS.primary} />
            <Text style={styles.resultsTitle}>Your Personality Profile</Text>
            <Text style={styles.resultsSubtitle}>Calculated from your answers</Text>
          </View>

          {/* MBTI type */}
          <Card style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Personality Type</Text>
            <View style={styles.mbtiRow}>
              {mbtiType.split('').map((letter, i) => (
                <View key={i} style={styles.mbtiLetterBox}>
                  <Text style={styles.mbtiLetter}>{letter}</Text>
                  <Text style={styles.mbtiLetterFull}>
                    {MBTI_LEGEND.find(l => l.abbr === letter)?.full ?? letter}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.mbtiDesc}>{mbtiDesc}</Text>
          </Card>

          {/* Big Five */}
          <Card style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Big Five Traits</Text>
            {Object.entries(bigFive).map(([trait, value]) => (
              <View key={trait} style={styles.traitRow}>
                <Text style={styles.traitLabel}>{trait}</Text>
                <View style={styles.traitBarContainer}>
                  <View style={[styles.traitBar, { width: `${value}%` as any }]} />
                </View>
                <Text style={styles.traitValue}>{value}%</Text>
              </View>
            ))}
          </Card>

          {/* Love languages */}
          <Card style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Love Languages</Text>
            {Object.entries(loveScores)
              .sort(([, a], [, b]) => b - a)
              .map(([lang, score]) => (
                <View key={lang} style={styles.traitRow}>
                  <Text style={[styles.traitLabel, { width: 130 }]}>{lang}</Text>
                  <View style={styles.traitBarContainer}>
                    <View style={[
                      styles.traitBar,
                      { width: `${(score / 5) * 100}%` as any },
                      lang === topLoveLanguage && { backgroundColor: COLORS.primary },
                    ]} />
                  </View>
                  <Text style={styles.traitValue}>{score}/5</Text>
                </View>
              ))}
            <Text style={styles.topLoveNote}>
              Primary: <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{topLoveLanguage}</Text>
            </Text>
          </Card>

          {/* Attachment */}
          <Card style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Attachment Style</Text>
            <View style={styles.attachmentBadge}>
              <Ionicons
                name={attachmentStyle === 'secure' ? 'shield-checkmark' : attachmentStyle === 'anxious' ? 'heart' : 'person'}
                size={24}
                color={attachmentStyle === 'secure' ? COLORS.success : attachmentStyle === 'anxious' ? COLORS.primary : COLORS.warning}
              />
              <Text style={[styles.attachmentText, {
                color: attachmentStyle === 'secure' ? COLORS.success : attachmentStyle === 'anxious' ? COLORS.primary : COLORS.warning,
              }]}>
                {attachmentStyle.charAt(0).toUpperCase() + attachmentStyle.slice(1)}
              </Text>
            </View>
            <Text style={styles.attachmentDescription}>
              {attachmentStyle === 'secure'
                ? "You're comfortable with intimacy and independence. You form healthy relationships and communicate needs effectively."
                : attachmentStyle === 'anxious'
                ? "You crave closeness and may worry about your partner's commitment. You're deeply caring and emotionally expressive."
                : "You value independence and may find it challenging to depend on others. You're self-reliant and thoughtful."}
            </Text>
          </Card>

          <Button
            title="Save & Find Compatible Matches"
            onPress={() => navigation.goBack()}
            size="large"
            style={styles.saveButton}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (currentQuestion === 0) setScreen('legend');
          else setCurrentQuestion(prev => prev - 1);
        }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
          </View>
          <Text style={styles.progressText}>{currentQuestion + 1} / {QUESTIONS.length}</Text>
        </View>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.categoryBadge}>
          {question.axis === 'IE' || question.axis === 'NS' || question.axis === 'TF' || question.axis === 'JP'
            ? 'Personality Type'
            : question.axis === 'loveLanguage' ? 'Love Language' : 'Attachment Style'}
        </Text>

        {/* Inline axis hint for MBTI questions */}
        {(question.axis === 'IE' || question.axis === 'NS' || question.axis === 'TF' || question.axis === 'JP') && (
          <View style={styles.axisHint}>
            <View style={styles.axisHintSide}>
              <Text style={styles.axisHintLetter}>{question.lowLabel}</Text>
              <Text style={styles.axisHintWord}>
                {MBTI_LEGEND.find(l => l.abbr === question.lowLabel)?.full}
              </Text>
            </View>
            <View style={styles.axisHintDivider} />
            <View style={styles.axisHintSide}>
              <Text style={styles.axisHintLetter}>{question.highLabel}</Text>
              <Text style={styles.axisHintWord}>
                {MBTI_LEGEND.find(l => l.abbr === question.highLabel)?.full}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.questionText}>{question.question}</Text>

        <View style={styles.optionsContainer}>
          {SCALE.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                answers[question.id] === option.value && styles.optionButtonSelected,
              ]}
              onPress={() => handleAnswer(option.value)}
            >
              <Text style={[
                styles.optionText,
                answers[question.id] === option.value && styles.optionTextSelected,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1, height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    minWidth: 50,
    textAlign: 'right',
  },
  questionContainer: { flex: 1, padding: SPACING.xl },
  categoryBadge: {
    fontSize: FONTS.sizes.sm, fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
  },
  axisHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  axisHintSide: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  axisHintLetter: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  axisHintWord: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  axisHintDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  questionText: {
    fontSize: FONTS.sizes.xl, fontWeight: '600',
    color: COLORS.text, lineHeight: 30,
    marginBottom: SPACING.xl,
  },
  optionsContainer: { gap: SPACING.sm },
  optionButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text, textAlign: 'center',
  },
  optionTextSelected: { color: COLORS.white, fontWeight: '600' },

  // Legend
  legendScroll: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  legendIntro: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  legendTitle: {
    fontSize: FONTS.sizes.xl, fontWeight: '800',
    color: COLORS.text, textAlign: 'center',
  },
  legendSubtitle: {
    fontSize: FONTS.sizes.md, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  legendGrid: { gap: SPACING.sm, marginBottom: SPACING.lg },
  legendItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  legendAbbrBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  legendAbbr: {
    fontSize: 22, fontWeight: '900', color: COLORS.white,
  },
  legendTextBlock: { flex: 1 },
  legendFull: {
    fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text,
  },
  legendDesc: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2,
  },
  legendExample: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  legendExampleTitle: {
    fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text,
  },
  legendExampleText: {
    fontSize: FONTS.sizes.md, color: COLORS.text,
  },
  legendExampleDesc: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontStyle: 'italic',
  },

  // Results
  resultsContainer: { flex: 1, padding: SPACING.lg },
  resultsHeader: {
    alignItems: 'center', marginBottom: SPACING.xl, gap: SPACING.sm,
  },
  resultsTitle: {
    fontSize: FONTS.sizes.xxl, fontWeight: 'bold', color: COLORS.text,
  },
  resultsSubtitle: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
  },
  resultCard: { marginBottom: SPACING.md },
  sectionTitle: {
    fontSize: FONTS.sizes.md, fontWeight: '600',
    color: COLORS.text, marginBottom: SPACING.md,
  },
  mbtiRow: {
    flexDirection: 'row', gap: SPACING.sm,
    justifyContent: 'center', marginBottom: SPACING.md,
  },
  mbtiLetterBox: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minWidth: 64,
  },
  mbtiLetter: {
    fontSize: 28, fontWeight: '900', color: COLORS.primary,
  },
  mbtiLetterFull: {
    fontSize: FONTS.sizes.xs, color: COLORS.textSecondary,
    fontWeight: '500', marginTop: 2, textAlign: 'center',
  },
  mbtiDesc: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
    lineHeight: 20, textAlign: 'center',
  },
  traitRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  traitLabel: {
    fontSize: FONTS.sizes.sm, color: COLORS.text, width: 110,
  },
  traitBarContainer: {
    flex: 1, height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4, overflow: 'hidden',
    marginHorizontal: SPACING.sm,
  },
  traitBar: {
    height: '100%',
    backgroundColor: COLORS.primary + 'AA',
    borderRadius: 4,
  },
  traitValue: {
    fontSize: FONTS.sizes.sm, fontWeight: '600',
    color: COLORS.primary, width: 40, textAlign: 'right',
  },
  topLoveNote: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  attachmentBadge: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  attachmentText: {
    fontSize: FONTS.sizes.lg, fontWeight: '600',
  },
  attachmentDescription: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20,
  },
  saveButton: {
    marginTop: SPACING.lg, marginBottom: SPACING.xl,
  },
});
