import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Didit Verification Service
//
// Docs: https://docs.didit.me
// Authentication: API Key (x-api-key header)
// ─────────────────────────────────────────────────────────────────────────────

interface DiditSessionResponse {
  id: string;
  url: string;
  status: string;
}

interface DiditSessionResult {
  sessionId: string;
  sessionUrl: string;
}

export class DiditVerificationService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.VERIFICATION_API_KEY || '';
    this.apiSecret = process.env.VERIFICATION_API_SECRET || '';
    this.baseUrl = (process.env.VERIFICATION_API_URL || 'https://gateway.didit.me/v1').replace(/\/$/, '');
  }

  private isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  // ── Create a verification session ────────────────────────────────────────
  async createVerificationSession(userId: string, email: string): Promise<DiditSessionResult> {
    if (!this.isConfigured()) {
      throw new Error('Didit verification is not configured');
    }

    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VERIFICATION_APP_ID || this.apiKey,
      },
      body: JSON.stringify({
        workflow: 'standard', // or custom workflow ID
        user: {
          id: userId,
          email: email,
        },
        // Redirect URLs after completion
        redirect_urls: {
          success: `${process.env.APP_URL || 'trustmatch://'}verification/success`,
          error: `${process.env.APP_URL || 'trustmatch://'}verification/error`,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Didit session creation failed (${response.status}): ${error}`);
    }

    const data = (await response.json()) as DiditSessionResponse;
    
    // Store workflow/session ID in database
    await prisma.verification.update({
      where: { userId },
      data: {
        jumioWorkflowId: data.id, // Using this field to store Didit session ID
      },
    });

    return {
      sessionId: data.id,
      sessionUrl: data.url,
    };
  }

  // ── Retrieve session result ───────────────────────────────────────────────
  async getSessionResult(sessionId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Didit verification is not configured');
    }

    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Didit session retrieval failed (${response.status}): ${error}`);
    }

    return response.json();
  }

  // ── Process webhook payload ───────────────────────────────────────────────
  async processWebhook(payload: any): Promise<void> {
    const sessionId = payload.session_id || payload.id;
    const status = payload.status;
    
    if (!sessionId) {
      console.error('Didit webhook: no session_id found');
      return;
    }

    // Find user by Didit session ID
    const verification = await prisma.verification.findFirst({
      where: { jumioWorkflowId: sessionId },
      include: { user: true },
    });

    if (!verification) {
      console.error(`Didit webhook: no verification found for session ${sessionId}`);
      return;
    }

    const userId = verification.userId;

    // Map Didit status to our verification fields
    const isSuccess = status === 'completed' || status === 'approved' || status === 'success';
    
    await prisma.verification.update({
      where: { userId },
      data: {
        isVerified: isSuccess,
        idVerified: isSuccess,
        selfieVerified: isSuccess,
        jumioDecision: status?.toUpperCase(),
        faceMatchScore: payload.face_match_score ? payload.face_match_score * 100 : null,
        livenessScore: payload.liveness_score ? payload.liveness_score * 100 : null,
        verifiedAt: isSuccess ? new Date() : null,
      },
    });

    console.log(`✅ Didit webhook processed for user ${userId}: ${status}`);
  }
}

// Export singleton instance
export const verificationService = new DiditVerificationService();

export default verificationService;
