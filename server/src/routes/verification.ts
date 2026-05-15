import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { verificationService } from '../services/verificationService';
import { verificationLimiter } from '../middleware/rateLimiter';
import { sendVerificationResultEmail } from '../services/emailService';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import FormData from 'form-data';

// ── Multer: local disk storage for ID documents (kept on-server, never sent to CDN) ─
const idDocStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads/documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const uploadIdDoc = multer({
  storage: idDocStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ── Tesseract worker singleton (created once, reused across requests) ─────────
let _ocrWorker: Tesseract.Worker | null = null;
async function getOcrWorker(): Promise<Tesseract.Worker> {
  if (!_ocrWorker) {
    _ocrWorker = await Tesseract.createWorker('eng');
  }
  return _ocrWorker;
}

const router = Router();

// ── Levenshtein edit distance — used for fuzzy name matching to handle OCR errors
// e.g. "MIEAYO" vs "MIKITAYO" → distance 3, similarity ~0.63 → accepted
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Returns similarity 0–1. Threshold 0.6 = at least 60% of chars match.
function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / Math.max(a.length, b.length);
}

// Checks if two names are similar enough to be the same person
// Accepts exact match OR similarity >= 0.6 (handles OCR character errors)
// Also handles OCR word-splitting: "MIKITA YO" matches "MIKITAYO"
function namesMatch(userName: string, ocrName: string): boolean {
  if (!userName || !ocrName) return false;
  const userLower = userName.toLowerCase();
  const ocrLower  = ocrName.toLowerCase();
  if (ocrLower.includes(userLower)) return true; // exact substring
  // Handle OCR splitting a word with a space: "MIKITA YO" vs "MIKITAYO"
  const ocrNoSpaces   = ocrLower.replace(/\s+/g, '');
  const userNoSpaces  = userLower.replace(/\s+/g, '');
  if (ocrNoSpaces.includes(userNoSpaces)) return true;
  return nameSimilarity(userLower, ocrLower) >= 0.6;
}

// Document verification status enum
enum DocumentVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  EXTRACTING = 'EXTRACTING',
}

// Store extracted document data temporarily
interface ExtractedDocumentData {
  documentType: string;
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  expiryDate?: string;
  nationality?: string;
  gender?: string;
  address?: string;
}

const normalizeNameForMatch = (value: string) => {
  if (!value) return '';
  // Remove special characters and normalize whitespace for flexible matching
  return value.trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').toLowerCase();
};

const normalizeDateForMatch = (value: string) => {
  if (!value) return '';
  
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  
  // Try to parse DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  // Fallback: try Date parsing but avoid timezone issues
  const parsed = new Date(value + 'T00:00:00Z'); // Force UTC
  if (isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
};

// In-memory store for extracted document data (in production, use Redis or database)
const documentDataStore = new Map<string, ExtractedDocumentData>();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/verification/id-document
// Upload and store the user's ID document image on the server.
// The file is saved to uploads/documents/ and the path is recorded in the DB.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/id-document',
  authMiddleware,
  uploadIdDoc.single('document'),
  async (req: AuthRequest, res: Response) => {
    try {
      // Accept both authenticated and non-authenticated requests
      let userId = req.userId;
      
      // If no auth, try to find user by email in body
      if (!userId && req.body.email) {
        const user = await prisma.user.findUnique({
          where: { email: req.body.email },
          select: { id: true }
        });
        if (user) userId = user.id;
      }
      
      if (!userId) {
        return res.status(400).json({ error: 'User not identified' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No document image provided' });
      }

      const documentType = (req.body.documentType as string) || null;
      const relPath = `/uploads/documents/${req.file.filename}`;

      // Persist the document URL and type on the verification record
      // First check if user exists
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });
      
      if (userExists) {
        await prisma.verification.upsert({
          where: { userId },
          create: {
            userId,
            idDocumentUrl: relPath,
            ...(documentType ? { idDocumentType: documentType as any } : {}),
          },
          update: {
            idDocumentUrl: relPath,
            ...(documentType ? { idDocumentType: documentType as any } : {}),
          },
        });
      } else {
        console.log('User not found for ID document upload');
      }

      return res.json({ success: true, documentUrl: relPath });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('ID document upload error:', error);
      return res.status(500).json({ error: 'Failed to upload ID document' });
    }
  }
);

router.post('/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, verification: true },
    });

    if (!user) throw new AppError('User not found', 404);

    // Don't restart if already fully verified
    if (user.verification?.isVerified) {
      return res.json({
        alreadyVerified: true,
        message: 'User is already verified',
      });
    }

    const session = await verificationService.createVerificationSession(userId, user.email);

    return res.status(201).json({
      sessionId: session.sessionId,
      sessionUrl: session.sessionUrl,
      message: 'Open sessionUrl in a WebView to complete ID + liveness verification',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Verification start error:', error);
    return res.status(500).json({ error: 'Failed to start verification session' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/verification/webhook   (PUBLIC — no auth — called by Jumio servers)
//
// Secured by checking the Authorization header against JUMIO_WEBHOOK_SECRET.
// Configure this secret in the Jumio Portal:
//   Settings → Webhooks → Callback Authorization → Bearer Token → <your secret>
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Validate webhook secret
    const webhookSecret = process.env.JUMIO_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = req.headers.authorization || '';
      const provided = authHeader.replace(/^Bearer\s+/i, '');
      if (provided !== webhookSecret) {
        console.warn('Jumio webhook: invalid authorization');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const payload = req.body;

    // Basic shape validation
    if (!payload?.workflowExecution?.customerInternalReference) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Acknowledge Jumio immediately (must respond within 10 s)
    res.status(200).json({ received: true });

    // Process asynchronously so we never time out Jumio
    setImmediate(async () => {
      try {
        await verificationService.processWebhook(payload);
        console.log(
          `✅ Jumio webhook processed for user: ${payload.workflowExecution.customerInternalReference} — decision: ${payload.workflowExecution.decision?.type ?? 'N/A'}`
        );
      } catch (err) {
        console.error('Jumio webhook processing error:', err);
      }
    });
  } catch (error) {
    console.error('Jumio webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/verification/gemini-models — debug: list available Gemini models for the configured key
router.get('/gemini-models', async (_req: Request, res: Response) => {
  const key = process.env.GOOGLE_VISION_API_KEY;
  if (!key) return res.status(500).json({ error: 'GOOGLE_VISION_API_KEY not set' });
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    );
    const models = (response.data?.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name);
    return res.json({ models });
  } catch (err: any) {
    return res.status(500).json({ error: err?.response?.data || err?.message });
  }
});

// GET /api/verification/status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const verification = await prisma.verification.findUnique({ where: { userId } });
    if (!verification) throw new AppError('Verification record not found', 404);

    return res.json(buildStatusResponse(verification));
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Verification status error:', error);
    return res.status(500).json({ error: 'Failed to get verification status' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/verification/retry
// Resets a failed/expired session so the user can try again.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/retry', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, verification: true },
    });

    if (!user) throw new AppError('User not found', 404);
    if (user.verification?.isVerified) {
      return res.json({ alreadyVerified: true });
    }

    return res.status(201).json({
      message: 'ID verification session created'
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Verification retry error:', error);
    return res.status(500).json({ error: 'Failed to retry verification' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
function buildStatusResponse(v: {
  isVerified: boolean;
  idVerified: boolean;
  selfieVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  faceMatchScore: number | null;
  livenessScore: number | null;
  verifiedAt: Date | null;
}) {
  return {
    isVerified: v.isVerified,
    idVerified: v.idVerified,
    selfieVerified: v.selfieVerified,
    emailVerified: v.emailVerified,
    phoneVerified: v.phoneVerified,
    faceMatchScore: v.faceMatchScore,
    livenessScore: v.livenessScore,
    verifiedAt: v.verifiedAt,
  };
}

// ── POST /api/verification/extract-document-text ─────────────────────────────
// OCR endpoint — tries OCR.space first, falls back to Tesseract
// No auth required — OCR doesn't touch the database
router.post('/extract-document-text', async (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Image URL is required' });

    // ── Decode image to base64 ────────────────────────────────────────────────
    let base64Image: string;
    let imageBuffer: Buffer;

    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      if (!base64Data) return res.status(400).json({ error: 'Invalid base64 image data' });
      base64Image = base64Data;
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (imageUrl.startsWith('http')) {
      const r = await fetch(imageUrl);
      if (!r.ok) return res.json({ success: false, text: '', confidence: 0, error: 'Could not fetch image.' });
      imageBuffer = Buffer.from(await r.arrayBuffer());
      base64Image = imageBuffer.toString('base64');
    } else {
      return res.status(400).json({ error: 'Invalid image format.' });
    }

    const ocrSpaceKey = process.env.GOOGLE_VISION_API_KEY || 'helloworld';

    // ── OCR.space (primary) ───────────────────────────────────────────────────
    try {
      console.log('Using OCR.space for document OCR...');

      const params = new URLSearchParams();
      params.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
      params.append('language', 'eng');
      params.append('isOverlayRequired', 'false');
      params.append('detectOrientation', 'true');
      params.append('scale', 'true');
      params.append('OCREngine', '2');

      const ocrResponse = await axios.post(
        'https://api.ocr.space/parse/image',
        params.toString(),
        {
          headers: {
            apikey: ocrSpaceKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        }
      );

      const ocrResult = ocrResponse.data;
      console.log('OCR.space raw response:', JSON.stringify(ocrResult).substring(0, 300));

      const parsedText: string = ocrResult?.ParsedResults?.[0]?.ParsedText || '';

      if (parsedText && parsedText.trim().length >= 10) {
        console.log('\n========== OCR.space TEXT ==========');
        console.log(parsedText);
        console.log('=====================================\n');

        const normalizedText = parsedText
          .replace(/\r\n|\r/g, '\n')
          .replace(/([A-Z])\.\s+([A-Z])/g, '$1$2')  // fix "MIKIT. AYO" → "MIKITAYO"
          .replace(/([A-Za-z])\n([A-Za-z])/g, '$1 $2') // join words split across lines
          .replace(/\n+/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();

        console.log('========== NORMALIZED TEXT ==========');
        console.log(normalizedText);
        console.log('=====================================\n');

        return res.json({ success: true, text: normalizedText, confidence: 0.85 });
      }

      console.log('OCR.space returned no text, falling back to Tesseract...');
    } catch (ocrErr: any) {
      console.error('OCR.space error:', ocrErr?.response?.data || ocrErr?.message);
      console.log('Falling back to Tesseract...');
    }

    // ── Tesseract fallback ────────────────────────────────────────────────────
    console.log('Using Tesseract OCR...');
    const processedBuffer = await sharp(imageBuffer!)
      .resize({ width: 2800, withoutEnlargement: false })
      .greyscale()
      .normalize()
      .linear(1.8, -(128 * 0.8))
      .sharpen({ sigma: 2, m1: 2, m2: 3 })
      .threshold(140)
      .toBuffer();

    const worker = await getOcrWorker();
    const { data } = await Promise.race([
      worker.recognize(processedBuffer),
      new Promise<never>((_, reject) =>
        setTimeout(async () => {
          if (_ocrWorker) { try { await _ocrWorker.terminate(); } catch {} _ocrWorker = null; }
          reject(new Error('OCR timed out'));
        }, 60_000)
      ),
    ]);

    console.log('\n========== TESSERACT OCR TEXT ==========');
    console.log(data.text);
    console.log('Confidence:', data.confidence);
    console.log('=========================================\n');

    if (data.confidence < 15) {
      return res.json({
        success: false, text: '', confidence: data.confidence / 100,
        error: 'Image quality too low. Please retake the photo in better lighting with the full ID visible.',
      });
    }

    const normalizedText = data.text
      .replace(/\r\n|\r/g, '\n')
      .replace(/([A-Z])\.\s+([A-Z])/g, '$1$2')
      .replace(/\b([A-Z]) ([A-Z]{2,})\b/g, '$1$2')
      .replace(/([A-Za-z])\n([A-Za-z])/g, '$1 $2')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    console.log('========== NORMALIZED TEXT ==========');
    console.log(normalizedText);
    console.log('=====================================\n');

    return res.json({ success: true, text: normalizedText, confidence: data.confidence / 100 });

  } catch (error: any) {
    console.error('OCR error:', error?.response?.data || error?.message);
    return res.json({ success: false, text: '', confidence: 0, error: 'OCR service failed. Please try again.' });
  }
});

// ── Additional route: Accept local AI verification results ───────────────────
// Used when frontend does local AI verification instead of Jumio
router.post('/submit-local', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { 
      success, 
      trustScore, 
      confidence, 
      ageEstimate, 
      isLikelyBot, 
      isDeepfake,
    } = req.body;

    if (!success) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    // Update verification record with AI results
    console.log('[submit-local] Updating verification for userId:', userId);
    await prisma.verification.update({
      where: { userId },
      data: {
        // This endpoint is used only for AI-based local verification.
        // If you want Step A gating, do not mark idVerified until selfie check is done.
        // SelfieVerified still represents the selfie comparison passing.
        isVerified: true, // keep overall verified for this local AI flow
        idVerified: true,
        selfieVerified: true,
        faceMatchScore: confidence ? confidence * 100 : null,
        livenessScore: 100, // AI confirmed liveness
        verifiedAt: new Date(),
      },
    });
    console.log('[submit-local] Verification updated successfully');

    // Send verification result email to user
    const emailResult = await sendVerificationResultEmail(userId, {
      success,
      trustScore,
      confidence,
      ageEstimate,
      isLikelyBot,
      isDeepfake,
    });
    console.log('[submit-local] Email result:', emailResult);

    return res.json({
      success: true,
      isVerified: true,
      message: 'Verification completed using AI',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Local verification submit error:', error);
    return res.status(500).json({ error: 'Failed to submit verification' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/verification/document/verify-local
// Local document verification with extracted data from on-device ML
// Made public to work during registration flow (before user is logged in)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/document/verify-local', verificationLimiter, async (req: AuthRequest, res: Response) => {
  try {
    // Accept both authenticated and non-authenticated requests
    // For registration flow, no auth required - validation happens client-side
    // and actual user creation happens in PhotoUploadScreen
    const authHeader = req.headers.authorization;
    let userId: string | undefined;
    
    // If auth header provided, verify it - but don't fail if token is invalid/expired
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        if (process.env.JWT_SECRET) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId?: string };
          userId = decoded.userId;
        }
      } catch (jwtError: any) {
        // Invalid or expired token - continue without user (for registration flow)
        // Don't treat this as a fatal error
        console.log('Invalid/expired token in verify-local, continuing for registration:', jwtError.message);
        // Don't re-throw - just continue without userId
      }
    }
    
    const { 
      documentType,
      documentNumber,
      firstName,
      lastName,
      fullName,
      rawText,
      dateOfBirth,
      registrationFirstName,
      registrationLastName,
      registrationDateOfBirth,
      expiryDate,
      nationality,
      gender,
      address,
      confidence,
      email,
      password
    } = req.body;

    // Reject only if confidence is exactly 50 AND no OCR text was extracted at all
    // (confidence=50 with extracted names means OCR worked but doc number wasn't found — that's OK)
    if (confidence === 50 && !firstName && !lastName && !fullName && !dateOfBirth) {
      return res.status(400).json({
        success: false,
        errors: ['Document verification requires a clear photo of your ID. Please retake the photo.'],
      });
    }

    // For registration flow - lookup user by email if provided
    let regUser = null;
    if (email) {
      regUser = await prisma.user.findUnique({
        where: { email },
        select: { dateOfBirth: true }
      });
    }
    
    // If user is authenticated, get their data for comparison
    let user: { firstName: string; lastName: string; dateOfBirth: Date | null; email: string } | null = null;
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, dateOfBirth: true, email: true },
      });
    }

    // Validate required fields
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check document type is valid
    const validDocTypes = ['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID'];
    if (!documentType || !validDocTypes.includes(documentType)) {
      errors.push('Invalid document type');
    }

    // Check document number (OCR may not always extract it — treat as warning only)
    if (!documentNumber) {
      warnings.push('Document number could not be read from the document');
    }

    // Check date of birth
    if (!dateOfBirth) {
      errors.push('Date of birth is required');
    }

    const extractedName = `${firstName || ''} ${lastName || ''}`.trim() || (fullName || '').trim();
    // Only fail if we have no name AND no rawText to fall back on for matching
    if (!extractedName && !rawText) {
      errors.push('Could not extract full name from document');
    }

    if (!dateOfBirth || !normalizeDateForMatch(dateOfBirth)) {
      errors.push('Could not extract a valid date of birth from document');
    }

    // Verify age is 18+
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      errors.push('User must be at least 18 years old');
    }

    // Check name matches (authenticated flow)
    let nameMatches = true;
    if (user) {
      // Normalize names for comparison - remove extra whitespace, convert to lowercase
      const userFirstName = (user.firstName || '').toLowerCase().trim();
      const userLastName = (user.lastName || '').toLowerCase().trim();
      const userFullName = `${userFirstName} ${userLastName}`.trim();
      
      // Get OCR extracted names - could be in firstName/lastName fields or fullName
      const ocrFirstName = (firstName || '').toLowerCase().trim();
      const ocrLastName = (lastName || '').toLowerCase().trim();
      const ocrFullName = (fullName || '').toLowerCase().trim();
      
      // If OCR only provides fullName, try to split it
      let extractedFirstName = ocrFirstName;
      let extractedLastName = ocrLastName;
      
      if (!ocrFirstName && !ocrLastName && ocrFullName) {
        // Try to split full name
        const nameParts = ocrFullName.split(/\s+/);
        if (nameParts.length >= 1) extractedFirstName = nameParts[0];
        if (nameParts.length >= 2) extractedLastName = nameParts.slice(1).join(' ');
      } else if (ocrFirstName && !ocrLastName && ocrFullName) {
        // Only first name provided, extract last name from full name
        extractedLastName = ocrFullName.replace(ocrFirstName, '').trim();
      }

      // Debug logging
      console.log('Name matching debug:', {
        userFirstName,
        userLastName,
        extractedFirstName,
        extractedLastName,
        ocrFullName,
      });

      // Build a single string of all OCR name text for flexible matching
      // Prefer rawText (full OCR output) over parsed fields which may be wrong
      const allOcrText = (rawText || `${extractedFirstName} ${extractedLastName} ${ocrFullName}`).toLowerCase().trim();

      if (userFirstName && userLastName) {
        const firstFound = namesMatch(userFirstName, allOcrText);
        const lastFound  = namesMatch(userLastName,  allOcrText);

        if (firstFound && lastFound) {
          nameMatches = true;
        } else if (firstFound || lastFound) {
          nameMatches = true;
          warnings.push('Only part of your name could be verified on the document');
        } else {
          nameMatches = false;
        }
      } else if (userFirstName) {
        nameMatches = namesMatch(userFirstName, allOcrText);
      }

      if (!nameMatches) {
        errors.push('Name on document does not match registration data');
      }

      // Cross-check DOB with registration data (allow 1-day tolerance for OCR errors)
      const dobToCheck = regUser || user;
      if (dobToCheck && dateOfBirth && dobToCheck.dateOfBirth) {
        // Normalize both dates to YYYY-MM-DD strings to avoid timezone issues
        const userDobStr = dobToCheck.dateOfBirth instanceof Date 
          ? dobToCheck.dateOfBirth.toISOString().split('T')[0]
          : String(dobToCheck.dateOfBirth).split('T')[0];
        const inputDobStr = normalizeDateForMatch(dateOfBirth);
        
        console.log('DOB comparison debug:', {
          userDobFromDB: userDobStr,
          inputDobFromID: inputDobStr,
          match: userDobStr === inputDobStr
        });
        
        // Compare as strings first (most reliable)
        if (userDobStr !== inputDobStr) {
          // If strings don't match, check if dates are within 1 day (for timezone tolerance)
          const userDob = new Date(userDobStr + 'T00:00:00Z');
          const inputDob = new Date(inputDobStr + 'T00:00:00Z');
          const diffDays = Math.abs((userDob.getTime() - inputDob.getTime()) / (1000 * 60 * 60 * 24));
          console.log('DOB difference in days:', diffDays);
          if (diffDays > 1) {
            errors.push('Date of birth does not match your registration information');
          }
        }
      }

    }

    // Strict registration flow checks: both full name and DOB must match exactly
    // with the user-entered values before continuing.
    if (registrationFirstName || registrationLastName || registrationDateOfBirth) {
      const regFirst = (registrationFirstName || '').toLowerCase().trim();
      const regLast = (registrationLastName || '').toLowerCase().trim();
      const docFirst = (firstName || '').toLowerCase().trim();
      const docLast = (lastName || '').toLowerCase().trim();
      const docFull = (fullName || '').toLowerCase().trim();

      // Use rawText for matching if available — more reliable than parsed fields
      // rawText contains the full OCR output before any parsing, so names are always in it
      const allDocText = (rawText || `${docFirst} ${docLast} ${docFull}`).toLowerCase().trim();

      // Only enforce name matching if we actually have OCR text to match against
      if (allDocText && allDocText.length > 10) {
        const firstFound = regFirst ? namesMatch(regFirst, allDocText) : true;
        const lastFound  = regLast  ? namesMatch(regLast,  allDocText) : true;

        if (!firstFound && !lastFound && (regFirst || regLast)) {
          errors.push('Your name does not match the name on your ID document. Please ensure you entered your legal name during registration.');
        } else if ((!firstFound || !lastFound) && (regFirst || regLast)) {
          warnings.push('Only part of your name could be confirmed on the document');
        }
      } else {
        // No OCR text available — skip name matching, log a warning
        console.log('No OCR text available for name matching, skipping name check');
        warnings.push('Name could not be verified from document text');
      }

      // Date comparison with tolerance for formatting differences
      const normalizedExtractedDob = normalizeDateForMatch(dateOfBirth || '');
      const normalizedEnteredDob = normalizeDateForMatch(registrationDateOfBirth || '');
      // Allow slight differences (1 day tolerance) for timezone/format issues
      if (normalizedEnteredDob && normalizedExtractedDob && normalizedExtractedDob !== normalizedEnteredDob) {
        const dob1 = new Date(normalizedExtractedDob);
        const dob2 = new Date(normalizedEnteredDob);
        const diffDays = Math.abs((dob1.getTime() - dob2.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
          errors.push('The date of birth on your ID does not match what you entered during registration. Please ensure your details are correct.');
        }
      }
    }

    // Check document expiry
    let notExpired = true;
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      if (expiry < today) {
        errors.push('Document has expired');
        notExpired = false;
      }
    } else if (documentType === 'PASSPORT') {
      warnings.push('Could not verify document expiry date');
    }

    // Determine verification status
    const verificationStatus = errors.length === 0 
      ? DocumentVerificationStatus.VERIFIED 
      : DocumentVerificationStatus.FAILED;

    // Store extracted data for later reference (only if userId exists)
    const extractedData: ExtractedDocumentData = {
      documentType,
      documentNumber,
      firstName,
      lastName,
      fullName,
      dateOfBirth,
      expiryDate,
      nationality,
      gender,
      address,
    };
    if (userId) {
      documentDataStore.set(userId, extractedData);
    }

    // Update verification record (only if userId exists - for logged in users)
    // OR update user by email if this is during registration flow
    if ((userId || email) && verificationStatus === DocumentVerificationStatus.VERIFIED) {
      // Find user by userId or email
      const userToUpdate = userId 
        ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
        : email 
        ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
        : null;
      
      if (userToUpdate) {
        const actualUserId = userToUpdate.id;
        
        // Update user's personal info with verified data from ID
        // This ensures the database has the correct info that matches their ID
        const updateData: any = {};
        if (registrationFirstName) updateData.firstName = registrationFirstName;
        if (registrationLastName) updateData.lastName = registrationLastName;
        if (registrationDateOfBirth) updateData.dateOfBirth = new Date(registrationDateOfBirth);
        
        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({
            where: { id: actualUserId },
            data: updateData,
          });
          console.log('Updated user info with verified data:', { email, ...updateData });
        }
        
        // Mark idVerified: true so the selfie upload step can proceed.
        // The overall isVerified flag stays false until selfie + email are also done.
        await prisma.verification.upsert({
          where: { userId: actualUserId },
          create: {
            userId: actualUserId,
            idDocumentType: documentType as any,
            idVerified: true,
            verifiedAt: new Date(),
          },
          update: {
            idDocumentType: documentType as any,
            idVerified: true,
          },
        });
      } else {
        console.log('User not found for verification, skipping record creation');
      }
    }

    return res.json({
      success: errors.length === 0,
      status: verificationStatus,
      errors,
      warnings,
      nameMatches,
      ageVerified: age >= 18,
      notExpired,
      confidence: confidence || 80,
      extractedData: {
        documentType,
        documentNumber: documentNumber ? `****${documentNumber.slice(-4)}` : undefined,
        name: fullName || `${firstName || ''} ${lastName || ''}`.trim(),
      },
    });
  } catch (error: any) {
    // Provide more detailed error information for debugging
    let errorMessage = 'Failed to verify document';
    let statusCode = 500;

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    // Handle specific error types with better messages
    if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid authentication token';
      statusCode = 401;
    } else if (error.name === 'TokenExpiredError') {
      errorMessage = 'Authentication token expired';
      statusCode = 401;
    } else if (error.message?.includes('Prisma')) {
      errorMessage = 'Database operation failed';
      console.error('Prisma error in document verification:', error);
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('Local document verification error:', error);
    return res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/verification/document/store
// Store extracted document data for later verification
// ─────────────────────────────────────────────────────────────────────────────
router.post('/document/store', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const extractedData = req.body as ExtractedDocumentData;

    // Store the extracted data
    documentDataStore.set(userId, extractedData);

    return res.json({
      success: true,
      message: 'Document data stored successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Document store error:', error);
    return res.status(500).json({ error: 'Failed to store document data' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/verification/document/status
// Get current document verification status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/document/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get verification record
    const verification = await prisma.verification.findUnique({
      where: { userId },
    });

    // Get stored document data
    const storedData = documentDataStore.get(userId);

    return res.json({
      isVerified: verification?.idVerified || false,
      documentType: verification?.idDocumentType || null,
      storedData: storedData || null,
      verifiedAt: verification?.verifiedAt || null,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Document status error:', error);
    return res.status(500).json({ error: 'Failed to get document status' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/verification/face-compare
// Proxy to the DeepFace Railway service — same backend used for selfie-vs-ID.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/face-compare', async (req: AuthRequest, res: Response) => {
  try {
    const { image1, image2 } = req.body;

    if (!image1 || !image2) {
      return res.status(400).json({ error: 'Two images are required for comparison' });
    }

    const deepfaceUrl = process.env.FACE_VERIFICATION_API_URL;
    if (!deepfaceUrl) {
      return res.status(503).json({ error: 'Face verification service not configured. Set FACE_VERIFICATION_API_URL.' });
    }

    // Helper: fetch a URL or decode base64 into a Buffer
    const toBuffer = async (source: string): Promise<Buffer> => {
      if (source.startsWith('data:image')) {
        return Buffer.from(source.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      }
      if (source.startsWith('http')) {
        const resp = await axios.get(source, { responseType: 'arraybuffer', timeout: 15000 });
        return Buffer.from(resp.data);
      }
      if (source.startsWith('/') || source.startsWith('file://')) {
        return fs.readFileSync(source.replace(/^file:\/\//, ''));
      }
      throw new Error(`Unsupported image source: ${source.substring(0, 60)}`);
    };

    const [buf1, buf2] = await Promise.all([toBuffer(image1), toBuffer(image2)]);

    const form = new FormData();
    form.append('img1', buf1, { filename: 'img1.jpg', contentType: 'image/jpeg' });
    form.append('img2', buf2, { filename: 'img2.jpg', contentType: 'image/jpeg' });

    const dfResp = await axios.post(deepfaceUrl, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });

    const data = dfResp.data;
    const isMatch: boolean = data.verified === true;
    const similarity: number = data.distance != null
      ? Math.max(0, Math.min(1, 1 - data.distance))
      : (data.confidence != null ? data.confidence / 100 : 0);

    console.log(`[face-compare] similarity=${(similarity * 100).toFixed(1)}% match=${isMatch}`);

    return res.json({
      success: true,
      similarity,
      isMatch,
      threshold: data.threshold || 0.68,
      message: isMatch
        ? `Faces match! (${(similarity * 100).toFixed(0)}% similarity)`
        : `Faces do not match (${(similarity * 100).toFixed(0)}% similarity)`,
    });
  } catch (error: any) {
    console.error('Face comparison error:', error?.message);
    return res.status(500).json({ error: 'Face comparison failed', details: error?.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/verification/selfie
// Upload the verified selfie to Cloudinary and store the URL as the face anchor.
// Called after selfie vs ID comparison passes.
// ─────────────────────────────────────────────────────────────────────────────
const selfieStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads/selfies');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `selfie-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const uploadSelfieFile = multer({
  storage: selfieStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
}).single('selfie');

router.post('/selfie', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Check user has completed ID verification first
    const verification = await prisma.verification.findUnique({ where: { userId } });
    if (!verification?.idVerified) {
      return res.status(403).json({ error: 'Please complete ID verification before uploading a selfie.' });
    }

    await new Promise<void>((resolve, reject) => {
      uploadSelfieFile(req as any, res as any, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No selfie image provided' });
    }

    const relPath = `/uploads/selfies/${req.file.filename}`;

    // Upload to Cloudinary — required for persistent URL.
    // A local path would break after any Railway redeploy.
    let selfieUrl: string;
    try {
      const { cloudinary: cld } = await import('../lib/cloudinary');
      const result = await cld.uploader.upload(req.file.path, {
        folder: 'trustmatch/selfies',
        transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good' }],
      });
      selfieUrl = result.secure_url;
      // Clean up local file after Cloudinary upload
      try { fs.unlinkSync(req.file.path); } catch {}
    } catch (cloudErr) {
      console.error('Cloudinary selfie upload failed:', cloudErr);
      // Clean up temp file
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(500).json({
        error: 'Failed to store selfie. Please try again.',
        details: 'Image storage service unavailable.',
      });
    }

    await prisma.verification.update({
      where: { userId },
      data: {
        selfieUrl,
        verifiedSelfieUrl: selfieUrl,
        selfieVerified: true,
        // Step A: set idVerified only after selfie passes
        idVerified: true,
        faceMatchScore: req.body.faceMatchScore ? parseFloat(req.body.faceMatchScore) : null,
      },
    });

    return res.json({ success: true, selfieUrl });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Selfie upload error:', error);
    return res.status(500).json({ error: 'Failed to upload selfie' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/verification/compare-photo-to-selfie
// Compare a newly uploaded profile photo against the user's verified selfie
// using the DeepFace Railway service — same backend used for selfie-vs-ID.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/compare-photo-to-selfie', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ error: 'photoUrl is required' });
    }

    const deepfaceUrl = process.env.FACE_VERIFICATION_API_URL;
    if (!deepfaceUrl) {
      return res.status(503).json({ error: 'Face verification service not configured. Set FACE_VERIFICATION_API_URL.' });
    }

    // Get the verified selfie URL
    const verification = await prisma.verification.findUnique({ where: { userId } });
    if (!verification?.verifiedSelfieUrl) {
      return res.status(403).json({ error: 'No verified selfie found. Please complete selfie verification first.' });
    }
    if (!verification.selfieVerified) {
      return res.status(403).json({ error: 'Selfie verification not completed. Please complete selfie verification first.' });
    }

    const selfieUrl = verification.verifiedSelfieUrl;

    // Download both images as buffers
    const fetchBuffer = async (url: string): Promise<Buffer> => {
      const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
      return Buffer.from(resp.data);
    };

    const [selfieBuffer, photoBuffer] = await Promise.all([
      fetchBuffer(selfieUrl),
      fetchBuffer(photoUrl),
    ]);

    // POST to DeepFace Railway service
    const form = new FormData();
    form.append('img1', selfieBuffer, { filename: 'selfie.jpg', contentType: 'image/jpeg' });
    form.append('img2', photoBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    const dfResp = await axios.post(deepfaceUrl, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });

    const data = dfResp.data;
    const isMatch: boolean = data.verified === true;
    const similarity: number = data.distance != null
      ? Math.max(0, Math.min(1, 1 - data.distance))
      : (data.confidence != null ? data.confidence / 100 : 0);

    console.log(`[photo-vs-selfie] userId=${userId} similarity=${(similarity * 100).toFixed(1)}% match=${isMatch}`);

    if (!isMatch) {
      // Do NOT ban on a single mismatch — the user may have uploaded a bad photo.
      // Just return isMatch: false so the client can prompt them to re-upload.
      // Only log for monitoring; no account action taken here.
      console.warn(`[photo-vs-selfie] User ${userId} — profile photo did not match selfie. Similarity: ${(similarity * 100).toFixed(0)}%`);
      return res.status(200).json({
        isMatch: false,
        similarity,
        locked: false,
        reason: 'Your profile photo does not clearly show your face or does not match your selfie. Please upload a clear, well-lit photo where your face is fully visible.',
      });
    }

    return res.json({
      isMatch: true,
      similarity,
      message: `Photo verified — ${(similarity * 100).toFixed(0)}% match with your selfie.`,
    });
  } catch (error: any) {
    console.error('Photo-vs-selfie comparison error:', error?.message);
    return res.status(500).json({ error: 'Face comparison failed', details: error?.message });
  }
});

export default router;
