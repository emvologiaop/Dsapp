import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Ghost } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';

interface Comment {
  _id: string;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  userId: { _id: string; name: string; username: string } | null;
}

interface CommentsPanelProps {
  postId: string;
  userId: string;
  isAnonymous: boolean;
  onClose: () => void;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ postId, userId, isAnonymous, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsPosting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: text, isAnonymous }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [newComment, ...prev]);
        setText('');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 max-h-[75vh] flex flex-col shadow-2xl border border-border"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-lg">Comments</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment._id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-bold">
                  {comment.isAnonymous ? <Ghost size={14} className="text-muted-foreground" /> : (comment.userId?.name?.[0] || 'U')}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold">
                      {comment.isAnonymous ? 'Ghost' : (comment.userId?.name || 'User')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 bg-muted rounded-xl p-2 pl-4">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={isAnonymous ? 'Comment anonymously...' : 'Add a comment...'}
              className="flex-1 bg-transparent outline-none text-sm py-1"
            />
            <button
              onClick={handleSubmit}
              disabled={isPosting || !text.trim()}
              className="p-2 bg-primary text-primary-foreground rounded-lg transition-all active:scale-90 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
