import { useState } from 'react';
import { MoreVertical, Edit2, Trash2, X, Flag } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';
import { withAuthHeaders } from '../utils/clientAuth';

interface PostOptionsProps {
  postId: string;
  userId: string;
  postOwnerId: string;
  initialContent: string;
  initialMediaUrls?: string[];
  onDelete?: () => void;
  onEdit?: (content: string, mediaUrls?: string[]) => void;
}

export function PostOptions({
  postId,
  userId,
  postOwnerId,
  initialContent,
  initialMediaUrls = [],
  onDelete,
  onEdit,
}: PostOptionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editContent, setEditContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const isOwner = userId === postOwnerId;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        onDelete?.();
      } else {
        alert('Failed to delete post');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) {
      alert('Post content cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          userId,
          content: editContent,
          mediaUrls: initialMediaUrls,
        }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        onEdit?.(updatedPost.content, updatedPost.mediaUrls);
        setShowEditModal(false);
        setShowMenu(false);
      } else {
        alert('Failed to update post');
      }
    } catch (error) {
      console.error('Failed to update post:', error);
      alert('Failed to update post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          reporterId: userId,
          type: 'post',
          targetId: postId,
          reason: reportReason,
          description: reportDescription,
        }),
      });
      if (response.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setShowReportModal(false);
          setReportSuccess(false);
          setReportReason('');
          setReportDescription('');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to report post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-muted rounded-full transition-colors"
          aria-label="Post options"
        >
          <MoreVertical size={18} className="text-muted-foreground" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-8 z-10 min-w-[170px] overflow-hidden rounded-2xl border border-white/35 bg-background/92 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.85)] backdrop-blur-xl">
            {isOwner && (
              <>
                <button
                  onClick={() => {
                    setShowEditModal(true);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60"
                >
                  <Edit2 size={16} />
                  Edit Post
                </button>
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-500 transition-colors hover:bg-muted/60"
                >
                  <Trash2 size={16} />
                  Delete Post
                </button>
              </>
            )}
            {!isOwner && (
              <button
                onClick={() => {
                  setShowReportModal(true);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-500 transition-colors hover:bg-muted/60"
              >
                <Flag size={16} />
                Report Post
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <FriendlyCard className="w-full max-w-2xl border-white/30 bg-background/88 p-6 shadow-[0_28px_80px_-34px_rgba(15,23,42,0.85)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Post</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="rounded-full p-1 transition-colors hover:bg-muted"
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full resize-none rounded-2xl border border-white/35 bg-background/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={6}
              placeholder="What's on your mind?"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 rounded-xl bg-muted px-4 py-2.5 transition-colors hover:bg-muted/80"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-primary-foreground shadow-[0_18px_35px_-24px_rgba(15,23,42,0.9)] transition-colors hover:bg-primary/90 disabled:opacity-50"
                disabled={isSubmitting || !editContent.trim()}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </FriendlyCard>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <FriendlyCard className="max-w-md w-full p-6">
            {reportSuccess ? (
              <div className="text-center py-6">
                <p className="text-lg font-bold text-green-500">✓ Report Submitted</p>
                <p className="text-sm text-muted-foreground mt-2">Thank you for helping keep DDU Social safe.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Report Post</h3>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">Why are you reporting this post?</p>

                <div className="space-y-2 mb-4">
                  {['Spam', 'Harassment', 'Inappropriate content', 'Misinformation', 'Other'].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ${
                        reportReason === reason
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                  rows={3}
                  placeholder="Additional details (optional)"
                  maxLength={500}
                />

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReport}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 text-sm"
                    disabled={!reportReason || isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </>
            )}
          </FriendlyCard>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
