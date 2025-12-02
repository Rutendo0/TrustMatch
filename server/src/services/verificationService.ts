import { PrismaClient, IDDocumentType } from '@prisma/client';

const prisma = new PrismaClient();

export interface VerificationResult {
  success: boolean;
  faceMatchScore?: number;
  livenessScore?: number;
  documentValid?: boolean;
  extractedData?: {
    fullName: string;
    dateOfBirth: string;
    documentNumber: string;
    expiryDate?: string;
  };
  errors?: string[];
}

export class VerificationService {
  async verifyDocument(
    userId: string,
    documentType: IDDocumentType,
    documentBuffer: Buffer
  ): Promise<VerificationResult> {
    try {
      await this.simulateApiDelay();

      const isValid = Math.random() > 0.1;
      
      if (!isValid) {
        return {
          success: false,
          documentValid: false,
          errors: ['Document appears to be invalid or unreadable'],
        };
      }

      const extractedData = {
        fullName: 'Extracted Name',
        dateOfBirth: '1990-01-01',
        documentNumber: 'ABC123456',
        expiryDate: '2030-01-01',
      };

      await prisma.verification.update({
        where: { userId },
        data: {
          idDocumentType: documentType,
          idVerified: true,
        },
      });

      return {
        success: true,
        documentValid: true,
        extractedData,
      };
    } catch (error) {
      console.error('Document verification error:', error);
      return {
        success: false,
        errors: ['Verification service unavailable'],
      };
    }
  }

  async verifySelfie(
    userId: string,
    selfieBuffer: Buffer
  ): Promise<VerificationResult> {
    try {
      await this.simulateApiDelay();

      const verification = await prisma.verification.findUnique({
        where: { userId },
      });

      if (!verification?.idDocumentUrl) {
        return {
          success: false,
          errors: ['Please upload ID document first'],
        };
      }

      const faceMatchScore = 0.8 + Math.random() * 0.15;
      const livenessScore = 0.85 + Math.random() * 0.12;

      const isVerified = faceMatchScore >= 0.75 && livenessScore >= 0.8;

      await prisma.verification.update({
        where: { userId },
        data: {
          selfieVerified: isVerified,
          faceMatchScore,
          livenessScore,
          isVerified: isVerified && verification.idVerified,
          verifiedAt: isVerified && verification.idVerified ? new Date() : null,
        },
      });

      return {
        success: isVerified,
        faceMatchScore,
        livenessScore,
        errors: isVerified ? undefined : ['Face verification failed. Please try again with better lighting.'],
      };
    } catch (error) {
      console.error('Selfie verification error:', error);
      return {
        success: false,
        errors: ['Verification service unavailable'],
      };
    }
  }

  async checkForDuplicateAccounts(
    email: string,
    phone: string,
    deviceId: string
  ): Promise<{ isDuplicate: boolean; reason?: string }> {
    const blockedAccount = await prisma.blockedAccount.findFirst({
      where: {
        OR: [
          { email },
          { phone },
          { deviceId },
        ],
      },
    });

    if (blockedAccount) {
      return {
        isDuplicate: true,
        reason: 'Account associated with blocked user',
      };
    }

    const existingDevice = await prisma.deviceFingerprint.findFirst({
      where: { deviceId },
    });

    if (existingDevice) {
      return {
        isDuplicate: true,
        reason: 'Device already registered with another account',
      };
    }

    return { isDuplicate: false };
  }

  async blockAccount(
    email?: string,
    phone?: string,
    deviceId?: string,
    reason: string = 'Violation of terms'
  ): Promise<void> {
    await prisma.blockedAccount.create({
      data: {
        email,
        phone,
        deviceId,
        reason,
      },
    });

    if (deviceId) {
      await prisma.deviceFingerprint.updateMany({
        where: { deviceId },
        data: { isBlocked: true },
      });
    }
  }

  private async simulateApiDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  }
}

export const verificationService = new VerificationService();
