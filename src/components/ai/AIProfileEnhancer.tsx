import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '../common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

interface PhotoAnalysis {
  url: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  suggestions: string[];
}

interface AIProfileEnhancerProps {
  currentBio: string;
  photos: string[];
  interests: string[];
  onBioUpdate: (newBio: string) => void;
  onClose: () => void;
}

export const AIProfileEnhancer: React.FC<AIProfileEnhancerProps> = ({
  currentBio,
  photos,
  interests,
  onBioUpdate,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'bio' | 'photos' | 'tips'>('bio');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bioSuggestions, setBioSuggestions] = useState<string[]>([]);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysis[]>([]);
  const [selectedBio, setSelectedBio] = useState<string | null>(null);
  const [profileScore, setProfileScore] = useState<number | null>(null);

  const analyzeBio = async () => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const suggestions = [
      `${interests[0] || 'Adventure'} enthusiast with a passion for genuine connections. When I'm not ${interests[1]?.toLowerCase() || 'exploring'}, you'll find me trying new restaurants or planning my next trip. Looking for someone who can match my energy and isn't afraid to be themselves. ✨`,
      `Life's too short for boring conversations and bad coffee ☕ | ${interests.slice(0, 2).join(' • ')} | Believer in spontaneous adventures and meaningful connections. Swipe right if you want someone who'll remember the little things.`,
      `Not here to waste time – I know what I want. ${interests[0] || 'Creative soul'} by day, ${interests[1] || 'foodie'} by night. Looking for my partner in crime for both the adventures and the quiet nights in. Your move 💫`,
    ];

    setBioSuggestions(suggestions);
    setProfileScore(78);
    setIsAnalyzing(false);
  };

  const analyzePhotos = async () => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const analysis: PhotoAnalysis[] = photos.slice(0, 4).map((url, index) => ({
      url,
      quality: index === 0 ? 'excellent' : index === 1 ? 'good' : 'fair',
      issues: index === 0 ? [] : index === 1 ? ['Could use more natural lighting'] : ['Face partially obscured', 'Low resolution'],
      suggestions: index === 0 
        ? ['Great main photo!'] 
        : index === 1 
        ? ['Try outdoor natural light next time'] 
        : ['Show your full face', 'Use a higher quality camera'],
    }));

    setPhotoAnalysis(analysis);
    setIsAnalyzing(false);
  };

  const renderBioTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.currentBioContainer}>
        <Text style={styles.sectionLabel}>Your Current Bio</Text>
        <View style={styles.currentBio}>
          <Text style={styles.currentBioText}>
            {currentBio || 'No bio yet. Let AI help you write one!'}
          </Text>
        </View>
      </View>

      {bioSuggestions.length === 0 ? (
        <Button
          title="Generate Bio Suggestions"
          onPress={analyzeBio}
          loading={isAnalyzing}
          icon={<Ionicons name="sparkles" size={18} color={COLORS.white} />}
        />
      ) : (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.sectionLabel}>AI Suggestions</Text>
          {bioSuggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.bioSuggestion,
                selectedBio === suggestion && styles.bioSuggestionSelected,
              ]}
              onPress={() => setSelectedBio(suggestion)}
            >
              <Text style={styles.bioSuggestionText}>{suggestion}</Text>
              {selectedBio === suggestion && (
                <View style={styles.selectedCheck}>
                  <Ionicons name="checkmark" size={16} color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
          ))}

          {selectedBio && (
            <Button
              title="Use This Bio"
              onPress={() => {
                onBioUpdate(selectedBio);
                onClose();
              }}
              style={styles.useBioButton}
            />
          )}

          <TouchableOpacity style={styles.regenerateButton} onPress={analyzeBio}>
            <Ionicons name="refresh" size={18} color={COLORS.primary} />
            <Text style={styles.regenerateText}>Generate more options</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderPhotosTab = () => (
    <View style={styles.tabContent}>
      {photoAnalysis.length === 0 ? (
        <Button
          title="Analyze My Photos"
          onPress={analyzePhotos}
          loading={isAnalyzing}
          icon={<Ionicons name="camera" size={18} color={COLORS.white} />}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {photoAnalysis.map((photo, index) => (
            <View key={index} style={styles.photoAnalysisItem}>
              <Image source={{ uri: photo.url }} style={styles.analyzedPhoto} />
              <View style={styles.photoDetails}>
                <View style={styles.qualityBadge(photo.quality)}>
                  <Text style={styles.qualityText(photo.quality)}>
                    {photo.quality.toUpperCase()}
                  </Text>
                </View>
                {photo.issues.length > 0 ? (
                  <View style={styles.issuesList}>
                    {photo.issues.map((issue, i) => (
                      <View key={i} style={styles.issueItem}>
                        <Ionicons name="alert-circle" size={14} color={COLORS.warning} />
                        <Text style={styles.issueText}>{issue}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noIssues}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                    <Text style={styles.noIssuesText}>No issues detected</Text>
                  </View>
                )}
                {photo.suggestions.map((suggestion, i) => (
                  <Text key={i} style={styles.suggestionText}>
                    💡 {suggestion}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderTipsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {profileScore !== null && (
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{profileScore}</Text>
            <Text style={styles.scoreLabel}>Profile Score</Text>
          </View>
          <View style={styles.scoreDetails}>
            <Text style={styles.scoreTitle}>Good, but can be better!</Text>
            <Text style={styles.scoreSubtitle}>
              Complete the tips below to increase your score
            </Text>
          </View>
        </View>
      )}

      <View style={styles.tipsList}>
        <TipItem
          icon="images"
          title="Add more photos"
          description="Profiles with 4-6 photos get 3x more matches"
          completed={photos.length >= 4}
        />
        <TipItem
          icon="document-text"
          title="Write a bio"
          description="A good bio increases matches by 50%"
          completed={currentBio.length >= 50}
        />
        <TipItem
          icon="mic"
          title="Add a voice prompt"
          description="Voice notes make your profile stand out"
          completed={false}
        />
        <TipItem
          icon="videocam"
          title="Add a video intro"
          description="Video profiles get priority matching"
          completed={false}
        />
        <TipItem
          icon="heart"
          title="Complete personality quiz"
          description="Better matches through compatibility"
          completed={false}
        />
      </View>
    </ScrollView>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.aiIcon}>
                <Ionicons name="sparkles" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>AI Profile Enhancer</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            {(['bio', 'photos', 'tips'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'bio' && renderBioTab()}
          {activeTab === 'photos' && renderPhotosTab()}
          {activeTab === 'tips' && renderTipsTab()}
        </View>
      </View>
    </Modal>
  );
};

const TipItem: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  completed: boolean;
}> = ({ icon, title, description, completed }) => (
  <View style={[styles.tipItem, completed && styles.tipItemCompleted]}>
    <View style={[styles.tipIcon, completed && styles.tipIconCompleted]}>
      <Ionicons
        name={completed ? 'checkmark' : icon}
        size={20}
        color={completed ? COLORS.white : COLORS.primary}
      />
    </View>
    <View style={styles.tipContent}>
      <Text style={[styles.tipTitle, completed && styles.tipTitleCompleted]}>
        {title}
      </Text>
      <Text style={styles.tipDescription}>{description}</Text>
    </View>
    {!completed && (
      <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
    )}
  </View>
);

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
    maxHeight: '90%',
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  tabContent: {
    padding: SPACING.lg,
    flex: 1,
  },
  currentBioContainer: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  currentBio: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  currentBioText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  suggestionsContainer: {
    gap: SPACING.sm,
  },
  bioSuggestion: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    position: 'relative',
  },
  bioSuggestionSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
  },
  bioSuggestionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
    paddingRight: SPACING.lg,
  },
  selectedCheck: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useBioButton: {
    marginTop: SPACING.md,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  regenerateText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  photoAnalysisItem: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  analyzedPhoto: {
    width: 80,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
  },
  photoDetails: {
    flex: 1,
    gap: SPACING.xs,
  },
  qualityBadge: (quality: string) => ({
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor:
      quality === 'excellent' ? 'rgba(16, 185, 129, 0.1)' :
      quality === 'good' ? 'rgba(59, 130, 246, 0.1)' :
      quality === 'fair' ? 'rgba(245, 158, 11, 0.1)' :
      'rgba(239, 68, 68, 0.1)',
  }),
  qualityText: (quality: string) => ({
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color:
      quality === 'excellent' ? COLORS.success :
      quality === 'good' ? '#3B82F6' :
      quality === 'fair' ? '#F59E0B' :
      COLORS.error,
  }),
  issuesList: {
    gap: 4,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  issueText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  noIssues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  noIssuesText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
  },
  suggestionText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    marginTop: 4,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  scoreCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scoreLabel: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scoreDetails: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  scoreSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tipsList: {
    gap: SPACING.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.md,
  },
  tipItemCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipIconCompleted: {
    backgroundColor: COLORS.success,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  tipTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  tipDescription: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
