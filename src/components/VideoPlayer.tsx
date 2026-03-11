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
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState<string>('720p');
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(videoUrl);
  const [bufferedRanges, setBufferedRanges] = useState<number>(0);

  // Select best quality based on available qualities
  useEffect(() => {
    if (videoQualities && videoQualities.length > 0) {
      // Default to 720p if available, otherwise use first quality
      const quality720 = videoQualities.find((q) => q.quality === '720p');
      const selectedUrl = quality720?.url || videoQualities[0].url;
      setCurrentVideoUrl(selectedUrl);
      setSelectedQuality(quality720?.quality || videoQualities[0].quality);
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
