import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface AIConversationStarterProps {
  matchName: string;
  matchInterests: string[];
  matchBio: string;
  onSelectSuggestion: (message: string) => void;
  onClose: () => void;
}

export const AIConversationStarter: React.FC<AIConversationStarterProps> = ({
  matchName,
  matchInterests,
  matchBio,
  onSelectSuggestion,
  onClose,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    generateSuggestions();
  }, []);

  const generateSuggestions = async () => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    const interestBasedOpeners = matchInterests.slice(0, 2).map(interest => {
      const openers: Record<string, string[]> = {
        'Travel': [
          `Hey ${matchName}! I noticed you love traveling. What's been your most memorable trip so far? ✈️`,
          `Hi! Fellow travel enthusiast here! Do you have a dream destination on your bucket list?`,
        ],
        'Photography': [
          `Your photos look amazing! Do you do photography professionally or is it a passion project? 📸`,
          `Hey ${matchName}! I'd love to hear about your photography journey. What got you started?`,
        ],
        'Hiking': [
          `Hey! I see you're into hiking. Any favorite trails you'd recommend? 🏔️`,
          `Hi ${matchName}! What's the most beautiful view you've seen on a hike?`,
        ],
        'Music': [
          `I noticed you're into music! What's been on repeat for you lately? 🎵`,
          `Hey ${matchName}! Are you more of a live concert person or a cozy vinyl listener?`,
        ],
        'Food': [
          `Hey foodie! What's your go-to comfort food? 🍕`,
          `Hi ${matchName}! I'm always looking for restaurant recs - any favorites in the area?`,
        ],
        'Art': [
          `I love that you're into art! Do you create or mainly appreciate? 🎨`,
          `Hey ${matchName}! Have you seen any good exhibitions lately?`,
        ],
        'Technology': [
          `Fellow tech person! What's the most exciting innovation you've seen recently?`,
          `Hi ${matchName}! Are you working on any interesting projects?`,
        ],
        'Dogs': [
          `I see you're a dog person! 🐕 What kind of pup do you have?`,
          `Hey ${matchName}! Dogs are the best! Does yours have any funny quirks?`,
        ],
      };

      const categoryOpeners = openers[interest] || [
        `Hey ${matchName}! I noticed we both like ${interest.toLowerCase()}. How did you get into it?`,
      ];

      return categoryOpeners[Math.floor(Math.random() * categoryOpeners.length)];
    });

    const genericOpeners = [
      `Hey ${matchName}! Your profile really caught my eye. What's something you're really passionate about that most people don't know?`,
      `Hi! I couldn't help but notice your smile in your photos. What makes you genuinely happy?`,
      `Hey ${matchName}! If you could have dinner with anyone, living or not, who would it be and why?`,
    ];

    const allSuggestions = [
      ...interestBasedOpeners,
      genericOpeners[Math.floor(Math.random() * genericOpeners.length)],
    ].slice(0, 4);

    setSuggestions(allSuggestions);
    setIsLoading(false);
  };

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onSelectSuggestion(suggestions[index]);
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.aiIcon}>
          <Ionicons name="sparkles" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>AI Conversation Starter</Text>
          <Text style={styles.subtitle}>
            Personalized openers based on {matchName}'s profile
          </Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Crafting personalized openers...</Text>
        </View>
      ) : (
        <ScrollView style={styles.suggestionsContainer} showsVerticalScrollIndicator={false}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.suggestionItem,
                selectedIndex === index && styles.suggestionItemSelected,
              ]}
              onPress={() => handleSelect(index)}
            >
              <Text
                style={[
                  styles.suggestionText,
                  selectedIndex === index && styles.suggestionTextSelected,
                ]}
              >
                {suggestion}
              </Text>
              {selectedIndex === index && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={generateSuggestions}
          >
            <Ionicons name="refresh" size={18} color={COLORS.primary} />
            <Text style={styles.refreshText}>Generate new suggestions</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {matchInterests.length > 0 && (
        <View style={styles.basedOnContainer}>
          <Text style={styles.basedOnLabel}>Based on shared interests:</Text>
          <View style={styles.interestTags}>
            {matchInterests.slice(0, 3).map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  suggestionsContainer: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  suggestionItemSelected: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  suggestionText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  suggestionTextSelected: {
    color: COLORS.primary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  refreshText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  basedOnContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  basedOnLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  interestTag: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  interestText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
