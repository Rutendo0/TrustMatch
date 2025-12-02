export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  interestedIn: 'male' | 'female' | 'both';
  bio: string;
  photos: string[];
  location: {
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  verification: VerificationStatus;
  preferences: UserPreferences;
  createdAt: string;
  lastActive: string;
}

export interface VerificationStatus {
  isVerified: boolean;
  idVerified: boolean;
  selfieVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  verifiedAt?: string;
}

export interface UserPreferences {
  ageRange: {
    min: number;
    max: number;
  };
  distance: number;
  showMe: 'male' | 'female' | 'both';
}

export interface Match {
  id: string;
  users: [string, string];
  matchedAt: string;
  lastMessage?: Message;
  isActive: boolean;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'gif';
  sentAt: string;
  readAt?: string;
}

export interface SwipeAction {
  type: 'like' | 'dislike' | 'superlike';
  userId: string;
  targetUserId: string;
  timestamp: string;
}

export interface VerificationDocument {
  type: 'passport' | 'drivers_license' | 'national_id';
  imageUri: string;
  extractedData?: {
    fullName: string;
    dateOfBirth: string;
    documentNumber: string;
    expiryDate: string;
  };
}

export interface LiveSelfie {
  imageUri: string;
  livenessScore: number;
  faceMatchScore: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface RegistrationData {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  interestedIn: 'male' | 'female' | 'both';
  idDocument: VerificationDocument;
  selfie: LiveSelfie;
  deviceFingerprint: string;
}
