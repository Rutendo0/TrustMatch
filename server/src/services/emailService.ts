import { Resend } from 'resend';
import { prisma } from '../lib/prisma';

const CODE_EXPIRY_MINUTES = 15;

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Initialise Resend only if API key is set
const getResend = (): Resend | null => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
};

const FROM_EMAIL = process.env.EMAIL_FROM || 'TrustMatch <noreply@trustmatch.app>';

// ── Send verification email ───────────────────────────────────────────────────
export const sendVerificationEmail = async (
  userId: string
): Promise<{ success: boolean; message: string; code?: string; emailFailed?: boolean }> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { verification: true },
    });

    if (!user) return { success: false, message: 'User not found' };
    if (user.verification?.emailVerified) return { success: false, message: 'Email already verified' };

    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRY_MINUTES);

    await prisma.verification.update({
      where: { userId },
      data: { emailCode: code, emailCodeExpiry: expiresAt },
    });

    const resend = getResend();

    if (resend) {
      // Send real email via Resend
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: 'Your TrustMatch verification code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #DC2626; font-size: 28px; margin: 0;">TrustMatch</h1>
              <p style="color: #6B7280; margin-top: 4px;">Verify your email address</p>
            </div>
            <p style="color: #1F2937; font-size: 16px;">Hi ${user.firstName},</p>
            <p style="color: #1F2937; font-size: 16px;">
              Use the code below to verify your email address. This code expires in ${CODE_EXPIRY_MINUTES} minutes.
            </p>
            <div style="background: #FEE2E2; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 40px; font-weight: bold; letter-spacing: 8px; color: #DC2626;">
                ${code}
              </span>
            </div>
            <p style="color: #6B7280; font-size: 14px;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
            <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} TrustMatch. All rights reserved.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('[Resend] Failed to send email:', error);
        // Fall through to console log + return code so client can auto-fill
      } else {
        console.log(`[Email] Verification code sent to ${user.email}`);
        return { success: true, message: 'Verification code sent to your email' };
      }
    }

    // Fallback: log to console and return code so the app can auto-fill
    // This happens when: no Resend key, or Resend rejected (e.g. unverified domain)
    console.log(`\n========================================`);
    console.log(`[EMAIL VERIFICATION CODE - NO PROVIDER]`);
    console.log(`  User  : ${user.email}`);
    console.log(`  Code  : ${code}`);
    console.log(`  Expiry: ${CODE_EXPIRY_MINUTES} minutes`);
    console.log(`========================================\n`);

    return { success: true, message: 'Verification code generated', code, emailFailed: true };
  } catch (error) {
    console.error('Send verification email error:', error);
    return { success: false, message: 'Failed to send verification email' };
  }
};

// ── Verify submitted code ─────────────────────────────────────────────────────
export const verifyEmailCode = async (
  userId: string,
  code: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const verification = await prisma.verification.findUnique({ where: { userId } });

    if (!verification) return { success: false, message: 'Verification not found' };

    const storedCode = String(verification.emailCode);
    const enteredCode = String(code).trim();

    if (storedCode !== enteredCode) return { success: false, message: 'Invalid verification code' };

    if (!verification.emailCodeExpiry || verification.emailCodeExpiry < new Date()) {
      await prisma.verification.update({
        where: { userId },
        data: { emailCode: null, emailCodeExpiry: null },
      });
      return { success: false, message: 'Verification code has expired. Please request a new one.' };
    }

    await prisma.verification.update({
      where: { userId },
      data: {
        emailVerified: true,
        isVerified: true,
        verifiedAt: new Date(),
        emailCode: null,
        emailCodeExpiry: null,
      },
    });

    return { success: true, message: 'Email verified successfully!' };
  } catch (error) {
    console.error('Verify email code error:', error);
    return { success: false, message: 'Failed to verify email' };
  }
};

// ── Resend code ───────────────────────────────────────────────────────────────
export const resendVerificationCode = async (
  userId: string
): Promise<{ success: boolean; message: string; code?: string }> => {
  return sendVerificationEmail(userId);
};

// ── Verification result email ─────────────────────────────────────────────────
interface VerificationResultData {
  success: boolean;
  trustScore: number;
  confidence: number;
  ageEstimate?: number;
  isLikelyBot: boolean;
  isDeepfake: boolean;
}

export const sendVerificationResultEmail = async (
  userId: string,
  result: VerificationResultData
): Promise<{ success: boolean; message: string }> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) return { success: false, message: 'User not found' };

    const resend = getResend();

    if (resend && result.success) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: 'Your TrustMatch verification is complete ✓',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #DC2626; font-size: 28px; margin: 0;">TrustMatch</h1>
            </div>
            <p style="color: #1F2937; font-size: 16px;">Hi ${user.firstName},</p>
            <p style="color: #1F2937; font-size: 16px;">
              🎉 Your identity has been verified! You can now start discovering matches on TrustMatch.
            </p>
            <div style="background: #D1FAE5; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="color: #065F46; font-weight: bold; margin: 0;">Trust Score: ${result.trustScore}/100</p>
            </div>
            <p style="color: #6B7280; font-size: 14px;">Welcome to TrustMatch — where every connection is real.</p>
          </div>
        `,
      });
    }

    return { success: true, message: 'Verification result email sent' };
  } catch (error) {
    console.error('Send verification result error:', error);
    return { success: false, message: 'Failed to send verification result email' };
  }
};
