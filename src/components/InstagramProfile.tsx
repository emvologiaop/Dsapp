import React, { useState, useEffect } from 'react';
import { FriendlyCard } from './FriendlyCard';
import { FollowButton } from './FollowButton';
import { ImageCarousel } from './ImageCarousel';
import { Settings, Grid3x3, Film, Tag, MapPin, Link as LinkIcon, BadgeCheck, Calendar, ArrowLeft, MessageSquare, X, Heart, MessageCircle, Users, Bookmark, GraduationCap, CirclePlay, Archive, Share2, MoreVertical, Flag } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryViewer } from './StoryViewer';
import { PostActions } from './PostActions';
import { ReelCommentsPanel } from './ReelCommentsPanel';
import { ShareModal } from './ShareModal';

interface InstagramProfileProps {
  userId: string;
  currentUserId: string;
  currentUser?: any;
  dataSaverEnabled?: boolean;
  onEditProfile?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  onOpenSettings?: () => void;
  onMessageUser?: (user: any) => void;
  initialSelectedPost?: any | null;
}

type ProfileTab = 'posts' | 'reels' | 'stories' | 'saved' | 'tagged';

export const InstagramProfile: React.FC<InstagramProfileProps> = ({
  userId,
  currentUserId,
  currentUser,
  dataSaverEnabled = false,
  onEditProfile,
  onBack,
  onClose,
  onOpenSettings,
  onMessageUser,
  initialSelectedPost,
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [savedContent, setSavedContent] = useState<any[]>([]);
  const [taggedContent, setTaggedContent] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedReel, setSelectedReel] = useState<any | null>(null);
  const [selectedStories, setSelectedStories] = useState<any[] | null>(null);
  const [activeCommentsReelId, setActiveCommentsReelId] = useState<string | null>(null);
  const [shareModalReelId, setShareModalReelId] = useState<string | null>(null);
  const [showReelOptions, setShowReelOptions] = useState(false);
  const [showReelReportModal, setShowReelReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isSelectedReelVideoReady, setIsSelectedReelVideoReady] = useState(false);
  
  // Follow modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followData, setFollowData] = useState<any[]>([]);
  const [isFollowDataLoading, setIsFollowDataLoading] = useState(false);
  
  const isOwnProfile = userId === currentUserId;

  useEffect(() => {
    setActiveTab('posts');
    setSelectedPost(null);
    setSelectedReel(null);
    setSelectedStories(null);
    fetchProfile();
    fetchPosts();
    fetchReels();
    fetchStories();
    if (userId === currentUserId) {
      fetchSavedContent();
    } else {
      setSavedContent([]);
    }
  }, [userId, currentUserId, currentUser, dataSaverEnabled]);

  useEffect(() => {
    if (!initialSelectedPost) return;
    setActiveTab('posts');
    setSelectedPost(initialSelectedPost);
  }, [initialSelectedPost]);

  useEffect(() => {
    if (activeTab === 'tagged') {
      fetchTaggedContent();
    }
  }, [activeTab, userId, dataSaverEnabled]);

  useEffect(() => {
    setIsSelectedReelVideoReady(!dataSaverEnabled);
  }, [selectedReel?._id, dataSaverEnabled]);

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
      const limit = dataSaverEnabled ? 12 : 20;
      const res = await fetch(`/api/users/${userId}/posts?currentUserId=${currentUserId}&limit=${limit}`);
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
      const limit = dataSaverEnabled ? 9 : 20;
      const res = await fetch(`/api/users/${userId}/reels?currentUserId=${currentUserId}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setReels(data.reels || []);
      }
    } catch (error) {
      console.error('Failed to fetch reels:', error);
    }
  };

  const fetchStories = async () => {
    try {
      const res = await fetch(`/api/stories/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setStories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    }
  };

  const fetchSavedContent = async () => {
    try {
      const limit = dataSaverEnabled ? 12 : 24;
      const res = await fetch(`/api/users/${userId}/saved?currentUserId=${currentUserId}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        const combined = [
          ...(data.posts || []).map((post: any) => ({ ...post, type: 'post' })),
          ...(data.reels || []).map((reel: any) => ({ ...reel, type: 'reel' })),
        ].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setSavedContent(combined);
      }
    } catch (error) {
      console.error('Failed to fetch saved content:', error);
    }
  };

  const fetchTaggedContent = async () => {
    try {
      const limit = dataSaverEnabled ? 12 : 20;
      const res = await fetch(`/api/users/${userId}/tagged?limit=${limit}`);
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

  const fetchFollowers = async () => {
    setIsFollowDataLoading(true);
    setFollowData([]);
    setShowFollowersModal(true);
    try {
      const res = await fetch(`/api/users/${userId}/followers`);
      if (res.ok) {
        const data = await res.json();
        setFollowData(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch followers:', error);
    } finally {
      setIsFollowDataLoading(false);
    }
  };

  const fetchFollowing = async () => {
    setIsFollowDataLoading(true);
    setFollowData([]);
    setShowFollowingModal(true);
    try {
      const res = await fetch(`/api/users/${userId}/following`);
      if (res.ok) {
        const data = await res.json();
        setFollowData(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch following:', error);
    } finally {
      setIsFollowDataLoading(false);
    }
  };

  const openReel = (reel: any) => {
    setShowReelOptions(false);
    setSelectedReel(reel);
  };

  const toggleReelLike = async (reelId: string, currentlyLiked?: boolean) => {
    setReels((prev) => prev.map((reel) => reel._id === reelId ? { ...reel, isLiked: !currentlyLiked, likesCount: (reel.likesCount || 0) + (currentlyLiked ? -1 : 1) } : reel));
    setSavedContent((prev) => prev.map((item) => item.type === 'reel' && item._id === reelId ? { ...item, isLiked: !currentlyLiked, likesCount: (item.likesCount || 0) + (currentlyLiked ? -1 : 1) } : item));
    setTaggedContent((prev) => prev.map((item) => item.type === 'reel' && item._id === reelId ? { ...item, isLiked: !currentlyLiked, likesCount: (item.likesCount || 0) + (currentlyLiked ? -1 : 1) } : item));
    setSelectedReel((prev: any) => prev?._id === reelId ? { ...prev, isLiked: !currentlyLiked, likesCount: (prev.likesCount || 0) + (currentlyLiked ? -1 : 1) } : prev);

    try {
      const res = await fetch(`/api/reels/${reelId}/like`, {
        method: currentlyLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (!res.ok) throw new Error('Failed to update like');
    } catch {
      setReels((prev) => prev.map((reel) => reel._id === reelId ? { ...reel, isLiked: currentlyLiked, likesCount: (reel.likesCount || 0) + (currentlyLiked ? 1 : -1) } : reel));
      setSavedContent((prev) => prev.map((item) => item.type === 'reel' && item._id === reelId ? { ...item, isLiked: currentlyLiked, likesCount: (item.likesCount || 0) + (currentlyLiked ? 1 : -1) } : item));
      setTaggedContent((prev) => prev.map((item) => item.type === 'reel' && item._id === reelId ? { ...item, isLiked: currentlyLiked, likesCount: (item.likesCount || 0) + (currentlyLiked ? 1 : -1) } : item));
      setSelectedReel((prev: any) => prev?._id === reelId ? { ...prev, isLiked: currentlyLiked, likesCount: (prev.likesCount || 0) + (currentlyLiked ? 1 : -1) } : prev);
    }
  };

  const toggleReelSave = async (reelId: string, currentlySaved?: boolean) => {
    const nextSaved = !currentlySaved;
    setReels((prev) => prev.map((reel) => reel._id === reelId ? { ...reel, isBookmarked: nextSaved } : reel));
    setSavedContent((prev) => {
      const updated = prev.map((item) => item.type === 'reel' && item._id === reelId ? { ...item, isBookmarked: nextSaved } : item);
      return activeTab === 'saved' && !nextSaved ? updated.filter((item) => !(item.type === 'reel' && item._id === reelId)) : updated;
    });
    setTaggedContent((prev) => prev.map((item) => item.type === 'reel' && item._id === reelId ? { ...item, isBookmarked: nextSaved } : item));
    setSelectedReel((prev: any) => prev?._id === reelId ? { ...prev, isBookmarked: nextSaved } : prev);

    try {
      const res = await fetch(`/api/reels/${reelId}/bookmark`, {
        method: currentlySaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (!res.ok) throw new Error('Failed to update save');
      if (!currentlySaved && userId === currentUserId) {
        fetchSavedContent();
      }
    } catch {
      setReels((prev) => prev.map((reel) => reel._id === reelId ? { ...reel, isBookmarked: currentlySaved } : reel));
      if (userId === currentUserId) {
        fetchSavedContent();
      }
      setTaggedContent((prev) => prev.map((item) => item.type === 'reel' && item._id === reelId ? { ...item, isBookmarked: currentlySaved } : item));
      setSelectedReel((prev: any) => prev?._id === reelId ? { ...prev, isBookmarked: currentlySaved } : prev);
    }
  };

  const handleReelReport = async () => {
    if (!selectedReel?._id || !reportReason) return;
    setReportSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: currentUserId,
          type: 'reel',
          targetId: selectedReel._id,
          reason: reportReason,
          description: reportDescription,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to report reel');
      }
      setReportSuccess(true);
      setTimeout(() => {
        setShowReelReportModal(false);
        setReportSuccess(false);
        setReportReason('');
        setReportDescription('');
      }, 1800);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to report reel');
    } finally {
      setReportSubmitting(false);
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
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map((post) => (
            <motion.button
              key={post._id}
              type="button"
              onClick={() => setSelectedPost(post)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square bg-muted overflow-hidden cursor-pointer group relative focus:outline-none"
              whileHover={{ scale: 0.98 }}
            >
              {(post.mediaUrls?.[0] || post.mediaUrl) ? (
                <img
                  src={post.mediaUrls?.[0] || post.mediaUrl}
                  alt="Post"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-3">
                  <p className="text-xs line-clamp-4 text-center text-muted-foreground leading-snug">{post.content}</p>
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 fill-white" />
                  <span className="text-sm font-bold">{post.likesCount || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span className="text-sm font-bold">{post.commentsCount || 0}</span>
                </div>
              </div>
              {/* Multi-image indicator */}
              {post.mediaUrls?.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 rounded p-0.5">
                  <Bookmark className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
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
        <div className="grid grid-cols-3 gap-0.5">
          {reels.map((reel) => (
            <motion.button
              key={reel._id}
              type="button"
              onClick={() => openReel(reel)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-[9/16] bg-muted overflow-hidden cursor-pointer group relative focus:outline-none"
              whileHover={{ scale: 0.98 }}
            >
              {(reel.thumbnailUrl || reel.videoUrl) && (
                <img
                  src={reel.thumbnailUrl || reel.videoUrl}
                  alt="Reel"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Film className="w-8 h-8 text-white" />
              </div>
              <div className="absolute bottom-2 left-2 text-white text-xs font-bold flex items-center gap-1 bg-black/40 rounded px-1.5 py-0.5">
                <Film className="w-3 h-3" />
                <span>{reel.viewsCount || 0}</span>
              </div>
            </motion.button>
          ))}
        </div>
      );
    }

    if (activeTab === 'stories') {
      if (stories.length === 0) {
        return (
          <div className="text-center py-20">
            <CirclePlay className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">No active stories right now</p>
          </div>
        );
      }

      return (
        <div className="grid gap-3 sm:grid-cols-2 p-1">
          {stories.map((story, index) => (
            <motion.button
              key={story._id}
              type="button"
              onClick={() => setSelectedStories(stories.slice(index))}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm"
            >
              <div className="aspect-[9/14] bg-black">
                {story.mediaType === 'video' ? (
                  story.thumbnailUrl || dataSaverEnabled ? (
                    <div className="relative h-full w-full">
                      {story.thumbnailUrl ? (
                        <img
                          src={story.thumbnailUrl}
                          alt={story.caption || 'Story video preview'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-white/80">
                          Video story
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <CirclePlay className="w-10 h-10 text-white" />
                      </div>
                    </div>
                  ) : (
                    <video
                      src={story.mediaUrl}
                      poster={story.thumbnailUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  )
                ) : (
                  <img
                    src={story.mediaUrl}
                    alt={story.caption || 'Story'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-semibold">{story.caption || `Story ${index + 1}`}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(story.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      );
    }

    if (activeTab === 'saved') {
      if (savedContent.length === 0) {
        return (
          <div className="text-center py-20">
            <Archive className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">No saved posts or reels yet</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-3 gap-0.5">
          {savedContent.map((item) => (
            <motion.button
              key={`${item.type}-${item._id}`}
              type="button"
              onClick={() => item.type === 'post' ? setSelectedPost(item) : openReel(item)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'bg-muted overflow-hidden cursor-pointer group relative focus:outline-none',
                item.type === 'post' ? 'aspect-square' : 'aspect-[9/16]'
              )}
            >
              {item.mediaUrl || item.mediaUrls?.[0] || item.thumbnailUrl || item.videoUrl ? (
                <img
                  src={item.mediaUrls?.[0] || item.mediaUrl || item.thumbnailUrl || item.videoUrl}
                  alt={item.type === 'post' ? 'Saved post' : 'Saved reel'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-3">
                  <p className="text-xs line-clamp-4 text-center text-muted-foreground">{item.content || item.caption}</p>
                </div>
              )}
              <div className="absolute top-2 right-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
                {item.type === 'post' ? 'Post' : 'Reel'}
              </div>
            </motion.button>
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
        <div className="grid grid-cols-3 gap-0.5">
          {taggedContent.map((item) => (
            <motion.button
              key={item._id}
              type="button"
              onClick={() => item.type === 'post' ? setSelectedPost(item) : openReel(item)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'bg-muted overflow-hidden cursor-pointer group relative focus:outline-none',
                item.type === 'post' ? 'aspect-square' : 'aspect-[9/16]'
              )}
              whileHover={{ scale: 0.98 }}
            >
              {item.mediaUrl || item.videoUrl || item.mediaUrls?.[0] ? (
                <img
                  src={item.mediaUrls?.[0] || item.mediaUrl || item.videoUrl}
                  alt={item.type === 'post' ? 'Tagged post' : 'Tagged reel'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-3">
                  <p className="text-xs line-clamp-4 text-center text-muted-foreground">{item.content || item.caption}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 fill-white" />
                  <span className="text-sm font-bold">{item.likesCount || item.likedBy?.length || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span className="text-sm font-bold">{item.commentsCount || 0}</span>
                </div>
              </div>
              {item.type === 'reel' && (
                <div className="absolute bottom-2 left-2 text-white text-xs font-bold flex items-center gap-1">
                  <Film className="w-4 h-4" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="space-y-0">
      {/* Profile Header */}
      <div className="px-4 py-5 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-start gap-5 mb-5">
          {/* Avatar with ring */}
          <div className="relative shrink-0">
            {(() => {
              const badgeType = profile.badgeType;
              const borderClass = badgeType === 'gold'
                ? 'ring-yellow-400'
                : (badgeType === 'blue' || profile.isVerified) ? 'ring-blue-500'
                : 'ring-primary/30';
              return (
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full ring-2 ${borderClass} bg-muted flex items-center justify-center text-3xl font-bold overflow-hidden shadow-md`}>
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
                <BadgeCheck className="w-3.5 h-3.5 text-white" fill="currentColor" />
              </div>
            )}
          </div>

          {/* Stats & Actions — desktop-only stats row */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <h2 className="text-base font-bold truncate">{profile.username}</h2>
              {profile.badgeType === 'gold' ? (
                <div className="flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/40">
                  <BadgeCheck className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-600">Gold</span>
                </div>
              ) : (profile.badgeType === 'blue' || profile.isVerified) ? (
                <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/30">
                  <BadgeCheck className="w-3.5 h-3.5 text-blue-500" fill="currentColor" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Verified</span>
                </div>
              ) : null}
            </div>

            {/* Desktop stats */}
            <div className="hidden md:flex items-center gap-6 mb-3">
              <div className="flex flex-col items-center">
                <span className="font-bold text-sm">{posts.length}</span>
                <span className="text-xs text-muted-foreground">posts</span>
              </div>
              <div 
                className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={fetchFollowers}
              >
                <span className="font-bold text-sm">{profile.followersCount || 0}</span>
                <span className="text-xs text-muted-foreground">followers</span>
              </div>
              <div 
                className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={fetchFollowing}
              >
                <span className="font-bold text-sm">{profile.followingCount || 0}</span>
                <span className="text-xs text-muted-foreground">following</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={onEditProfile}
                    className="flex-1 bg-muted hover:bg-muted/80 text-foreground px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border border-border"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={onOpenSettings}
                    className="bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border border-border"
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
                    className="flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border border-border"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="space-y-1.5">
          <h3 className="font-bold text-sm text-foreground">{profile.name}</h3>
          {profile.bio && (
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          )}
          <div className="flex flex-col gap-1 pt-0.5">
            {profile.department && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                <span>{profile.department}</span>
              </div>
            )}
            {profile.year && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GraduationCap className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                <span>Year {profile.year}</span>
              </div>
            )}
            {profile.location && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 text-primary/60 shrink-0" />
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
                <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{profile.website}</span>
              </a>
            )}
          </div>
        </div>

        {/* Mobile Stats Row */}
        <div className="md:hidden flex items-center justify-around border-t border-border mt-4 pt-4">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-bold text-base text-foreground">{posts.length}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">posts</span>
          </div>
          <div className="w-px h-8 bg-border" />
          <div 
            className="flex flex-col items-center gap-0.5 cursor-pointer"
            onClick={fetchFollowers}
          >
            <span className="font-bold text-base text-foreground">{profile.followersCount || 0}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">followers</span>
          </div>
          <div className="w-px h-8 bg-border" />
          <div 
            className="flex flex-col items-center gap-0.5 cursor-pointer"
            onClick={fetchFollowing}
          >
            <span className="font-bold text-base text-foreground">{profile.followingCount || 0}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">following</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border">
        <div className="flex items-center">
          {([
            { id: 'posts', icon: Grid3x3, label: 'Posts' },
            { id: 'reels', icon: Film, label: 'Reels' },
            { id: 'stories', icon: CirclePlay, label: 'Stories' },
            ...(isOwnProfile ? [{ id: 'saved', icon: Archive, label: 'Saved' } as const] : []),
            { id: 'tagged', icon: Tag, label: 'Tagged' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wider border-t-2 transition-colors',
                activeTab === id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="min-h-[300px]"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-background rounded-2xl overflow-hidden w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold">{profile.name?.[0]}</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{profile.username}</span>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Post Media */}
              {(selectedPost.mediaUrls?.length > 0 || selectedPost.mediaUrl) && (
                <ImageCarousel
                  images={selectedPost.mediaUrls?.length > 0 ? selectedPost.mediaUrls : [selectedPost.mediaUrl]}
                />
              )}

              {/* Post Content */}
              <div className="p-4 space-y-3">
                {selectedPost.content && (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selectedPost.content}</p>
                )}

                <PostActions
                  postId={selectedPost._id}
                  userId={currentUserId}
                  initialLikes={selectedPost.likesCount}
                  initialLiked={selectedPost.isLiked}
                  initialBookmarked={selectedPost.isBookmarked}
                  initialComments={selectedPost.commentsCount}
                  initialShares={selectedPost.sharesCount}
                />

                {/* Stats row */}
                <div className="flex items-center gap-4 pt-1 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Heart className="w-4 h-4" />
                    <span>{selectedPost.likesCount || 0} likes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MessageCircle className="w-4 h-4" />
                    <span>{selectedPost.commentsCount || 0} comments</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{selectedPost.sharesCount || 0} shares</span>
                  </div>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedPost.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setSelectedReel(null);
              setShowReelOptions(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-background shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-black">
                {isSelectedReelVideoReady || !dataSaverEnabled ? (
                  <video
                    src={selectedReel.videoUrl}
                    poster={selectedReel.thumbnailUrl}
                    className="w-full aspect-[9/16] object-cover"
                    controls
                    playsInline
                    preload={dataSaverEnabled ? 'none' : 'metadata'}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSelectedReelVideoReady(true)}
                    className="relative block w-full overflow-hidden bg-black text-left"
                  >
                    {selectedReel.thumbnailUrl ? (
                      <img
                        src={selectedReel.thumbnailUrl}
                        alt={selectedReel.caption || 'Reel preview'}
                        className="w-full aspect-[9/16] object-cover"
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex aspect-[9/16] items-center justify-center bg-muted text-sm text-white/80">
                        Reel preview
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-black shadow-sm">
                        Tap to load video
                      </div>
                    </div>
                  </button>
                )}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-white backdrop-blur">
                    <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center font-bold">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        profile.name?.[0] || 'U'
                      )}
                    </div>
                    <span className="text-sm font-semibold">{profile.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReelOptions((prev) => !prev)}
                      className="rounded-full bg-black/45 p-2 text-white backdrop-blur"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReel(null);
                        setShowReelOptions(false);
                      }}
                      className="rounded-full bg-black/45 p-2 text-white backdrop-blur"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {showReelOptions && (
                  <div className="absolute top-14 right-3 z-10 min-w-[160px] overflow-hidden rounded-xl border border-white/15 bg-black/70 text-white shadow-xl backdrop-blur">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReelOptions(false);
                        setShowReelReportModal(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-white/10"
                    >
                      <Flag size={16} />
                      Report reel
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4 p-4">
                {selectedReel.caption && (
                  <p className="text-sm whitespace-pre-wrap text-foreground">{selectedReel.caption}</p>
                )}
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => toggleReelLike(selectedReel._id, selectedReel.isLiked)}
                    className="inline-flex items-center gap-2 text-sm font-semibold"
                  >
                    <Heart className={cn('w-5 h-5', selectedReel.isLiked ? 'text-red-500 fill-red-500' : 'text-foreground')} />
                    <span>{selectedReel.likesCount || 0}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCommentsReelId(selectedReel._id)}
                    className="inline-flex items-center gap-2 text-sm font-semibold"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{selectedReel.commentsCount || 0}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareModalReelId(selectedReel._id)}
                    className="inline-flex items-center gap-2 text-sm font-semibold"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>{selectedReel.sharesCount || 0}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleReelSave(selectedReel._id, selectedReel.isBookmarked)}
                    className={cn('ml-auto inline-flex items-center gap-2 text-sm font-semibold', selectedReel.isBookmarked ? 'text-yellow-500' : 'text-foreground')}
                  >
                    <Bookmark className={cn('w-5 h-5', selectedReel.isBookmarked ? 'fill-current' : '')} />
                    <span>Save</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedReel.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedStories && (
        <StoryViewer
          stories={selectedStories}
          currentUserId={currentUserId}
          onClose={() => setSelectedStories(null)}
        />
      )}

      {activeCommentsReelId && (
        <ReelCommentsPanel
          reelId={activeCommentsReelId}
          userId={currentUserId}
          isAnonymous={false}
          onClose={() => setActiveCommentsReelId(null)}
        />
      )}

      <ShareModal
        isOpen={Boolean(shareModalReelId)}
        onClose={() => setShareModalReelId(null)}
        reelId={shareModalReelId || undefined}
        userId={currentUserId}
        contentType="reel"
        onShareComplete={() => {
          if (!shareModalReelId) return;
          const reelId = shareModalReelId;
          setShareModalReelId(null);
          setReels((prev) => prev.map((reel) => reel._id === reelId ? { ...reel, sharesCount: (reel.sharesCount || 0) + 1 } : reel));
          setSavedContent((prev) => prev.map((item) => item.type === 'reel' && item._id === reelId ? { ...item, sharesCount: (item.sharesCount || 0) + 1 } : item));
          setTaggedContent((prev) => prev.map((item) => item.type === 'reel' && item._id === reelId ? { ...item, sharesCount: (item.sharesCount || 0) + 1 } : item));
          setSelectedReel((prev: any) => prev?._id === reelId ? { ...prev, sharesCount: (prev.sharesCount || 0) + 1 } : prev);
        }}
      />

      {showReelReportModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowReelReportModal(false)}>
          <FriendlyCard className="max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            {reportSuccess ? (
              <div className="text-center py-6">
                <p className="text-lg font-bold text-green-500">Report submitted</p>
                <p className="text-sm text-muted-foreground mt-2">Thanks for helping review this reel.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Report reel</h3>
                  <button type="button" onClick={() => setShowReelReportModal(false)} className="p-1 rounded hover:bg-muted">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-2">
                  {['Spam', 'Harassment', 'Inappropriate content', 'Misinformation', 'Other'].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setReportReason(reason)}
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                        reportReason === reason ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-border hover:bg-muted'
                      )}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Additional details (optional)"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  rows={4}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowReelReportModal(false)} className="flex-1 rounded-xl bg-muted px-4 py-3 text-sm font-semibold">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReelReport}
                    disabled={!reportReason || reportSubmitting}
                    className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </FriendlyCard>
        </div>
      )}

      {/* Followers / Following Modals */}
      <AnimatePresence>
        {(showFollowersModal || showFollowingModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setShowFollowersModal(false);
              setShowFollowingModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-background rounded-2xl overflow-hidden w-full max-w-sm max-h-[70vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-bold text-lg">{showFollowersModal ? 'Followers' : 'Following'}</h3>
                <button
                  onClick={() => {
                    setShowFollowersModal(false);
                    setShowFollowingModal(false);
                  }}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isFollowDataLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : followData.length > 0 ? (
                  followData.map((user) => (
                    <div key={user._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold">{user.name?.[0]}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-sm">{user.username}</span>
                            {(user.isVerified || user.badgeType === 'blue' || user.badgeType === 'gold') && (
                              <BadgeCheck className={`w-3.5 h-3.5 ${user.badgeType === 'gold' ? 'text-yellow-500' : 'text-blue-500'}`} fill="currentColor" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{user.name}</span>
                        </div>
                      </div>
                      {user._id !== currentUserId && (
                        <FollowButton
                          userId={currentUserId}
                          targetId={user._id}
                          initialIsFollowing={user.isFollowing || (showFollowingModal && profile.id === currentUserId)}
                          className="px-3 py-1.5 h-auto text-xs rounded-lg"
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No {showFollowersModal ? 'followers' : 'users followed'} yet.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
