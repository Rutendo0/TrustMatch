import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { registrationProgress } from './RegistrationProgressService';


// Use environment variable or default to localhost for development
// For production, set EXPO_PUBLIC_API_URL in your environment
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://trustmatch-server.onrender.com/api';
// For external face verification API, set EXPO_PUBLIC_FACE_VERIFICATION_API_URL
// If not set, face verification will return an error

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config) => {
        // If token isn't in memory yet (e.g. app just started before init() finished),
        // pull it directly from SecureStore so no request ever goes out without auth.
        if (!this.token) {
          try {
            this.token = await SecureStore.getItemAsync('authToken');
          } catch {}
        }
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Don't retry on 401 - just reject the error
        // Let each request handle its own auth errors
        return Promise.reject(error);
      }
    );
  }

  async init() {
    try {
      this.token = await SecureStore.getItemAsync('authToken');
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  async setToken(token: string) {
    this.token = token;
    await SecureStore.setItemAsync('authToken', token);
  }

  async logout() {
    this.token = null;
    await SecureStore.deleteItemAsync('authToken');
    // Clear registration progress on logout
    await registrationProgress.clearProgress();
  }

  async register(data: {
    email?: string;
    phone?: string;
    password?: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    interestedIn: string;
    deviceFingerprint: string;
    identityFingerprint?: string;
    platform: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    await this.setToken(response.data.token);
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    await this.setToken(response.data.token);
    return response.data;
  }

  async uploadIdDocument(documentType: string, imageUri: string, email?: string) {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('document', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'document.jpg',
    } as any);
    if (email) {
      formData.append('email', email);
    }

    // Add timeout to prevent hanging
    const response = await this.client.post('/verification/id-document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 second timeout for upload
    });
    return response.data;
  }

  async uploadProfilePhoto(imageUri: string) {
    const formData = new FormData();
    formData.append('photo', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    const response = await this.client.post('/users/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async deletePhoto(photoId: string) {
    const response = await this.client.delete(`/users/photos/${photoId}`);
    return response.data;
  }

  async uploadSelfie(imageUri: string) {
    const formData = new FormData();
    formData.append('selfie', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'selfie.jpg',
    } as any);

    const response = await this.client.post('/verification/selfie', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getVerificationStatus() {
    const response = await this.client.get('/verification/status');
    return response.data;
  }

  // Extract text from document image using server-side OCR.
  // Short 20-second timeout: if OCR doesn't respond quickly we fail-fast and
  // fall back to user-entered data, keeping the server healthy for the
  // subsequent verifyLocalDocument call.
  async extractDocumentText(imageUrl: string) {
    const response = await this.client.post(
      '/verification/extract-document-text',
      { imageUrl },
      { timeout: 20_000 }, // fail fast — OCR is best-effort, not required
    );
    return response.data;
  }

  async submitLocalVerification(data: {
    success: boolean;
    trustScore?: number;
    confidence?: number;
    ageEstimate?: number;
    isLikelyBot?: boolean;
    isDeepfake?: boolean;
  }) {
    const response = await this.client.post('/verification/submit-local', data);
    return response.data;
  }

  // Document verification with on-device ML extracted data
  // Can accept email/password for pre-registration verification
  async verifyLocalDocument(data: {
    email?: string;
    password?: string;
    documentType: string;
    documentNumber?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    dateOfBirth: string;
    registrationFirstName?: string;
    registrationLastName?: string;
    registrationDateOfBirth?: string;
    expiryDate?: string;
    nationality?: string;
    gender?: string;
    address?: string;
    confidence?: number;
  }) {
    // Use shorter timeout for verification - 15 seconds should be enough
    const response = await this.client.post('/verification/document/verify-local', data, {
      timeout: 15000,
    });
    return response.data;
  }

  // Store extracted document data
  async storeDocumentData(data: any) {
    const response = await this.client.post('/verification/document/store', data);
    return response.data;
  }

  // Get document verification status
  async getDocumentStatus() {
    const response = await this.client.get('/verification/document/status');
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

async getProfileInsights() {
  try {
    const response = await this.client.get('/users/me/insights');
    return response.data;
  } catch (error: any) {
    console.warn('Profile insights unavailable:', error.response?.status || error.message);
    // Return safe defaults
    return {
      totalLikesReceived: 0,
      likesReceivedLastWeek: 0,
      likesTrend: 0,
      superLikesReceived: 0,
      totalMatches: 0,
      profileViews: 0,
    };
  }
}

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    city?: string;
    country?: string;
    occupation?: string;
    education?: string;
    relationshipGoal?: string;
    aboutMe?: string;
    interests?: string[];
  }) {
    const response = await this.client.put('/users/me', data);
    return response.data;
  }

  async updatePreferences(data: {
    ageRangeMin?: number;
    ageRangeMax?: number;
    maxDistance?: number;
    interestedIn?: string;
  }) {
    const response = await this.client.put('/users/preferences', data);
    return response.data;
  }

  async getDiscoverProfiles(limit: number = 10, filters?: {
    gender?: string;
    ageMin?: number;
    ageMax?: number;
    distance?: number;
  }) {
    const params: any = { limit };
    if (filters) {
      if (filters.gender && filters.gender !== 'Everyone') {
        params.gender = filters.gender;
      }
      if (filters.ageMin) params.ageMin = filters.ageMin;
      if (filters.ageMax) params.ageMax = filters.ageMax;
      if (filters.distance) params.distance = filters.distance;
    }
    const response = await this.client.get('/users/discover', { params });
    return response.data;
  }

  async swipe(targetUserId: string, action: 'LIKE' | 'DISLIKE' | 'SUPERLIKE') {
    const response = await this.client.post('/matches/swipe', {
      targetUserId,
      action,
    });
    return response.data;
  }

  async getMatches() {
    const response = await this.client.get('/matches');
    return response.data;
  }

  async getLikes() {
    const response = await this.client.get('/matches/likes');
    return response.data;
  }

  async getSentLikes() {
    const response = await this.client.get('/matches/sent-likes');
    return response.data;
  }

  async unmatch(matchId: string) {
    const response = await this.client.delete(`/matches/${matchId}`);
    return response.data;
  }

  async getMessages(matchId: string, limit: number = 50, before?: string) {
    const response = await this.client.get(`/messages/${matchId}`, {
      params: { limit, before },
    });
    return response.data;
  }

  async sendMessage(matchId: string, content: string, type: string = 'TEXT') {
    const response = await this.client.post(`/messages/${matchId}`, {
      content,
      type,
    });
    return response.data;
  }

  async markMessagesAsRead(matchId: string) {
    const response = await this.client.put(`/messages/${matchId}/read`);
    return response.data;
  }

  // Email verification
  async sendEmailVerification() {
    const response = await this.client.post('/auth/send-email-verification');
    return response.data;
  }

  async verifyEmailCode(code: string) {
    const response = await this.client.post('/auth/verify-email', { code });
    return response.data;
  }

  async resendEmailCode() {
    const response = await this.client.post('/auth/resend-email-code');
    return response.data;
  }

  async completeRegistration() {
    const response = await this.client.post('/auth/complete');
    if (response.data.token) {
      await this.setToken(response.data.token);
    }
    return response.data;
  }

  async resendVerificationCode(email: string) {
    const response = await this.client.post('/auth/resend-code', { email });
    return response.data;
  }

   // Face comparison using external backend API
   // Configure via EXPO_PUBLIC_FACE_VERIFICATION_API_URL environment variable
   // This should point to your Node.js backend endpoint (e.g., http://localhost:5000/api/users/verify-face)
   async compareFaces(image1: string, image2: string) {
     const externalApiUrl = process.env.EXPO_PUBLIC_FACE_VERIFICATION_API_URL;
     
     if (!externalApiUrl) {
       console.warn('Face verification API URL not configured. Set EXPO_PUBLIC_FACE_VERIFICATION_API_URL');
       return { 
         success: false, 
         similarity: 0, 
         isMatch: false, 
         message: 'Face verification API not configured' 
       };
     }
     
     try {
        // Create FormData with the two images as file uploads
        const formData = new FormData();
        
        // Helper to append image file to FormData for React Native
        // React Native fetch understands { uri, type, name } objects
        const appendImageFile = (uri: string, fieldName: string) => {
          formData.append(fieldName, {
            uri,
            type: 'image/jpeg',
            name: `${fieldName}.jpg`,
          } as any);
        };
        
        appendImageFile(image1, 'img1');
        appendImageFile(image2, 'img2');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(externalApiUrl, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          // Don't set Content-Type - fetch will set it with boundary for FormData
        });
        
        clearTimeout(timeoutId);
       
       if (!response.ok) {
         const errorText = await response.text();
         throw new Error(`Face verification API error (${response.status}): ${errorText}`);
       }
       
       const data = await response.json();
       
       // Backend returns DeepFace response with `verified` boolean and `distance` value
       // We need to convert to our standard format
       const isMatch = data.verified === true;
       const similarity = data.distance ? (1 - data.distance) : (data.confidence ? data.confidence / 100 : 0);
       const threshold = data.threshold || 0.68;
       
       return {
         success: true,
         similarity,
         isMatch,
         threshold,
         message: isMatch ? 'Face match confirmed' : 'Faces do not match',
         // Include extra data for debugging
         rawResponse: {
           distance: data.distance,
           confidence: data.confidence,
           model: data.model,
           detectorBackend: data.detector_backend,
           facialAreas: data.facial_areas,
         }
       };
     } catch (error: any) {
       console.error('External face comparison error:', error);
       return {
         success: false,
         similarity: 0,
         isMatch: false,
         message: error.message || 'Face comparison failed',
       };
     }
   }

  // Live verification - submit live detection results to backend
  async submitLiveVerification(data: {
    similarity: number;
    confidence: number;
    isMatch: boolean;
    photosMatched: number;
    totalPhotos: number;
  }) {
    const response = await this.client.post('/users/me/live-verification', data);
    return response.data;
  }

  // Get live verification history
  async getLiveVerificationHistory(limit?: number, offset?: number) {
    const params: any = {};
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;
    const response = await this.client.get('/users/me/live-verification/history', { params });
    return response.data;
  }
}

export const api = new ApiService();
