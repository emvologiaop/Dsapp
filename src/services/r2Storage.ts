import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

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
 */
export function generateUniqueFilename(originalName: string, prefix: string = ''): string {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  const extension = originalName.split('.').pop() || 'bin';
  return `${prefix}${timestamp}-${randomStr}.${extension}`;
}

/**
 * Upload a file to R2 storage
 */
export async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string = ''
): Promise<string> {
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
 */
export async function uploadStreamToR2(
  stream: any, // Use any to handle Node.js stream types
  filename: string,
  contentType: string,
  folder: string = ''
): Promise<string> {
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
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  // Extract key from URL
  const key = fileUrl.replace(`${PUBLIC_URL}/`, '');

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Generate a presigned URL for temporary access
 */
export async function getPresignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
  const key = fileUrl.replace(`${PUBLIC_URL}/`, '');

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get file key from URL
 */
export function getKeyFromUrl(fileUrl: string): string {
  return fileUrl.replace(`${PUBLIC_URL}/`, '');
}
