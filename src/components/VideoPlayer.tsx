import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface VideoQuality {
  quality: string;
  url: string;
  width: number;
  height: number;
}

interface VideoPlayerProps {
  videoQualities?: VideoQuality[];
  videoUrl: string;
  thumbnailUrl?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
  preloadNext?: () => void; // Callback to preload next video
  reelId?: string; // For view tracking
  userId?: string; // For view tracking
  duration?: number; // Video duration for tracking
}

export function VideoPlayer({
  videoQualities,
  videoUrl,
  thumbnailUrl,
  autoPlay = false,
  muted = true,
  loop = true,
  onEnded,
  onTimeUpdate,
  className = '',
  preloadNext,
  reelId,
  userId,
  duration,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState<string>('540p'); // Changed default to 540p
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(videoUrl);
  const [bufferedRanges, setBufferedRanges] = useState<number>(0);
  const [watchStartTime, setWatchStartTime] = useState<number>(0);
  const [totalWatchTime, setTotalWatchTime] = useState<number>(0);
  const viewRecordedRef = useRef<boolean>(false);

  // Record video view
  const recordView = async (watchDuration: number) => {
    if (!reelId || !userId || !duration) return;

    try {
      await fetch(`/api/reels/${reelId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          watchDuration,
          totalDuration: duration,
        }),
      });
    } catch (error) {
      console.error('Failed to record view:', error);
    }
  };

  // Select best quality based on available qualities
  useEffect(() => {
    if (videoQualities && videoQualities.length > 0) {
      // Default to 540p if available, fallback to 360p or first quality
      const quality540 = videoQualities.find((q) => q.quality === '540p');
      const quality360 = videoQualities.find((q) => q.quality === '360p');
      const selectedUrl = quality540?.url || quality360?.url || videoQualities[0].url;
      setCurrentVideoUrl(selectedUrl);
      setSelectedQuality(quality540?.quality || quality360?.quality || videoQualities[0].quality);
    } else {
      setCurrentVideoUrl(videoUrl);
    }
  }, [videoQualities, videoUrl]);

  // Handle video loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const buffered = video.buffered.end(video.buffered.length - 1);
        setBufferedRanges(buffered);
      }
    };

    const handleTimeUpdate = () => {
      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime);
      }

      // Track watch time
      if (video.currentTime > watchStartTime) {
        setTotalWatchTime(prev => prev + (video.currentTime - watchStartTime));
      }
      setWatchStartTime(video.currentTime);

      // Record view when 50% watched (and not already recorded)
      if (reelId && userId && duration && !viewRecordedRef.current) {
        const watchPercentage = (video.currentTime / duration) * 100;
        if (watchPercentage >= 50) {
          recordView(video.currentTime);
          viewRecordedRef.current = true;
        }
      }

      // Predictive preloading: when 80% of video is played, preload next
      if (preloadNext && video.duration > 0) {
        const progress = video.currentTime / video.duration;
        if (progress > 0.8) {
          preloadNext();
        }
      }
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('timeupdate', handleTimeUpdate);

    if (onEnded) {
      video.addEventListener('ended', onEnded);
    }

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      if (onEnded) {
        video.removeEventListener('ended', onEnded);
      }
    };
  }, [onEnded, onTimeUpdate, preloadNext]);

  // Change quality
  const handleQualityChange = (quality: string) => {
    const selectedQualityData = videoQualities?.find((q) => q.quality === quality);
    if (selectedQualityData && videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      setCurrentVideoUrl(selectedQualityData.url);
      setSelectedQuality(quality);

      // Resume playback at the same position
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = currentTime;
          videoRef.current.play();
        }
      }, 100);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Thumbnail shown while loading */}
      {isLoading && thumbnailUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center z-10"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
        >
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        src={currentVideoUrl}
        className="w-full h-full object-cover"
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        preload="auto"
        poster={thumbnailUrl}
      />

      {/* Quality selector */}
      {videoQualities && videoQualities.length > 1 && (
        <div className="absolute top-4 right-4 z-20">
          <select
            value={selectedQuality}
            onChange={(e) => handleQualityChange(e.target.value)}
            className="bg-black/60 text-white text-sm px-2 py-1 rounded border border-white/20 backdrop-blur-sm"
          >
            {videoQualities.map((q) => (
              <option key={q.quality} value={q.quality}>
                {q.quality}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Buffer indicator (optional) */}
      {isLoading && !thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}
