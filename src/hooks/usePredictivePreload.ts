import { useEffect, useRef } from 'react';

interface Reel {
  _id: string;
  videoUrl: string;
  videoQualities?: Array<{
    quality: string;
    url: string;
    width: number;
    height: number;
  }>;
  thumbnailUrl?: string;
}

/**
 * Custom hook for predictive video preloading
 * Preloads the next 2-3 videos in the background for smooth playback
 */
export function usePredictivePreload(
  reels: Reel[],
  currentIndex: number,
  preloadCount: number = 3
) {
  const preloadedVideos = useRef<Set<string>>(new Set());
  const videoElements = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    // Preload next videos
    const startIndex = currentIndex + 1;
    const endIndex = Math.min(startIndex + preloadCount, reels.length);

    for (let i = startIndex; i < endIndex; i++) {
      const reel = reels[i];
      const videoUrl = reel.videoQualities?.[0]?.url || reel.videoUrl;

      // Skip if already preloaded or is base64 data
      if (preloadedVideos.current.has(reel._id) || videoUrl.startsWith('data:')) {
        continue;
      }

      // Create video element for preloading
      const video = document.createElement('video');
      video.src = videoUrl;
      video.preload = 'auto';
      video.muted = true;

      // Add to cache
      videoElements.current.set(reel._id, video);
      preloadedVideos.current.add(reel._id);

      // Load the video (start downloading)
      video.load();
    }

    // Cleanup: remove videos that are too far behind
    const cleanupThreshold = currentIndex - 2;
    if (cleanupThreshold > 0) {
      for (let i = 0; i < cleanupThreshold; i++) {
        const reel = reels[i];
        if (videoElements.current.has(reel._id)) {
          const video = videoElements.current.get(reel._id);
          if (video) {
            video.src = '';
            video.load();
          }
          videoElements.current.delete(reel._id);
          preloadedVideos.current.delete(reel._id);
        }
      }
    }
  }, [currentIndex, reels, preloadCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      videoElements.current.forEach((video) => {
        video.src = '';
        video.load();
      });
      videoElements.current.clear();
      preloadedVideos.current.clear();
    };
  }, []);

  return {
    isPreloaded: (reelId: string) => preloadedVideos.current.has(reelId),
    preloadedCount: preloadedVideos.current.size,
  };
}

/**
 * Custom hook for video chunk preloading
 * Simulates Instagram's 4-second chunk download strategy
 */
export function useChunkedVideoPreload(
  videoUrl: string,
  chunkDurationSeconds: number = 4
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const chunksLoaded = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!videoRef.current || videoUrl.startsWith('data:')) {
      return;
    }

    const video = videoRef.current;

    const handleTimeUpdate = () => {
      if (!video.duration) return;

      const currentTime = video.currentTime;
      const currentChunk = Math.floor(currentTime / chunkDurationSeconds);
      const nextChunk = currentChunk + 1;

      // Check if we need to preload the next chunk
      const nextChunkStartTime = nextChunk * chunkDurationSeconds;
      const shouldPreloadNext =
        nextChunkStartTime < video.duration &&
        !chunksLoaded.current.has(nextChunk);

      if (shouldPreloadNext) {
        // Mark chunk as being loaded
        chunksLoaded.current.add(nextChunk);

        // In a real implementation with HLS/DASH, you would:
        // 1. Request the specific chunk from the server
        // 2. Append it to the media source buffer
        // For standard video elements, the browser handles this automatically
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoUrl, chunkDurationSeconds]);

  return videoRef;
}

/**
 * Preload images for faster display
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
}

/**
 * Batch preload multiple images
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map((url) => preloadImage(url));
  await Promise.allSettled(promises);
}
