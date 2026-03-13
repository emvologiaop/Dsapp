import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Ghost, MessageCircle, CornerDownRight } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';

interface Comment {
  _id: string;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  userId: { _id: string; name: string; username: string } | null;
  parentCommentId?: string;
  replyCount: number;
}

interface CommentsPanelProps {
  postId: string;
  userId: string;
  isAnonymous: boolean;
  onClose: () => void;
  onViewProfile?: (userId?: string | null) => void;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ postId, userId, isAnonymous, onClose, onViewProfile }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        // Filter to only show top-level comments (no parentCommentId)
        const topLevelComments = data.filter((c: Comment) => !c.parentCommentId);
        setComments(topLevelComments);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const fetchReplies = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/replies`);
      if (res.ok) {
        const data = await res.json();
        setReplies(prev => ({ ...prev, [commentId]: data }));
      }
    } catch (error) {
      console.error('Failed to fetch replies:', error);
    }
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
      // Fetch replies if not already loaded
      if (!replies[commentId]) {
        fetchReplies(commentId);
      }
    }
    setExpandedReplies(newExpanded);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsPosting(true);
    try {
      const endpoint = replyingTo
        ? `/api/comments/${replyingTo}/reply`
        : `/api/posts/${postId}/comments`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: text, isAnonymous: false }),
      });

      if (res.ok) {
        const newComment = await res.json();
        if (replyingTo) {
          // Add reply to replies list
          setReplies(prev => ({
            ...prev,
            [replyingTo]: [...(prev[replyingTo] || []), newComment]
          }));
          // Update reply count
          setComments(prev => prev.map(c =>
            c._id === replyingTo ? { ...c, replyCount: c.replyCount + 1 } : c
          ));
          // Expand replies to show the new reply
          setExpandedReplies(prev => new Set(prev).add(replyingTo));
        } else {
          setComments((prev) => [newComment, ...prev]);
        }
        setText('');
        setReplyingTo(null);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Failed to post comment.');
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
        className="fixed inset-0 bg-background z-50 flex flex-col shadow-2xl md:inset-x-0 md:top-auto md:bottom-0 md:max-h-[75vh] md:rounded-t-2xl md:border md:border-border"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-lg">Comments</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border bg-muted/30">
          Comments always use your real profile.
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment._id} className="space-y-2">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-bold">
                    {comment.isAnonymous ? <Ghost size={14} className="text-muted-foreground" /> : (comment.userId?.name?.[0] || 'U')}
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => !comment.isAnonymous && onViewProfile?.(comment.userId?._id)}
                      disabled={comment.isAnonymous || !comment.userId?._id}
                      className="text-left disabled:cursor-default"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold hover:text-primary transition-colors">
                          {comment.isAnonymous ? 'Ghost' : (comment.userId?.name || 'User')}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                    </button>
                    {/* Reply and View Replies buttons */}
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => setReplyingTo(comment._id)}
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle size={12} />
                        Reply
                      </button>
                      {comment.replyCount > 0 && (
                        <button
                          onClick={() => toggleReplies(comment._id)}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                        >
                          <CornerDownRight size={12} />
                          {expandedReplies.has(comment._id) ? 'Hide' : 'View'} {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nested Replies */}
                {expandedReplies.has(comment._id) && replies[comment._id] && (
                  <div className="ml-11 space-y-2 pl-4 border-l-2 border-muted">
                    {replies[comment._id].map((reply) => (
                      <div key={reply._id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted shrink-0 flex items-center justify-center text-[10px] font-bold">
                          {reply.isAnonymous ? <Ghost size={10} className="text-muted-foreground" /> : (reply.userId?.name?.[0] || 'U')}
                        </div>
                        <div className="flex-1">
                          <button
                            type="button"
                            onClick={() => !reply.isAnonymous && onViewProfile?.(reply.userId?._id)}
                            disabled={reply.isAnonymous || !reply.userId?._id}
                            className="text-left disabled:cursor-default"
                          >
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-bold hover:text-primary transition-colors">
                                {reply.isAnonymous ? 'Ghost' : (reply.userId?.name || 'User')}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-foreground mt-0.5">{reply.content}</p>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border">
          {replyingTo && (
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 bg-muted/50 p-2 rounded-lg">
              <span className="flex items-center gap-1">
                <CornerDownRight size={12} />
                Replying to comment
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-primary hover:text-primary/80"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 bg-muted rounded-xl p-2 pl-4">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Add a comment..."
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
