import React, { useState } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface FollowButtonProps {
  userId: string;
  targetId: string;
  initialIsFollowing: boolean;
  className?: string;
  onChange?: (isFollowing: boolean) => void;
}

export const FollowButton: React.FC<FollowButtonProps> = ({ userId, targetId, initialIsFollowing, className, onChange }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  // Don't show follow button for own profile
  if (userId === targetId) return null;

  const toggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/users/${targetId}/follow`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (response.ok) {
        const nextIsFollowing = !isFollowing;
        setIsFollowing(nextIsFollowing);
        onChange?.(nextIsFollowing);
        window.dispatchEvent(new CustomEvent('social:follow-changed', {
          detail: { userId, targetId, following: nextIsFollowing }
        }));
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFollow}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors",
        isFollowing 
          ? "bg-muted text-foreground hover:bg-red-500/10 hover:text-red-500" 
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        className
      )}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-4 h-4" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
};
