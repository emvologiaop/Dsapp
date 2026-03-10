import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share2, Plus, Upload, X } from 'lucide-react';
import { cn } from '../lib/utils';

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
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const compressVideo = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = async () => {
        // Set compression parameters
        const MAX_WIDTH = 720;  // 720p max resolution
        const MAX_HEIGHT = 1280;
        const TARGET_FPS = 30;   // Target framerate
        const QUALITY = 0.7;     // JPEG quality for frames

        // Calculate scaled dimensions (maintain aspect ratio)
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const aspectRatio = width / height;
          if (width > height) {
            width = MAX_WIDTH;
            height = Math.round(width / aspectRatio);
          } else {
            height = MAX_HEIGHT;
            width = Math.round(height * aspectRatio);
          }
        }

        canvas.width = width;
        canvas.height = height;

        try {
          // For very short videos or images, just compress as single frame
          if (video.duration <= 0.1 || file.type.startsWith('image/')) {
            ctx?.drawImage(video, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', QUALITY);
            URL.revokeObjectURL(video.src);
            resolve(compressedDataUrl);
            return;
          }

          // For longer videos, extract key frames
          const frameInterval = 1000 / TARGET_FPS; // ms between frames
          const duration = Math.min(video.duration, 60); // Max 60 seconds
          const frames: string[] = [];

          let currentTime = 0;
          const captureFrame = () => {
            if (currentTime >= duration) {
              URL.revokeObjectURL(video.src);

              // Create a simple "video" as base64 (first frame for preview)
              // In production, you'd want to use MediaRecorder API or server-side processing
              if (frames.length > 0) {
                resolve(frames[0]); // Use first frame as thumbnail
              } else {
                ctx?.drawImage(video, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', QUALITY));
              }
              return;
            }

            video.currentTime = currentTime;
          };

          video.onseeked = () => {
            ctx?.drawImage(video, 0, 0, width, height);
            frames.push(canvas.toDataURL('image/jpeg', QUALITY));
            currentTime += frameInterval / 1000;

            if (currentTime < duration) {
              captureFrame();
            } else {
              URL.revokeObjectURL(video.src);
              resolve(frames[0]); // Use first frame
            }
          };

          captureFrame();
        } catch (error) {
          URL.revokeObjectURL(video.src);
          reject(error);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video'));
      };
    });
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    try {
      // Check file size (warn if > 50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (uploadFile.size > MAX_FILE_SIZE) {
        alert('File size exceeds 50MB. Please choose a smaller file.');
        setIsUploading(false);
        return;
      }

      // Compress video/image
      const compressedData = await compressVideo(uploadFile);

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

      if (res.ok) {
        setShowUpload(false);
        setUploadCaption('');
        setUploadFile(null);
        fetchReels();
      } else {
        alert('Upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
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
                  <p className="text-sm text-muted-foreground">
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                    {uploadFile.type.startsWith('image/') ? ' (Image)' : ' (Video)'}
                  </p>
                  {isUploading && (
                    <p className="text-xs text-primary animate-pulse">Compressing and uploading...</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload size={40} className="mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Tap to select a video or image</p>
                  <p className="text-xs text-muted-foreground">Max 50MB • Auto-compressed to 720p</p>
                </div>
              )}
              <input
                type="file"
                accept="video/*,image/*"
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

      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[70vh]">
        <video
          ref={videoRef}
          src={currentReel?.videoUrl}
          loop
          muted={isMuted}
          playsInline
          className="w-full h-full object-cover"
          onClick={() => setIsPlaying(!isPlaying)}
        />

        {/* Controls Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
          <div />
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

              <button className="flex flex-col items-center gap-1">
                <MessageCircle size={28} className="text-white" />
                <span className="text-white text-xs">{currentReel.commentsCount}</span>
              </button>

              <button className="flex flex-col items-center gap-1">
                <Share2 size={28} className="text-white" />
                <span className="text-white text-xs">{currentReel.sharesCount}</span>
              </button>

              <button onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX size={24} className="text-white" /> : <Volume2 size={24} className="text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Play/Pause indicator */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 bg-black/40 rounded-full flex items-center justify-center">
              <Play size={32} className="text-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Reel navigation */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-muted rounded-xl text-sm font-medium disabled:opacity-30 transition-all"
        >
          Previous
        </button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {reels.length}
        </span>
        <button
          onClick={() => setCurrentIndex(Math.min(reels.length - 1, currentIndex + 1))}
          disabled={currentIndex === reels.length - 1}
          className="px-4 py-2 bg-muted rounded-xl text-sm font-medium disabled:opacity-30 transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
};
