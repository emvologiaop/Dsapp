import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import { uploadToR2, generateUniqueFilename } from './r2Storage.js';

let ffmpegInstalled = false;
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  ffmpegInstalled = true;
} catch (e) {
  console.warn("ffmpeg not detected! Video transcoding and thumbnail generation will be skipped.");
}

const TEMP_ROOT = path.join(os.tmpdir(), 'dsu-media');

/**
 * Result of video processing including thumbnail and multiple quality versions
 */
export interface VideoProcessingResult {
  thumbnail: string;
  qualities: {
    quality: string;
    url: string;
    width: number;
    height: number;
  }[];
  duration: number;
  originalUrl: string;
}

/**
 * Generate thumbnail from video with optimized compression
 *
 * @param videoPath - Path to the video file on disk
 * @param outputFolder - Directory to save the thumbnail (default: '/tmp/thumbnails')
 * @returns Path to the generated thumbnail file
 *
 * @throws Error if thumbnail generation fails
 *
 * @remarks
 * - Takes screenshot at 1 second mark
 * - Outputs 360x640 resolution to reduce storage costs
 * - Uses JPEG quality 5 for high compression
 */
export async function generateThumbnail(
  videoPath: string,
  outputFolder: string = path.join(TEMP_ROOT, 'thumbnails')
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create output folder if it doesn't exist
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const thumbnailFilename = `thumb-${Date.now()}.jpg`;
    const thumbnailPath = path.join(outputFolder, thumbnailFilename);

    // Reduced size for free tier: 360x640 instead of 720x1280
    // Higher compression with quality setting
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: thumbnailFilename,
        folder: outputFolder,
        size: '360x640',
      })
      .outputOptions(['-q:v 5']) // JPEG quality 5 (higher number = lower quality, range 2-31)
      .on('end', () => resolve(thumbnailPath))
      .on('error', (err) => reject(err));
  });
}

/**
 * Get video metadata (duration, dimensions)
 *
 * @param videoPath - Path to the video file on disk
 * @returns Object containing duration (seconds), width, and height
 *
 * @throws Error if video metadata cannot be read or video has no video stream
 */
export async function getVideoMetadata(videoPath: string): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found'));

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 720,
        height: videoStream.height || 1280,
      });
    });
  });
}

/**
 * Transcode video to multiple qualities with conservative single-pass encoding
 * tuned for portability across Windows/Linux dev environments.
 *
 * @param videoPath - Path to the input video file
 * @param qualities - Array of quality settings (name, dimensions, bitrate, CRF)
 * @param outputFolder - Directory to save transcoded files (default: '/tmp/transcoded')
 * @returns Array of transcoded video info (quality, path, dimensions)
 *
 * @throws Error if transcoding fails
 *
 * @remarks
 * Settings optimized for free tier:
 * - Preset: slow (better compression)
 * - Audio bitrate: 64k (reduced from 128k)
 * - H.264 codec with yuv420p pixel format for compatibility
 */
export async function transcodeVideo(
  videoPath: string,
  qualities: Array<{ name: string; width: number; height: number; bitrate: string; crf: number }>,
  outputFolder: string = path.join(TEMP_ROOT, 'transcoded')
): Promise<Array<{ quality: string; path: string; width: number; height: number }>> {
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const results = [];

  for (const quality of qualities) {
    const outputFilename = `${quality.name}-${Date.now()}.mp4`;
    const outputPath = path.join(outputFolder, outputFilename);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .size(`${quality.width}x${quality.height}`)
        .videoBitrate(quality.bitrate)
        .audioBitrate('64k')
        .audioCodec('aac')
        .videoCodec('libx264')
        .format('mp4')
        .outputOptions([
          '-preset slow',
          '-crf ' + quality.crf,
          '-movflags +faststart',
          '-profile:v main',
          '-level 3.1',
          '-pix_fmt yuv420p',
          '-g 48',
          '-sc_threshold 0',
          '-b_strategy 2',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    results.push({
      quality: quality.name,
      path: outputPath,
      width: quality.width,
      height: quality.height,
    });
  }

  return results;
}

/**
 * Process video: generate thumbnail and transcode to multiple qualities
 * Optimized for Cloudflare R2 free tier - uses lower quality settings and removes original upload
 *
 * @param videoBuffer - Video file content as Buffer
 * @param originalFilename - Original filename (used to extract extension)
 * @returns VideoProcessingResult with thumbnail URL, quality URLs, duration
 *
 * @throws Error if video exceeds 60 seconds or if processing fails
 *
 * @remarks
 * Processing steps:
 * 1. Save video to temp folder
 * 2. Extract metadata and validate duration (max 60 seconds)
 * 3. Generate thumbnail (360x640 JPEG)
 * 4. Transcode to 360p and 540p (no 1080p to save storage)
 * 5. Upload all files to R2 storage
 * 6. Clean up all temporary files (using finally block)
 *
 * Free tier optimizations:
 * - 60 second duration limit
 * - Only 360p and 540p qualities
 * - Aggressive compression settings
 * - No original video upload (uses best quality instead)
 */
export async function processVideo(
  videoBuffer: Buffer,
  originalFilename: string
): Promise<VideoProcessingResult> {
  const tempFolder = path.join(TEMP_ROOT, 'video-processing');
  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }

  // Save original video temporarily
  const tempVideoPath = path.join(tempFolder, `original-${Date.now()}-${originalFilename}`);
  let thumbnailPath: string | null = null;
  const transcodedPaths: string[] = [];

  try {
    fs.writeFileSync(tempVideoPath, videoBuffer);

    if (!ffmpegInstalled) {
      console.log('Skipping transcoding (ffmpeg not installed), uploading original video directly.');
      const videoFilename = generateUniqueFilename('video.mp4', 'videos/original/');
      const videoUrl = await uploadToR2(videoBuffer, videoFilename, 'video/mp4', '');
      return {
        thumbnail: '',
        qualities: [{ quality: 'Original', url: videoUrl, width: 720, height: 1280 }],
        duration: 0,
        originalUrl: videoUrl,
      };
    }

    // Get video metadata
    const metadata = await getVideoMetadata(tempVideoPath);

    // Enforce 60 second limit for free tier
    if (metadata.duration > 60) {
      throw new Error('Video duration exceeds 60 seconds. Please upload a shorter video.');
    }

    // Generate thumbnail with aggressive compression
    thumbnailPath = await generateThumbnail(tempVideoPath);
    const thumbnailBuffer = fs.readFileSync(thumbnailPath);
    const thumbnailFilename = generateUniqueFilename('thumbnail.jpg', 'videos/thumbnails/');
    const thumbnailUrl = await uploadToR2(thumbnailBuffer, thumbnailFilename, 'image/jpeg', '');

    // Transcode to multiple qualities with optimized settings for free tier
    const qualities = [];
    const targetQualities = [
      { name: '360p', width: 360, height: 640, bitrate: '400k', crf: 28 }, // Lower bitrate and higher CRF
      { name: '540p', width: 540, height: 960, bitrate: '800k', crf: 26 }, // New mid-tier instead of 720p
    ];

    // Remove 1080p entirely for free tier - too expensive
    // Only transcode to qualities the video can support
    const filteredQualities = targetQualities.filter(q => metadata.height >= q.height);

    // If no qualities match, use the lowest one
    if (filteredQualities.length === 0) {
      filteredQualities.push(targetQualities[0]);
    }

    const transcodedVideos = await transcodeVideo(tempVideoPath, filteredQualities);

    // Upload transcoded videos to R2
    for (const video of transcodedVideos) {
      transcodedPaths.push(video.path);
      const videoBuffer = fs.readFileSync(video.path);
      const videoFilename = generateUniqueFilename(`${video.quality}.mp4`, 'videos/');
      const videoUrl = await uploadToR2(videoBuffer, videoFilename, 'video/mp4', '');

      qualities.push({
        quality: video.quality,
        url: videoUrl,
        width: video.width,
        height: video.height,
      });
    }

    // Use the first transcoded quality as the default URL
    // Don't upload original to save storage on free tier
    const originalUrl = qualities[0]?.url || '';

    return {
      thumbnail: thumbnailUrl,
      qualities,
      duration: metadata.duration,
      originalUrl, // Actually points to best quality, not original
    };
  } catch (error) {
    throw error;
  } finally {
    // Clean up all temporary files
    cleanupTempFile(tempVideoPath);
    if (thumbnailPath) {
      cleanupTempFile(thumbnailPath);
    }
    transcodedPaths.forEach(cleanupTempFile);
  }
}

/**
 * Helper function to safely delete a temporary file
 * Catches and logs errors to prevent cleanup failures from breaking the app
 *
 * @param filePath - Path to the file to delete
 */
function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to clean up temporary file ${filePath}:`, error);
  }
}


/**
 * Process image: optimize and upload
 *
 * @param imageBuffer - Image file content as Buffer
 * @param originalFilename - Original filename (used for generating unique name)
 * @returns Public URL of the uploaded image
 *
 * @throws Error if upload fails
 */
export async function processImage(
  imageBuffer: Buffer,
  originalFilename: string
): Promise<string> {
  const filename = generateUniqueFilename(originalFilename, 'images/');
  return await uploadToR2(imageBuffer, filename, 'image/jpeg', '');
}
