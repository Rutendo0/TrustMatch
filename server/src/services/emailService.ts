import { prisma } from '../lib/prisma';
import { Resend } from 'resend';

// Email verification code expiry time in minutes
const CODE_EXPIRY_MINUTES = 15;

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate a random 6-digit code
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email using Resend
export const sendVerificationEmail = async (userId: string): Promise<{ success: boolean; message: string; code?: string }> => {
  try {
    // Get user with verification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { verification: true }
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Check if email is already verified
    if (user.verification?.emailVerified) {
      return { success: false, message: 'Email already verified' };
    }

    // Skip ID/selfie check - using local AI verification instead
    // if (!user.verification?.idVerified || !user.verification?.selfieVerified) {
    //   return { 
    //     success: false, 
    //     message: 'Please complete ID and selfie verification before verifying email' 
    //   };
    // }

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRY_MINUTES);

    // Log code for testing purposes
    console.log(`[EMAIL VERIFICATION] Code for ${user.email}: ${code}`);

    // Save code to verification record
    await prisma.verification.update({
      where: { userId },
      data: {
        emailCode: code,
        emailCodeExpiry: expiresAt
      }
    });

    // Send email using Resend
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff4b6e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .code { font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #ff4b6e; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TrustMatch</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email</h2>
            <p>Hi ${user.firstName},</p>
            <p>Thank you for completing your profile verification! Please use the code below to verify your email address:</p>
            <div class="code">${code}</div>
            <p>This code will expire in ${CODE_EXPIRY_MINUTES} minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 TrustMatch. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email with Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'TrustMatch <onboarding@resend.dev>',
      to: user.email,
      subject: 'Verify Your TrustMatch Email',
      html: emailContent
    });

    if (error) {
      console.error('Resend error:', error);
      // Always log the code so the flow can be tested when Resend is not yet configured
      console.log(`\n========================================`);
      console.log(`[EMAIL CODE] ${user.email} → ${code}`);
      console.log(`========================================\n`);
      // Code is already stored in DB — return success with code so frontend can display it
      return { success: true, message: 'Verification code generated', code };
    }

    console.log('Verification email sent:', data);
    return { success: true, message: 'Verification code sent to your email', code };
  } catch (error) {
    console.error('Send verification email error:', error);
    return { success: false, message: 'Failed to send verification email' };
  }
};

// Verify email code
export const verifyEmailCode = async (userId: string, code: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Find the verification record with valid code
    const verification = await prisma.verification.findUnique({
      where: { userId }
    });

    if (!verification) {
      return { success: false, message: 'Verification not found' };
    }

    // Check if code matches and hasn't expired (allow both string and number comparison)
    console.log('[verifyEmailCode] Stored code:', verification.emailCode, 'Entered code:', code);
    const storedCode = String(verification.emailCode);
    const enteredCode = String(code).trim();
    if (storedCode !== enteredCode) {
      return { success: false, message: 'Invalid verification code' };
    }

    if (!verification.emailCodeExpiry || verification.emailCodeExpiry < new Date()) {
      // Clear expired code
      await prisma.verification.update({
        where: { userId },
        data: { emailCode: null, emailCodeExpiry: null }
      });
      return { success: false, message: 'Verification code has expired' };
    }

    // Mark email as verified
    await prisma.verification.update({
      where: { userId },
      data: { 
        emailVerified: true,
        isVerified: true, // All verifications complete
        verifiedAt: new Date(),
        emailCode: null, // Clear the code
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
  // Simply call sendVerificationEmail which generates a new code
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

// Send verification result email to user
export const sendVerificationResultEmail = async (userId: string, result: VerificationResultData): Promise<{ success: boolean; message: string }> => {
  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true }
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const status = result.success ? '✅ Verified' : '❌ Not Verified';
    const statusColor = result.success ? '#22c55e' : '#ef4444';
    const botStatus = result.isLikelyBot ? '⚠️ Suspicious' : '✅ Authentic';
    const deepfakeStatus = result.isDeepfake ? '⚠️ Detected' : '✅ Not Detected';

    // Build HTML email content
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff4b6e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .status { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; padding: 15px; border-radius: 8px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; }
          .value { color: #666; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TrustMatch</h1>
          </div>
          <div class="content">
            <h2>Verification Result</h2>
            <p>Hi ${user.firstName},</p>
            <p>Your verification has been processed. Here are your results:</p>
            
            <div class="status" style="background: ${statusColor}20; color: ${statusColor};">
              ${status}
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Trust Score</span>
                <span class="value">${result.trustScore}/100</span>
              </div>
              <div class="detail-row">
                <span class="label">Confidence</span>
                <span class="value">${Math.round(result.confidence * 100)}%</span>
              </div>
              ${result.ageEstimate ? `
              <div class="detail-row">
                <span class="label">Age Estimate</span>
                <span class="value">${result.ageEstimate} years</span>
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="label">Bot Detection</span>
                <span class="value">${botStatus}</span>
              </div>
              <div class="detail-row">
                <span class="label">Deepfake Detection</span>
                <span class="value">${deepfakeStatus}</span>
              </div>
            </div>
            
            <p>Thank you for using TrustMatch!</p>
          </div>
          <div class="footer">
            <p>© 2026 TrustMatch. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email with Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'TrustMatch <onboarding@resend.dev>',
      to: user.email,
      subject: result.success ? '🎉 TrustMatch Verification Passed!' : '⚠️ TrustMatch Verification Result',
      html: emailContent
    });

    if (error) {
      console.error('Resend error:', error);
      console.log(`\n========================================`);
      console.log(`[VERIFICATION RESULT EMAIL] Would send to: ${user.email}`);
      console.log(`[VERIFICATION RESULT]:`, result);
      console.log(`========================================\n`);
      return { success: true, message: 'Verification completed. Email could not be sent.' };
    }

    console.log('Verification result email sent:', data);
    return { success: true, message: 'Verification result email sent' };
  } catch (error) {
    console.error('Send verification result email error:', error);
    return { success: false, message: 'Failed to send verification result email' };
  }
};
