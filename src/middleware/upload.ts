import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Allowed MIME types
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'] as const;
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

// File filter for videos
const videoFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_VIDEO_MIMES.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files (MP4, MOV, AVI, WebM) are allowed.'));
  }
};

// File filter for images
const imageFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files (JPEG, PNG, GIF, WebP) are allowed.'));
  }
};

// Configure multer for video uploads (100MB limit)
export const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Configure multer for image uploads (10MB limit)
export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Configure multer for multiple images (10 images max)
export const uploadMultipleImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10, // Max 10 files
  },
});
