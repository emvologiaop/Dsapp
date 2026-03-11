import React, { useState, useEffect } from 'react';
import { FriendlyCard } from './FriendlyCard';
import { FollowButton } from './FollowButton';
import { Settings, Grid3x3, Film, Tag, MapPin, Link as LinkIcon, BadgeCheck, Calendar, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface InstagramProfileProps {
  userId: string;
  currentUserId: string;
  onEditProfile?: () => void;
}

type ProfileTab = 'posts' | 'reels' | 'tagged';

export const InstagramProfile: React.FC<InstagramProfileProps> = ({
  userId,
  currentUserId,
  onEditProfile
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const isOwnProfile = userId === currentUserId;

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchReels();
  }, [userId, currentUserId]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/profile?currentUserId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const fetchReels = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/reels`);
      if (res.ok) {
        const data = await res.json();
        setReels(data);
      }
    } catch (error) {
      console.error('Failed to fetch reels:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>User not found.</p>
      </div>
    );
  }

  const renderContent = () => {
    if (activeTab === 'posts') {
      if (posts.length === 0) {
        return (
          <div className="text-center py-20">
            <Grid3x3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">No posts yet</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square bg-muted overflow-hidden cursor-pointer group relative"
            >
              {post.mediaUrl ? (
                <img
                  src={post.mediaUrl}
                  alt="Post"
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
                  <p className="text-xs line-clamp-4 text-center">{post.content}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{post.likesCount || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{post.commentsCount || 0}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      );
    }

    if (activeTab === 'reels') {
      if (reels.length === 0) {
        return (
          <div className="text-center py-20">
            <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">No reels yet</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-3 gap-1">
          {reels.map((reel) => (
            <motion.div
              key={reel._id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-[9/16] bg-muted overflow-hidden cursor-pointer group relative"
            >
              {reel.mediaUrl && (
                <img
                  src={reel.mediaUrl}
                  alt="Reel"
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
              )}
              <div className="absolute bottom-2 left-2 text-white text-xs font-bold flex items-center gap-1">
                <Film className="w-4 h-4" />
                <span>{reel.viewsCount || 0}</span>
              </div>
            </motion.div>
          ))}
        </div>
      );
    }

    if (activeTab === 'tagged') {
      return (
        <div className="text-center py-20">
          <Tag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">No tagged posts yet</p>
        </div>
      );
    }
  };

  return (
    <div className="space-y-0">
      {/* Profile Header - DDU Style */}
      <div className="px-6 py-6 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar with DDU ring */}
          <div className="relative">
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-[3px] border-primary/30 bg-muted flex items-center justify-center text-4xl font-bold overflow-hidden shrink-0 shadow-lg">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary">{profile.name?.[0] || 'U'}</span>
              )}
            </div>
            {profile.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1 border-2 border-background shadow-md">
                <Sparkles className="w-4 h-4 text-primary-foreground" fill="currentColor" />
              </div>
            )}
          </div>

          {/* Stats & Actions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold truncate">{profile.username}</h2>
              {profile.isVerified && (
                <div className="shrink-0 flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  <BadgeCheck className="w-4 h-4 text-primary" fill="currentColor" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">DDU</span>
                </div>
              )}
            </div>

            {/* Stats Row - Desktop */}
            <div className="hidden md:flex items-center gap-8 mb-4">
              <div className="flex flex-col items-center">
                <span className="font-bold text-base">{posts.length}</span>
                <span className="text-xs text-muted-foreground">posts</span>
              </div>
              <div className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity">
                <span className="font-bold text-base">{profile.followersCount || 0}</span>
                <span className="text-xs text-muted-foreground">followers</span>
              </div>
              <div className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity">
                <span className="font-bold text-base">{profile.followingCount || 0}</span>
                <span className="text-xs text-muted-foreground">following</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={onEditProfile}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
                  >
                    Edit Profile
                  </button>
                  <button
                    className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <FollowButton
                  userId={currentUserId}
                  targetId={userId}
                  initialIsFollowing={profile.isFollowing}
                  className="flex-1 rounded-lg font-semibold"
                />
              )}
            </div>
          </div>
        </div>

        {/* Profile Info - DDU Typography */}
        <div className="space-y-2">
          <h3 className="font-bold text-base text-foreground">{profile.name}</h3>
          {profile.bio && (
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          )}
          <div className="flex flex-col gap-1 pt-1">
            {profile.department && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary/60" />
                <span>{profile.department}</span>
              </div>
            )}
            {profile.location && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 text-primary/60" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="truncate">{profile.website}</span>
              </a>
            )}
          </div>
        </div>

        {/* Stats Row - Mobile with DDU accent */}
        <div className="md:hidden flex items-center justify-around border-t border-border mt-6 pt-4">
          <div className="flex flex-col items-center">
            <span className="font-bold text-base text-primary">{posts.length}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">posts</span>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-base text-primary">{profile.followersCount || 0}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">followers</span>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-base text-primary">{profile.followingCount || 0}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">following</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider border-t-2 transition-colors",
              activeTab === 'posts'
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Grid3x3 className="w-4 h-4" />
            <span className="hidden md:inline">Posts</span>
          </button>
          <button
            onClick={() => setActiveTab('reels')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider border-t-2 transition-colors",
              activeTab === 'reels'
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Film className="w-4 h-4" />
            <span className="hidden md:inline">Reels</span>
          </button>
          <button
            onClick={() => setActiveTab('tagged')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider border-t-2 transition-colors",
              activeTab === 'tagged'
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Tag className="w-4 h-4" />
            <span className="hidden md:inline">Tagged</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="min-h-[300px]"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
