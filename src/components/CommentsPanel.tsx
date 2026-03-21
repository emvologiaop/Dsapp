import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Ghost, MessageCircle, CornerDownRight, Heart } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';
import { withAuthHeaders } from '../utils/clientAuth';

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
  isAnonymous?: boolean;
  onClose: () => void;
  onViewProfile?: (userId?: string | null) => void;
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

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ postId, userId, onClose, onViewProfile }) => {
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
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId, content: text, isAnonymous: false }),
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
        className="fixed inset-0 z-50 flex flex-col bg-background/95 shadow-2xl md:inset-x-0 md:top-auto md:bottom-0 md:max-h-[78vh] md:rounded-t-[30px] md:border md:border-white/30 md:bg-background/92 md:backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/30 p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Conversation</p>
            <h3 className="text-lg font-bold tracking-[-0.03em]">Comments</h3>
          </div>
          <button onClick={onClose} className="rounded-full border border-border/70 bg-background/80 p-2 transition-colors hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="border-b border-white/20 bg-background/70 px-4 py-2 text-xs text-muted-foreground">
          Comments always use your real profile.
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
                <div className="flex gap-3 rounded-[22px] border border-white/25 bg-background/70 px-3 py-3 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      if (comment.isAnonymous) return;
                      onViewProfile?.(comment.userId?._id);
                    }}
                    disabled={comment.isAnonymous || !comment.userId?._id}
                    className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden disabled:cursor-default"
                    aria-label="View profile"
                  >
                    {comment.isAnonymous ? (
                      <Ghost size={14} className="text-muted-foreground" />
                    ) : comment.userId?.avatarUrl ? (
                      <img src={comment.userId.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      comment.userId?.name?.[0] || 'U'
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          if (comment.isAnonymous) return;
                          onViewProfile?.(comment.userId?._id);
                        }}
                        disabled={comment.isAnonymous || !comment.userId?._id}
                        className="font-semibold hover:underline disabled:no-underline disabled:cursor-default"
                      >
                        {comment.isAnonymous ? 'Ghost' : (comment.userId?.username || 'user')}
                      </button>
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
                  <div className="ml-11 space-y-3 border-l-2 border-muted pl-3">
                    {replies[comment._id].map((reply) => (
                      <div key={reply._id} className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (reply.isAnonymous) return;
                            onViewProfile?.(reply.userId?._id);
                          }}
                          disabled={reply.isAnonymous || !reply.userId?._id}
                          className="w-6 h-6 rounded-full bg-muted shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden disabled:cursor-default"
                          aria-label="View profile"
                        >
                          {reply.isAnonymous ? (
                            <Ghost size={10} className="text-muted-foreground" />
                          ) : reply.userId?.avatarUrl ? (
                            <img src={reply.userId.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            reply.userId?.name?.[0] || 'U'
                          )}
                        </button>
                        <div className="flex-1">
                          <p className="text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                if (reply.isAnonymous) return;
                                onViewProfile?.(reply.userId?._id);
                              }}
                              disabled={reply.isAnonymous || !reply.userId?._id}
                              className="font-semibold hover:underline disabled:no-underline disabled:cursor-default"
                            >
                              {reply.isAnonymous ? 'Ghost' : (reply.userId?.username || 'user')}
                            </button>
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

        <div className="border-t border-white/30 p-4">
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
          <div className="flex items-center gap-3 rounded-[24px] border border-white/35 bg-background/75 p-2 pl-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.7)] backdrop-blur">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={replyingTo ? `Reply to @${replyingTo.name}...` : 'Add a comment...'}
              className="flex-1 bg-transparent py-1 text-sm outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={isPosting || !text.trim()}
              className="rounded-2xl bg-primary p-2.5 text-primary-foreground shadow-[0_18px_35px_-24px_rgba(15,23,42,0.9)] transition-all active:scale-90 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
