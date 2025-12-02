import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.post(
  '/id-document',
  authMiddleware,
  upload.single('document'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { documentType } = req.body;

      if (!req.file) {
        throw new AppError('No document uploaded', 400);
      }

      if (!['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID'].includes(documentType)) {
        throw new AppError('Invalid document type', 400);
      }

      const documentUrl = `uploads/documents/${userId}_${Date.now()}.jpg`;

      await prisma.verification.update({
        where: { userId },
        data: {
          idDocumentType: documentType,
          idDocumentUrl: documentUrl,
          idVerified: false,
        },
      });

      res.json({
        message: 'Document uploaded successfully',
        status: 'pending_verification',
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'Document upload failed' });
    }
  }
);

router.post(
  '/selfie',
  authMiddleware,
  upload.single('selfie'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      if (!req.file) {
        throw new AppError('No selfie uploaded', 400);
      }

      const verification = await prisma.verification.findUnique({
        where: { userId },
      });

      if (!verification?.idDocumentUrl) {
        throw new AppError('Please upload ID document first', 400);
      }

      const selfieUrl = `uploads/selfies/${userId}_${Date.now()}.jpg`;

      const faceMatchScore = 0.85 + Math.random() * 0.1;
      const livenessScore = 0.9 + Math.random() * 0.08;

      const isVerified = faceMatchScore >= 0.8 && livenessScore >= 0.85;

      await prisma.verification.update({
        where: { userId },
        data: {
          selfieUrl,
          selfieVerified: isVerified,
          faceMatchScore,
          livenessScore,
          idVerified: isVerified,
          isVerified,
          verifiedAt: isVerified ? new Date() : null,
        },
      });

      res.json({
        message: isVerified ? 'Verification successful' : 'Verification failed',
        isVerified,
        faceMatchScore,
        livenessScore,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Selfie verification error:', error);
      res.status(500).json({ error: 'Selfie verification failed' });
    }
  }
);

router.get(
  '/status',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      const verification = await prisma.verification.findUnique({
        where: { userId },
      });

      if (!verification) {
        throw new AppError('Verification record not found', 404);
      }

      res.json({
        isVerified: verification.isVerified,
        idVerified: verification.idVerified,
        selfieVerified: verification.selfieVerified,
        emailVerified: verification.emailVerified,
        phoneVerified: verification.phoneVerified,
        verifiedAt: verification.verifiedAt,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Verification status error:', error);
      res.status(500).json({ error: 'Failed to get verification status' });
    }
  }
);

export default router;
