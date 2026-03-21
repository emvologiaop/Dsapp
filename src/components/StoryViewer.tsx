import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Send, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { SocialText } from './SocialText';
import { getStoryTimeRemaining, orderStoriesForViewer, StoryGroup } from '../utils/stories';
import { withAuthHeaders } from '../utils/clientAuth';

interface StoryViewerProps {
  groups: StoryGroup[];
  currentUserId: string;
  initialGroupUserId?: string | null;
  onClose: () => void;
  onStoriesMutated?: () => void;
}

type StoryViewerUser = {
  _id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
};

type StoryOverlay = {
  text: string;
  x: number;
  y: number;
  color: string;
  size: 'sm' | 'md' | 'lg';
  background: 'none' | 'soft' | 'solid';
};

type StoryDrawing = {
  tool: 'brush' | 'eraser';
  color: string;
  size: number;
  points: Array<{ x: number; y: number }>;
};

type StorySticker = {
  pack: 'basic' | 'reactions' | 'neon';
  value: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

const IMAGE_STORY_DURATION_MS = 5000;
const VIDEO_FALLBACK_DURATION_MS = 10000;

function getOverlayTextClass(size: StoryOverlay['size']) {
  if (size === 'sm') return 'text-sm';
  if (size === 'lg') return 'text-2xl';
  return 'text-lg';
}

function getOverlayBackgroundClass(background: StoryOverlay['background']) {
  if (background === 'solid') return 'bg-black/80';
  if (background === 'none') return 'bg-transparent';
  return 'bg-black/35 backdrop-blur-sm';
}

function getFilterClass(filter?: string) {
  if (filter === 'warm') return 'sepia-[0.2] saturate-125 hue-rotate-[-6deg]';
  if (filter === 'mono') return 'grayscale contrast-110';
  if (filter === 'dream') return 'brightness-110 saturate-125 hue-rotate-[12deg]';
  if (filter === 'boost') return 'contrast-125 saturate-150';
  return '';
}

function getCameraEffectClass(effect?: string) {
  if (effect === 'vintage') return 'sepia-[0.35] saturate-125 contrast-105';
  if (effect === 'cool') return 'hue-rotate-[16deg] saturate-110 brightness-105';
  if (effect === 'vivid') return 'contrast-125 saturate-150';
  if (effect === 'mono') return 'grayscale contrast-110';
  return '';
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  groups,
  currentUserId,
  initialGroupUserId,
  onClose,
  onStoriesMutated,
}) => {
  const initialGroupIndex = Math.max(
    0,
    groups.findIndex((group) => group.user._id === initialGroupUserId)
  );
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [deletingStory, setDeletingStory] = useState(false);
  const [viewerNotice, setViewerNotice] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [storyViewers, setStoryViewers] = useState<StoryViewerUser[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setGroupIndex(initialGroupIndex);
    setStoryIndex(0);
  }, [initialGroupIndex, initialGroupUserId]);

  const activeGroup = groups[groupIndex] || null;
  const orderedStories = useMemo(
    () => orderStoriesForViewer(activeGroup?.stories || []),
    [activeGroup]
  );
  const activeStory = orderedStories[storyIndex] || null;
  const isOwnStory = activeGroup?.user?._id === currentUserId;
  const mediaUrl = activeStory?.mediaUrl || activeStory?.thumbnailUrl || '';
  const isVideo =
    (activeStory?.mediaType || '').toLowerCase() === 'video' ||
    String(mediaUrl || '').toLowerCase().includes('.mp4');
  const activeDurationMs = isVideo
    ? videoDurationMs || Math.max(Number(activeStory?.duration || 0) * 1000, VIDEO_FALLBACK_DURATION_MS)
    : IMAGE_STORY_DURATION_MS;

  useEffect(() => {
    setStoryIndex(0);
  }, [groupIndex]);

  useEffect(() => {
    setElapsedMs(0);
    setReplyText('');
    setViewerNotice(null);
    setVideoDurationMs(null);
    setIsPaused(false);
    setDragOffsetY(0);
    setStoryViewers([]);
  }, [activeStory?._id]);

  useEffect(() => {
    if (!videoRef.current || !isVideo) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPaused, isVideo, activeStory?._id]);

  useEffect(() => {
    if (!activeStory?._id || isOwnStory) return;

    fetch(`/api/stories/${activeStory._id}/view`, {
      method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ userId: currentUserId }),
    }).catch((error) => {
      console.error('Failed to mark story viewed:', error);
    });
  }, [activeStory?._id, currentUserId, isOwnStory]);

  const goToPrevious = () => {
    if (!activeGroup) return;
    if (storyIndex > 0) {
      setStoryIndex((current) => current - 1);
      return;
    }
    if (groupIndex > 0) {
      const previousGroupStories = orderStoriesForViewer(groups[groupIndex - 1]?.stories || []);
      setGroupIndex((current) => current - 1);
      setStoryIndex(Math.max(previousGroupStories.length - 1, 0));
      return;
    }
    onClose();
  };

  const goToNext = () => {
    if (!activeGroup) return;
    if (storyIndex < orderedStories.length - 1) {
      setStoryIndex((current) => current + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((current) => current + 1);
      setStoryIndex(0);
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!activeStory) return;
    if (isPaused) return;

    const interval = window.setInterval(() => {
      setElapsedMs((current) => {
        const next = current + 50;
        if (next >= activeDurationMs) {
          window.clearInterval(interval);
          goToNext();
          return activeDurationMs;
        }
        return next;
      });
    }, 50);

    return () => window.clearInterval(interval);
  }, [activeStory?._id, activeDurationMs, groupIndex, storyIndex, isPaused]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goToPrevious();
      if (event.key === 'ArrowRight') goToNext();
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => {
    if (!isOwnStory || !activeStory?._id) return;

    setLoadingViewers(true);
    fetch(`/api/stories/${activeStory._id}/viewers?userId=${encodeURIComponent(currentUserId)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Failed to load viewers')))
      .then((data) => setStoryViewers(Array.isArray(data?.viewers) ? data.viewers : []))
      .catch((error) => {
        console.error('Failed to fetch story viewers:', error);
      })
      .finally(() => setLoadingViewers(false));
  }, [activeStory?._id, currentUserId, isOwnStory]);

  const handleReply = async () => {
    const message = replyText.trim();
    if (!activeStory || !activeGroup || !message || sendingReply || isOwnStory) return;

    setSendingReply(true);
    setViewerNotice(null);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: activeGroup.user._id,
          text: `Reply to your story: ${message}`,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send story reply');
      }

      setReplyText('');
      setViewerNotice('Reply sent.');
    } catch (error) {
      console.error('Failed to send story reply:', error);
      setViewerNotice(error instanceof Error ? error.message : 'Failed to send story reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!activeStory?._id || !isOwnStory || deletingStory) return;

    setDeletingStory(true);
    try {
      const response = await fetch(`/api/stories/${activeStory._id}?userId=${encodeURIComponent(currentUserId)}`, {
        method: 'DELETE',
        headers: withAuthHeaders(),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete story');
      }

      onStoriesMutated?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete story:', error);
      setViewerNotice(error instanceof Error ? error.message : 'Failed to delete story');
    } finally {
      setDeletingStory(false);
    }
  };

  const clearHoldTimeout = () => {
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  const handlePressStart = () => {
    clearHoldTimeout();
    holdTimeoutRef.current = window.setTimeout(() => {
      setIsPaused(true);
    }, 180);
  };

  const handlePressEnd = () => {
    clearHoldTimeout();
    setIsPaused(false);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    handlePressStart();
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start) return;
    const touch = event.touches[0];
    const deltaY = touch.clientY - start.y;
    if (deltaY > 0) {
      setDragOffsetY(deltaY);
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    handlePressEnd();
    if (!start) return;
    const touch = event.changedTouches[0];
    const deltaY = touch.clientY - start.y;
    touchStartRef.current = null;
    if (deltaY > 120) {
      onClose();
      return;
    }
    setDragOffsetY(0);
  };

  if (!activeGroup || !activeStory) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
      style={{ transform: dragOffsetY ? `translateY(${dragOffsetY}px)` : undefined, transition: dragOffsetY ? 'none' : 'transform 180ms ease' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_36%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.08),transparent_30%)]" />

      <div className="relative z-10 flex items-center gap-2 px-3 pb-3 pt-4">
        {orderedStories.map((story, index) => {
          const progress =
            index < storyIndex ? 100 : index > storyIndex ? 0 : Math.min((elapsedMs / activeDurationMs) * 100, 100);
          return (
            <div key={story._id || `${activeGroup.user._id}_${index}`} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-[width] duration-75" style={{ width: `${progress}%` }} />
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-white/60">
            {activeGroup.user.avatarUrl ? (
              <img src={activeGroup.user.avatarUrl} alt={activeGroup.user.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/10 text-sm font-bold">
                {activeGroup.user.name?.[0] || 'U'}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{activeGroup.user.username || activeGroup.user.name}</p>
            <p className="truncate text-xs text-white/70">
              {getStoryTimeRemaining(activeStory.expiresAt)}
              {' • Mutuals only'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isVideo && (
            <button
              type="button"
              onClick={() => setIsMuted((current) => !current)}
              className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
              aria-label={isMuted ? 'Unmute story' : 'Mute story'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
          {isOwnStory && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletingStory}
              className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20 disabled:opacity-60"
              aria-label="Delete story"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
            aria-label="Close story viewer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        className="relative z-10 flex flex-1 items-center justify-center px-4 pb-6 pt-2"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={goToPrevious}
          className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-pointer"
          aria-label="Previous story"
        />
        <div className="relative flex h-full w-full max-w-md items-center justify-center overflow-hidden rounded-[34px] bg-white/6 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] ring-1 ring-white/15">
          {isVideo ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className={`h-full w-full object-cover ${getFilterClass(activeStory.visualFilter)} ${getCameraEffectClass(activeStory.cameraEffect)}`}
              autoPlay
              playsInline
              muted={isMuted}
              onLoadedMetadata={(event) => {
                const durationSeconds = Number(event.currentTarget.duration);
                if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
                  setVideoDurationMs(durationSeconds * 1000);
                }
              }}
            />
          ) : (
            <img src={mediaUrl} alt={activeStory.caption || 'Story'} className={`h-full w-full object-cover ${getFilterClass(activeStory.visualFilter)} ${getCameraEffectClass(activeStory.cameraEffect)}`} />
          )}

          <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {(activeStory.drawings || []).map((path: StoryDrawing, index: number) => (
              <polyline
                key={`${activeStory._id || 'story'}_drawing_${index}`}
                points={(path.points || []).map((point) => `${point.x},${point.y}`).join(' ')}
                fill="none"
                stroke={path.tool === 'eraser' ? '#000000' : path.color}
                strokeWidth={Math.max(0.6, (Number(path.size) || 3) / 3)}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity={path.tool === 'eraser' ? 0.45 : 1}
              />
            ))}
          </svg>

          {(activeStory.stickers || []).map((sticker: StorySticker, index: number) => (
            <div
              key={`${activeStory._id || 'story'}_sticker_${index}`}
              className="pointer-events-none absolute left-0 top-0 z-20 -translate-x-1/2 -translate-y-1/2 text-3xl"
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                transform: `translate(-50%, -50%) scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
              }}
            >
              {sticker.value}
            </div>
          ))}

          {(activeStory.overlayTexts || []).map((overlay: StoryOverlay, index: number) => (
            <div
              key={`${activeStory._id || 'story'}_overlay_${index}`}
              className={`absolute left-0 top-0 z-10 max-w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-3 py-2 font-semibold leading-tight text-white shadow-[0_14px_30px_-16px_rgba(0,0,0,0.85)] ${getOverlayTextClass(overlay.size)} ${getOverlayBackgroundClass(overlay.background)}`}
              style={{ left: `${overlay.x}%`, top: `${overlay.y}%`, color: overlay.color }}
            >
              {overlay.text}
            </div>
          ))}

          {activeStory.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-5 pt-16">
              <SocialText
                text={activeStory.caption}
                className="text-sm leading-6 text-white/95"
                hashtagClassName="text-white font-semibold hover:underline"
                mentionClassName="text-white font-semibold hover:underline"
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={goToNext}
          className="absolute inset-y-0 right-0 z-10 w-1/3 cursor-pointer"
          aria-label="Next story"
        />
      </div>

      <div className="relative z-10 px-4 pb-5">
        {viewerNotice && (
          <div className="mb-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/90">
            {viewerNotice}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-xs text-white/65">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
            <span>{groupIndex + 1}/{groups.length}</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>{storyIndex + 1}/{orderedStories.length}</span>
          </div>
          {isOwnStory ? (
            <div className="rounded-full bg-white/10 px-3 py-2">
              {activeStory.views?.length || 0} views
            </div>
          ) : null}
        </div>

        {isOwnStory && (
          <div className="mt-3 rounded-[24px] border border-white/12 bg-white/8 p-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Story activity</p>
                <p className="text-xs text-white/55">People who viewed this story.</p>
              </div>
              {loadingViewers ? <span className="text-xs text-white/55">Loading...</span> : null}
            </div>
            {storyViewers.length === 0 ? (
              <p className="text-sm text-white/60">No viewers yet.</p>
            ) : (
              <div className="flex max-h-36 flex-col gap-2 overflow-y-auto pr-1">
                {storyViewers.map((viewer) => (
                  <div key={viewer._id} className="flex items-center gap-3 rounded-2xl bg-white/6 px-3 py-2">
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-white/10">
                      {viewer.avatarUrl ? (
                        <img src={viewer.avatarUrl} alt={viewer.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold">
                          {viewer.name?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{viewer.username || viewer.name}</p>
                      <p className="truncate text-xs text-white/55">{viewer.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isOwnStory && (
          <div className="mt-3 flex items-center gap-3 rounded-full border border-white/15 bg-white/8 px-4 py-2 backdrop-blur">
            <input
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleReply();
                }
              }}
              placeholder={`Reply to @${activeGroup.user.username || 'story'}...`}
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45"
            />
            <button
              type="button"
              onClick={handleReply}
              disabled={sendingReply || !replyText.trim()}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-all',
                sendingReply || !replyText.trim() ? 'opacity-40' : 'hover:scale-105'
              )}
              aria-label="Send story reply"
            >
              <Send size={16} />
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 text-white/55">
          <button
            type="button"
            onClick={goToPrevious}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-white/15"
          >
            <ChevronLeft size={14} />
            Previous
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-white/15"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
