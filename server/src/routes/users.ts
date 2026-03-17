import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
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
      city: user.city,
      country: user.country,
      role: user.role,
      photos: user.photos,
      verification: user.verification,
      preferences: {
        ageRangeMin: user.ageRangeMin,
        ageRangeMax: user.ageRangeMax,
        maxDistance: user.maxDistance,
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
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const { firstName, lastName, bio, city, country } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { firstName, lastName, bio, city, country, updatedAt: new Date() },
      });

      return res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        city: user.city,
        country: user.country,
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
router.get('/discover', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = 10 } = req.query;

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

    const genderFilter =
      currentUser.interestedIn === 'MALE' ? 'MALE' : 'FEMALE';

    const profiles = await prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        isActive: true,
        verification: { isVerified: true },
        ...(genderFilter ? { gender: genderFilter } : {}),
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
      city: user.city,
      photos: user.photos.map((p) => p.url),
      isVerified: user.verification?.isVerified || false,
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

export default router;
