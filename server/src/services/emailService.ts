import { prisma } from '../lib/prisma';

// Email verification code expiry time in minutes
const CODE_EXPIRY_MINUTES = 15;

// Generate a random 6-digit code
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email — currently logs code to console (no email provider configured)
export const sendVerificationEmail = async (userId: string): Promise<{ success: boolean; message: string; code?: string }> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { verification: true }
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.verification?.emailVerified) {
      return { success: false, message: 'Email already verified' };
    }

    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRY_MINUTES);

    // Save code to DB
    await prisma.verification.update({
      where: { userId },
      data: {
        emailCode: code,
        emailCodeExpiry: expiresAt
      }
    });

    // Log code to console for development use
    console.log(`\n========================================`);
    console.log(`[EMAIL VERIFICATION CODE]`);
    console.log(`  User  : ${user.email}`);
    console.log(`  Code  : ${code}`);
    console.log(`  Expiry: ${CODE_EXPIRY_MINUTES} minutes`);
    console.log(`========================================\n`);

    return { success: true, message: 'Verification code generated', code };
  } catch (error) {
    console.error('Send verification email error:', error);
    return { success: false, message: 'Failed to generate verification code' };
  }
};

// Verify the submitted code
export const verifyEmailCode = async (userId: string, code: string): Promise<{ success: boolean; message: string }> => {
  try {
    const verification = await prisma.verification.findUnique({
      where: { userId }
    });

    if (!verification) {
      return { success: false, message: 'Verification not found' };
    }

    const storedCode = String(verification.emailCode);
    const enteredCode = String(code).trim();

    console.log('[verifyEmailCode] Stored:', storedCode, '| Entered:', enteredCode);

    if (storedCode !== enteredCode) {
      return { success: false, message: 'Invalid verification code' };
    }

    if (!verification.emailCodeExpiry || verification.emailCodeExpiry < new Date()) {
      await prisma.verification.update({
        where: { userId },
        data: { emailCode: null, emailCodeExpiry: null }
      });
      return { success: false, message: 'Verification code has expired' };
    }

    await prisma.verification.update({
      where: { userId },
      data: {
        emailVerified: true,
        isVerified: true,
        verifiedAt: new Date(),
        emailCode: null,
        emailCodeExpiry: null
      }
    });

    return { success: true, message: 'Email verified successfully!' };
  } catch (error) {
    console.error('Verify email code error:', error);
    return { success: false, message: 'Failed to verify email' };
  }
};

// Resend verification code (generates a new one)
export const resendVerificationCode = async (userId: string): Promise<{ success: boolean; message: string; code?: string }> => {
  return sendVerificationEmail(userId);
};

// Interface for verification result data
interface VerificationResultData {
  success: boolean;
  trustScore: number;
  confidence: number;
  ageEstimate?: number;
  isLikelyBot: boolean;
  isDeepfake: boolean;
}

// Log verification result (no email provider configured yet)
export const sendVerificationResultEmail = async (userId: string, result: VerificationResultData): Promise<{ success: boolean; message: string }> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true }
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    console.log(`\n========================================`);
    console.log(`[VERIFICATION RESULT] ${user.email}`);
    console.log(`  Status    : ${result.success ? 'PASSED' : 'FAILED'}`);
    console.log(`  Trust Score: ${result.trustScore}/100`);
    console.log(`  Confidence : ${Math.round(result.confidence * 100)}%`);
    if (result.ageEstimate) console.log(`  Age Estimate: ${result.ageEstimate}`);
    console.log(`  Bot       : ${result.isLikelyBot ? 'Suspicious' : 'Authentic'}`);
    console.log(`  Deepfake  : ${result.isDeepfake ? 'Detected' : 'Not Detected'}`);
    console.log(`========================================\n`);

    return { success: true, message: 'Verification result logged' };
  } catch (error) {
    console.error('Send verification result error:', error);
    return { success: false, message: 'Failed to log verification result' };
  }
};
