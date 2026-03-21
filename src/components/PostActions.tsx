import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { ShareModal } from './ShareModal';
import { withAuthHeaders } from '../utils/clientAuth';

interface PostActionsProps {
  postId: string;
  userId: string;
  initialLikes?: number;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  initialComments?: number;
  initialShares?: number;
  onComment?: () => void;
}

export function PostActions({
  postId,
  userId,
  initialLikes = 0,
  initialLiked = false,
  initialBookmarked = false,
  initialComments = 0,
  initialShares = 0,
  onComment,
}: PostActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [shares, setShares] = useState(initialShares);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes((prev) => (newLiked ? prev + 1 : prev - 1));
    try {
      await fetch(`/api/posts/${postId}/like`, {
        method: newLiked ? 'POST' : 'DELETE',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId }),
      });
    } catch (err) {
      setLiked(!newLiked);
      setLikes((prev) => (newLiked ? prev - 1 : prev + 1));
    }
  };

  const handleBookmark = async () => {
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    try {
      await fetch(`/api/posts/${postId}/bookmark`, {
        method: newBookmarked ? 'POST' : 'DELETE',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId }),
      });
    } catch (err) {
      setBookmarked(!newBookmarked);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        onClick={handleLike}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-all duration-300 ${liked ? 'border-red-500/20 bg-red-500/10 text-red-500 shadow-[0_16px_35px_-24px_rgba(239,68,68,0.75)]' : 'border-border/70 bg-background/80 text-muted-foreground hover:-translate-y-0.5 hover:text-red-500'}`}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
        <span>{likes}</span>
      </button>

      <button
        onClick={onComment}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:text-primary"
        aria-label="Comment"
      >
        <MessageCircle className="w-5 h-5" />
        <span>{initialComments}</span>
      </button>

      <button
        onClick={() => setShareModalOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:text-primary"
        aria-label="Share"
      >
        <Share2 className="w-5 h-5" />
        <span>{shares}</span>
      </button>

      <button
        onClick={handleBookmark}
        className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-all duration-300 ${bookmarked ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500 shadow-[0_16px_35px_-24px_rgba(234,179,8,0.75)]' : 'border-border/70 bg-background/80 text-muted-foreground hover:-translate-y-0.5 hover:text-yellow-500'}`}
        aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
      >
        <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
      </button>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        postId={postId}
        userId={userId}
        onShareComplete={() => setShares((prev) => prev + 1)}
      />
    </div>
  );
}
