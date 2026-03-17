import React, { useEffect, useMemo, useState } from 'react';
import { Film, Heart, MessageCircle, Plus, Share2, Upload, X, Bookmark, MoreVertical, Flag } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';
import { cn } from '../lib/utils';
import { ReelCommentsPanel } from './ReelCommentsPanel';
import { ShareModal } from './ShareModal';

type UserLite = {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
};

type Reel = {
  _id: string;
  userId: { _id: string; name: string; username?: string; avatarUrl?: string } | null;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  likesCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  commentsCount?: number;
  sharesCount?: number;
  viewsCount?: number;
  isAnonymous?: boolean;
  createdAt?: string;
};

interface ReelsTabProps {
  user: UserLite;
  onViewProfile?: (userId?: string | null) => void;
  onHashtagClick?: (hashtag: string) => void;
  openUploadRequestId?: number;
  dataSaverEnabled?: boolean;
}

export const ReelsTab: React.FC<ReelsTabProps> = ({ user, onViewProfile, openUploadRequestId, dataSaverEnabled = false }) => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [activeCommentsReelId, setActiveCommentsReelId] = useState<string | null>(null);
  const [shareModalReelId, setShareModalReelId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const userId = user?.id;
  const activeReel = useMemo(() => reels[0], [reels]); // basic feed: first reel

  const fetchReels = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const limit = dataSaverEnabled ? 12 : 30;
      const res = await fetch(`/api/reels?userId=${encodeURIComponent(userId)}&page=0&limit=${limit}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to fetch reels');
      }
      const data = await res.json();
      setReels(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch reels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dataSaverEnabled]);

  useEffect(() => {
    setIsVideoReady(!dataSaverEnabled);
  }, [activeReel?._id, dataSaverEnabled]);

  useEffect(() => {
    if (!openUploadRequestId) return;
    setShowUpload(true);
  }, [openUploadRequestId]);

  const toggleLike = async (reelId: string, currentlyLiked?: boolean) => {
    if (!userId) return;
    setReels((prev) =>
      prev.map((r) =>
        r._id === reelId
          ? {
              ...r,
              isLiked: !currentlyLiked,
              likesCount: (r.likesCount || 0) + (currentlyLiked ? -1 : 1),
            }
          : r
      )
    );

    try {
      const res = await fetch(`/api/reels/${reelId}/like`, {
        method: currentlyLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        throw new Error('Failed to update like');
      }
    } catch {
      // rollback
      setReels((prev) =>
        prev.map((r) =>
          r._id === reelId
            ? {
                ...r,
                isLiked: currentlyLiked,
                likesCount: (r.likesCount || 0) + (currentlyLiked ? 1 : -1),
              }
            : r
        )
      );
    }
  };

  const shareReel = async (reelId: string) => {
    setShareModalReelId(reelId);
  };

  const toggleSave = async (reelId: string, currentlySaved?: boolean) => {
    if (!userId) return;
    setReels((prev) =>
      prev.map((r) =>
        r._id === reelId
          ? { ...r, isBookmarked: !currentlySaved }
          : r
      )
    );

    try {
      const res = await fetch(`/api/reels/${reelId}/bookmark`, {
        method: currentlySaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        throw new Error('Failed to update save');
      }
    } catch {
      setReels((prev) =>
        prev.map((r) =>
          r._id === reelId
            ? { ...r, isBookmarked: currentlySaved }
            : r
        )
      );
    }
  };

  const handleReport = async () => {
    if (!activeReel?._id || !userId || !reportReason) return;
    setReportSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: userId,
          type: 'reel',
          targetId: activeReel._id,
          reason: reportReason,
          description: reportDescription,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to report reel');
      }
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportReason('');
        setReportDescription('');
      }, 1800);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to report reel');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleUpload = async () => {
    if (!userId) return;
    if (!file) {
      alert('Choose a video first.');
      return;
    }

    setUploading(true);
    try {
      // Prefer R2 upload endpoint (server-side processing) to avoid base64 issues.
      const form = new FormData();
      form.append('video', file);
      form.append('userId', userId);
      form.append('caption', caption);
      form.append('isAnonymous', 'false');

      const res = await fetch('/api/reels/upload-r2', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Reel upload failed');
      }

      const created = await res.json();
      setShowUpload(false);
      setCaption('');
      setFile(null);
      setReels((prev) => [created, ...prev]);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Reel upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Reels</h2>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90"
        >
          <Plus size={18} />
          Upload
        </button>
      </div>

      {error && (
        <FriendlyCard className="border border-red-500/20 bg-red-500/10 text-sm text-red-600 dark:text-red-300">
          {error}
        </FriendlyCard>
      )}

      {reels.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>No reels yet. Upload the first one!</p>
        </div>
      ) : (
        <FriendlyCard className="p-0 overflow-hidden border border-border/60 shadow-sm">
          <div className="relative bg-black">
            {activeReel && (isVideoReady || !dataSaverEnabled) ? (
              <video
                src={activeReel.videoUrl}
                poster={activeReel.thumbnailUrl}
                className="w-full aspect-[9/16] object-cover"
                controls
                playsInline
                preload={dataSaverEnabled ? 'none' : 'metadata'}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsVideoReady(true)}
                className="relative block w-full overflow-hidden bg-black text-left"
              >
                {activeReel?.thumbnailUrl ? (
                  <img
                    src={activeReel.thumbnailUrl}
                    alt={activeReel.caption || 'Reel preview'}
                    className="w-full aspect-[9/16] object-cover"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div className="flex aspect-[9/16] items-center justify-center bg-muted text-sm text-white/80">
                    Video preview
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-black shadow-sm">
                    Tap to load video
                  </div>
                </div>
              </button>
            )}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (activeReel?.isAnonymous) return;
                  onViewProfile?.(activeReel?.userId?._id);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-full bg-black/40 backdrop-blur px-3 py-2 text-white',
                  activeReel?.isAnonymous ? 'opacity-60 cursor-not-allowed' : 'hover:bg-black/50'
                )}
                disabled={Boolean(activeReel?.isAnonymous)}
              >
                <div className="w-7 h-7 rounded-full bg-white/10 overflow-hidden flex items-center justify-center font-bold">
                  {activeReel?.isAnonymous
                    ? 'G'
                    : activeReel?.userId?.avatarUrl
                      ? <img src={activeReel.userId.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      : activeReel?.userId?.name?.[0] || 'U'}
                </div>
                <span className="text-sm font-semibold">
                  {activeReel?.isAnonymous ? 'Ghost' : (activeReel?.userId?.username || activeReel?.userId?.name || 'User')}
                </span>
              </button>
              <div className="rounded-full bg-black/40 backdrop-blur px-3 py-2 text-white text-xs flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowOptions((prev) => !prev)}
                  className="flex items-center gap-1"
                >
                  <MoreVertical size={14} />
                  <span>Reel</span>
                </button>
              </div>
            </div>
            {showOptions && activeReel && (
              <div className="absolute top-14 right-3 z-10 min-w-[160px] overflow-hidden rounded-xl border border-white/15 bg-black/70 text-white shadow-xl backdrop-blur">
                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    setShowReportModal(true);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-white/10"
                >
                  <Flag size={16} />
                  Report reel
                </button>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {activeReel?.caption && (
              <p className="text-sm text-foreground whitespace-pre-wrap">{activeReel.caption}</p>
            )}

            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => activeReel && toggleLike(activeReel._id, activeReel.isLiked)}
                className="inline-flex items-center gap-2 text-sm font-semibold"
              >
                <Heart className={cn('w-5 h-5', activeReel?.isLiked ? 'text-red-500 fill-red-500' : 'text-foreground')} />
                <span>{activeReel?.likesCount || 0}</span>
              </button>

              <button
                type="button"
                onClick={() => activeReel && setActiveCommentsReelId(activeReel._id)}
                className="inline-flex items-center gap-2 text-sm font-semibold"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{activeReel?.commentsCount || 0}</span>
              </button>

              <button
                type="button"
                onClick={() => activeReel && shareReel(activeReel._id)}
                className="inline-flex items-center gap-2 text-sm font-semibold"
              >
                <Share2 className="w-5 h-5" />
                <span>{activeReel?.sharesCount || 0}</span>
              </button>

              <button
                type="button"
                onClick={() => activeReel && toggleSave(activeReel._id, activeReel.isBookmarked)}
                className={cn(
                  'ml-auto inline-flex items-center gap-2 text-sm font-semibold',
                  activeReel?.isBookmarked ? 'text-yellow-500' : 'text-foreground'
                )}
              >
                <Bookmark className={cn('w-5 h-5', activeReel?.isBookmarked ? 'fill-current' : '')} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </FriendlyCard>
      )}

      {activeCommentsReelId && userId && (
        <ReelCommentsPanel
          reelId={activeCommentsReelId}
          userId={userId}
          isAnonymous={false}
          onClose={() => setActiveCommentsReelId(null)}
          onViewProfile={onViewProfile}
        />
      )}

      <ShareModal
        isOpen={Boolean(shareModalReelId)}
        onClose={() => setShareModalReelId(null)}
        reelId={shareModalReelId || undefined}
        userId={userId}
        contentType="reel"
        onShareComplete={() => {
          setShareModalReelId(null);
          if (!activeReel) return;
          setReels((prev) =>
            prev.map((r) =>
              r._id === activeReel._id
                ? { ...r, sharesCount: (r.sharesCount || 0) + 1 }
                : r
            )
          );
        }}
      />

      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <FriendlyCard className="max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            {reportSuccess ? (
              <div className="text-center py-6">
                <p className="text-lg font-bold text-green-500">Report submitted</p>
                <p className="text-sm text-muted-foreground mt-2">Thanks for helping us review this reel.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Report reel</h3>
                  <button type="button" onClick={() => setShowReportModal(false)} className="p-1 rounded hover:bg-muted">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-2">
                  {['Spam', 'Harassment', 'Inappropriate content', 'Misinformation', 'Other'].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setReportReason(reason)}
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                        reportReason === reason ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-border hover:bg-muted'
                      )}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Additional details (optional)"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  rows={4}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 rounded-xl bg-muted px-4 py-3 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReport}
                    disabled={!reportReason || reportSubmitting}
                    className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </FriendlyCard>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Upload size={18} className="text-primary" />
              <h2 className="text-lg font-bold">Upload Reel</h2>
            </div>
            <button onClick={() => setShowUpload(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl w-full mx-auto space-y-4">
            <FriendlyCard className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Video</p>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={uploading}
                />
                {file && (
                  <p className="text-xs text-muted-foreground">
                    Selected: <span className="font-medium">{file.name}</span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Caption (optional)</p>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  rows={4}
                  disabled={uploading}
                />
              </div>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold disabled:opacity-60 transition-all active:scale-[0.99]"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <p className="text-xs text-muted-foreground">
                Tip: this uses the server upload endpoint to prevent large base64 uploads from failing.
              </p>
            </FriendlyCard>
          </div>
        </div>
      )}
    </div>
  );
};
