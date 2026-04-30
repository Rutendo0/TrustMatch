import { Router, Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createPhotoStorage, cloudinary } from '../lib/cloudinary';

const router = Router();

const MAX_PHOTOS = 6;

// Create Cloudinary storage
const storage = createPhotoStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// GET /api/users/photos — list current user's photos
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const photos = await prisma.photo.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });
    res.json(photos);
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to get photos' });
  }
});

// POST /api/users/photos — upload a new photo
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Check limit BEFORE uploading to Cloudinary
    const existingCount = await prisma.photo.count({ where: { userId } });
    if (existingCount >= MAX_PHOTOS) {
      return res.status(400).json({ error: `Maximum of ${MAX_PHOTOS} photos allowed` });
    }

    // Only upload after limit check passes
    await new Promise<void>((resolve, reject) => {
      upload.single('photo')(req as any, res as any, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const isFirst = existingCount === 0;

    // Get the Cloudinary URL
    const photoUrl = (req.file as any).path || req.file.filename;

    const photo = await prisma.photo.create({
      data: {
        userId,
        url: photoUrl,
        order: existingCount,
        isMain: isFirst,
      },
    });

    res.status(201).json(photo);
  } catch (error: any) {
    console.error('Upload photo error:', error);
    // Propagate AppError status codes correctly
    const status = error instanceof AppError ? error.statusCode : 500;
    res.status(status).json({ error: error.message || 'Failed to upload photo' });
  }
});

// DELETE /api/users/photos/:id — delete a photo
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const photoId = req.params.id;

    const photo = await prisma.photo.findFirst({
      where: { id: photoId, userId },
    });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    // Delete from Cloudinary
    try {
      // Extract public ID from URL
      const urlParts = photo.url.split('/');
      const publicId = urlParts.slice(-2).join('/').replace(/\.[^.]+$/, '');
      await cloudinary.uploader.destroy(publicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary delete error:', cloudinaryError);
    }

    // Delete from database
    await prisma.photo.delete({ where: { id: photoId } });

    // Reorder remaining photos
    const remaining = await prisma.photo.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    for (let i = 0; i < remaining.length; i++) {
      await prisma.photo.update({
        where: { id: remaining[i].id },
        data: { 
          order: i,
          isMain: i === 0,
        },
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete photo error:', error);
    const status = error instanceof AppError ? error.statusCode : 500;
    res.status(status).json({ error: error.message || 'Failed to delete photo' });
  }
});

// PUT /api/users/photos/reorder — reorder photos
router.put('/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { photoIds } = req.body as { photoIds: string[] };

    if (!Array.isArray(photoIds)) {
      throw new AppError('Invalid photo IDs', 400);
    }

    // Verify all photos belong to user
    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds }, userId },
    });

    if (photos.length !== photoIds.length) {
      throw new AppError('Some photos not found', 404);
    }

    // Update order
    for (let i = 0; i < photoIds.length; i++) {
      await prisma.photo.update({
        where: { id: photoIds[i] },
        data: { 
          order: i,
          isMain: i === 0,
        },
      });
    }

    const updated = await prisma.photo.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Reorder photos error:', error);
    const status = error instanceof AppError ? error.statusCode : 500;
    res.status(status).json({ error: error.message || 'Failed to reorder photos' });
  }
});

export default router;
