import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AISecurityService, PersonalityProfile, PhotoQualityAnalysis } from '../../services/AISecurityService';

interface AIProfileEnhancerProps {
  currentBio: string;
  currentPhotos: string[];
  personalityProfile?: PersonalityProfile;
  onBioUpdate: (newBio: string) => void;
  onPhotosUpdate: (updatedPhotos: string[]) => void;
  onClose: () => void;
}

interface PhotoRecommendation {
  uri: string;
  currentScore: number;
  aiRecommendations: string[];
  suggestions: string[];
}

export const AIProfileEnhancer: React.FC<AIProfileEnhancerProps> = ({
  currentBio,
  currentPhotos,
  personalityProfile,
  onBioUpdate,
  onPhotosUpdate,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'bio' | 'photos' | 'personality'>('bio');
  const [bioStyles, setBioStyles] = useState<{
    friendly: string;
    professional: string;
    fun: string;
  } | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingBio, setIsLoadingBio] = useState(false);

  useEffect(() => {
    if (activeTab === 'bio') {
      generateBioEnhancements();
    } else if (activeTab === 'photos') {
      analyzePhotos();
    } else if (activeTab === 'personality') {
      generatePersonalityInsights();
    }
  }, [activeTab]);

  const generateBioEnhancements = async () => {
    setIsLoadingBio(true);
    try {
      const aiService = AISecurityService.getInstance();
      const [friendlyBio, professionalBio, funBio] = await Promise.all([
        aiService.enhanceBio(currentBio, 'friendly', personalityProfile),
        aiService.enhanceBio(currentBio, 'professional', personalityProfile),
        aiService.enhanceBio(currentBio, 'fun', personalityProfile),
      ]);

      setBioStyles({
        friendly: friendlyBio,
        professional: professionalBio,
        fun: funBio,
      });
    } catch (error) {
      console.error('Bio enhancement failed:', error);
      Alert.alert('Error', 'Failed to enhance bio. Please try again.');
    } finally {
      setIsLoadingBio(false);
    }
  };

  const analyzePhotos = async () => {
    setIsAnalyzing(true);
    try {
      const aiService = AISecurityService.getInstance();
      const analysisPromises = currentPhotos.map(async (photoUri) => {
        const analysis = await aiService.analyzePhotoQuality(photoUri);
        return {
          uri: photoUri,
          currentScore: analysis.score,
          aiRecommendations: analysis.aiRecommendations || [],
          suggestions: analysis.recommendations,
        };
      });

      const results = await Promise.all(analysisPromises);
      setPhotoAnalysis(results);
    } catch (error) {
      console.error('Photo analysis failed:', error);
      Alert.alert('Error', 'Failed to analyze photos. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generatePersonalityInsights = () => {
    if (!personalityProfile) return;

    // Mock insights generation based on personality profile
    // In a real app, this would come from AI analysis
  };

  const handleBioSelect = (style: 'friendly' | 'professional' | 'fun') => {
    if (bioStyles) {
      onBioUpdate(bioStyles[style]);
      Alert.alert('Bio Updated', `Your bio has been updated to the ${style} style!`);
    }
  };

  const renderBioEnhancement = () => (
    <View style={styles.tabContent}>
      <View style={styles.enhancementHeader}>
        <Ionicons name="create" size={24} color={COLORS.primary} />
        <Text style={styles.enhancementTitle}>AI Bio Enhancement</Text>
        <Text style={styles.enhancementSubtitle}>
          Let AI help you write a compelling bio that matches your personality
        </Text>
      </View>

      {isLoadingBio ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>AI is crafting your perfect bio...</Text>
        </View>
      ) : bioStyles ? (
        <ScrollView style={styles.bioOptionsContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Choose Your Style</Text>
          
          <TouchableOpacity
            style={styles.bioOption}
            onPress={() => handleBioSelect('friendly')}
          >
            <View style={styles.bioOptionHeader}>
              <Ionicons name="heart" size={20} color={COLORS.success} />
              <Text style={styles.bioOptionTitle}>Friendly & Approachable</Text>
            </View>
            <Text style={styles.bioOptionText}>{bioStyles.friendly}</Text>
            <View style={styles.bioOptionFooter}>
              <Text style={styles.bioOptionLabel}>Best for: First impressions</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bioOption}
            onPress={() => handleBioSelect('professional')}
          >
            <View style={styles.bioOptionHeader}>
              <Ionicons name="briefcase" size={20} color={COLORS.primary} />
              <Text style={styles.bioOptionTitle}>Professional & Clear</Text>
            </View>
            <Text style={styles.bioOptionText}>{bioStyles.professional}</Text>
            <View style={styles.bioOptionFooter}>
              <Text style={styles.bioOptionLabel}>Best for: Career-focused profiles</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bioOption}
            onPress={() => handleBioSelect('fun')}
          >
            <View style={styles.bioOptionHeader}>
              <Ionicons name="sparkles" size={20} color={COLORS.warning} />
              <Text style={styles.bioOptionTitle}>Fun & Energetic</Text>
            </View>
            <Text style={styles.bioOptionText}>{bioStyles.fun}</Text>
            <View style={styles.bioOptionFooter}>
              <Text style={styles.bioOptionLabel}>Best for: Casual dating</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </View>
  );

  const renderPhotoEnhancement = () => (
    <View style={styles.tabContent}>
      <View style={styles.enhancementHeader}>
        <Ionicons name="camera" size={24} color={COLORS.primary} />
        <Text style={styles.enhancementTitle}>AI Photo Analysis</Text>
        <Text style={styles.enhancementSubtitle}>
          Get personalized recommendations to improve your profile photos
        </Text>
      </View>

      {isAnalyzing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>AI is analyzing your photos...</Text>
        </View>
      ) : (
        <ScrollView style={styles.photoAnalysisContainer} showsVerticalScrollIndicator={false}>
          {photoAnalysis.map((photo, index) => (
            <Card key={index} style={styles.photoAnalysisCard}>
              <View style={styles.photoAnalysisHeader}>
                <Text style={styles.photoTitle}>Photo {index + 1}</Text>
                <View style={styles.photoScoreContainer}>
                  <Text style={[
                    styles.photoScore,
                    { color: photo.currentScore >= 80 ? COLORS.success : 
                            photo.currentScore >= 60 ? COLORS.warning : COLORS.error }
                  ]}>
                    {photo.currentScore}/100
                  </Text>
                </View>
              </View>

              {photo.aiRecommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <Text style={styles.recommendationsTitle}>AI Recommendations</Text>
                  {photo.aiRecommendations.map((rec, recIndex) => (
                    <View key={recIndex} style={styles.recommendationItem}>
                      <Ionicons name="sparkles" size={16} color={COLORS.primary} />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              )}

              {photo.suggestions.length > 0 && (
                <View style={styles.suggestionsSection}>
                  <Text style={styles.suggestionsTitle}>Suggestions</Text>
                  {photo.suggestions.map((suggestion, sugIndex) => (
                    <View key={sugIndex} style={styles.suggestionItem}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.warning} />
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderPersonalityInsights = () => (
    <View style={styles.tabContent}>
      <View style={styles.enhancementHeader}>
        <Ionicons name="person-circle" size={24} color={COLORS.primary} />
        <Text style={styles.enhancementTitle}>Personality Insights</Text>
        <Text style={styles.enhancementSubtitle}>
          Discover how AI sees your personality and dating style
        </Text>
      </View>

      {personalityProfile ? (
        <ScrollView style={styles.personalityContainer} showsVerticalScrollIndicator={false}>
          <Card style={styles.personalityCard}>
            <Text style={styles.personalityTitle}>Your Dating Style</Text>
            <Text style={styles.personalityText}>{personalityProfile.relationshipStyle}</Text>
          </Card>

          <Card style={styles.personalityCard}>
            <Text style={styles.personalityTitle}>Communication Style</Text>
            <Text style={styles.personalityText}>{personalityProfile.communicationStyle}</Text>
          </Card>

          <Card style={styles.personalityCard}>
            <Text style={styles.personalityTitle}>Key Traits</Text>
            <View style={styles.traitsContainer}>
              {personalityProfile.traits.map((trait, index) => (
                <View key={index} style={styles.traitTag}>
                  <Text style={styles.traitText}>{trait}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card style={styles.personalityCard}>
            <Text style={styles.personalityTitle}>Interests</Text>
            <View style={styles.interestsContainer}>
              {personalityProfile.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </Card>
        </ScrollView>
      ) : (
        <View style={styles.noDataContainer}>
          <Ionicons name="person-add" size={48} color={COLORS.textSecondary} />
          <Text style={styles.noDataText}>
            Complete your personality quiz to get AI insights
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>AI Profile Enhancer</Text>
        <Text style={styles.subtitle}>Let AI help you shine</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bio' && styles.activeTab]}
          onPress={() => setActiveTab('bio')}
        >
          <Ionicons 
            name="create" 
            size={20} 
            color={activeTab === 'bio' ? COLORS.primary : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'bio' && styles.activeTabText]}>
            Bio
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
          onPress={() => setActiveTab('photos')}
        >
          <Ionicons 
            name="camera" 
            size={20} 
            color={activeTab === 'photos' ? COLORS.primary : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>
            Photos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'personality' && styles.activeTab]}
          onPress={() => setActiveTab('personality')}
        >
          <Ionicons 
            name="person-circle" 
            size={20} 
            color={activeTab === 'personality' ? COLORS.primary : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'personality' && styles.activeTabText]}>
            Personality
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'bio' && renderBioEnhancement()}
      {activeTab === 'photos' && renderPhotoEnhancement()}
      {activeTab === 'personality' && renderPersonalityInsights()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  activeTab: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  enhancementHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.md,
  },
  enhancementTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  enhancementSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  bioOptionsContainer: {
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  bioOption: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bioOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  bioOptionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  bioOptionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  bioOptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bioOptionLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  photoAnalysisContainer: {
    gap: SPACING.md,
  },
  photoAnalysisCard: {
    padding: SPACING.md,
  },
  photoAnalysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  photoTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  photoScoreContainer: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
  },
  photoScore: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  recommendationsSection: {
    marginBottom: SPACING.md,
  },
  recommendationsTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  recommendationText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  suggestionsSection: {
    marginBottom: SPACING.sm,
  },
  suggestionsTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  suggestionText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  personalityContainer: {
    gap: SPACING.md,
  },
  personalityCard: {
    padding: SPACING.md,
  },
  personalityTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  personalityText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  traitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  traitTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  traitText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  interestTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  interestText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    fontWeight: '500',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  noDataText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
