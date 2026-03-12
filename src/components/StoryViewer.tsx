import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Send, MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Story {
  _id: string;
  userId: {
    _id: string;
    name: string;
    username: string;
    avatarUrl?: string;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  duration?: number;
  views: string[];
  expiresAt: string;
  createdAt: string;
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  currentUserId: string;
  onClose: () => void;
  onStoryChange?: (index: number) => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  initialIndex = 0,
  currentUserId,
  onClose,
  onStoryChange
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory?.userId._id === currentUserId;
  const duration = currentStory?.mediaType === 'video' ? (currentStory.duration || 15) : 5; // 5 seconds for images, video duration for videos

  useEffect(() => {
    if (!currentStory) return;

    // Mark story as viewed
    const markAsViewed = async () => {
      try {
        await fetch(`/api/stories/${currentStory._id}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId })
        });
      } catch (error) {
        console.error('Failed to mark story as viewed:', error);
      }
    };

    markAsViewed();
  }, [currentStory?._id, currentUserId]);

  useEffect(() => {
    if (isPaused) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      return;
    }

    setProgress(0);
    const startTime = Date.now();
    const durationMs = duration * 1000;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / durationMs) * 100;

      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
      }
    }, 50);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentIndex, isPaused, duration]);

  useEffect(() => {
    if (onStoryChange) {
      onStoryChange(currentIndex);
    }
  }, [currentIndex, onStoryChange]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/stories/${currentStory._id}?userId=${currentUserId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        if (stories.length === 1) {
          onClose();
        } else if (currentIndex === stories.length - 1) {
          handlePrevious();
        } else {
          handleNext();
        }
      }
    } catch (error) {
      console.error('Failed to delete story:', error);
    }
    setShowOptions(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  if (!currentStory) return null;

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Previous/Next clickable areas */}
      <div className="absolute inset-0 flex">
        <div
          className="w-1/3 h-full cursor-pointer"
          onClick={handlePrevious}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        />
        <div className="w-1/3 h-full" />
        <div
          className="w-1/3 h-full cursor-pointer"
          onClick={handleNext}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        />
      </div>

      {/* Story content container */}
      <div className="relative w-full max-w-md h-full max-h-[calc(100vh-2rem)] bg-black rounded-lg overflow-hidden">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
          {stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className={cn(
                  'h-full bg-white transition-all duration-100',
                  index < currentIndex && 'w-full',
                  index === currentIndex && `w-[${progress}%]`,
                  index > currentIndex && 'w-0'
                )}
                style={{
                  width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 z-20 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white bg-muted flex items-center justify-center overflow-hidden">
              {currentStory.userId.avatarUrl ? (
                <img
                  src={currentStory.userId.avatarUrl}
                  alt={currentStory.userId.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold">
                  {currentStory.userId.name[0]}
                </span>
              )}
            </div>
            <div className="text-white">
              <p className="font-semibold text-sm">{currentStory.userId.username}</p>
              <p className="text-xs opacity-80">{timeAgo(currentStory.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwnStory && (
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Options menu */}
        <AnimatePresence>
          {showOptions && isOwnStory && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 right-4 z-30 bg-background rounded-lg shadow-lg border border-border overflow-hidden"
            >
              <button
                onClick={handleDelete}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors w-full text-left text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Delete Story</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story media */}
        <div className="w-full h-full flex items-center justify-center bg-black">
          {currentStory.mediaType === 'image' ? (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="max-w-full max-h-full object-contain"
              autoPlay
              muted
              playsInline
              onEnded={handleNext}
            />
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-20 left-0 right-0 px-4 z-20">
            <p className="text-white text-sm text-center bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Navigation arrows for desktop */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrevious}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {currentIndex < stories.length - 1 && (
          <button
            onClick={handleNext}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Views count for own story */}
        {isOwnStory && (
          <div className="absolute bottom-4 left-4 z-20">
            <p className="text-white text-sm flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="font-bold">{currentStory.views.length}</span>
              <span>views</span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
