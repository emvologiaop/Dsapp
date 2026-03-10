import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { ShareModal } from './ShareModal';

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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (err) {
      setBookmarked(!newBookmarked);
    }
  };

  return (
    <div className="flex items-center gap-4 mt-2">
      <button
        onClick={handleLike}
        className={`flex items-center gap-1 text-sm transition-colors ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
        <span>{likes}</span>
      </button>

      <button
        onClick={onComment}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        aria-label="Comment"
      >
        <MessageCircle className="w-5 h-5" />
        <span>{initialComments}</span>
      </button>

      <button
        onClick={() => setShareModalOpen(true)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        aria-label="Share"
      >
        <Share2 className="w-5 h-5" />
        <span>{shares}</span>
      </button>

      <button
        onClick={handleBookmark}
        className={`ml-auto flex items-center gap-1 text-sm transition-colors ${bookmarked ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
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
