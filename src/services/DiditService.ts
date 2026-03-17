// Didit Verification Service - Uses backend API instead of SDK
import { api } from './api';

export interface DiditVerificationResult {
  success: boolean;
  verificationId?: string;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export interface DiditSession {
  sessionId: string;
  workflowId: string;
}

class DiditService {
  // Create a verification session via backend
  async createVerificationSession(): Promise<DiditSession> {
    try {
      const response = await api.createDiditSession();
      return response;
    } catch (error) {
      console.error('Failed to create verification session:', error);
      throw error;
    }
  }

  // Check verification status via backend
  async getVerificationStatus(): Promise<DiditVerificationResult> {
    try {
      const response = await api.getVerificationStatus();
      return response;
    } catch (error) {
      console.error('Failed to get verification status:', error);
      throw error;
    }
  }

  // Submit local AI verification results (fallback)
  async submitLocalVerification(data: {
    success: boolean;
    trustScore?: number;
    confidence?: number;
    ageEstimate?: number;
    isLikelyBot?: boolean;
    isDeepfake?: boolean;
  }): Promise<DiditVerificationResult> {
    try {
      const response = await api.submitLocalVerification(data);
      return response;
    } catch (error) {
      console.error('Failed to submit verification:', error);
      throw error;
    }
  }

  // Check if Didit is configured
  isConfigured(): boolean {
    // Check if backend has Didit credentials
    return true; // Backend handles this
  }

  // Start verification - creates session and returns SDK parameters
  async startVerification(): Promise<{
    success: boolean;
    sessionId: string;
    workflowId: string;
    sdkParams?: any;
    error?: string;
  }> {
    try {
      const session = await this.createVerificationSession();
      return {
        success: true,
        sessionId: session.sessionId,
        workflowId: session.workflowId,
      };
    } catch (error: any) {
      return {
        success: false,
        sessionId: '',
        workflowId: '',
        error: error.message || 'Failed to start verification',
      };
    }
  }
}

export const diditService = new DiditService();
