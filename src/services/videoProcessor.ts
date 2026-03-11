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
 * Generate thumbnail from video
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

    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: thumbnailFilename,
        folder: outputFolder,
        size: '720x1280',
      })
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
 * Transcode video to multiple qualities
 */
export async function transcodeVideo(
  videoPath: string,
  qualities: Array<{ name: string; width: number; height: number; bitrate: string }>,
  outputFolder: string = '/tmp/transcoded'
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
        .audioBitrate('128k')
        .format('mp4')
        .outputOptions([
          '-preset fast',
          '-movflags +faststart', // Enable streaming
          '-crf 23',
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

    // Upload original video
    const originalFilename_r2 = generateUniqueFilename(originalFilename, 'videos/original/');
    const originalUrl = await uploadToR2(videoBuffer, originalFilename_r2, 'video/mp4', '');

    // Generate thumbnail
    const thumbnailPath = await generateThumbnail(tempVideoPath);
    const thumbnailBuffer = fs.readFileSync(thumbnailPath);
    const thumbnailFilename = generateUniqueFilename('thumbnail.jpg', 'videos/thumbnails/');
    const thumbnailUrl = await uploadToR2(thumbnailBuffer, thumbnailFilename, 'image/jpeg', '');

    // Transcode to multiple qualities
    const qualities = [];
    const targetQualities = [
      { name: '360p', width: 360, height: 640, bitrate: '500k' },
      { name: '720p', width: 720, height: 1280, bitrate: '2500k' },
    ];

    // Only add 1080p if original is high enough resolution
    if (metadata.height >= 1080) {
      targetQualities.push({ name: '1080p', width: 1080, height: 1920, bitrate: '5000k' });
    }

    const transcodedVideos = await transcodeVideo(tempVideoPath, targetQualities);

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

    return {
      thumbnail: thumbnailUrl,
      qualities,
      duration: metadata.duration,
      originalUrl,
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
