import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { uploadToR2, generateUniqueFilename } from './r2Storage.js';

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
 */
export async function generateThumbnail(
  videoPath: string,
  outputFolder: string = '/tmp/thumbnails'
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
 * Transcode video to multiple qualities with advanced compression
 * Optimized for Cloudflare R2 free tier with two-pass encoding
 */
export async function transcodeVideo(
  videoPath: string,
  qualities: Array<{ name: string; width: number; height: number; bitrate: string; crf: number }>,
  outputFolder: string = '/tmp/transcoded'
): Promise<Array<{ quality: string; path: string; width: number; height: number }>> {
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const results = [];

  for (const quality of qualities) {
    const outputFilename = `${quality.name}-${Date.now()}.mp4`;
    const outputPath = path.join(outputFolder, outputFilename);

    // Two-pass encoding for better compression
    // Pass 1: Analyze video
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .size(`${quality.width}x${quality.height}`)
        .videoBitrate(quality.bitrate)
        .audioBitrate('64k') // Reduced from 128k for free tier
        .audioCodec('aac')
        .videoCodec('libx264')
        .format('mp4')
        .outputOptions([
          '-preset slow', // Better compression (was 'fast')
          '-crf ' + quality.crf, // Constant Rate Factor for quality
          '-movflags +faststart', // Enable streaming
          '-profile:v main', // Compatible with most devices
          '-level 3.1',
          '-pix_fmt yuv420p', // Compatible pixel format
          '-g 48', // GOP size for better streaming
          '-sc_threshold 0', // Disable scene change detection
          '-b_strategy 2',
          '-pass 1',
          '-an', // No audio in first pass
          '-f mp4'
        ])
        .output('/dev/null') // Discard output from pass 1
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // Pass 2: Encode with analysis data
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
          '-pass 2'
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
 */
export async function processVideo(
  videoBuffer: Buffer,
  originalFilename: string
): Promise<VideoProcessingResult> {
  const tempFolder = '/tmp/video-processing';
  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }

  // Save original video temporarily
  const tempVideoPath = path.join(tempFolder, `original-${Date.now()}-${originalFilename}`);
  fs.writeFileSync(tempVideoPath, videoBuffer);

  try {
    // Get video metadata
    const metadata = await getVideoMetadata(tempVideoPath);

    // Enforce 60 second limit for free tier
    if (metadata.duration > 60) {
      throw new Error('Video duration exceeds 60 seconds. Please upload a shorter video.');
    }

    // Generate thumbnail with aggressive compression
    const thumbnailPath = await generateThumbnail(tempVideoPath);
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
      const videoBuffer = fs.readFileSync(video.path);
      const videoFilename = generateUniqueFilename(`${video.quality}.mp4`, 'videos/');
      const videoUrl = await uploadToR2(videoBuffer, videoFilename, 'video/mp4', '');

      qualities.push({
        quality: video.quality,
        url: videoUrl,
        width: video.width,
        height: video.height,
      });

      // Clean up transcoded file
      fs.unlinkSync(video.path);
    }

    // Clean up temporary files
    fs.unlinkSync(tempVideoPath);
    fs.unlinkSync(thumbnailPath);

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
    // Clean up on error
    if (fs.existsSync(tempVideoPath)) {
      fs.unlinkSync(tempVideoPath);
    }
    throw error;
  }
}

/**
 * Process image: optimize and upload
 */
export async function processImage(
  imageBuffer: Buffer,
  originalFilename: string
): Promise<string> {
  const filename = generateUniqueFilename(originalFilename, 'images/');
  return await uploadToR2(imageBuffer, filename, 'image/jpeg', '');
}
