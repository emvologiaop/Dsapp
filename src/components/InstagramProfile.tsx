import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FriendlyCard } from './FriendlyCard';
import { FollowButton } from './FollowButton';
import { ImageCarousel } from './ImageCarousel';
import { Settings, Grid3x3, Tag, MapPin, Link as LinkIcon, BadgeCheck, Calendar, ArrowLeft, MessageSquare, X, Heart, MessageCircle, Users, Bookmark, GraduationCap, CirclePlay, Archive } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryViewer } from './StoryViewer';
import { PostActions } from './PostActions';

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
  onViewProfile?: (userId?: string | null) => void;
  initialSelectedPost?: any | null;
}

type ProfileTab = 'posts' | 'stories' | 'saved' | 'tagged';

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
  onViewProfile,
  initialSelectedPost,
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [savedContent, setSavedContent] = useState<any[]>([]);
  const [taggedContent, setTaggedContent] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedPostCollection, setSelectedPostCollection] = useState<'posts' | 'saved' | 'tagged'>('posts');
  const [selectedStories, setSelectedStories] = useState<any[] | null>(null);
  
  // Follow modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followData, setFollowData] = useState<any[]>([]);
  const [isFollowDataLoading, setIsFollowDataLoading] = useState(false);
  
  const isOwnProfile = userId === currentUserId;

  useEffect(() => {
    setActiveTab('posts');
    setSelectedPost(null);
    setSelectedStories(null);
    fetchProfile();
    fetchPosts();
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
    setSelectedPostCollection('posts');
    setSelectedPost(initialSelectedPost);
  }, [initialSelectedPost]);

  const postViewerRef = useRef<HTMLDivElement | null>(null);

  const viewerItems = useMemo(() => {
    const source =
      selectedPostCollection === 'saved'
        ? savedContent
        : selectedPostCollection === 'tagged'
          ? taggedContent
          : posts;

    if (!selectedPost) return source;
    if (source.some((item) => item._id === selectedPost._id)) return source;
    return [selectedPost, ...source.filter((item) => item._id !== selectedPost._id)];
  }, [posts, savedContent, taggedContent, selectedPost, selectedPostCollection]);

  useEffect(() => {
    if (!selectedPost?._id || !postViewerRef.current) return;

    const postElement = postViewerRef.current.querySelector<HTMLElement>(`[data-post-id="${selectedPost._id}"]`);
    if (!postElement) return;

    requestAnimationFrame(() => {
      postElement.scrollIntoView({ block: 'center' });
    });
  }, [selectedPost?._id, viewerItems.length]);

  const openPostViewer = (post: any, collection: 'posts' | 'saved' | 'tagged') => {
    setSelectedPostCollection(collection);
    setSelectedPost(post);
  };

  useEffect(() => {
    if (activeTab === 'tagged') {
      fetchTaggedContent();
    }
  }, [activeTab, userId, dataSaverEnabled]);

  useEffect(() => {
    const handleFollowChanged = () => {
      fetchProfile();
      if (showFollowersModal) {
        fetchFollowers();
      }
      if (showFollowingModal) {
        fetchFollowing();
      }
    };

    window.addEventListener('social:follow-changed', handleFollowChanged as EventListener);
    return () => window.removeEventListener('social:follow-changed', handleFollowChanged as EventListener);
  }, [userId, currentUserId, showFollowersModal, showFollowingModal]);

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
          followsYou: false,
          canMessage: false,
          mutualFriendsCount: 0,
          mutualFriends: [],
          sharedContexts: [],
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
        const savedPosts = (data.posts || [])
          .map((post: any) => ({ ...post, type: 'post' }))
          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setSavedContent(savedPosts);
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
        setTaggedContent((data.posts || []).map((post: any) => ({ ...post, type: 'post' })));
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
              onClick={() => openPostViewer(post, 'posts')}
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
            <p className="text-muted-foreground">No saved posts yet</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-3 gap-0.5">
          {savedContent.map((item) => (
            <motion.button
              key={`${item.type}-${item._id}`}
              type="button"
              onClick={() => openPostViewer(item, 'saved')}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square bg-muted overflow-hidden cursor-pointer group relative focus:outline-none"
            >
              {item.mediaUrl || item.mediaUrls?.[0] ? (
                <img
                  src={item.mediaUrls?.[0] || item.mediaUrl}
                  alt="Saved post"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-3">
                  <p className="text-xs line-clamp-4 text-center text-muted-foreground">{item.content}</p>
                </div>
              )}
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
              onClick={() => openPostViewer(item, 'tagged')}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square bg-muted overflow-hidden cursor-pointer group relative focus:outline-none"
              whileHover={{ scale: 0.98 }}
            >
              {item.mediaUrl || item.mediaUrls?.[0] ? (
                <img
                  src={item.mediaUrls?.[0] || item.mediaUrl}
                  alt="Tagged post"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-3">
                  <p className="text-xs line-clamp-4 text-center text-muted-foreground">{item.content}</p>
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
                    onChange={() => fetchProfile()}
                  />
                  <button
                    type="button"
                    onClick={() => onMessageUser?.(profile)}
                    disabled={!profile.canMessage}
                    className="flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border border-border disabled:cursor-not-allowed disabled:opacity-60"
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
          {!isOwnProfile && !profile.canMessage && (
            <p className="text-xs text-muted-foreground">Messaging unlocks after you both follow each other.</p>
          )}
          {!isOwnProfile && profile.mutualFriendsCount > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex -space-x-2">
                {(profile.mutualFriends || []).slice(0, 3).map((mutual: any) => (
                  <button
                    key={mutual.id}
                    type="button"
                    onClick={() => onViewProfile?.(mutual.id)}
                    className="h-7 w-7 overflow-hidden rounded-full border-2 border-background bg-muted"
                    aria-label={mutual.name}
                  >
                    {mutual.avatarUrl ? (
                      <img src={mutual.avatarUrl} alt={mutual.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] font-bold">{mutual.name?.[0] || 'U'}</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Followed by {(profile.mutualFriends || []).slice(0, 2).map((mutual: any) => mutual.username).join(', ')}
                {profile.mutualFriendsCount > 2 ? ` and ${profile.mutualFriendsCount - 2} others` : ''}
              </p>
            </div>
          )}
          {!isOwnProfile && profile.sharedContexts?.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Shared context: {profile.sharedContexts.join(' • ')}
            </p>
          )}
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
            className="fixed inset-0 z-50 bg-background"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.2 }}
              className="flex h-full w-full flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
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

              <div ref={postViewerRef} className="flex-1 overflow-y-auto px-4 py-4">
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-8">
                  {viewerItems.map((item) => (
                    <div
                      key={item._id}
                      data-post-id={item._id}
                      className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
                    >
                      {(item.mediaUrls?.length > 0 || item.mediaUrl) && (
                        <ImageCarousel
                          images={item.mediaUrls?.length > 0 ? item.mediaUrls : [item.mediaUrl]}
                        />
                      )}

                      <div className="space-y-3 p-4">
                        {item.content && (
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.content}</p>
                        )}

                        <PostActions
                          postId={item._id}
                          userId={currentUserId}
                          initialLikes={item.likesCount}
                          initialLiked={item.isLiked}
                          initialBookmarked={item.isBookmarked}
                          initialComments={item.commentsCount}
                          initialShares={item.sharesCount}
                        />

                        <div className="flex items-center gap-4 border-t border-border/50 pt-1">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Heart className="w-4 h-4" />
                            <span>{item.likesCount || 0} likes</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MessageCircle className="w-4 h-4" />
                            <span>{item.commentsCount || 0} comments</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{item.sharesCount || 0} shares</span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
                      <button
                        type="button"
                        onClick={() => onViewProfile?.(user._id)}
                        className="flex items-center gap-3 text-left"
                      >
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
                      </button>
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
