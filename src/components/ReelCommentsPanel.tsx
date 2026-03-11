import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Ghost } from 'lucide-react';

interface Comment {
  _id: string;
  userId: { _id: string; name: string } | null;
  content: string;
  text?: string;
  isAnonymous: boolean;
  createdAt: string;
}

interface ReelCommentsPanelProps {
  reelId: string;
  userId: string;
  isAnonymous: boolean;
  onClose: () => void;
}

export const ReelCommentsPanel: React.FC<ReelCommentsPanelProps> = ({
  reelId,
  userId,
  isAnonymous,
  onClose,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [reelId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/reels/${reelId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reels/${reelId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          content: newComment,
          isAnonymous,
        }),
      });
      if (response.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full bg-background rounded-t-3xl shadow-xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-bold">Comments</h3>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment._id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center">
                    {comment.isAnonymous ? (
                      <Ghost size={14} className="text-muted-foreground" />
                    ) : (
                      comment.userId?.name?.[0] || 'U'
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">
                      {comment.isAnonymous ? 'Ghost' : comment.userId?.name || 'User'}
                    </p>
                    <p className="text-sm text-foreground mt-1">{comment.content || comment.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No comments yet. Be the first!</p>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={isAnonymous ? 'Comment as Ghost...' : 'Add a comment...'}
                className="flex-1 bg-muted border border-border rounded-full px-4 py-2 text-sm outline-none focus:border-primary"
                disabled={isLoading}
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || isLoading}
                className="p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-50 transition-all active:scale-95"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
