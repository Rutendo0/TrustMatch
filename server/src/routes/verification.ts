import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { verificationService } from '../services/verificationService';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
      const userId = req.userId!;

      if (!req.file) {
        return res.status(400).json({ error: 'No document image provided' });
      }

      const documentType = (req.body.documentType as string) || null;
      const relPath = `/uploads/documents/${req.file.filename}`;

      // Persist the document URL and type on the verification record
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
// GET /api/verification/status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const verification = await prisma.verification.findUnique({ where: { userId } });
    if (!verification) throw new AppError('Verification record not found', 404);

    // If a Jumio workflow was started but the webhook hasn't arrived yet,
    // try polling Jumio directly for the result.
    if (
      !verification.isVerified &&
      verification.jumioWorkflowId &&
      process.env.VERIFICATION_API_KEY
    ) {
      const result = await verificationService.getSessionResult(verification.jumioWorkflowId);
      if (result?.workflowExecution?.decision?.type) {
        await verificationService.processWebhook(result);
        // Re-fetch after update
        const updated = await prisma.verification.findUnique({ where: { userId } });
        if (updated) {
          return res.json(buildStatusResponse(updated));
        }
      }
    }

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

    // Clear previous Jumio state before issuing a new session
    await prisma.verification.update({
      where: { userId },
      data: {
        jumioWorkflowId: null,
        jumioDecision: null,
        idVerified: false,
        selfieVerified: false,
        faceMatchScore: null,
        livenessScore: null,
      },
    });

    const session = await verificationService.createVerificationSession(userId, user.email);

    return res.status(201).json({
      sessionId: session.sessionId,
      sessionUrl: session.sessionUrl,
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
  jumioDecision: string | null;
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
    decision: v.jumioDecision,
    verifiedAt: v.verifiedAt,
  };
}

// ── POST /api/verification/extract-document-text ─────────────────────────────
// Open-source server-side OCR using Tesseract.js (no API key, no rate limits)
router.post('/extract-document-text', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Decode image to a raw Buffer
    let imageBuffer: Buffer;
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      if (!base64Data) {
        return res.status(400).json({ error: 'Invalid base64 image data' });
      }
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (imageUrl.startsWith('http')) {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.json({ success: true, text: '', confidence: 0 });
      }
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      return res.status(400).json({ error: 'Invalid image format. Provide a URL or base64 data URI.' });
    }

    // Pre-process with sharp: normalise size + greyscale + enhance contrast
    // 1400 px is sufficient for Tesseract accuracy while keeping processing fast
    const processedBuffer = await sharp(imageBuffer)
      .resize({ width: 1400, withoutEnlargement: true })
      .greyscale()
      .normalize()
      .sharpen()
      .toBuffer();

    // Run Tesseract OCR with a 60-second safety timeout.
    // If OCR hangs, terminate the worker so it doesn't leak memory and crash the process.
    const worker = await getOcrWorker();
    const OCR_TIMEOUT_MS = 60_000;
    const { data } = await Promise.race([
      worker.recognize(processedBuffer),
      new Promise<never>((_, reject) =>
        setTimeout(async () => {
          // Kill the stuck worker and reset singleton so next request gets a fresh one
          if (_ocrWorker) {
            try { await _ocrWorker.terminate(); } catch {}
            _ocrWorker = null;
          }
          reject(new Error('OCR timed out'));
        }, OCR_TIMEOUT_MS)
      ),
    ]);

    return res.json({
      success: true,
      text: data.text,
      confidence: data.confidence / 100,
    });
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    // Return empty text so the client can fall back to user-entered data
    return res.json({ success: true, text: '', confidence: 0 });
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
    await prisma.verification.update({
      where: { userId },
      data: {
        isVerified: true, // Mark as verified based on AI
        idVerified: true,
        selfieVerified: true,
        faceMatchScore: confidence ? confidence * 100 : null,
        livenessScore: 100, // AI confirmed liveness
        verifiedAt: new Date(),
      },
    });

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
// ─────────────────────────────────────────────────────────────────────────────
router.post('/document/verify-local', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
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
      confidence,
    } = req.body;

    // Get user data for comparison
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, dateOfBirth: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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

    // Check name matches
    const extractedName = (fullName || `${firstName || ''} ${lastName || ''}`).toLowerCase().trim();
    const userName = `${user.firstName} ${user.lastName}`.toLowerCase().trim();
    let nameMatches = false;

    if (extractedName && userName) {
      const userFirstLower = user.firstName.toLowerCase();
      const userLastLower = user.lastName.toLowerCase();
      const extractedFirstLower = (firstName || extractedName.split(' ')[0] || '').toLowerCase();
      const extractedLastLower = (lastName || extractedName.split(' ').slice(1).join(' ') || '').toLowerCase();

      // Check for match
      if (extractedFirstLower === userFirstLower || extractedLastLower === userLastLower) {
        nameMatches = true;
      } else if (extractedName.includes(userFirstLower) || extractedName.includes(userLastLower)) {
        nameMatches = true;
      }
    }

    if (!nameMatches) {
      errors.push('Name on document does not match registration data');
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

    // Store extracted data for later reference
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
    documentDataStore.set(userId, extractedData);

    // Update verification record
    if (verificationStatus === DocumentVerificationStatus.VERIFIED) {
      await prisma.verification.upsert({
        where: { userId },
        create: {
          userId,
          idVerified: true,
          idDocumentType: documentType as any,
          verifiedAt: new Date(),
        },
        update: {
          idVerified: true,
          idDocumentType: documentType as any,
          verifiedAt: new Date(),
        },
      });
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
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Local document verification error:', error);
    return res.status(500).json({ error: 'Failed to verify document' });
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

export default router;
