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
import { Canvas, Image, loadImage } from 'canvas';
import * as faceapi from 'face-api.js';

// Fix for face-api.js in Node.js environment
// @ts-ignore - face-api.js types can be incomplete in Node.js
// Use global fetch (available in Node.js 18+)
faceapi.env.setEnv({ 
  Canvas, 
  Image, 
  fetch: globalThis.fetch,
});

// Configure face-api.js models path
const MODEL_PATH = path.join(process.cwd(), 'models');

// Load face-api.js models from CDN or local
let modelsLoaded = false;
async function loadFaceApiModels() {
  if (modelsLoaded) return;
  try {
    // Try to load from local first
    try {
      await faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
      modelsLoaded = true;
      console.log('Face-api.js models loaded from local disk');
      return;
    } catch (localError) {
      console.log('Local models not found, downloading from CDN...');
    }
    
    // Fallback: Download models from justadudewhokeys CDN
    const MODEL_URLS = {
      tinyFaceDetector: 'https://justadudewhokeys.github.io/face-api.js/models/tiny_face_detector_model-weights_manifest.json',
      faceLandmark68Net: 'https://justadudewhokeys.github.io/face-api.js/models/face_landmark_68_model-weights_manifest.json',
      faceRecognitionNet: 'https://justadudewhokeys.github.io/face-api.js/models/face_recognition_model-weights_manifest.json',
    };

    await faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhokeys.github.io/face-api.js/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhokeys.github.io/face-api.js/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('https://justadudewhokeys.github.io/face-api.js/models');
    
    modelsLoaded = true;
    console.log('Face-api.js models loaded from CDN');
  } catch (error) {
    console.error('Error loading face-api.js models:', error);
    throw error;
  }
}

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
    console.log('[submit-local] Updating verification for userId:', userId);
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
      dateOfBirth,
      expiryDate,
      nationality,
      gender,
      address,
      confidence,
      email,
      password
    } = req.body;
    
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

    // Check name matches (only if user exists - for logged in users)
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

      if (userFirstName && userLastName && extractedFirstName && extractedLastName) {
        // Check for exact match of first AND last name
        const firstNameMatch = extractedFirstName === userFirstName;
        const lastNameMatch = extractedLastName === userLastName;
        
        if (firstNameMatch && lastNameMatch) {
          nameMatches = true;
        } else if (ocrFullName.includes(userFirstName) && ocrFullName.includes(userLastName)) {
          // Both first and last names found in full name string
          nameMatches = true;
        } else {
          // No match
          nameMatches = false;
        }
      } else if (userFirstName && extractedFirstName) {
        // At minimum, first name should match
        nameMatches = extractedFirstName === userFirstName;
      }

      if (!nameMatches) {
        errors.push('Name on document does not match registration data');
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
    if (userId && verificationStatus === DocumentVerificationStatus.VERIFIED) {
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
// Compare two face images using face-api.js on the server
// Free solution - no external API needed
// ─────────────────────────────────────────────────────────────────────────────
router.post('/face-compare', async (req: AuthRequest, res: Response) => {
  try {
    const { image1, image2 } = req.body;

    if (!image1 || !image2) {
      return res.status(400).json({ 
        error: 'Two images are required for comparison',
        details: 'Please provide both image1 and image2 URLs or base64 data'
      });
    }

    // Load models if not already loaded
    await loadFaceApiModels();

    // Load images from URLs or base64 - use canvas for Node.js
    let img1: Canvas;
    let img2: Canvas;

    try {
      // Helper to load image into canvas
      const loadImageToCanvas = async (source: string): Promise<Canvas> => {
        let imageData: Buffer;
        
        if (source.startsWith('data:image')) {
          // Base64 - extract the data part
          const base64Data = source.replace(/^data:image\/\w+;base64,/, '');
          imageData = Buffer.from(base64Data, 'base64');
        } else if (source.startsWith('http')) {
          // Fetch from URL
          const axios = require('axios');
          const response = await axios.get(source, { responseType: 'arraybuffer' });
          imageData = Buffer.from(response.data);
        } else {
          // Local file path
          imageData = fs.readFileSync(source);
        }
        
        // Create canvas and draw image
        const img = await loadImage(imageData);
        const canvas = new Canvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return canvas;
      };

      img1 = await loadImageToCanvas(image1);
      img2 = await loadImageToCanvas(image2);
    } catch (imgError: any) {
      console.error('Error loading images:', imgError);
      return res.status(400).json({ 
        error: 'Failed to load images',
        details: imgError.message
      });
    }

    // Detect faces and get descriptors
    const detector = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5
    });

    const detection1 = await faceapi.detectSingleFace(img1, detector)
      .withFaceLandmarks()
      .withFaceDescriptor();

    const detection2 = await faceapi.detectSingleFace(img2, detector)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection1 || !detection2) {
      return res.json({
        success: false,
        similarity: 0,
        isMatch: false,
        error: !detection1 ? 'No face detected in first image' : 'No face detected in second image',
        message: 'Could not detect a face in one or both images. Please use clearer photos.',
      });
    }

    // Calculate face matching score using Euclidean distance
    const distance = faceapi.euclideanDistance(
      detection1.descriptor,
      detection2.descriptor
    );

    // Convert distance to similarity (0 = identical, 1 = completely different)
    // Typical threshold: 0.6 for tight match, 0.4 for very strict
    const similarity = 1 - distance;
    const threshold = 0.5; // 50% similarity threshold
    const isMatch = similarity >= threshold;

    console.log(`Face comparison: distance=${distance.toFixed(4)}, similarity=${(similarity * 100).toFixed(1)}%, match=${isMatch}`);

    return res.json({
      success: true,
      similarity: Math.max(0, Math.min(1, similarity)),
      isMatch,
      distance: distance,
      threshold,
      message: isMatch 
        ? `Faces match! (${(similarity * 100).toFixed(0)}% similarity)`
        : `Faces do not match (${(similarity * 100).toFixed(0)}% similarity). Threshold: ${(threshold * 100).toFixed(0)}%`,
    });

  } catch (error: any) {
    console.error('Face comparison error:', error);
    return res.status(500).json({ 
      error: 'Face comparison failed',
      details: error.message
    });
  }
});

export default router;
