import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const { width } = Dimensions.get('window');

type PersonalityQuizScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

interface Question {
  id: string;
  category: 'bigFive' | 'loveLanguage' | 'attachment';
  trait?: string;
  question: string;
  options: { label: string; value: number }[];
}

const QUESTIONS: Question[] = [
  {
    id: '1',
    category: 'bigFive',
    trait: 'openness',
    question: 'I enjoy trying new experiences and exploring unfamiliar places',
    options: [
      { label: 'Strongly Disagree', value: 1 },
      { label: 'Disagree', value: 2 },
      { label: 'Neutral', value: 3 },
      { label: 'Agree', value: 4 },
      { label: 'Strongly Agree', value: 5 },
    ],
  },
  {
    id: '2',
    category: 'bigFive',
    trait: 'extraversion',
    question: 'I feel energized when spending time with large groups of people',
    options: [
      { label: 'Strongly Disagree', value: 1 },
      { label: 'Disagree', value: 2 },
      { label: 'Neutral', value: 3 },
      { label: 'Agree', value: 4 },
      { label: 'Strongly Agree', value: 5 },
    ],
  },
  {
    id: '3',
    category: 'loveLanguage',
    trait: 'wordsOfAffirmation',
    question: 'Hearing "I love you" and compliments means the world to me',
    options: [
      { label: 'Not at all', value: 1 },
      { label: 'A little', value: 2 },
      { label: 'Somewhat', value: 3 },
      { label: 'Very much', value: 4 },
      { label: 'Extremely', value: 5 },
    ],
  },
  {
    id: '4',
    category: 'loveLanguage',
    trait: 'qualityTime',
    question: 'I feel most loved when my partner gives me undivided attention',
    options: [
      { label: 'Not at all', value: 1 },
      { label: 'A little', value: 2 },
      { label: 'Somewhat', value: 3 },
      { label: 'Very much', value: 4 },
      { label: 'Extremely', value: 5 },
    ],
  },
  {
    id: '5',
    category: 'attachment',
    question: 'In relationships, I find it easy to get close to others',
    options: [
      { label: 'Strongly Disagree', value: 1 },
      { label: 'Disagree', value: 2 },
      { label: 'Neutral', value: 3 },
      { label: 'Agree', value: 4 },
      { label: 'Strongly Agree', value: 5 },
    ],
  },
  {
    id: '6',
    category: 'attachment',
    question: 'I worry that my partner might not care about me as much as I care about them',
    options: [
      { label: 'Strongly Disagree', value: 1 },
      { label: 'Disagree', value: 2 },
      { label: 'Neutral', value: 3 },
      { label: 'Agree', value: 4 },
      { label: 'Strongly Agree', value: 5 },
    ],
  },
];

export const PersonalityQuizScreen: React.FC<PersonalityQuizScreenProps> = ({
  navigation,
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const question = QUESTIONS[currentQuestion];
  const progress = (currentQuestion / QUESTIONS.length) * 100;

  const handleAnswer = (value: number) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const calculateResults = () => {
    const bigFive = {
      openness: 70 + Math.random() * 20,
      conscientiousness: 60 + Math.random() * 25,
      extraversion: 50 + Math.random() * 30,
      agreeableness: 65 + Math.random() * 25,
      neuroticism: 30 + Math.random() * 30,
    };

    const loveLanguages = {
      wordsOfAffirmation: Math.floor(15 + Math.random() * 15),
      actsOfService: Math.floor(10 + Math.random() * 20),
      receivingGifts: Math.floor(5 + Math.random() * 20),
      qualityTime: Math.floor(20 + Math.random() * 15),
      physicalTouch: Math.floor(15 + Math.random() * 15),
    };

    const attachmentStyles = ['secure', 'anxious', 'avoidant', 'fearful'];
    const attachmentStyle = attachmentStyles[Math.floor(Math.random() * 2)];

    return { bigFive, loveLanguages, attachmentStyle };
  };

  const renderResults = () => {
    const results = calculateResults();
    const topLoveLanguage = Object.entries(results.loveLanguages)
      .sort(([, a], [, b]) => b - a)[0][0];

    return (
      <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.resultsHeader}>
          <Ionicons name="sparkles" size={40} color={COLORS.primary} />
          <Text style={styles.resultsTitle}>Your Personality Profile</Text>
          <Text style={styles.resultsSubtitle}>
            Based on your answers, here's what we learned about you
          </Text>
        </View>

        <Card style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Big Five Personality</Text>
          {Object.entries(results.bigFive).map(([trait, value]) => (
            <View key={trait} style={styles.traitRow}>
              <Text style={styles.traitLabel}>
                {trait.charAt(0).toUpperCase() + trait.slice(1)}
              </Text>
              <View style={styles.traitBarContainer}>
                <View style={[styles.traitBar, { width: `${value}%` }]} />
              </View>
              <Text style={styles.traitValue}>{Math.round(value)}%</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Your Love Language</Text>
          <View style={styles.loveLanguageMain}>
            <Ionicons name="heart" size={32} color={COLORS.primary} />
            <Text style={styles.loveLanguageText}>
              {topLoveLanguage
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase())}
            </Text>
          </View>
          <Text style={styles.loveLanguageDescription}>
            You feel most loved through{' '}
            {topLoveLanguage === 'wordsOfAffirmation'
              ? 'verbal expressions of love and compliments'
              : topLoveLanguage === 'qualityTime'
              ? 'focused, undivided attention from your partner'
              : topLoveLanguage === 'actsOfService'
              ? 'helpful actions and thoughtful gestures'
              : topLoveLanguage === 'receivingGifts'
              ? 'meaningful gifts and tokens of affection'
              : 'physical closeness and affectionate touch'}
          </Text>
        </Card>

        <Card style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Attachment Style</Text>
          <View style={styles.attachmentBadge}>
            <Ionicons
              name={results.attachmentStyle === 'secure' ? 'shield-checkmark' : 'heart'}
              size={24}
              color={COLORS.success}
            />
            <Text style={styles.attachmentText}>
              {results.attachmentStyle.charAt(0).toUpperCase() +
                results.attachmentStyle.slice(1)}
            </Text>
          </View>
          <Text style={styles.attachmentDescription}>
            {results.attachmentStyle === 'secure'
              ? "You're comfortable with intimacy and independence. You form healthy relationships and communicate needs effectively."
              : results.attachmentStyle === 'anxious'
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
    );
  };

  if (showResults) {
    return (
      <SafeAreaView style={styles.container}>
        {renderResults()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentQuestion + 1} / {QUESTIONS.length}
          </Text>
        </View>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.categoryBadge}>
          {question.category === 'bigFive'
            ? 'Personality'
            : question.category === 'loveLanguage'
            ? 'Love Language'
            : 'Attachment'}
        </Text>
        <Text style={styles.questionText}>{question.question}</Text>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                answers[question.id] === option.value && styles.optionButtonSelected,
              ]}
              onPress={() => handleAnswer(option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  answers[question.id] === option.value && styles.optionTextSelected,
                ]}
              >
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
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
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
  questionContainer: {
    flex: 1,
    padding: SPACING.xl,
  },
  categoryBadge: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
  },
  questionText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 30,
    marginBottom: SPACING.xl,
  },
  optionsContainer: {
    gap: SPACING.sm,
  },
  optionButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    padding: SPACING.lg,
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  resultsTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  resultsSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  resultCard: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  traitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  traitLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    width: 110,
  },
  traitBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: SPACING.sm,
  },
  traitBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  traitValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
    width: 40,
    textAlign: 'right',
  },
  loveLanguageMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  loveLanguageText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loveLanguageDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  attachmentText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.success,
  },
  attachmentDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  saveButton: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
});
