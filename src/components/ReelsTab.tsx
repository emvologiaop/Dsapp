import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share2, Plus, Upload, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ReelCommentsPanel } from './ReelCommentsPanel';
import { ShareModal } from './ShareModal';

interface Reel {
  _id: string;
  userId: { _id: string; name: string; username: string } | null;
  videoUrl: string;
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
}

export const ReelsTab: React.FC<ReelsTabProps> = ({ user }) => {
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
  const [lastTap, setLastTap] = useState(0);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-200, 0, 200], [0.5, 1, 0.5]);

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

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      const currentReel = reels[currentIndex];
      if (!likedReels.has(currentReel._id)) {
        handleLike(currentReel._id);
        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 1000);
      }
    }
    setLastTap(now);
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
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const res = await fetch('/api/reels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            caption: uploadCaption,
            videoData: base64,
            isAnonymous: false,
          }),
        });
        if (res.ok) {
          setShowUpload(false);
          setUploadCaption('');
          setUploadFile(null);
          fetchReels();
        }
      };
      reader.readAsDataURL(uploadFile);
    } catch (error) {
      console.error('Upload error:', error);
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
          <button onClick={() => setShowUpload(false)} className="p-2 rounded-full bg-muted">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <div
              className={cn(
                'border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary transition-colors',
                uploadFile && 'border-primary bg-primary/5'
              )}
            >
              {uploadFile ? (
                <div className="space-y-2">
                  <p className="font-medium">{uploadFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload size={40} className="mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Tap to select a video</p>
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
            className="w-full bg-muted border border-border rounded-xl p-4 text-sm outline-none resize-none h-20"
          />

          <button
            onClick={handleUpload}
            disabled={!uploadFile || isUploading}
            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl disabled:opacity-50 transition-all active:scale-95"
          >
            {isUploading ? 'Uploading...' : 'Post Reel'}
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
        <h2 className="text-xl font-bold">Reels</h2>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-sm transition-all active:scale-95"
        >
          <Plus size={16} />
          Upload
        </button>
      </div>

      <motion.div
        className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[70vh]"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ y, opacity }}
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20 z-20">
          <div
            className="h-full bg-white transition-all duration-100"
            style={{ width: `${playbackProgress}%` }}
          />
        </div>

        <video
          ref={videoRef}
          src={currentReel?.videoUrl}
          loop
          muted={isMuted}
          playsInline
          className="w-full h-full object-cover"
          onClick={handleDoubleTap}
        />

        {/* Like Animation */}
        {showLikeAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <Heart size={100} className="text-white fill-white" />
          </motion.div>
        )}

        {/* Controls Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
          {/* Top Info */}
          <div className="flex items-center justify-between">
            <div className="text-white text-xs bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full pointer-events-auto">
              {currentIndex + 1} / {reels.length}
            </div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="pointer-events-auto w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              {isMuted ? <VolumeX size={18} className="text-white" /> : <Volume2 size={18} className="text-white" />}
            </button>
          </div>

          {/* Bottom Info & Actions */}
          <div className="flex items-end justify-between pointer-events-auto">
            <div className="text-white space-y-1 max-w-[70%]">
              <p className="font-bold text-sm">
                {currentReel?.isAnonymous ? 'Ghost' : (currentReel?.userId?.name || 'User')}
              </p>
              {currentReel?.caption && (
                <p className="text-xs text-white/80">{currentReel.caption}</p>
              )}
            </div>

            <div className="flex flex-col items-center gap-4">
              <button onClick={() => handleLike(currentReel._id)} className="flex flex-col items-center gap-1">
                <Heart
                  size={28}
                  className={cn('transition-colors', likedReels.has(currentReel._id) ? 'text-red-500 fill-current' : 'text-white')}
                />
                <span className="text-white text-xs">{currentReel.likesCount}</span>
              </button>

              <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
                <MessageCircle size={28} className="text-white" />
                <span className="text-white text-xs">{currentReel.commentsCount}</span>
              </button>

              <button onClick={() => setShowShare(true)} className="flex flex-col items-center gap-1">
                <Share2 size={28} className="text-white" />
                <span className="text-white text-xs">{currentReel.sharesCount}</span>
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
            <div className="w-16 h-16 bg-black/40 rounded-full flex items-center justify-center">
              <Play size={32} className="text-white ml-1" />
            </div>
          )}
        </button>
      </motion.div>

      {/* Swipe Hint */}
      <div className="text-center mt-4 text-xs text-muted-foreground">
        Swipe up or down to navigate • Double tap to like
      </div>

      {/* Comments Panel */}
      {showComments && currentReel && (
        <ReelCommentsPanel
          reelId={currentReel._id}
          userId={user?.id}
          isAnonymous={false}
          onClose={() => setShowComments(false)}
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
