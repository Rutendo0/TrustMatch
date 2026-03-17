import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';


const API_URL = 'http://192.168.1.93:3000/api';

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
        if (error.response?.status === 401) {
          // Only clear the in-memory token — do NOT delete from SecureStore.
          // Deleting from SecureStore on every 401 causes a cascade: if one
          // request fails (e.g. the best-effort image upload), the token is
          // gone and every subsequent request in the same flow also gets 401.
          // Individual screens handle navigation-to-login when needed.
          this.token = null;
        }
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
  }

  async register(data: {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    interestedIn: string;
    deviceFingerprint: string;
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

  async uploadIdDocument(documentType: string, imageUri: string) {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('document', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'document.jpg',
    } as any);

    const response = await this.client.post('/verification/id-document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
  async verifyLocalDocument(data: {
    documentType: string;
    documentNumber?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    dateOfBirth: string;
    expiryDate?: string;
    nationality?: string;
    gender?: string;
    address?: string;
    confidence?: number;
  }) {
    const response = await this.client.post('/verification/document/verify-local', data);
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

  async createDiditSession() {
    const response = await this.client.post('/verification/start');
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    city?: string;
    country?: string;
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

  async getDiscoverProfiles(limit: number = 10) {
    const response = await this.client.get('/users/discover', {
      params: { limit },
    });
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

  async resendVerificationCode(email: string) {
    const response = await this.client.post('/auth/resend-code', { email });
    return response.data;
  }
}

export const api = new ApiService();
