import { useState, useEffect, useRef, useCallback } from 'react';
import { FriendlyCard } from './components/FriendlyCard';
import { Home, Film, MessageSquare, Settings, Ghost, LogOut, Shield, Bell, Zap, Plus, User, Search } from 'lucide-react';
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';
import { ChatRoom } from './components/Chat/ChatRoom';
import { CreatePost } from './components/CreatePost';
import { PostActions } from './components/PostActions';
import { FollowButton } from './components/FollowButton';
import { Inbox } from './components/Inbox';
import { CommentsPanel } from './components/CommentsPanel';
import { ReelsTab } from './components/ReelsTab';
import { ImageCarousel } from './components/ImageCarousel';
import { cn } from './lib/utils';
import { Dock } from '../components/ui/dock-two';
import { ThemeSwitch } from './components/ui/ThemeSwitch';
import { NotificationBell } from './components/NotificationBell';
import { NotificationPanel } from './components/NotificationPanel';
// Removed FeatureIdeas component - voting section removed per requirements
import { AdminDashboard } from './components/AdminDashboard';
import { InstagramProfile } from './components/InstagramProfile';
import { EditProfileModal } from './components/EditProfileModal';
import { PostOptions } from './components/PostOptions';
import { SearchPanel } from './components/SearchPanel';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import socket from './services/socket';

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'reels' | 'chat' | 'inbox' | 'profile' | 'settings'>('home');
  const [homeFeedTab, setHomeFeedTab] = useState<'feed' | 'ghost'>('feed');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [showStoryUpload, setShowStoryUpload] = useState(false);

  // Stable refs to avoid stale closures in socket effects
  const fetchChatsRef = useRef<(() => void) | null>(null);
  const chatDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDoubleTapLike = async (postId: string) => {
    try {
      const post = posts.find(p => p._id === postId);
      if (!post || post.isLiked) return;

      setPosts(posts.map(p =>
        p._id === postId ? { ...p, likesCount: p.likesCount + 1, isLiked: true } : p
      ));

      await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('ddu_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsOnboarded(true);
        // Load telegram notifications preference
        if (parsedUser.telegramNotificationsEnabled !== undefined) {
          setTelegramNotificationsEnabled(parsedUser.telegramNotificationsEnabled);
        }
      } catch (e) {
        localStorage.removeItem('ddu_user');
      }
    }

    // Check maintenance mode
    fetch('/api/system/maintenance')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setMaintenanceMode(data.maintenanceMode);
          setMaintenanceMessage(data.maintenanceMessage || '');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOnboarded && activeTab === 'home') {
      fetchPosts();
      fetchStories();
    }
    if (isOnboarded && activeTab === 'chat') {
      fetchChats();
    }
  }, [isOnboarded, activeTab, user?.id]);

  // Join the user's socket room at app level so notifications and messages
  // are received even outside of ChatRoom
  useEffect(() => {
    if (!user?.id) return;

    socket.emit('join_chat', user.id);

    // When a new message arrives, refresh the chat list so the preview updates.
    // Debounce via ref to avoid multiple API calls when several messages arrive at once.
    const handleNewMessage = () => {
      if (chatDebounceRef.current) clearTimeout(chatDebounceRef.current);
      chatDebounceRef.current = setTimeout(() => fetchChatsRef.current?.(), 300);
    };

    socket.on('receive_private_message', handleNewMessage);

    return () => {
      socket.off('receive_private_message', handleNewMessage);
      if (chatDebounceRef.current) clearTimeout(chatDebounceRef.current);
    };
  }, [user?.id]);

  const fetchChats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/users/${user.id}/chats`);
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  }, [user?.id]);

  // Keep the ref in sync so the socket handler always calls the latest version
  useEffect(() => {
    fetchChatsRef.current = fetchChats;
  }, [fetchChats]);

  const fetchPosts = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/posts?userId=${user.id}`);
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        setPosts(data);
      } else {
        const text = await response.text();
        console.error("Non-JSON response from /api/posts:", text);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const fetchStories = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/stories?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }

      const data = await response.json();
      setStoryGroups(sortStoryGroups(data, user.id));
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const handleOnboardingFinish = (userData: any) => {
    setUser(userData);
    setIsOnboarded(true);
    localStorage.setItem('ddu_user', JSON.stringify(userData));
  };

  const handleProfileUpdate = (updatedUser: any) => {
    const mergedUser = { ...user, ...updatedUser };
    setUser(mergedUser);
    localStorage.setItem('ddu_user', JSON.stringify(mergedUser));
  };

  const handleTelegramNotificationsToggle = async () => {
    try {
      const newValue = !telegramNotificationsEnabled;
      const response = await fetch(`/api/users/${user?.id}/telegram-notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newValue })
      });

      if (response.ok) {
        setTelegramNotificationsEnabled(newValue);
        const updatedUser = { ...user, telegramNotificationsEnabled: newValue };
        setUser(updatedUser);
        localStorage.setItem('ddu_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to toggle Telegram notifications:', error);
    }
  };

  const ghostModeEligible = !user?.createdAt || canUseGhostMode(user.createdAt);
  const ghostModeDisabled = !!user?.createdAt && !ghostModeEligible;

  const toggleGhostMode = () => {
    if (ghostModeDisabled) return;
    setIsAnonymous(!isAnonymous);
  };

  if (!isOnboarded) {
    return <OnboardingFlow onFinish={handleOnboardingFinish} />;
  }

  // Show maintenance screen for non-admin users when maintenance mode is active
  if (maintenanceMode && user?.role !== 'admin') {
    return <MaintenanceScreen message={maintenanceMessage} />;
  }

  if (activeChat) {
    return (
      <ChatRoom
        currentUser={user}
        otherUser={activeChat}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  if (showAdminDashboard) {
    return <AdminDashboard userId={user?.id} onClose={() => setShowAdminDashboard(false)} />;
  }

  const sortedStoryGroups = user?.id ? sortStoryGroups(storyGroups, user.id) : storyGroups;
  const ownStoryGroup = sortedStoryGroups.find((group) => group.user._id === user?.id);
  const storyTrayGroups = ownStoryGroup
    ? sortedStoryGroups
    : user
      ? [{
          user: {
            _id: user.id,
            name: user.name,
            username: user.username,
            avatarUrl: user.avatarUrl
          },
          stories: [],
          hasViewed: false
        }, ...sortedStoryGroups]
      : sortedStoryGroups;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tighter text-primary">Social</h1>
          {isAnonymous && (
            <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full border border-border">
              <Ghost size={12} className="text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ghost Mode</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
            aria-label="Search"
          >
            <Search size={20} />
          </button>
          <NotificationBell userId={user?.id} onOpen={() => setShowNotifications(true)} />
          <ThemeSwitch />
          <button
            onClick={toggleGhostMode}
            className={cn(
              "p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed",
              isAnonymous ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
            disabled={ghostModeDisabled}
            title={ghostModeDisabled ? `Ghost mode unlocks after ${GHOST_MODE_MIN_ACCOUNT_AGE_DAYS} days` : 'Ghost mode'}
          >
            <Ghost size={20} />
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center font-bold text-accent overflow-hidden hover:border-accent/50 transition-all"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.name?.[0] || 'U'
            )}
          </button>
        </div>
      </header>

      {showNotifications && (
        <NotificationPanel userId={user?.id} onClose={() => setShowNotifications(false)} />
      )}

      {/* Main Content */}
      <main className="px-6 py-6 max-w-2xl mx-auto">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Feed</h2>
                <p className="text-sm text-muted-foreground">{STORY_LIFETIME_TEXT}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStoryUpload(true)}
                  className="p-2 rounded-full border border-border bg-background hover:bg-muted transition-colors"
                  aria-label="Add story"
                >
                  <Plus size={20} />
                </button>
                <button 
                  onClick={() => setShowCreatePost(!showCreatePost)}
                  className="p-2 bg-primary text-primary-foreground rounded-full"
                  aria-label="Create post"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="border-y border-border/70 bg-background -mx-6 px-6 py-4">
              <div className="flex gap-4 overflow-x-auto pb-1">
                {storyTrayGroups.map((group) => {
                  const hasActiveStory = group.stories.length > 0;
                  const latestStory = group.stories[0];
                  const isOwnStory = group.user._id === user?.id;

                  return (
                    <button
                      key={group.user._id}
                      type="button"
                      onClick={() => {
                        if (!hasActiveStory && isOwnStory) {
                          setShowStoryUpload(true);
                          return;
                        }

                        if (hasActiveStory) {
                          setActiveStoryGroup({
                            ...group,
                            stories: orderStoriesForViewer(group.stories)
                          });
                        }
                      }}
                      className="flex shrink-0 flex-col items-center gap-2 bg-transparent"
                    >
                      <StoryRing
                        hasActiveStory={hasActiveStory}
                        hasViewedAll={group.hasViewed}
                        avatarUrl={group.user.avatarUrl}
                        name={group.user.name}
                        username={group.user._id === user?.id ? 'Your story' : group.user.username}
                        isOwnStory={isOwnStory}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        {hasActiveStory ? getStoryTimeRemaining(latestStory.expiresAt) : 'Add story'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {showCreatePost && (
              <CreatePost 
                user={user} 
                isAnonymous={isAnonymous} 
                onPostCreated={() => {
                  setShowCreatePost(false);
                  const nextScope = isAnonymous ? 'ghost' : 'feed';
                  setHomeFeedTab(nextScope);
                  fetchPosts(nextScope);
                }} 
              />
            )}
            
            {posts.length > 0 ? posts.map((post) => {
              const postDisplayName = post.isAnonymous ? 'Ghost' : (post.userId?.username || post.userId?.name || 'User');

              return (
                <article key={post._id} className="bg-background border-y border-border/70 -mx-6 overflow-hidden">
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {post.isAnonymous ? (
                          <Ghost size={18} className="text-muted-foreground" />
                        ) : post.userId?.avatarUrl ? (
                          <img src={post.userId.avatarUrl} alt={post.userId?.name || 'User'} className="w-full h-full object-cover" />
                        ) : (
                          post.userId?.name?.[0] || 'U'
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{postDisplayName}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!post.isAnonymous && user && post.userId?._id !== user.id && (
                        <FollowButton
                          userId={user.id}
                          targetId={post.userId._id}
                          initialIsFollowing={post.isFollowing}
                        />
                      )}
                      {!post.isAnonymous && (
                        <PostOptions
                          postId={post._id}
                          userId={user?.id}
                          postOwnerId={post.userId?._id}
                          initialContent={post.content}
                          initialMediaUrls={post.mediaUrls || (post.mediaUrl ? [post.mediaUrl] : [])}
                          onDelete={() => {
                            setPosts(posts.filter(p => p._id !== post._id));
                          }}
                          onEdit={(content, mediaUrls) => {
                            setPosts(posts.map(p =>
                              p._id === post._id ? { ...p, content, mediaUrls } : p
                            ));
                          }}
                        />
                      )}
                    </div>
                  </div>
                {post.mediaUrls && post.mediaUrls.length > 0 ? (
                  <ImageCarousel
                    images={post.mediaUrls}
                    onLike={() => handleDoubleTapLike(post._id)}
                  />
                ) : post.mediaUrl ? (
                  <ImageCarousel
                    images={[post.mediaUrl]}
                    onLike={() => handleDoubleTapLike(post._id)}
                  />
                ) : null}
                <div className="px-6 py-4 space-y-3">
                  {post.content && (
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold mr-2">{postDisplayName}</span>
                      {post.content}
                    </p>
                  )}
                  <PostActions
                    postId={post._id}
                    userId={user?.id}
                    initialLikes={post.likesCount}
                    initialLiked={post.isLiked}
                    initialBookmarked={post.isBookmarked}
                    initialComments={post.commentsCount}
                    initialShares={post.sharesCount}
                    onComment={() => setCommentPostId(post._id)}
                  />
                  </div>
                </article>
            )}) : (
              <div className="text-center py-20 text-muted-foreground">
                <p>{homeFeedTab === 'ghost' ? 'No ghost posts yet.' : 'No posts yet. Be the first!'}</p>
                {homeFeedTab === 'ghost' && (
                  <p className="text-sm mt-2">Anonymous posts live here so the main feed stays identity-first.</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reels' && (
          <ReelsTab user={user} />
        )}

        {activeTab === 'chat' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Direct Messages</h2>
            <div className="space-y-2">
              {chats.length > 0 ? chats.map((chat) => (
                <FriendlyCard
                  key={chat.user.id}
                  onClick={() => setActiveChat(chat.user)}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-muted shrink-0 flex items-center justify-center font-bold text-foreground">
                    {chat.user.name?.[0] || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold truncate">{chat.user.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{chat.lastMessage.text}</p>
                  </div>
                </FriendlyCard>
              )) : (
                <div className="text-center py-20 text-muted-foreground">
                  <p>No conversations yet.</p>
                  <p className="text-sm mt-2">Follow people and start chatting!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'inbox' && user && (
          <Inbox userId={user.id} />
        )}

        {activeTab === 'profile' && user && (
          <InstagramProfile
            userId={user.id}
            currentUserId={user.id}
            onEditProfile={() => setShowEditProfile(true)}
          />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Settings</h2>

            {user?.role === 'admin' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Admin</h3>
                <FriendlyCard
                  onClick={() => setShowAdminDashboard(true)}
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-all"
                >
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold">Admin Dashboard</p>
                    <p className="text-xs text-muted-foreground">Manage users, posts, and reels</p>
                  </div>
                </FriendlyCard>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Profile</h3>
              <FriendlyCard className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-2xl font-bold text-accent">
                  {user?.name?.[0] || 'U'}
                </div>
                <div>
                  <p className="font-bold text-lg">{user?.name || 'User'}</p>
                  <p className="text-sm text-white/40">@{user?.username || 'username'}</p>
                </div>
              </FriendlyCard>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Data & Privacy</h3>
              <FriendlyCard className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap size={18} className="text-accent" />
                    <div>
                      <p className="text-sm font-medium">Lite Mode (240p)</p>
                      <p className="text-[10px] text-black/40">Save data on campus Wi-Fi</p>
                    </div>
                  </div>
                  <button className="w-12 h-6 bg-accent rounded-full relative transition-all">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-purple-400" />
                    <div>
                      <p className="text-sm font-medium">Anonymous Mode</p>
                      <p className="text-[10px] text-black/40">Post as Ghost</p>
                    </div>
                  </div>
                  <button 
                    onClick={toggleGhostMode}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                      isAnonymous ? "bg-accent" : "bg-black/10"
                    )}
                    disabled={ghostModeDisabled}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      isAnonymous ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
                  <ul className="space-y-1 list-disc pl-4">
                    <li>Ghost posts are anonymous to other users, but moderators can still trace reported posts internally.</li>
                    <li>Ghost mode unlocks after {GHOST_MODE_MIN_ACCOUNT_AGE_DAYS} days.</li>
                    <li>You can only make 1 ghost post every {GHOST_POST_RATE_LIMIT_HOURS} hours.</li>
                    <li>Comments always use your real profile.</li>
                  </ul>
                </div>
              </FriendlyCard>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Integrations</h3>
              <FriendlyCard className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-accent" />
                    <div>
                      <p className="text-sm font-medium">Telegram Notifications</p>
                      <p className="text-[10px] text-black/40">Receive notifications via Telegram bot</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTelegramNotificationsToggle}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all",
                      telegramNotificationsEnabled ? "bg-accent" : "bg-black/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      telegramNotificationsEnabled ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
                {!user?.telegramChatId && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    ⚠️ Link your Telegram account first to receive notifications
                  </div>
                )}
              </FriendlyCard>
            </div>

            <div className="pt-4 space-y-4">
              <button 
                onClick={() => {
                  localStorage.removeItem('ddu_user');
                  setIsOnboarded(false);
                }}
                className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <LogOut size={18} />
                Logout Account
              </button>

              <div className="text-center space-y-2">
                <a
                  href="https://t.me/dev_envologia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  🐛 Report Bug to @dev_envologia
                </a>
                <br />
                <a
                  href="https://t.me/dev_envologia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  💡 Suggest Feature to @dev_envologia
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {commentPostId && user && (
        <CommentsPanel
          postId={commentPostId}
          userId={user.id}
          isAnonymous={false}
          onClose={() => setCommentPostId(null)}
        />
      )}

      {showEditProfile && user && (
        <EditProfileModal
          user={user}
          isOpen={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          onSave={handleProfileUpdate}
        />
      )}

      {showSearch && (
        <SearchPanel onClose={() => setShowSearch(false)} />
      )}

      {activeStoryGroup && user && (
        <StoryViewer
          stories={activeStoryGroup.stories}
          currentUserId={user.id}
          onClose={() => {
            setActiveStoryGroup(null);
            fetchStories();
          }}
        />
      )}

      {showStoryUpload && user && (
        <StoryUpload
          userId={user.id}
          onClose={() => setShowStoryUpload(false)}
          onUploadSuccess={() => {
            fetchStories();
          }}
        />
      )}

        {/* Bottom Nav */}
        <Dock
          items={[
            { icon: Home, label: 'Home', onClick: () => setActiveTab('home') },
            { icon: Film, label: 'Reels', onClick: () => setActiveTab('reels') },
            { icon: MessageSquare, label: 'Chat', onClick: () => setActiveTab('chat') },
            { icon: User, label: 'Profile', onClick: () => setActiveTab('profile') },
            { icon: Settings, label: 'Settings', onClick: () => setActiveTab('settings') },
          ]}
          className="fixed bottom-0 left-0 right-0 z-40"
        />
      </div>
    );
}
