import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

// Create storage engine for profile photos
export const createPhotoStorage = () => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'trustmatch/photos',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' }
      ],
    } as any,
  });
};

// Create storage engine for ID documents
export const createDocumentStorage = () => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'trustmatch/documents',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      resource_type: 'raw',
    } as any,
  });
};

// Create storage engine for selfies
export const createSelfieStorage = () => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'trustmatch/selfies',
      allowed_formats: ['jpg', 'jpeg', 'png'],
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto:good' }
      ],
    } as any,
  });
};

// Create storage engine for voice notes
export const createVoiceNoteStorage = () => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'trustmatch/voice-notes',
      allowed_formats: ['mp3', 'wav', 'm4a'],
      resource_type: 'video', // Cloudinary treats audio as video
    } as any,
  });
};
