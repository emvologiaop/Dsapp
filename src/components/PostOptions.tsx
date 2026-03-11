import { useState } from 'react';
import { MoreVertical, Edit2, Trash2, X } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';

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
  const [editContent, setEditContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only show if user owns the post
  if (userId !== postOwnerId) {
    return null;
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
          <div className="absolute right-0 top-8 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[150px]">
            <button
              onClick={() => {
                setShowEditModal(true);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 text-sm"
            >
              <Edit2 size={16} />
              Edit Post
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 text-sm text-red-500"
            >
              <Trash2 size={16} />
              Delete Post
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <FriendlyCard className="max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Post</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={6}
              placeholder="What's on your mind?"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                disabled={isSubmitting || !editContent.trim()}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
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
