import { useState } from 'react';
import { MoreVertical, Edit2, Trash2, X } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';

interface ReelOptionsProps {
  reelId: string;
  userId: string;
  reelOwnerId: string;
  initialCaption: string;
  onDelete?: () => void;
  onEdit?: (caption: string) => void;
}

export function ReelOptions({
  reelId,
  userId,
  reelOwnerId,
  initialCaption,
  onDelete,
  onEdit,
}: ReelOptionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCaption, setEditCaption] = useState(initialCaption);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only show if user owns the reel
  if (userId !== reelOwnerId) {
    return null;
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this reel?')) return;

    try {
      const response = await fetch(`/api/reels/${reelId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        onDelete?.();
      } else {
        alert('Failed to delete reel');
      }
    } catch (error) {
      console.error('Failed to delete reel:', error);
      alert('Failed to delete reel');
    }
  };

  const handleEdit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/reels/${reelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          caption: editCaption,
        }),
      });

      if (response.ok) {
        const updatedReel = await response.json();
        onEdit?.(updatedReel.caption);
        setShowEditModal(false);
        setShowMenu(false);
      } else {
        alert('Failed to update reel');
      }
    } catch (error) {
      console.error('Failed to update reel:', error);
      alert('Failed to update reel');
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
          aria-label="Reel options"
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
              Edit Caption
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 text-sm text-red-500"
            >
              <Trash2 size={16} />
              Delete Reel
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <FriendlyCard className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Caption</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={4}
              placeholder="Add a caption..."
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
                disabled={isSubmitting}
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
