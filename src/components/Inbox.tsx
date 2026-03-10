import React, { useState, useEffect } from 'react';
import { FriendlyCard } from './FriendlyCard';
import { Ghost } from 'lucide-react';
import { PostActions } from './PostActions';
import { FollowButton } from './FollowButton';

interface InboxProps {
  userId: string;
}

export const Inbox: React.FC<InboxProps> = ({ userId }) => {
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
      <h2 className="text-2xl font-bold px-4">Shared with you</h2>
      
      {messages.map((message) => (
        <div key={message.shareId} className="space-y-2">
          <div className="px-4 flex items-center gap-2 text-sm text-muted-foreground">
            <img 
              src={message.sender.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender.username}`} 
              alt={message.sender.name} 
              className="w-5 h-5 rounded-full bg-muted"
            />
            <span className="font-medium text-foreground">{message.sender.name}</span> shared this with you
          </div>
          
          <FriendlyCard className="space-y-4 p-0 overflow-hidden border-primary/20">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {message.post.isAnonymous ? <Ghost size={16} className="text-muted-foreground" /> : (message.post.userId?.name?.[0] || 'U')}
                </div>
                <div>
                  <p className="text-sm font-bold">{message.post.isAnonymous ? 'Ghost' : (message.post.userId?.name || 'User')}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(message.post.createdAt).toLocaleDateString()}</p>
                </div>
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
            <div className="p-4 space-y-2">
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
