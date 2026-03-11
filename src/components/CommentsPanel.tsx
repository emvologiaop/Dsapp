import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Ghost, MessageCircle, CornerDownRight, Heart } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';

interface Comment {
  _id: string;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  userId: { _id: string; name: string; username: string; avatarUrl?: string } | null;
  parentCommentId?: string;
  replyCount: number;
}

interface CommentsPanelProps {
  postId: string;
  userId: string;
  isAnonymous: boolean;
  onClose: () => void;
}

const getTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
};

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ postId, userId, isAnonymous, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
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
      if (!replies[commentId]) {
        fetchReplies(commentId);
      }
    }
    setExpandedReplies(newExpanded);
  };

  const startReply = (commentId: string, commentAuthor: string) => {
    setReplyingTo({ id: commentId, name: commentAuthor });
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsPosting(true);
    try {
      const endpoint = replyingTo
        ? `/api/comments/${replyingTo.id}/reply`
        : `/api/posts/${postId}/comments`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: text, isAnonymous }),
      });

      if (res.ok) {
        const newComment = await res.json();
        if (replyingTo) {
          setReplies(prev => ({
            ...prev,
            [replyingTo.id]: [...(prev[replyingTo.id] || []), newComment]
          }));
          setComments(prev => prev.map(c =>
            c._id === replyingTo.id ? { ...c, replyCount: c.replyCount + 1 } : c
          ));
          setExpandedReplies(prev => new Set(prev).add(replyingTo.id));
        } else {
          setComments((prev) => [newComment, ...prev]);
        }
        setText('');
        setReplyingTo(null);
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageCircle size={32} className="mb-3 opacity-30" />
              <p className="text-sm">No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment._id} className="space-y-2">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden">
                    {comment.isAnonymous ? (
                      <Ghost size={14} className="text-muted-foreground" />
                    ) : comment.userId?.avatarUrl ? (
                      <img src={comment.userId.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      comment.userId?.name?.[0] || 'U'
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">
                        {comment.isAnonymous ? 'Ghost' : (comment.userId?.username || 'user')}
                      </span>
                      {' '}
                      <span className="text-foreground">{comment.content}</span>
                    </p>
                    <div className="flex gap-4 mt-1.5">
                      <span className="text-[11px] text-muted-foreground">
                        {getTimeAgo(comment.createdAt)}
                      </span>
                      <button
                        onClick={() => startReply(comment._id, comment.isAnonymous ? 'Ghost' : (comment.userId?.username || 'user'))}
                        className="text-[11px] text-muted-foreground hover:text-foreground font-semibold transition-colors"
                      >
                        Reply
                      </button>
                      {comment.replyCount > 0 && (
                        <button
                          onClick={() => toggleReplies(comment._id)}
                          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <CornerDownRight size={10} />
                          {expandedReplies.has(comment._id) ? 'Hide' : 'View'} {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nested Replies */}
                {expandedReplies.has(comment._id) && replies[comment._id] && (
                  <div className="ml-11 space-y-3 pl-3 border-l-2 border-muted">
                    {replies[comment._id].map((reply) => (
                      <div key={reply._id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                          {reply.isAnonymous ? (
                            <Ghost size={10} className="text-muted-foreground" />
                          ) : reply.userId?.avatarUrl ? (
                            <img src={reply.userId.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            reply.userId?.name?.[0] || 'U'
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs">
                            <span className="font-semibold">
                              {reply.isAnonymous ? 'Ghost' : (reply.userId?.username || 'user')}
                            </span>
                            {' '}
                            <span className="text-foreground">{reply.content}</span>
                          </p>
                          <div className="flex gap-4 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {getTimeAgo(reply.createdAt)}
                            </span>
                            <button
                              onClick={() => startReply(comment._id, reply.isAnonymous ? 'Ghost' : (reply.userId?.username || 'user'))}
                              className="text-[10px] text-muted-foreground hover:text-foreground font-semibold transition-colors"
                            >
                              Reply
                            </button>
                          </div>
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
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-1">
              <span>
                Replying to <span className="font-semibold text-foreground">@{replyingTo.name}</span>
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-primary hover:text-primary/80 font-semibold"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 bg-muted rounded-xl p-2 pl-4">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={replyingTo ? `Reply to @${replyingTo.name}...` : isAnonymous ? 'Comment anonymously...' : 'Add a comment...'}
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
