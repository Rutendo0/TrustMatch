import { prisma } from '../lib/prisma';


export class VerificationService {
  // Placeholder for future verification providers
  async createVerificationSession(userId: string, email: string): Promise<{ sessionId: string; sessionUrl: string }> {
  
    return {
      sessionId: `local-${userId}-${Date.now()}`,
      sessionUrl: `${process.env.APP_URL || 'trustmatch://'}verification/local`,
    };
  }

  async getSessionResult(sessionId: string): Promise<any> {
    // Jumio/Didit has been removed
    throw new Error('External verification service not available');
  }

  async processWebhook(payload: any): Promise<void> {
    // Jumio/Didit has been removed
    console.log('Webhook received but Jumio/Didit is not configured');
  }
}

// Export singleton instance
export const verificationService = new VerificationService();

export default verificationService;
