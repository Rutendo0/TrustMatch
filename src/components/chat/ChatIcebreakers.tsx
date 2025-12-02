import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface ChatIcebreakersProps {
  onSendIcebreaker: (icebreaker: IcebreakerContent) => void;
  onClose: () => void;
}

interface IcebreakerContent {
  type: 'game' | 'question' | 'poll' | 'challenge';
  title: string;
  content: any;
}

const ICEBREAKERS: IcebreakerContent[] = [
  {
    type: 'game',
    title: 'Two Truths, One Lie',
    content: {
      description: "Share 3 facts - your match guesses the lie!",
      prompt: "I'll share 3 things about me. Guess which one is the lie!",
    },
  },
  {
    type: 'poll',
    title: 'First Date Poll',
    content: {
      question: 'Pick your ideal first date:',
      options: ['☕ Coffee & Walk', '🍷 Dinner', '🎬 Movie Night', '🎳 Activity Date'],
    },
  },
  {
    type: 'question',
    title: 'Would You Rather',
    content: {
      options: [
        ['Travel back in time', 'Travel to the future'],
        ['Be able to fly', 'Be invisible'],
        ['Live in the city', 'Live in the countryside'],
        ['Have unlimited money', 'Have unlimited time'],
      ],
    },
  },
  {
    type: 'challenge',
    title: 'Rate Our Match',
    content: {
      prompt: 'Rate your first impression of our match from 1-10!',
      scale: 10,
    },
  },
  {
    type: 'game',
    title: '20 Questions',
    content: {
      description: 'Think of something, I have 20 yes/no questions to guess it!',
      categories: ['Animal', 'Object', 'Famous Person', 'Place'],
    },
  },
  {
    type: 'question',
    title: 'This or That',
    content: {
      pairs: [
        ['Morning person 🌅', 'Night owl 🦉'],
        ['Beach 🏖️', 'Mountains ⛰️'],
        ['Netflix 📺', 'Going out 🎉'],
        ['Sweet 🍰', 'Savory 🍕'],
      ],
    },
  },
  {
    type: 'challenge',
    title: 'Song Dedication',
    content: {
      prompt: "Share a song that describes you or that you'd dedicate to me!",
      type: 'audio',
    },
  },
  {
    type: 'game',
    title: 'Emoji Story',
    content: {
      description: 'Tell me about your day using only emojis!',
      example: '☀️💻☕🏃‍♀️🍝📺😴',
    },
  },
];

export const ChatIcebreakers: React.FC<ChatIcebreakersProps> = ({
  onSendIcebreaker,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { type: 'game', label: 'Games', icon: 'game-controller' },
    { type: 'question', label: 'Questions', icon: 'help-circle' },
    { type: 'poll', label: 'Polls', icon: 'bar-chart' },
    { type: 'challenge', label: 'Challenges', icon: 'trophy' },
  ];

  const filteredIcebreakers = selectedCategory
    ? ICEBREAKERS.filter((i) => i.type === selectedCategory)
    : ICEBREAKERS;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'game':
        return '#8B5CF6';
      case 'question':
        return '#3B82F6';
      case 'poll':
        return '#10B981';
      case 'challenge':
        return '#F59E0B';
      default:
        return COLORS.primary;
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Break the Ice! 🧊</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Choose a fun way to start the conversation
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesList}
          >
            <TouchableOpacity
              style={[
                styles.categoryButton,
                !selectedCategory && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.categoryText,
                  !selectedCategory && styles.categoryTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.type}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.type && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category.type)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={16}
                  color={
                    selectedCategory === category.type
                      ? COLORS.white
                      : COLORS.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category.type && styles.categoryTextActive,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            style={styles.icebreakersContainer}
            showsVerticalScrollIndicator={false}
          >
            {filteredIcebreakers.map((icebreaker, index) => (
              <TouchableOpacity
                key={index}
                style={styles.icebreakerCard}
                onPress={() => onSendIcebreaker(icebreaker)}
              >
                <View
                  style={[
                    styles.icebreakerIcon,
                    { backgroundColor: `${getTypeColor(icebreaker.type)}20` },
                  ]}
                >
                  <Ionicons
                    name={
                      icebreaker.type === 'game'
                        ? 'game-controller'
                        : icebreaker.type === 'question'
                        ? 'help-circle'
                        : icebreaker.type === 'poll'
                        ? 'bar-chart'
                        : 'trophy'
                    }
                    size={24}
                    color={getTypeColor(icebreaker.type)}
                  />
                </View>
                <View style={styles.icebreakerContent}>
                  <Text style={styles.icebreakerTitle}>{icebreaker.title}</Text>
                  <Text style={styles.icebreakerDescription}>
                    {icebreaker.content.description ||
                      icebreaker.content.prompt ||
                      icebreaker.content.question}
                  </Text>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: `${getTypeColor(icebreaker.type)}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        { color: getTypeColor(icebreaker.type) },
                      ]}
                    >
                      {icebreaker.type.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Ionicons name="send" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const IcebreakerMessage: React.FC<{
  icebreaker: IcebreakerContent;
  isMe: boolean;
  onRespond?: (response: any) => void;
}> = ({ icebreaker, isMe, onRespond }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'game':
        return '#8B5CF6';
      case 'question':
        return '#3B82F6';
      case 'poll':
        return '#10B981';
      case 'challenge':
        return '#F59E0B';
      default:
        return COLORS.primary;
    }
  };

  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
    onRespond?.(index);
  };

  return (
    <View style={[styles.icebreakerMessage, isMe && styles.icebreakerMessageMine]}>
      <View
        style={[
          styles.icebreakerMessageHeader,
          { backgroundColor: `${getTypeColor(icebreaker.type)}20` },
        ]}
      >
        <Ionicons
          name={
            icebreaker.type === 'game'
              ? 'game-controller'
              : icebreaker.type === 'poll'
              ? 'bar-chart'
              : 'sparkles'
          }
          size={16}
          color={getTypeColor(icebreaker.type)}
        />
        <Text
          style={[
            styles.icebreakerMessageType,
            { color: getTypeColor(icebreaker.type) },
          ]}
        >
          {icebreaker.title}
        </Text>
      </View>

      {icebreaker.type === 'poll' && icebreaker.content.options && (
        <View style={styles.pollOptions}>
          <Text style={styles.pollQuestion}>{icebreaker.content.question}</Text>
          {icebreaker.content.options.map((option: string, index: number) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.pollOption,
                selectedOption === index && styles.pollOptionSelected,
              ]}
              onPress={() => handleOptionSelect(index)}
              disabled={selectedOption !== null}
            >
              <Text
                style={[
                  styles.pollOptionText,
                  selectedOption === index && styles.pollOptionTextSelected,
                ]}
              >
                {option}
              </Text>
              {selectedOption === index && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {icebreaker.type === 'question' && icebreaker.content.pairs && (
        <View style={styles.thisOrThat}>
          {icebreaker.content.pairs.slice(0, 1).map((pair: string[], index: number) => (
            <View key={index} style={styles.thisOrThatPair}>
              <TouchableOpacity
                style={[
                  styles.thisOrThatOption,
                  selectedOption === 0 && styles.thisOrThatOptionSelected,
                ]}
                onPress={() => handleOptionSelect(0)}
                disabled={selectedOption !== null}
              >
                <Text style={styles.thisOrThatText}>{pair[0]}</Text>
              </TouchableOpacity>
              <Text style={styles.thisOrThatOr}>OR</Text>
              <TouchableOpacity
                style={[
                  styles.thisOrThatOption,
                  selectedOption === 1 && styles.thisOrThatOptionSelected,
                ]}
                onPress={() => handleOptionSelect(1)}
                disabled={selectedOption !== null}
              >
                <Text style={styles.thisOrThatText}>{pair[1]}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {(icebreaker.type === 'game' || icebreaker.type === 'challenge') && (
        <Text style={styles.icebreakerPrompt}>
          {icebreaker.content.prompt || icebreaker.content.description}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  categoriesContainer: {
    maxHeight: 50,
  },
  categoriesList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    marginRight: SPACING.sm,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  icebreakersContainer: {
    padding: SPACING.lg,
  },
  icebreakerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  icebreakerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icebreakerContent: {
    flex: 1,
  },
  icebreakerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  icebreakerDescription: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  icebreakerMessage: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  icebreakerMessageMine: {
    alignSelf: 'flex-end',
  },
  icebreakerMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  icebreakerMessageType: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  pollOptions: {
    gap: SPACING.sm,
  },
  pollQuestion: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  pollOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pollOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
  },
  pollOptionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  pollOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  thisOrThat: {
    gap: SPACING.md,
  },
  thisOrThatPair: {
    gap: SPACING.sm,
  },
  thisOrThatOption: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  thisOrThatOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  thisOrThatText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  thisOrThatOr: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  icebreakerPrompt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
});
