import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share2, Plus, Upload, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ReelCommentsPanel } from './ReelCommentsPanel';
import { ShareModal } from './ShareModal';
import { simpleVideoCompress } from '../utils/videoCompression';
import { uploadVideoToR2, UploadProgress } from '../utils/r2Upload';
import { usePredictivePreload } from '../hooks/usePredictivePreload';
import { VideoPlayer } from './VideoPlayer';
import { ReelOptions } from './ReelOptions';
import { HashtagText } from './HashtagText';

interface VideoQuality {
  quality: string;
  url: string;
  width: number;
  height: number;
}

interface Reel {
  _id: string;
  userId: { _id: string; name: string; username: string } | null;
  videoUrl: string;
  videoQualities?: VideoQuality[];
  thumbnailUrl?: string;
  duration?: number;
  caption: string;
  isAnonymous: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  createdAt: string;
}

interface ReelsTabProps {
  user: any;
  onViewProfile?: (userId?: string | null) => void;
  onHashtagClick?: (hashtag: string) => void;
}

export const ReelsTab: React.FC<ReelsTabProps> = ({ user, onViewProfile, onHashtagClick }) => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useR2Upload, setUseR2Upload] = useState(true); // Toggle for R2 vs base64
  const videoRef = useRef<HTMLVideoElement>(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-200, 0, 200], [0.5, 1, 0.5]);

  // Predictive preloading for next reels
  const { isPreloaded } = usePredictivePreload(reels, currentIndex, 3);

  useEffect(() => {
    fetchReels();
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex]);

  // Update progress bar
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setPlaybackProgress(progress || 0);
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, [currentIndex]);

  const fetchReels = async () => {
    try {
      const res = await fetch(`/api/reels?userId=${user?.id || ''}`);
      if (res.ok) {
        const data = await res.json();
        setReels(data);
        const liked = new Set(data.filter((r: Reel) => r.isLiked).map((r: Reel) => r._id));
        setLikedReels(liked as Set<string>);
      }
    } catch (error) {
      console.error('Failed to fetch reels:', error);
    }
  };

  const handleLike = async (reelId: string) => {
    const alreadyLiked = likedReels.has(reelId);
    setLikedReels((prev) => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(reelId) : next.add(reelId);
      return next;
    });
    setReels((prev) =>
      prev.map((r) =>
        r._id === reelId ? { ...r, likesCount: alreadyLiked ? r.likesCount - 1 : r.likesCount + 1 } : r
      )
    );
    try {
      await fetch(`/api/reels/${reelId}/like`, {
        method: alreadyLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
    } catch (error) {
      console.error('Failed to like reel:', error);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.y < -threshold && currentIndex < reels.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setPlaybackProgress(0);
      y.set(0);
    } else if (info.offset.y > threshold && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setPlaybackProgress(0);
      y.set(0);
    } else {
      y.set(0);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      if (useR2Upload) {
        // Upload to R2 with processing (transcoding, thumbnail generation)
        await uploadVideoToR2(
          uploadFile,
          user?.id,
          uploadCaption,
          false,
          (progress: UploadProgress) => {
            setUploadProgress(progress.percentage);
          }
        );

        setUploadProgress(100);
      } else {
        // Legacy: Compress and upload as base64
        setUploadProgress(30);
        const compressedData = await simpleVideoCompress(uploadFile, 10);
        setUploadProgress(70);

        const res = await fetch('/api/reels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            caption: uploadCaption,
            videoData: compressedData,
            isAnonymous: false,
          }),
        });

        setUploadProgress(100);

        if (!res.ok) {
          throw new Error('Upload failed');
        }
      }

      // Reset and refresh
      setShowUpload(false);
      setUploadCaption('');
      setUploadFile(null);
      setUploadProgress(0);
      fetchReels();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const currentReel = reels[currentIndex];

  if (showUpload) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Upload Reel</h2>
          <button onClick={() => setShowUpload(false)} className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <div
              className={cn(
                'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
                uploadFile
                  ? 'border-primary bg-gradient-to-br from-primary/10 to-accent/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {uploadFile ? (
                <div className="space-y-2">
                  <p className="font-medium text-primary">{uploadFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p className="text-xs text-accent">Ready for compression</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                    <Upload size={32} className="text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Tap to select a video</p>
                  <p className="text-xs text-muted-foreground">Will be automatically compressed</p>
                </div>
              )}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
          </label>

          <textarea
            value={uploadCaption}
            onChange={(e) => setUploadCaption(e.target.value)}
            placeholder="Add a caption..."
            className="w-full bg-muted border border-border rounded-xl p-4 text-sm outline-none focus:border-primary transition-colors resize-none h-20"
          />

          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {uploadProgress < 100 ? (useR2Upload ? 'Uploading to R2...' : 'Compressing & uploading...') : 'Complete!'}
                </span>
                <span className="font-bold text-primary">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!uploadFile || isUploading}
            className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 hover:shadow-lg flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing...
              </>
            ) : (
              'Post Reel'
            )}
          </button>
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
          <Play size={40} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tighter">DDU Reels</h2>
        <p className="text-muted-foreground max-w-xs text-sm">No reels yet. Be the first to share a video!</p>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl transition-all active:scale-95"
        >
          <Plus size={18} />
          Upload Reel
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Reels</h2>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl text-sm transition-all active:scale-95 hover:shadow-lg"
        >
          <Plus size={16} />
          Upload
        </button>
      </div>

      <motion.div
        className="relative rounded-3xl overflow-hidden bg-black shadow-2xl"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ y, opacity, aspectRatio: '9/16', maxHeight: '70vh' }}
      >
        {/* Unique gradient progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent z-20">
          <div
            className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-100"
            style={{ width: `${playbackProgress}%` }}
          />
        </div>

        <VideoPlayer
          videoQualities={currentReel?.videoQualities}
          videoUrl={currentReel?.videoUrl}
          thumbnailUrl={currentReel?.thumbnailUrl}
          autoPlay={isPlaying}
          muted={isMuted}
          loop={true}
          onEnded={() => {
            // Auto advance to next reel
            if (currentIndex < reels.length - 1) {
              setCurrentIndex(currentIndex + 1);
            }
          }}
          onTimeUpdate={(time) => {
            if (videoRef.current) {
              const progress = (time / videoRef.current.duration) * 100;
              setPlaybackProgress(progress || 0);
            }
          }}
          preloadNext={() => {
            // Predictive preload triggered at 80% playback
            console.log('Preloading next videos...');
          }}
          reelId={currentReel?._id}
          userId={user?.id}
          duration={currentReel?.duration}
          className="w-full h-full"
        />

        {/* Unique gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none z-5" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none z-5" />

        {/* Controls Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
          {/* Top Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/10">
              <span className="text-white text-xs font-bold">{currentIndex + 1}</span>
              <span className="text-white/50 text-xs">/</span>
              <span className="text-white/80 text-xs">{reels.length}</span>
            </div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="pointer-events-auto w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-black/60 transition-colors"
            >
              {isMuted ? <VolumeX size={18} className="text-white" /> : <Volume2 size={18} className="text-white" />}
            </button>
          </div>

          {/* Bottom Info & Actions */}
          <div className="flex items-end justify-between pointer-events-auto gap-4">
            <div className="flex-1 text-white space-y-2 bg-gradient-to-t from-black/60 to-transparent p-3 -m-3 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => !currentReel?.isAnonymous && onViewProfile?.(currentReel?.userId?._id)}
                  disabled={currentReel?.isAnonymous || !currentReel?.userId?._id}
                  className="text-left disabled:cursor-default"
                >
                  <p className="font-bold text-sm drop-shadow-lg hover:text-primary transition-colors">
                    {currentReel?.isAnonymous ? 'Ghost' : (currentReel?.userId?.name || 'User')}
                  </p>
                </button>
                {!currentReel?.isAnonymous && (
                  <ReelOptions
                    reelId={currentReel._id}
                    userId={user?.id}
                    reelOwnerId={currentReel?.userId?._id}
                    initialCaption={currentReel.caption}
                    onDelete={() => {
                      setReels(reels.filter((r) => r._id !== currentReel._id));
                      if (currentIndex >= reels.length - 1 && currentIndex > 0) {
                        setCurrentIndex(currentIndex - 1);
                      }
                    }}
                    onEdit={(caption) => {
                      setReels(reels.map((r) =>
                        r._id === currentReel._id ? { ...r, caption } : r
                      ));
                    }}
                  />
                )}
              </div>
              {currentReel?.caption && (
                <HashtagText
                  text={currentReel.caption}
                  className="text-xs text-white/90 drop-shadow-lg line-clamp-2"
                  hashtagClassName="text-primary-foreground hover:underline"
                  onHashtagClick={onHashtagClick}
                />
              )}
            </div>

            <div className="flex flex-col items-center gap-3 bg-black/20 backdrop-blur-sm p-2 rounded-2xl border border-white/10">
              <button
                onClick={() => handleLike(currentReel._id)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <Heart
                  size={26}
                  className={cn(
                    'transition-all drop-shadow-lg',
                    likedReels.has(currentReel._id)
                      ? 'text-red-500 fill-current scale-110'
                      : 'text-white'
                  )}
                />
                <span className="text-white text-xs font-bold drop-shadow">{currentReel.likesCount}</span>
              </button>

              <button
                onClick={() => setShowComments(true)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <MessageCircle size={26} className="text-white drop-shadow-lg" />
                <span className="text-white text-xs font-bold drop-shadow">{currentReel.commentsCount}</span>
              </button>

              <button
                onClick={() => setShowShare(true)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <Share2 size={26} className="text-white drop-shadow-lg" />
                <span className="text-white text-xs font-bold drop-shadow">{currentReel.sharesCount}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Play/Pause toggle */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute inset-0 flex items-center justify-center z-5"
        >
          {!isPlaying && (
            <div className="w-20 h-20 bg-gradient-to-br from-primary/80 to-accent/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border-2 border-white/20">
              <Play size={36} className="text-white ml-1 drop-shadow-lg" />
            </div>
          )}
        </button>
      </motion.div>

      {/* Unique navigation hint */}
      <div className="text-center mt-6 space-y-1">
        <p className="text-xs text-muted-foreground">Swipe up or down to navigate</p>
        <p className="text-xs text-accent">Videos are automatically compressed</p>
      </div>

      {/* Comments Panel */}
      {showComments && currentReel && (
        <ReelCommentsPanel
          reelId={currentReel._id}
          userId={user?.id}
          isAnonymous={false}
          onClose={() => setShowComments(false)}
          onViewProfile={onViewProfile}
        />
      )}

      {/* Share Modal */}
      {showShare && currentReel && (
        <ShareModal
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          postId={currentReel._id}
          userId={user?.id}
          onShareComplete={() => {
            setReels((prev) =>
              prev.map((r) =>
                r._id === currentReel._id ? { ...r, sharesCount: r.sharesCount + 1 } : r
              )
            );
          }}
        />
      )}
    </div>
  );
};
