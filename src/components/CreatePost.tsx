import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Image as ImageIcon, Ghost, X } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';
import { cn } from '../lib/utils';

interface CreatePostProps {
  user: any;
  isAnonymous: boolean;
  onPostCreated: () => void;
}

export const CreatePost: React.FC<CreatePostProps> = ({ user, isAnonymous, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    setIsPosting(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          content,
          isAnonymous
        })
      });
      if (response.ok) {
        setContent('');
        onPostCreated();
      }
    } catch (error) {
      console.error("Post error:", error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <FriendlyCard className="space-y-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-muted shrink-0 flex items-center justify-center">
          {isAnonymous ? <Ghost size={20} className="text-muted-foreground" /> : (user?.name?.[0] || 'U')}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isAnonymous ? "Post anonymously as DDU Ghost..." : "What's happening on campus?"}
          className="w-full bg-transparent outline-none text-sm py-2 resize-none h-20 text-foreground placeholder-muted-foreground"
        />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-primary transition-all">
            <ImageIcon size={20} />
          </button>
        </div>
        <button
          onClick={handlePost}
          disabled={isPosting || !content.trim()}
          className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
        >
          {isPosting ? "Posting..." : "Post"}
        </button>
      </div>
    </FriendlyCard>
  );
};
