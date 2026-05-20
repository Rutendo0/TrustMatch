import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AuthRequest, verifiedAuthMiddleware } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as faceapi from 'face-api.js';
import { Canvas, Image, loadImage } from 'canvas';

// Fix for face-api.js in Node.js environment
(faceapi.env as any).setEnv({
  Canvas,
  Image,
  ImageData: (globalThis as any).ImageData,
  Video: (globalThis as any).Video,
  CanvasRenderingContext2D: (globalThis as any).CanvasRenderingContext2D,
  createCanvasElement: () => new Canvas(0, 0) as any,
  createImageElement: () => new Image() as any,
  fetch: globalThis.fetch,
  readFile: (filePath: string) => Promise.resolve(fs.readFileSync(filePath)),
});

// Configure face-api.js models path
const MODEL_PATH = path.join(process.cwd(), 'models');

// Load face-api.js models
let modelsLoaded = false;
let modelsLoadError: Error | null = null;
async function loadFaceApiModels() {
  if (modelsLoaded) return;
  if (modelsLoadError) throw modelsLoadError;
  try {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
      modelsLoaded = true;
      console.log('Face-api.js models loaded from local disk');
      return;
    } catch {
      console.log('Local models not found, loading from CDN...');
    }
    await faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhokeys.github.io/face-api.js/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhokeys.github.io/face-api.js/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('https://justadudewhokeys.github.io/face-api.js/models');
    modelsLoaded = true;
    console.log('Face-api.js models loaded from CDN');
  } catch (error: any) {
    console.error('Error loading face-api.js models:', error?.message || error);
    modelsLoadError = error;
    throw error;
  }
}

const router = Router();

// ── GET /api/users/me ─────────────────────────────────────────────────────────
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        verification: true,
        photos: { orderBy: { order: 'asc' } },
      },
    });

    if (!user) throw new AppError('User not found', 404);

    return res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      interestedIn: user.interestedIn,
      bio: user.bio,
      aboutMe: user.aboutMe,
      interests: user.interests ? JSON.parse(user.interests) : [],
      city: user.city,
      country: user.country,
      occupation: user.occupation,
      education: user.education,
      relationshipGoal: user.relationshipGoal,
      role: user.role,
      isVerified: user.verification?.isVerified || false,
      verificationBadges: user.verification?.isVerified ? ['Identity Verified', 'Selfie Verified'] : [],
      safetyFeatures: user.verification?.isVerified ? ['Verified'] : [],
      photos: user.photos,
      verification: user.verification,
      preferences: {
        ageRangeMin: user.ageRangeMin,
        ageRangeMax: user.ageRangeMax,
        maxDistance: user.maxDistance,
        interestedIn: user.interestedIn,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// ── PUT /api/users/me ─────────────────────────────────────────────────────────
router.put(
  '/me',
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('bio').optional().trim(),
    body('city').optional().trim(),
    body('country').optional().trim(),
    body('occupation').optional().trim(),
    body('education').optional().trim(),
    body('relationshipGoal').optional().trim(),
    body('aboutMe').optional().trim(),
    body('interests').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const { firstName, lastName, bio, city, country, occupation, education, relationshipGoal, aboutMe, interests } = req.body;

      // Only update fields that were explicitly provided — never overwrite with undefined
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (firstName   !== undefined) updateData.firstName        = firstName;
      if (lastName    !== undefined) updateData.lastName         = lastName;
      if (bio         !== undefined) updateData.bio              = bio;
      if (city        !== undefined) updateData.city             = city;
      if (country     !== undefined) updateData.country          = country;
      if (occupation  !== undefined) updateData.occupation       = occupation;
      if (education   !== undefined) updateData.education        = education;
      if (relationshipGoal !== undefined) updateData.relationshipGoal = relationshipGoal;
      if (aboutMe     !== undefined) updateData.aboutMe          = aboutMe;
      if (interests   !== undefined) updateData.interests        = JSON.stringify(interests);

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      return res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        city: user.city,
        country: user.country,
        occupation: user.occupation,
        education: user.education,
        relationshipGoal: user.relationshipGoal,
        aboutMe: user.aboutMe,
        interests: user.interests,
      });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// ── DELETE /api/users/me ──────────────────────────────────────────────────────
router.delete('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Invalidate all sessions
    await prisma.refreshToken.deleteMany({ where: { userId } });

    // Soft-delete: deactivate account
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false, email: `deleted_${userId}@deleted`, phone: `deleted_${userId}`, updatedAt: new Date() },
    });

    return res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ── PUT /api/users/preferences ────────────────────────────────────────────────
router.put(
  '/preferences',
  [
    body('ageRangeMin').optional().isInt({ min: 18, max: 100 }),
    body('ageRangeMax').optional().isInt({ min: 18, max: 100 }),
    body('maxDistance').optional().isInt({ min: 1, max: 500 }),
    body('interestedIn').optional().isIn(['MALE', 'FEMALE', 'BOTH']),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const { ageRangeMin, ageRangeMax, maxDistance, interestedIn } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { ageRangeMin, ageRangeMax, maxDistance, interestedIn },
      });

      return res.json({
        ageRangeMin: user.ageRangeMin,
        ageRangeMax: user.ageRangeMax,
        maxDistance: user.maxDistance,
        interestedIn: user.interestedIn,
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      return res.status(500).json({ error: 'Failed to update preferences' });
    }
  }
);

// ── PUT /api/users/location ───────────────────────────────────────────────────
router.put(
  '/location',
  [
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('city').optional().trim(),
    body('country').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const { latitude, longitude, city, country } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { latitude, longitude, city, country },
        select: { id: true, latitude: true, longitude: true, city: true, country: true },
      });

      return res.json(user);
    } catch (error) {
      console.error('Update location error:', error);
      return res.status(500).json({ error: 'Failed to update location' });
    }
  }
);

// ── GET /api/users/discover ───────────────────────────────────────────────────
router.get('/discover', verifiedAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = 10, gender, ageMin, ageMax, distance } = req.query;

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) throw new AppError('User not found', 404);

    // Get users the current user has already interacted with
    // Only exclude LIKED users and matches - allow re-showing DISLIKED users
    const [swipedUsers, myBlocks, blockedByOthers] = await Promise.all([
      prisma.swipe.findMany({
        where: { 
          swiperId: userId,
          action: { in: ['LIKE', 'SUPERLIKE'] }  // Only exclude liked users, not disliked
        },
        select: { swipedId: true },
      }),
      prisma.userBlock.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
      }),
      prisma.userBlock.findMany({
        where: { blockedId: userId },
        select: { blockerId: true },
      }),
    ]);

    const excludeIds = [
      userId,
      ...swipedUsers.map((s) => s.swipedId),
      ...myBlocks.map((b) => b.blockedId),
      ...blockedByOthers.map((b) => b.blockerId),
    ];

    // Use query param if provided, otherwise use user's preference
    let genderFilter: 'MALE' | 'FEMALE' | undefined;
    if (gender && (gender === 'MALE' || gender === 'FEMALE')) {
      genderFilter = gender as 'MALE' | 'FEMALE';
    } else if (currentUser.interestedIn) {
      genderFilter = currentUser.interestedIn as 'MALE' | 'FEMALE';
    }

    // Calculate age range
    const birthYear = new Date().getFullYear();
    const minBirthYear = birthYear - (ageMin ? Number(ageMin) : 100);
    const maxBirthYear = birthYear - (ageMax ? Number(ageMax) : 18);

    const profiles = await prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        isActive: true,
        verification: { isVerified: true },
        ...(genderFilter ? { gender: genderFilter } : {}),
        ...(ageMin || ageMax ? {
          dateOfBirth: {
            ...(maxBirthYear ? { gte: new Date(`${maxBirthYear}-01-01`) } : {}),
            ...(minBirthYear ? { lte: new Date(`${minBirthYear}-12-31`) } : {}),
          }
        } : {}),
      },
      include: {
        photos: { orderBy: { order: 'asc' } },
        verification: { select: { isVerified: true, idVerified: true, selfieVerified: true, emailVerified: true, liveVerified: true, faceMatchScore: true } },
        voiceNotes: {
          where: { isActive: true },
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { id: true, audioUrl: true, duration: true, prompt: true },
        },
      },
      take: Number(limit),
    });

    const response = profiles.map((p) => {
      // Calculate real trust score — same model as auth/complete:
      // email=20 (base), id=35, face scaled 0-35, photo=10
      const v = p.verification;
      const rawFace    = v?.faceMatchScore ?? 0;
      const facePoints = Math.round((rawFace / 100) * 35);
      const idPoints   = v?.idVerified    ? 35 : 0;
      const photoPoints = v?.idVerified   ? 10 : 0;
      const trustScore  = Math.min(100, 20 + idPoints + facePoints + photoPoints);


      // Calculate compatibility based on shared interests with current user.
      // Pure interest overlap — no fake base scores or bonuses.
      const profileInterests: string[] = p.interests ? JSON.parse(p.interests) : [];
      const currentUserInterests: string[] = currentUser.interests ? JSON.parse(currentUser.interests) : [];
      const sharedCount = profileInterests.filter(i => currentUserInterests.includes(i)).length;
      const totalUnique = new Set([...profileInterests, ...currentUserInterests]).size;
      // Jaccard similarity: shared / union — gives 0 if no overlap, honest score
      const compatibility = totalUnique === 0 ? 0 : Math.round((sharedCount / totalUnique) * 100);

      return {
        id: p.id,
        firstName: p.firstName,
        age: calculateAge(p.dateOfBirth),
        bio: p.bio,
        aboutMe: p.aboutMe,
        occupation: p.occupation,
        education: p.education,
        interests: profileInterests,
        city: p.city,
        photos: p.photos.map((ph) => ph.url),
        isVerified: v?.isVerified || false,
        trustScore,
        compatibility,
        voiceNotes: p.voiceNotes,
        lastActive: p.lastActive,
      };
    });

    return res.json(response);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Discover error:', error);
    return res.status(500).json({ error: 'Failed to get profiles' });
  }
});

// ── GET /api/users/me/insights ─────────────────────────────────────────────────
// MUST be before /:userId so Express doesn't treat "me" as a userId param
router.get('/me/insights', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    const likesReceived = await prisma.swipe.count({
      where: { swipedId: userId, action: 'LIKE' },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const likesReceivedLastWeek = await prisma.swipe.count({
      where: { swipedId: userId, action: 'LIKE', createdAt: { gte: sevenDaysAgo } },
    });

    const superLikesReceived = await prisma.swipe.count({
      where: { swipedId: userId, action: 'SUPERLIKE' },
    });

    const totalMatches = await prisma.match.count({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        isActive: true,
      },
    });

    const profileViews = await prisma.swipe.count({
      where: { swipedId: userId },
    });

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const likesPreviousWeek = await prisma.swipe.count({
      where: {
        swipedId: userId,
        action: 'LIKE',
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    });

    let likesTrend = 0;
    if (likesPreviousWeek > 0) {
      likesTrend = Math.round(((likesReceivedLastWeek - likesPreviousWeek) / likesPreviousWeek) * 100);
    } else if (likesReceivedLastWeek > 0) {
      likesTrend = 100;
    }

    return res.json({
      totalLikesReceived: likesReceived,
      likesReceivedLastWeek,
      likesTrend,
      superLikesReceived,
      totalMatches,
      profileViews,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get insights error:', error);
    return res.status(500).json({ error: 'Failed to get profile insights' });
  }
});

// ── POST /api/users/me/live-verification ─────────────────────────────────────
router.post('/me/live-verification', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { similarity, confidence, isMatch, photosMatched, totalPhotos } = req.body;

    if (typeof similarity !== 'number' || typeof confidence !== 'number' || typeof isMatch !== 'boolean') {
      return res.status(400).json({ error: 'Invalid verification data' });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const deviceInfo = req.get('User-Agent') || 'unknown';

    let verification = await prisma.verification.findUnique({ where: { userId } });
    if (!verification) {
      verification = await prisma.verification.create({ data: { userId } });
    }

    const liveVerification = await prisma.liveVerification.create({
      data: {
        verificationId: verification.id,
        similarity,
        confidence,
        isMatch,
        photosMatched: photosMatched || 0,
        totalPhotos: totalPhotos || 0,
        ipAddress,
        deviceInfo,
      },
    });

    if (isMatch) {
      await prisma.verification.update({
        where: { id: verification.id },
        data: {
          liveVerified: true,
          lastLiveVerification: new Date(),
          liveVerificationCount: (verification.liveVerificationCount || 0) + 1,
          isVerified: true,
        },
      });
    }

    return res.json({
      success: true,
      liveVerification: {
        id: liveVerification.id,
        isMatch,
        similarity,
        confidence,
        photosMatched,
        totalPhotos,
        createdAt: liveVerification.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Live verification error:', error);
    return res.status(500).json({ error: 'Failed to process live verification' });
  }
});

// ── GET /api/users/me/live-verification/history ───────────────────────────────
router.get('/me/live-verification/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = 10, offset = 0 } = req.query;

    const [history, total] = await Promise.all([
      prisma.liveVerification.findMany({
        where: { verification: { userId } },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.liveVerification.count({
        where: { verification: { userId } },
      }),
    ]);

    return res.json({
      history: history.map(r => ({
        id: r.id,
        isMatch: r.isMatch,
        similarity: r.similarity,
        confidence: r.confidence,
        photosMatched: r.photosMatched,
        totalPhotos: r.totalPhotos,
        createdAt: r.createdAt,
      })),
      total,
      hasMore: Number(offset) + Number(limit) < total,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Live verification history error:', error);
    return res.status(500).json({ error: 'Failed to get live verification history' });
  }
});

// ── GET /api/users/:userId — public profile ───────────────────────────────────
// MUST be last — wildcard catches everything above if placed earlier
router.get('/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = req.userId!;
    const { userId } = req.params;

    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: requesterId, blockedId: userId },
          { blockerId: userId, blockedId: requesterId },
        ],
      },
    });
    if (block) throw new AppError('User not found', 404);

    const user = await prisma.user.findFirst({
      where: { id: userId, isActive: true },
      include: {
        photos: { orderBy: { order: 'asc' } },
        verification: { select: { isVerified: true } },
        voiceNotes: {
          where: { isActive: true },
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { id: true, audioUrl: true, duration: true, prompt: true },
        },
      },
    });

    if (!user) throw new AppError('User not found', 404);

    return res.json({
      id: user.id,
      firstName: user.firstName,
      age: calculateAge(user.dateOfBirth),
      bio: user.bio,
      aboutMe: user.aboutMe,
      occupation: user.occupation,
      education: user.education,
      relationshipGoal: user.relationshipGoal,
      interests: user.interests ? JSON.parse(user.interests) : [],
      city: user.city,
      country: user.country,
      photos: user.photos.map((p) => p.url),
      isVerified: user.verification?.isVerified || false,
      verificationBadges: user.verification?.isVerified ? ['Identity Verified', 'Selfie Verified'] : [],
      safetyFeatures: user.verification?.isVerified ? ['Verified'] : [],
      voiceNotes: user.voiceNotes,
      lastActive: user.lastActive,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to get user profile' });
  }
});

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

// ── Multer: in-memory storage for face verification (no disk writes) ──────────
const faceUploadStorage = multer.memoryStorage();
const uploadFaceImages = multer({
  storage: faceUploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
}).fields([
  { name: 'img1', maxCount: 1 },
  { name: 'img2', maxCount: 1 },
]);

// ── POST /api/users/verify-face ─────────────────────────────────────────────
// Compares two face images using face-api.js (TinyFaceDetector + FaceRecognitionNet)
// Called from the React Native app during selfie verification
router.post('/verify-face', uploadFaceImages, async (req: AuthRequest, res: Response) => {
  let errorDetails = '';
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length < 2) {
      return res.status(400).json({
        error: 'Two images (img1 and img2) are required',
        verified: false,
        distance: 1,
        threshold: 0.5,
        similarity: 0,
      });
    }

    const img1File = files.find(f => f.fieldname === 'img1');
    const img2File = files.find(f => f.fieldname === 'img2');

    if (!img1File || !img2File) {
      return res.status(400).json({
        error: 'Both img1 and img2 must be provided',
        verified: false,
        distance: 1,
        threshold: 0.5,
        similarity: 0,
      });
    }

    // Validate image files are non-empty
    if (img1File.size === 0 || img2File.size === 0) {
      return res.status(400).json({
        error: 'One or both images are empty',
        verified: false,
        distance: 1,
        threshold: 0.5,
        similarity: 0,
      });
    }

    console.log('Face verification request received');
    console.log('Image 1:', img1File.originalname, img1File.mimetype, img1File.size, 'bytes');
    console.log('Image 2:', img2File.originalname, img2File.mimetype, img2File.size, 'bytes');

    // Load face-api.js models
    console.log('Loading face-api.js models...');
    await loadFaceApiModels();

    // Load images from buffers into canvas using face-api loadImage
    const loadImageFromBuffer = async (buffer: Buffer): Promise<any> => {
      const img = await loadImage(buffer);
      const canvas = new Canvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img as any, 0, 0, img.width, img.height);
      return canvas as any;
    };

    let img1Canvas: any;
    let img2Canvas: any;

    try {
      [img1Canvas, img2Canvas] = await Promise.all([
        loadImageFromBuffer(img1File.buffer),
        loadImageFromBuffer(img2File.buffer),
      ]);
    } catch (imgError: any) {
      console.error('Error loading images from buffer:', imgError);
      return res.status(400).json({
        error: 'Failed to process images. Please upload valid image files.',
        details: imgError.message,
        verified: false,
        distance: 1,
        threshold: 0.5,
        similarity: 0,
      });
    }

    // Detect faces and compute descriptors
    console.log('Detecting faces...');
    const detector = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.4,  // Lower threshold to be more permissive
    });

    let detection1: any;
    let detection2: any;

    try {
      const [det1, det2] = await Promise.all([
        faceapi.detectSingleFace(img1Canvas, detector).withFaceLandmarks().withFaceDescriptor(),
        faceapi.detectSingleFace(img2Canvas, detector).withFaceLandmarks().withFaceDescriptor(),
      ]);
      detection1 = det1;
      detection2 = det2;
    } catch (faceError: any) {
      console.error('Face detection error:', faceError);
      return res.status(500).json({
        error: 'Face detection failed',
        details: faceError.message,
        verified: false,
        distance: 1,
        threshold: 0.5,
        similarity: 0,
      });
    }

    if (!detection1 || !detection2) {
      const missingFace = !detection1 ? 'first image' : 'second image';
      console.log(`Face not detected in ${missingFace}`);
      return res.json({
        verified: false,
        distance: 1,
        threshold: 0.5,
        similarity: 0,
        isMatch: false,
        message: `No face detected in ${missingFace}. Please ensure your face is clearly visible.`,
        model: 'face-api.js',
        detector_backend: 'tinyFaceDetector',
        facial_areas: {
          img1: detection1 ? { x: 0, y: 0, w: 0, h: 0 } : null,
          img2: detection2 ? { x: 0, y: 0, w: 0, h: 0 } : null,
        },
      });
    }

    // Compute Euclidean distance between face descriptors
    const distance = faceapi.euclideanDistance(detection1.descriptor, detection2.descriptor);

    // Convert distance to similarity score
    // Distance: 0 = identical, higher = more different
    // Similarity: 1 = identical, 0 = completely different
    const threshold = 0.5;
    const similarity = 1 - distance;
    const isMatch = similarity >= threshold;

    console.log(`Face verification result:`);
    console.log(`  Distance: ${distance.toFixed(4)}`);
    console.log(`  Similarity: ${(similarity * 100).toFixed(1)}%`);
    console.log(`  Threshold: ${(threshold * 100).toFixed(0)}%`);
    console.log(`  Is Match: ${isMatch}`);

    return res.json({
      verified: isMatch,
      distance: Math.round(distance * 10000) / 10000,
      threshold,
      similarity: Math.round(Math.max(0, Math.min(1, similarity)) * 100) / 100,
      isMatch,
      model: 'face-api.js',
      detector_backend: 'tinyFaceDetector',
      match: isMatch,
      confidence: Math.round(Math.max(0, Math.min(1, similarity)) * 100),
      facial_areas: {
        img1: { x: 0, y: 0, w: 0, h: 0 },
        img2: { x: 0, y: 0, w: 0, h: 0 },
      },
      message: isMatch
        ? `Face match confirmed (${(similarity * 100).toFixed(0)}% similarity)`
        : `Faces do not match (${(similarity * 100).toFixed(0)}% similarity). Threshold: ${(threshold * 100).toFixed(0)}%`,
    });

  } catch (error: any) {
    console.error('Face verification error:', error);
    console.error('Stack:', error?.stack?.substring(0, 500));
    errorDetails = error?.message || String(error);

    return res.status(500).json({
      error: 'Face verification failed',
      details: errorDetails,
      stack: process.env.NODE_ENV === 'development' ? error?.stack?.substring(0, 500) : undefined,
      verified: false,
      distance: 1,
      threshold: 0.5,
      similarity: 0,
      match: false,
    });
  }
});

export default router;
