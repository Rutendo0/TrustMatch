import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        verification: true,
        photos: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
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
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

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
        data: {
          firstName,
          lastName,
          bio,
          city,
          country,
          updatedAt: new Date(),
        },
        include: {
          verification: true,
          photos: true,
        },
      });

      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        city: user.city,
        country: user.country,
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

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
        data: {
          ageRangeMin,
          ageRangeMax,
          maxDistance,
          interestedIn,
        },
      });

      res.json({
        ageRangeMin: user.ageRangeMin,
        ageRangeMax: user.ageRangeMax,
        maxDistance: user.maxDistance,
        interestedIn: user.interestedIn,
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  }
);

router.get('/discover', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = 10 } = req.query;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new AppError('User not found', 404);
    }

    const swipedUserIds = await prisma.swipe.findMany({
      where: { swiperId: userId },
      select: { swipedId: true },
    });

    const excludeIds = [userId, ...swipedUserIds.map(s => s.swipedId)];

    const profiles = await prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        isActive: true,
        verification: {
          isVerified: true,
        },
        gender: currentUser.interestedIn === 'BOTH' 
          ? undefined 
          : currentUser.interestedIn === 'MALE' ? 'MALE' : 'FEMALE',
      },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
        verification: {
          select: { isVerified: true },
        },
      },
      take: Number(limit),
    });

    const responseProfiles = profiles.map(profile => ({
      id: profile.id,
      firstName: profile.firstName,
      age: calculateAge(profile.dateOfBirth),
      bio: profile.bio,
      city: profile.city,
      photos: profile.photos.map(p => p.url),
      isVerified: profile.verification?.isVerified || false,
    }));

    res.json(responseProfiles);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Discover error:', error);
    res.status(500).json({ error: 'Failed to get profiles' });
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
