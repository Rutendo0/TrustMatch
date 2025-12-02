export interface SafetyAlert {
  id: string;
  userId: string;
  type: 'warning' | 'caution' | 'info';
  reason: string;
  reportCount: number;
  behaviorFlags: string[];
  createdAt: string;
}

export interface VideoCall {
  id: string;
  matchId: string;
  initiatorId: string;
  receiverId: string;
  status: 'pending' | 'active' | 'completed' | 'declined' | 'missed';
  duration?: number;
  startedAt?: string;
  endedAt?: string;
}

export interface LocationShare {
  id: string;
  userId: string;
  sharedWithPhone: string;
  sharedWithName: string;
  latitude: number;
  longitude: number;
  expiresAt: string;
  isActive: boolean;
}

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface AIConversationSuggestion {
  id: string;
  matchId: string;
  suggestions: string[];
  basedOn: {
    commonInterests: string[];
    profileHighlights: string[];
  };
}

export interface ProfileEnhancement {
  bioSuggestions: string[];
  photoFeedback: PhotoFeedback[];
  overallScore: number;
  improvements: string[];
}

export interface PhotoFeedback {
  photoUrl: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  suggestions: string[];
  hasFilters: boolean;
  isClear: boolean;
  faceVisible: boolean;
}

export interface CompatibilityScore {
  matchId: string;
  overallScore: number;
  breakdown: {
    personality: number;
    interests: number;
    values: number;
    lifestyle: number;
    communication: number;
  };
  highlights: string[];
  potentialChallenges: string[];
}

export interface AgeVerification {
  estimatedAge: number;
  confidence: number;
  claimedAge: number;
  isConsistent: boolean;
  discrepancy?: number;
}

export interface VoiceVerification {
  id: string;
  userId: string;
  audioUrl: string;
  verified: boolean;
  voiceprint?: string;
  createdAt: string;
}

export interface TrustScore {
  userId: string;
  level: 'basic' | 'verified' | 'trusted' | 'premium';
  score: number;
  factors: {
    idVerified: boolean;
    selfieVerified: boolean;
    livenessVerified: boolean;
    voiceVerified: boolean;
    phoneVerified: boolean;
    emailVerified: boolean;
    behaviorScore: number;
    reportHistory: number;
    accountAge: number;
  };
  badges: string[];
}

export interface Dealbreakers {
  userId: string;
  smoking: 'never' | 'sometimes' | 'often' | 'any';
  drinking: 'never' | 'social' | 'regular' | 'any';
  religion: string[];
  wantsKids: 'yes' | 'no' | 'maybe' | 'any';
  hasKids: 'yes' | 'no' | 'any';
  maxDistance: number;
  minAge: number;
  maxAge: number;
  education: string[];
  dealbreakersStrict: boolean;
}

export interface PersonalityProfile {
  userId: string;
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  loveLanguage: {
    wordsOfAffirmation: number;
    actsOfService: number;
    receivingGifts: number;
    qualityTime: number;
    physicalTouch: number;
  };
  attachmentStyle: 'secure' | 'anxious' | 'avoidant' | 'fearful';
  completedAt: string;
}

export interface ChatIcebreaker {
  id: string;
  type: 'game' | 'question' | 'poll' | 'challenge';
  title: string;
  description: string;
  content: any;
}

export interface GhostingStatus {
  matchId: string;
  lastMessageAt: string;
  daysSinceReply: number;
  suggestedAction: 'nudge' | 'graceful_exit' | 'expire';
  autoExpireAt?: string;
}

export interface AudioPrompt {
  id: string;
  userId: string;
  promptQuestion: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
}

export interface InterestBadge {
  id: string;
  name: string;
  category: string;
  icon: string;
  detectedFrom: 'photo' | 'bio' | 'quiz' | 'manual';
  confidence?: number;
}

export interface Event {
  id: string;
  name: string;
  type: 'concert' | 'festival' | 'university' | 'sports' | 'social' | 'other';
  location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  date: string;
  attendees: string[];
  matchesAtEvent: number;
}

export interface GroupProfile {
  id: string;
  name: string;
  members: string[];
  bio: string;
  photos: string[];
  lookingFor: 'group' | 'individuals' | 'both';
  createdBy: string;
  createdAt: string;
}

export interface PremiumFeatures {
  userId: string;
  tier: 'free' | 'plus' | 'premium' | 'vip';
  features: {
    unlimitedLikes: boolean;
    seeWhoLikedYou: boolean;
    profileBoosts: number;
    superLikes: number;
    videoProfiles: boolean;
    advancedFilters: boolean;
    readReceipts: boolean;
    priorityMatching: boolean;
    incognitoMode: boolean;
  };
  expiresAt?: string;
}

export interface ProfileView {
  id: string;
  viewerId: string;
  viewedId: string;
  viewedAt: string;
  duration: number;
  action?: 'like' | 'pass' | 'superlike';
}
