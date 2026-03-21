import React, { useState, useEffect } from 'react';
import { FriendlyCard } from './FriendlyCard';
import { Ghost } from 'lucide-react';
import { PostActions } from './PostActions';
import { FollowButton } from './FollowButton';

interface InboxProps {
  userId: string;
  onViewProfile?: (userId?: string | null) => void;
}

export const Inbox: React.FC<InboxProps> = ({ userId, onViewProfile }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInbox();
  }, [userId]);

  const fetchInbox = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/inbox`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>No shared posts yet.</p>
        <p className="text-sm mt-2">When friends share posts with you, they'll appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <FriendlyCard className="mx-4 space-y-2 border border-primary/10 bg-gradient-to-br from-background via-background to-primary/10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Inbox</p>
        <h2 className="text-3xl font-bold tracking-[-0.04em]">Shared with you</h2>
        <p className="text-sm text-muted-foreground">Posts your friends send directly to you appear here.</p>
      </FriendlyCard>
      
      {messages.map((message) => (
        <div key={message.shareId} className="space-y-2">
          <div className="px-4 flex items-center gap-2 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => onViewProfile?.(message.sender.id || message.sender._id)}
              className="flex items-center gap-2 rounded-full border border-white/40 bg-background/80 px-2.5 py-1.5 shadow-sm"
            >
              <img 
                src={message.sender.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender.username}`} 
                alt={message.sender.name} 
                className="w-5 h-5 rounded-full bg-muted"
              />
              <span className="font-medium text-foreground">{message.sender.name}</span>
            </button>
            <span>shared this with you</span>
          </div>
          
          <FriendlyCard className="space-y-4 overflow-hidden border-primary/15 bg-background/82 p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => !message.post.isAnonymous && onViewProfile?.(message.post.userId?._id)}
                  disabled={message.post.isAnonymous || !message.post.userId?._id}
                  className="flex items-center gap-3 text-left disabled:cursor-default"
                >
                  <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center overflow-hidden ring-1 ring-white/40">
                    {message.post.isAnonymous ? <Ghost size={16} className="text-muted-foreground" /> : message.post.userId?.avatarUrl ? (
                      <img src={message.post.userId.avatarUrl} alt={message.post.userId.name} className="w-full h-full object-cover" />
                    ) : (
                      message.post.userId?.name?.[0] || 'U'
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{message.post.isAnonymous ? 'Ghost' : (message.post.userId?.name || 'User')}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(message.post.createdAt).toLocaleDateString()}</p>
                  </div>
                </button>
              </div>
            </div>
            {message.post.mediaUrl && (
              <div className="relative group">
                <img 
                  src={message.post.mediaUrl} 
                  alt="Post" 
                  className="w-full aspect-video object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="space-y-3 p-4">
              <p className="text-sm text-foreground leading-relaxed">
                {message.post.content}
              </p>
              <PostActions 
                postId={message.post._id} 
                userId={userId} 
                initialLikes={message.post.likesCount} 
                initialLiked={message.post.isLiked} 
                initialBookmarked={message.post.isBookmarked}
                initialComments={message.post.commentsCount}
                initialShares={message.post.sharesCount}
                onComment={() => {}}
              />
            </div>
          </FriendlyCard>
        </div>
      ))}
    </div>
  );
};
