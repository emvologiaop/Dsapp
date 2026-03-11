import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { Readable } from 'stream';
import { sanitizeFilename } from '../utils/validation.js';

// Cloudflare R2 client configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

/**
 * Generate a unique filename with timestamp and random string
 *
 * @param originalName - Original filename with extension
 * @param prefix - Optional prefix for the filename (e.g., 'images/', 'videos/')
 * @returns Sanitized unique filename in format: {prefix}{timestamp}-{random}.{extension}
 *
 * @example
 * generateUniqueFilename('photo.jpg', 'images/')
 * // Returns: 'images/1234567890-a1b2c3d4e5f6g7h8.jpg'
 */
export function generateUniqueFilename(originalName: string, prefix: string = ''): string {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  const sanitized = sanitizeFilename(originalName);
  const extension = sanitized.split('.').pop() || 'bin';
  return `${prefix}${timestamp}-${randomStr}.${extension}`;
}

/**
 * Upload a file buffer to R2 storage
 *
 * @param buffer - File content as Buffer
 * @param filename - Filename to use in R2 (should be unique)
 * @param contentType - MIME type of the file (e.g., 'image/jpeg', 'video/mp4')
 * @param folder - Optional folder path (deprecated, use prefix in filename instead)
 * @returns Public URL of the uploaded file
 *
 * @throws Error if upload fails or if required environment variables are not set
 *
 * @example
 * const url = await uploadToR2(buffer, 'photo-123.jpg', 'image/jpeg', '')
 */
export async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string = ''
): Promise<string> {
  if (!BUCKET_NAME || !PUBLIC_URL) {
    throw new Error('R2 storage configuration is incomplete. Check environment variables.');
  }

  const key = folder ? `${folder}/${filename}` : filename;

  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    },
  });

  await upload.done();

  // Return public URL
  return `${PUBLIC_URL}/${key}`;
}

/**
 * Upload a file stream to R2 storage
 * Useful for large files to avoid loading entire file into memory
 *
 * @param stream - Readable stream of file content
 * @param filename - Filename to use in R2 (should be unique)
 * @param contentType - MIME type of the file
 * @param folder - Optional folder path (deprecated, use prefix in filename instead)
 * @returns Public URL of the uploaded file
 *
 * @throws Error if upload fails
 */
export async function uploadStreamToR2(
  stream: Readable,
  filename: string,
  contentType: string,
  folder: string = ''
): Promise<string> {
  if (!BUCKET_NAME || !PUBLIC_URL) {
    throw new Error('R2 storage configuration is incomplete. Check environment variables.');
  }

  const key = folder ? `${folder}/${filename}` : filename;

  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: stream,
      ContentType: contentType,
    },
  });

  await upload.done();

  return `${PUBLIC_URL}/${key}`;
}

/**
 * Delete a file from R2 storage
 *
 * @param fileUrl - Full public URL of the file to delete
 * @returns Promise that resolves when deletion is complete
 *
 * @throws Error if deletion fails
 *
 * @example
 * await deleteFromR2('https://r2.example.com/images/photo-123.jpg')
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  if (!BUCKET_NAME) {
    throw new Error('R2_BUCKET_NAME environment variable is not set');
  }

  // Extract key from URL
  const key = fileUrl.replace(`${PUBLIC_URL}/`, '');

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Generate a presigned URL for temporary access to a file
 * Useful for providing time-limited access to private files
 *
 * @param fileUrl - Full public URL of the file
 * @param expiresIn - Time in seconds until the URL expires (default: 3600 = 1 hour)
 * @returns Presigned URL that allows temporary access to the file
 *
 * @throws Error if URL generation fails
 *
 * @example
 * const tempUrl = await getPresignedUrl('https://r2.example.com/private/video.mp4', 7200)
 * // Returns URL valid for 2 hours
 */
export async function getPresignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('R2_BUCKET_NAME environment variable is not set');
  }

  const key = fileUrl.replace(`${PUBLIC_URL}/`, '');

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Extract the R2 storage key from a full file URL
 *
 * @param fileUrl - Full public URL of the file
 * @returns Storage key (path within the bucket)
 *
 * @example
 * getKeyFromUrl('https://r2.example.com/images/photo-123.jpg')
 * // Returns: 'images/photo-123.jpg'
 */
export function getKeyFromUrl(fileUrl: string): string {
  return fileUrl.replace(`${PUBLIC_URL}/`, '');
}
