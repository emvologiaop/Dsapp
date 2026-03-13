import React, { useState, useEffect } from 'react';
import { FriendlyCard } from './FriendlyCard';
import { FollowButton } from './FollowButton';
import { Settings, Grid3x3, Film, Tag, MapPin, Link as LinkIcon, BadgeCheck, Calendar, Sparkles, ArrowLeft, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface InstagramProfileProps {
  userId: string;
  currentUserId: string;
  currentUser?: any;
  onEditProfile?: () => void;
  onBack?: () => void;
  onMessageUser?: (user: any) => void;
}

type ProfileTab = 'posts' | 'reels' | 'tagged';

export const InstagramProfile: React.FC<InstagramProfileProps> = ({
  userId,
  currentUserId,
  currentUser,
  onEditProfile,
  onBack,
  onMessageUser,
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [taggedContent, setTaggedContent] = useState<any[]>([]);
  const isOwnProfile = userId === currentUserId;

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchReels();
    if (activeTab === 'tagged') {
      fetchTaggedContent();
    }
  }, [userId, currentUserId, currentUser, activeTab]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setProfileError(null);
    try {
      const res = await fetch(`/api/users/${userId}/profile?currentUserId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        return;
      }

      if (res.status === 404 && currentUser && userId === currentUserId) {
        setProfile({
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl || '',
          bio: currentUser.bio || '',
          website: currentUser.website || '',
          location: currentUser.location || '',
          department: currentUser.department || '',
          isVerified: currentUser.isVerified || false,
          followersCount: currentUser.followersCount || currentUser.followerIds?.length || 0,
          followingCount: currentUser.followingCount || currentUser.followingIds?.length || 0,
          isFollowing: false,
        });
        return;
      }

      const data = await res.json().catch(() => null);
      setProfile(null);
      setProfileError(data?.error || 'Unable to load profile.');
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setProfile(null);
      setProfileError('Unable to load profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
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
        setReels(data.reels || []);
      }
    } catch (error) {
      console.error('Failed to fetch reels:', error);
    }
  };

  const fetchTaggedContent = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/tagged`);
      if (res.ok) {
        const data = await res.json();
        setTaggedContent([
          ...(data.posts || []).map((post: any) => ({ ...post, type: 'post' })),
          ...(data.reels || []).map((reel: any) => ({ ...reel, type: 'reel' })),
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch tagged content:', error);
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
        <p>{profileError || 'Profile is unavailable right now.'}</p>
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
              {(post.mediaUrls?.[0] || post.mediaUrl) ? (
                <img
                  src={post.mediaUrls?.[0] || post.mediaUrl}
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
              {(reel.thumbnailUrl || reel.videoUrl) && (
                <img
                  src={reel.thumbnailUrl || reel.videoUrl}
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
      if (taggedContent.length === 0) {
        return (
          <div className="text-center py-20">
            <Tag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">No tagged posts yet</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-3 gap-1">
          {taggedContent.map((item) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'bg-muted overflow-hidden cursor-pointer group relative',
                item.type === 'post' ? 'aspect-square' : 'aspect-[9/16]'
              )}
            >
              {item.mediaUrl || item.videoUrl ? (
                <img
                  src={item.mediaUrl || item.videoUrl}
                  alt={item.type === 'post' ? 'Tagged post' : 'Tagged reel'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
                  <p className="text-xs line-clamp-4 text-center">{item.content || item.caption}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{item.likesCount || item.likedBy?.length || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{item.commentsCount || 0}</span>
                </div>
              </div>
              {item.type === 'reel' && (
                <div className="absolute bottom-2 left-2 text-white text-xs font-bold flex items-center gap-1">
                  <Film className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="space-y-0">
      {/* Profile Header - DDU Style */}
      <div className="px-6 py-6 bg-gradient-to-b from-primary/5 to-transparent">
        {!isOwnProfile && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to your profile
          </button>
        )}
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar with DDU ring */}
          <div className="relative">
            {(() => {
              const badgeType = profile.badgeType;
              const borderClass = badgeType === 'gold'
                ? 'border-yellow-400'
                : (badgeType === 'blue' || profile.isVerified) ? 'border-blue-500'
                : 'border-primary/30';
              return (
                <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full border-[3px] bg-muted flex items-center justify-center text-4xl font-bold overflow-hidden shrink-0 shadow-lg ${borderClass}`}>
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary">{profile.name?.[0] || 'U'}</span>
                  )}
                </div>
              );
            })()}
            {(profile.isVerified || profile.badgeType === 'blue' || profile.badgeType === 'gold') && (
              <div className={`absolute -bottom-1 -right-1 rounded-full p-1 border-2 border-background shadow-md ${
                profile.badgeType === 'gold' ? 'bg-yellow-400' : 'bg-blue-500'
              }`}>
                <BadgeCheck className="w-4 h-4 text-white" fill="currentColor" />
              </div>
            )}
          </div>

          {/* Stats & Actions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold truncate">{profile.username}</h2>
              {profile.badgeType === 'gold' ? (
                <div className="shrink-0 flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/40">
                  <BadgeCheck className="w-4 h-4 text-yellow-500" fill="currentColor" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-600">Verified</span>
                </div>
              ) : (profile.badgeType === 'blue' || profile.isVerified) ? (
                <div className="shrink-0 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/30">
                  <BadgeCheck className="w-4 h-4 text-blue-500" fill="currentColor" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Verified</span>
                </div>
              ) : null}
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
                <>
                  <FollowButton
                    userId={currentUserId}
                    targetId={userId}
                    initialIsFollowing={profile.isFollowing}
                    className="flex-1 rounded-lg font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => onMessageUser?.(profile)}
                    className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                </>
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
