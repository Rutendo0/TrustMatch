import express from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/voice-notes/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `voice-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /audio\/(mpeg|mp3|wav|aac|m4a|ogg)/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Get all voice notes for a user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    const voiceNotes = await prisma.voiceNote.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        audioUrl: true,
        duration: true,
        transcript: true,
        prompt: true,
        playCount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: voiceNotes
    });
  } catch (error) {
    console.error('Error fetching voice notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voice notes'
    });
  }
});

// Get a specific voice note
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const voiceNote = await prisma.voiceNote.findFirst({
      where: { id, userId, isActive: true },
      select: {
        id: true,
        audioUrl: true,
        duration: true,
        transcript: true,
        prompt: true,
        playCount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!voiceNote) {
      return res.status(404).json({
        success: false,
        error: 'Voice note not found'
      });
    }

    res.json({
      success: true,
      data: voiceNote
    });
  } catch (error) {
    console.error('Error fetching voice note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voice note'
    });
  }
});

// Upload a new voice note
router.post('/', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { duration, transcript, prompt } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    const audioUrl = `/uploads/voice-notes/${audioFile.filename}`;

    const voiceNote = await prisma.voiceNote.create({
      data: {
        userId,
        audioUrl,
        duration: parseInt(duration) || 0,
        transcript: transcript || null,
        prompt: prompt || null
      },
      select: {
        id: true,
        audioUrl: true,
        duration: true,
        transcript: true,
        prompt: true,
        playCount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: voiceNote,
      message: 'Voice note uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading voice note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload voice note'
    });
  }
});

// Update a voice note
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { transcript, prompt } = req.body;

    const existingVoiceNote = await prisma.voiceNote.findFirst({
      where: { id, userId, isActive: true }
    });

    if (!existingVoiceNote) {
      return res.status(404).json({
        success: false,
        error: 'Voice note not found'
      });
    }

    const voiceNote = await prisma.voiceNote.update({
      where: { id },
      data: {
        transcript: transcript !== undefined ? transcript : existingVoiceNote.transcript,
        prompt: prompt !== undefined ? prompt : existingVoiceNote.prompt,
        updatedAt: new Date()
      },
      select: {
        id: true,
        audioUrl: true,
        duration: true,
        transcript: true,
        prompt: true,
        playCount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: voiceNote,
      message: 'Voice note updated successfully'
    });
  } catch (error) {
    console.error('Error updating voice note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update voice note'
    });
  }
});

// Delete a voice note (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const existingVoiceNote = await prisma.voiceNote.findFirst({
      where: { id, userId, isActive: true }
    });

    if (!existingVoiceNote) {
      return res.status(404).json({
        success: false,
        error: 'Voice note not found'
      });
    }

    await prisma.voiceNote.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Voice note deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting voice note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete voice note'
    });
  }
});

// Increment play count
router.post('/:id/play', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const voiceNote = await prisma.voiceNote.findFirst({
      where: { id, isActive: true }
    });

    if (!voiceNote) {
      return res.status(404).json({
        success: false,
        error: 'Voice note not found'
      });
    }

    await prisma.voiceNote.update({
      where: { id },
      data: {
        playCount: {
          increment: 1
        }
      }
    });

    res.json({
      success: true,
      message: 'Play count incremented'
    });
  } catch (error) {
    console.error('Error incrementing play count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update play count'
    });
  }
});

// Get voice notes for profile display (public)
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 3;

    const voiceNotes = await prisma.voiceNote.findMany({
      where: { userId, isActive: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        audioUrl: true,
        duration: true,
        prompt: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: voiceNotes
    });
  } catch (error) {
    console.error('Error fetching profile voice notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voice notes'
    });
  }
});

export default router;