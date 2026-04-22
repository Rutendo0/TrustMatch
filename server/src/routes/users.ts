import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AuthRequest, verifiedAuthMiddleware } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

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

      // Convert interests array to JSON string if provided
      const interestsJson = interests ? JSON.stringify(interests) : undefined;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { 
          firstName, 
          lastName, 
          bio, 
          city, 
          country, 
          occupation,
          education,
          relationshipGoal,
          aboutMe,
          interests: interestsJson,
          updatedAt: new Date() 
        },
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

    const [swipedUsers, myBlocks, blockedByOthers] = await Promise.all([
      prisma.swipe.findMany({
        where: { swiperId: userId },
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
        verification: { select: { isVerified: true } },
        voiceNotes: {
          where: { isActive: true },
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { id: true, audioUrl: true, duration: true, prompt: true },
        },
      },
      take: Number(limit),
    });

    const response = profiles.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      age: calculateAge(p.dateOfBirth),
      bio: p.bio,
      aboutMe: p.aboutMe,
      interests: p.interests ? JSON.parse(p.interests) : [],
      city: p.city,
      photos: p.photos.map((ph) => ph.url),
      isVerified: p.verification?.isVerified || false,
      voiceNotes: p.voiceNotes,
      lastActive: p.lastActive,
    }));

    return res.json(response);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Discover error:', error);
    return res.status(500).json({ error: 'Failed to get profiles' });
  }
});

// ── GET /api/users/:userId — public profile ───────────────────────────────────
router.get('/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = req.userId!;
    const { userId } = req.params;

    // Hide profile if any block exists in either direction
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
      interests: user.interests ? JSON.parse(user.interests) : [],
      city: user.city,
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

// ── GET /api/users/me/insights ─────────────────────────────────────────────────
router.get('/me/insights', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Get total likes received (count of people who liked this user)
    const likesReceived = await prisma.swipe.count({
      where: {
        swipedId: userId,
        action: 'LIKE',
      },
    });

    // Get likes received in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const likesReceivedLastWeek = await prisma.swipe.count({
      where: {
        swipedId: userId,
        action: 'LIKE',
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // Get super likes received
    const superLikesReceived = await prisma.swipe.count({
      where: {
        swipedId: userId,
        action: 'SUPERLIKE',
      },
    });

    // Get total matches
    const totalMatches = await prisma.match.count({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
        isActive: true,
      },
    });

    // Get profile views (approximated by total swipes on this user's profile)
    const profileViews = await prisma.swipe.count({
      where: {
        swipedId: userId,
      },
    });

    // Calculate trends (comparing last 7 days to previous 7 days)
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

// ── POST /api/users/me/live-verification ────────────────────────────────────────
router.post('/me/live-verification', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { similarity, confidence, isMatch, photosMatched, totalPhotos } = req.body;

    if (typeof similarity !== 'number' || typeof confidence !== 'number' || typeof isMatch !== 'boolean') {
      return res.status(400).json({ error: 'Invalid verification data' });
    }

    // Get client IP and device info
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const deviceInfo = req.get('User-Agent') || 'unknown';

    // Get or create verification record
    let verification = await prisma.verification.findUnique({
      where: { userId },
    });

    if (!verification) {
      verification = await prisma.verification.create({
        data: {
          userId,
        },
      });
    }

    // Create live verification record
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

    // Update user's verification status if successful
    if (isMatch) {
      const newVerificationCount = (verification.liveVerificationCount || 0) + 1;
      
      await prisma.verification.update({
        where: { id: verification.id },
        data: {
          liveVerified: true,
          lastLiveVerification: new Date(),
          liveVerificationCount: newVerificationCount,
          isVerified: true, // Mark as fully verified if live verification passes
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

// ── GET /api/users/me/live-verification/history ──────────────────────────────────
router.get('/me/live-verification/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = 10, offset = 0 } = req.query;

    const history = await prisma.liveVerification.findMany({
      where: {
        verification: {
          userId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.liveVerification.count({
      where: {
        verification: {
          userId,
        },
      },
    });

    return res.json({
      history: history.map(record => ({
        id: record.id,
        isMatch: record.isMatch,
        similarity: record.similarity,
        confidence: record.confidence,
        photosMatched: record.photosMatched,
        totalPhotos: record.totalPhotos,
        createdAt: record.createdAt,
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

export default router;
