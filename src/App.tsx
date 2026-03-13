import { useState, useEffect, useRef, useCallback } from 'react';
import { FriendlyCard } from './components/FriendlyCard';
import { Home, Film, MessageSquare, Settings, Ghost, LogOut, Shield, Bell, Zap, Plus, User, Search, Lock, Eye, HelpCircle, Flag, ChevronRight, UserCog, Sparkles, Users, CalendarDays, GraduationCap, Copy, RefreshCw, ExternalLink } from 'lucide-react';
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
import socket from './services/socket';

import { AdminDashboard } from './components/AdminDashboard';
import { InstagramProfile } from './components/InstagramProfile';
import { EditProfileModal } from './components/EditProfileModal';
import { PostOptions } from './components/PostOptions';
import { SearchPanel } from './components/SearchPanel';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { HashtagText } from './components/HashtagText';
import { StoryViewer } from './components/StoryViewer';
import { StoryUpload } from './components/StoryUpload';

import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS, normalizeNotificationSettings } from './utils/notificationSettings';
import { CommunitySection, COMMUNITY_GROUPS, getGroupName, normalizeContentType, getVisibleCommunityPosts } from './utils/community';
import { sortStoryGroups, StoryGroup } from './utils/stories';
import { GHOST_MODE_MIN_ACCOUNT_AGE_DAYS, canUseGhostMode } from './utils/ghostPolicy';
import { getTelegramHandle, getTelegramProfileUrl, getTelegramDeepLink } from './utils/telegram';

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
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [homeSection, setHomeSection] = useState<CommunitySection>('feed');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]);
  const [composerNotice, setComposerNotice] = useState<string | null>(null);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [telegramAuthCode, setTelegramAuthCode] = useState('');
  const [refreshingTelegramCode, setRefreshingTelegramCode] = useState(false);
  const [verifyingTelegram, setVerifyingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [copiedTelegramCode, setCopiedTelegramCode] = useState(false);

  // Stable refs to avoid stale closures in socket effects
  const fetchChatsRef = useRef<(() => void) | null>(null);
  const chatDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Computed values
  const ghostModeDisabled = !canUseGhostMode(user?.createdAt);
  const visiblePosts = getVisibleCommunityPosts(posts, homeSection, selectedGroupId, joinedGroups);
  const botHandle = getTelegramHandle(import.meta.env.VITE_TELEGRAM_BOT_USERNAME);
  const botUrl = getTelegramProfileUrl(import.meta.env.VITE_TELEGRAM_BOT_USERNAME);

  // Notification settings labels for the UI
  const notificationSettingLabels = [
    { key: 'messages' as const, title: 'Direct Messages', description: 'New messages from other users' },
    { key: 'comments' as const, title: 'Comments', description: 'Comments on your posts' },
    { key: 'likes' as const, title: 'Likes', description: 'When someone likes your post' },
    { key: 'follows' as const, title: 'Follows', description: 'New followers' },
    { key: 'mentions' as const, title: 'Mentions', description: 'When someone mentions you' },
    { key: 'shares' as const, title: 'Shares', description: 'When someone shares your post' },
  ];

  const toggleGhostMode = () => {
    if (!ghostModeDisabled) {
      setIsAnonymous(!isAnonymous);
    }
  };

  const toggleGroupMembership = (groupId: string) => {
    setJoinedGroups((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const refreshTelegramAuthCode = useCallback(async (forceNew = false) => {
    if (!user?.id || user.telegramChatId) return;

    if (user.telegramAuthCode && !forceNew) {
      setTelegramAuthCode(user.telegramAuthCode);
      return;
    }

    setRefreshingTelegramCode(true);
    try {
      const response = await fetch('/api/auth/telegram-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setTelegramAuthCode(data.telegramAuthCode);
        const updatedUser = { ...user, telegramAuthCode: data.telegramAuthCode, telegramChatId: undefined };
        setUser(updatedUser);
        localStorage.setItem('ddu_user', JSON.stringify(updatedUser));
        setTelegramStatus('New Telegram code generated. Send it to the bot to link your account.');
      } else {
        const errorText = await response.text();
        setTelegramStatus(errorText || 'Unable to refresh Telegram code right now.');
      }
    } catch (error) {
      console.error('Failed to refresh Telegram auth code:', error);
      setTelegramStatus('Unable to refresh Telegram code right now.');
    } finally {
      setRefreshingTelegramCode(false);
    }
  }, [user]);

  const handleCopyTelegramCode = async () => {
    if (!telegramAuthCode) return;
    try {
      await navigator.clipboard.writeText(telegramAuthCode);
      setCopiedTelegramCode(true);
      setTimeout(() => setCopiedTelegramCode(false), 2000);
    } catch (error) {
      console.error('Failed to copy Telegram code:', error);
    }
  };

  const verifyTelegramLink = async () => {
    if (!telegramAuthCode) return;
    setVerifyingTelegram(true);
    setTelegramStatus(null);

    try {
      const response = await fetch(`/api/auth/verify-telegram/${telegramAuthCode}`);
      const data = await response.json();

      if (data?.verified && data.user) {
        const normalizedUser = {
          ...data.user,
          notificationSettings: normalizeNotificationSettings(data.user.notificationSettings),
        };
        setUser(normalizedUser);
        setTelegramNotificationsEnabled(Boolean(normalizedUser.telegramNotificationsEnabled));
        setNotificationSettings(normalizedUser.notificationSettings);
        setTelegramAuthCode(normalizedUser.telegramAuthCode || telegramAuthCode);
        localStorage.setItem('ddu_user', JSON.stringify(normalizedUser));
        setTelegramStatus('Telegram connected successfully.');
      } else {
        setTelegramStatus(`Still waiting for verification. Send the code to ${botHandle} on Telegram.`);
      }
    } catch (error) {
      console.error('Failed to verify Telegram link:', error);
      setTelegramStatus('Could not verify right now. Please try again in a moment.');
    } finally {
      setVerifyingTelegram(false);
    }
  };

  const handleNotificationSettingToggle = async (key: keyof NotificationSettings) => {
    const updatedSettings = {
      ...notificationSettings,
      [key]: !notificationSettings[key],
    };
    setNotificationSettings(updatedSettings);
    if (user) {
      const optimisticUser = { ...user, notificationSettings: updatedSettings };
      setUser(optimisticUser);
      localStorage.setItem('ddu_user', JSON.stringify(optimisticUser));
    }

    if (!user?.id) return;

    try {
      const response = await fetch(`/api/users/${user.id}/telegram-notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: telegramNotificationsEnabled, settings: updatedSettings })
      });

      if (response.ok) {
        const data = await response.json();
        const nextSettings = normalizeNotificationSettings(data.notificationSettings);
        setNotificationSettings(nextSettings);
        const updatedUser = {
          ...user,
          telegramNotificationsEnabled: data.telegramNotificationsEnabled,
          notificationSettings: nextSettings,
        };
        setUser(updatedUser);
        localStorage.setItem('ddu_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  };

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
        setNotificationSettings(normalizeNotificationSettings(parsedUser.notificationSettings));
        if (parsedUser.telegramAuthCode) {
          setTelegramAuthCode(parsedUser.telegramAuthCode);
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
    if (!user?.id || user.telegramChatId) return;
    refreshTelegramAuthCode();
  }, [user?.id, user?.telegramChatId, refreshTelegramAuthCode]);

  useEffect(() => {
    if (user?.telegramChatId) {
      setTelegramStatus(null);
    }
  }, [user?.telegramChatId]);

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
    const normalizedUser = {
      ...userData,
      notificationSettings: normalizeNotificationSettings(userData.notificationSettings),
    };
    setUser(normalizedUser);
    setIsOnboarded(true);
    setTelegramNotificationsEnabled(Boolean(normalizedUser.telegramNotificationsEnabled));
    setNotificationSettings(normalizedUser.notificationSettings);
    if (normalizedUser.telegramAuthCode) {
      setTelegramAuthCode(normalizedUser.telegramAuthCode);
    }
    localStorage.setItem('ddu_user', JSON.stringify(normalizedUser));
  };

  const handleProfileUpdate = (updatedUser: any) => {
    const mergedUser = {
      ...user,
      ...updatedUser,
      notificationSettings: normalizeNotificationSettings(updatedUser.notificationSettings ?? user?.notificationSettings),
    };
    setUser(mergedUser);
    setNotificationSettings(mergedUser.notificationSettings);
    localStorage.setItem('ddu_user', JSON.stringify(mergedUser));
  };

  const handleTelegramNotificationsToggle = async () => {
    const newValue = !telegramNotificationsEnabled;
    setTelegramNotificationsEnabled(newValue);

    if (user) {
      const optimisticUser = { ...user, telegramNotificationsEnabled: newValue, notificationSettings };
      setUser(optimisticUser);
      localStorage.setItem('ddu_user', JSON.stringify(optimisticUser));
    }

    if (!user?.id) return;

    try {
      const response = await fetch(`/api/users/${user.id}/telegram-notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newValue, settings: notificationSettings })
      });

      if (response.ok) {
        const data = await response.json();
        setTelegramNotificationsEnabled(data.telegramNotificationsEnabled);
        const nextSettings = normalizeNotificationSettings(data.notificationSettings);
        setNotificationSettings(nextSettings);
        const updatedUser = {
          ...user,
          telegramNotificationsEnabled: data.telegramNotificationsEnabled,
          notificationSettings: nextSettings,
        };
        setUser(updatedUser);
        localStorage.setItem('ddu_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to toggle Telegram notifications:', error);
    }
  };

  const openProfile = (targetUserId?: string | null) => {
    if (!targetUserId) return;
    setViewingProfileUserId(targetUserId);
    setActiveTab('profile');
    setShowSearch(false);
  };

  const openOwnProfile = () => {
    if (!user?.id) return;
    setViewingProfileUserId(user.id);
    setActiveTab('profile');
  };

  const startChatWithUser = (targetUser: any) => {
    if (!targetUser) return;

    const normalizedUser = {
      id: targetUser.id || targetUser._id,
      name: targetUser.name || 'User',
      username: targetUser.username || '',
      avatarUrl: targetUser.avatarUrl || '',
    };

    if (!normalizedUser.id || normalizedUser.id === user?.id) return;

    setActiveChat(normalizedUser);
    setShowSearch(false);
  };

  const openHashtagSearch = (hashtag: string) => {
    setSearchInitialQuery(hashtag);
    setShowSearch(true);
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
            onClick={openOwnProfile}
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
            <FriendlyCard className="space-y-5 border border-primary/10 bg-gradient-to-br from-background via-background to-primary/10 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                    <Sparkles size={14} />
                    Campus Hub
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {homeSection === 'feed'
                        ? 'Campus feed'
                        : homeSection === 'groups'
                          ? 'Student groups'
                          : homeSection === 'events'
                            ? 'Events board'
                            : 'Academic updates'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {homeSection === 'feed'
                        ? 'Share updates, announcements, and quick posts in one place.'
                        : homeSection === 'groups'
                          ? 'Join community spaces and post directly into the group conversations you care about.'
                          : homeSection === 'events'
                            ? 'Students can request events with title, photo, time, and place for admin approval.'
                            : 'Admins can publish official academic news, notices, and college updates here.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreatePost(!showCreatePost)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90"
                  disabled={homeSection === 'academics' && user?.role !== 'admin'}
                >
                  <Plus size={18} />
                  {homeSection === 'events' ? 'Request Event' : homeSection === 'academics' ? 'Post News' : 'Create'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'feed', label: 'Feed', icon: Home },
                  { id: 'groups', label: 'Groups', icon: Users },
                  { id: 'events', label: 'Events', icon: CalendarDays },
                  { id: 'academics', label: 'Academics', icon: GraduationCap },
                ].map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setHomeSection(section.id as CommunitySection);
                      setShowCreatePost(false);
                      setComposerNotice(null);
                    }}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                      homeSection === section.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <section.icon size={16} />
                    {section.label}
                  </button>
                ))}
              </div>

              {homeSection === 'groups' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedGroupId('all')}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                        selectedGroupId === 'all' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      All groups
                    </button>
                    {joinedGroups.map((groupId) => (
                      <button
                        key={groupId}
                        onClick={() => setSelectedGroupId(groupId)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                          selectedGroupId === groupId ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {getGroupName(groupId)}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {COMMUNITY_GROUPS.map((group) => {
                      const joined = joinedGroups.includes(group.id);
                      return (
                        <FriendlyCard
                          key={group.id}
                          className={cn('space-y-3 border border-border/80 bg-gradient-to-br', group.accent)}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-bold">{group.name}</p>
                              <span className="rounded-full bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                {group.membersLabel}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{group.summary}</p>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <button
                              onClick={() => {
                                toggleGroupMembership(group.id);
                                setComposerNotice(null);
                              }}
                              className={cn(
                                'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                                joined ? 'bg-foreground text-background' : 'bg-primary text-primary-foreground'
                              )}
                            >
                              {joined ? 'Leave group' : 'Join group'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedGroupId(group.id);
                                setHomeSection('groups');
                              }}
                              className="text-xs font-semibold text-muted-foreground"
                            >
                              Open
                            </button>
                          </div>
                        </FriendlyCard>
                      );
                    })}
                  </div>
                </div>
              )}
            </FriendlyCard>

            {composerNotice && (
              <FriendlyCard className="border border-emerald-500/20 bg-emerald-500/10 text-sm text-emerald-700 dark:text-emerald-300">
                {composerNotice}
              </FriendlyCard>
            )}

            {showCreatePost && (
              <CreatePost
                user={user}
                isAnonymous={isAnonymous}
                currentSection={homeSection}
                selectedGroupId={selectedGroupId}
                joinedGroupIds={joinedGroups}
                onPostCreated={(createdPost) => {
                  setShowCreatePost(false);
                  if (createdPost?.approvalStatus === 'pending') {
                    setComposerNotice('Your event request was submitted for admin approval and will appear after review.');
                  } else if (createdPost?.contentType === 'announcement') {
                    setComposerNotice('Announcement published across the feed and groups.');
                  } else if (createdPost?.contentType === 'academic') {
                    setComposerNotice('Academic update published successfully.');
                  } else {
                    setComposerNotice(null);
                  }
                  fetchPosts();
                }}
              />
            )}

            {homeSection === 'academics' && user?.role !== 'admin' && (
              <FriendlyCard className="border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                Only admins can create academic news, but everyone can read the published updates here.
              </FriendlyCard>
            )}

            {homeSection === 'groups' && joinedGroups.length === 0 && (
              <FriendlyCard className="border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                Join a group above to start posting in group conversations.
              </FriendlyCard>
            )}

            {visiblePosts.length > 0 ? visiblePosts.map((post) => {
              const contentType = normalizeContentType(post.contentType);
              return (
              <FriendlyCard key={post._id} className="space-y-4 p-0 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => !post.isAnonymous && openProfile(post.userId?._id)}
                      disabled={post.isAnonymous || !post.userId?._id}
                      className="flex items-center gap-3 text-left disabled:cursor-default"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {post.isAnonymous ? <Ghost size={16} className="text-muted-foreground" /> : (post.userId?.name?.[0] || 'U')}
                      </div>
                      <div>
                        <p className="text-sm font-bold hover:text-primary transition-colors">{post.isAnonymous ? 'Ghost' : (post.userId?.name || 'User')}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</p>
                      </div>
                    </button>
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
                <div className="p-4 space-y-2">
                  <HashtagText
                    text={post.content}
                    className="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
                    onHashtagClick={openHashtagSearch}
                  />
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
              </FriendlyCard>
            );
            }) : (
              <div className="text-center py-20 text-muted-foreground">
                <p>
                  {homeSection === 'groups'
                    ? 'No group posts yet. Share the first update with your community.'
                    : homeSection === 'events'
                      ? 'No approved events yet. Request one to get things started.'
                      : homeSection === 'academics'
                        ? 'No academic news yet.'
                        : 'No posts yet. Be the first!'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reels' && (
          <ReelsTab user={user} onViewProfile={openProfile} onHashtagClick={openHashtagSearch} />
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
            userId={viewingProfileUserId || user.id}
            currentUserId={user.id}
            currentUser={user}
            onEditProfile={() => setShowEditProfile(true)}
            onBack={viewingProfileUserId && viewingProfileUserId !== user.id ? openOwnProfile : undefined}
            onMessageUser={startChatWithUser}
          />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Settings</h2>

            {user?.role === 'admin' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Admin</h3>
                <FriendlyCard
                  onClick={() => setShowAdminDashboard(true)}
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-all"
                >
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">Admin Dashboard</p>
                    <p className="text-xs text-muted-foreground">Manage users, posts, and reels</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </FriendlyCard>
              </div>
            )}

            {/* Account Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Account</h3>
              <FriendlyCard className="divide-y divide-border">
                <div
                  onClick={() => setShowEditProfile(true)}
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center text-xl font-bold overflow-hidden">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary">{user?.name?.[0] || 'U'}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{user?.name || 'User'}</p>
                    <p className="text-sm text-muted-foreground">@{user?.username || 'username'}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
                <div
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-all"
                >
                  <UserCog size={20} className="text-muted-foreground" />
                  <span className="text-sm flex-1">Edit Profile</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </FriendlyCard>
            </div>

            {/* Privacy & Security */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Privacy & Security</h3>
              <FriendlyCard className="space-y-0 divide-y divide-border">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Eye size={18} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Anonymous Mode</p>
                      <p className="text-[10px] text-muted-foreground">Post as Ghost</p>
                    </div>
                  </div>
                  <button 
                    onClick={toggleGhostMode}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all",
                      isAnonymous ? "bg-primary" : "bg-muted"
                    )}
                    disabled={ghostModeDisabled}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                      isAnonymous ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Lite Mode (240p)</p>
                      <p className="text-[10px] text-muted-foreground">Save data on campus Wi-Fi</p>
                    </div>
                  </div>
                  <button className="w-12 h-6 bg-muted rounded-full relative transition-all">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              </FriendlyCard>
            </div>

            {/* Notifications */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Notifications</h3>
              <FriendlyCard className="space-y-0 divide-y divide-border">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Telegram Notifications</p>
                      <p className="text-[10px] text-muted-foreground">Receive notifications via Telegram bot</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTelegramNotificationsToggle}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all",
                      telegramNotificationsEnabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                      telegramNotificationsEnabled ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
                {!user?.telegramChatId && (
                  <div className="p-4 space-y-3 bg-muted/40 border-t border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Connect Telegram to receive alerts</p>
                        <p className="text-xs text-muted-foreground">
                          Open {botHandle} on Telegram and send this code to link your account.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => refreshTelegramAuthCode(true)}
                        disabled={refreshingTelegramCode}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-60"
                      >
                        <RefreshCw size={14} className={refreshingTelegramCode ? 'animate-spin' : ''} />
                        {refreshingTelegramCode ? 'Generating' : 'New code'}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-center font-mono text-lg px-4 py-3 rounded-xl border border-dashed border-border bg-background/60 text-primary tracking-widest">
                        {telegramAuthCode || '------'}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyTelegramCode}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-xs"
                      >
                        <Copy size={14} />
                        {copiedTelegramCode ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={telegramAuthCode ? getTelegramDeepLink(telegramAuthCode, import.meta.env.VITE_TELEGRAM_BOT_USERNAME) : botUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-colors"
                      >
                        Open bot &amp; verify
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={verifyTelegramLink}
                        disabled={verifyingTelegram}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-xs disabled:opacity-60"
                      >
                        {verifyingTelegram ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            Checking...
                          </>
                        ) : "I've sent the code"}
                      </button>
                    </div>
                    {telegramStatus && (
                      <div className="text-xs text-muted-foreground">{telegramStatus}</div>
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Detailed notification settings</p>
                      <p className="text-xs text-muted-foreground">
                        Choose which updates the Telegram bot should surface for your account.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {notificationSettingLabels.map((setting) => (
                      <div
                        key={setting.key}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">{setting.title}</p>
                          <p className="text-xs text-muted-foreground">{setting.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleNotificationSettingToggle(setting.key)}
                          className={cn(
                            'w-12 h-6 rounded-full relative transition-all',
                            notificationSettings[setting.key] ? 'bg-accent' : 'bg-muted'
                          )}
                        >
                          <div
                            className={cn(
                              'absolute top-1 w-4 h-4 bg-white rounded-full transition-all',
                              notificationSettings[setting.key] ? 'right-1' : 'left-1'
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </FriendlyCard>
            </div>

            {/* Help & Support */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Help & Support</h3>
              <FriendlyCard className="space-y-0 divide-y divide-border">
                <a
                  href="https://t.me/dev_envologia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-all"
                >
                  <Flag size={18} className="text-muted-foreground" />
                  <span className="text-sm flex-1">Report a Bug</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </a>
                <a
                  href="https://t.me/dev_envologia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-all"
                >
                  <HelpCircle size={18} className="text-muted-foreground" />
                  <span className="text-sm flex-1">Suggest a Feature</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </a>
              </FriendlyCard>
            </div>

            {/* Logout */}
            <div className="pt-2">
              <button 
                onClick={() => {
                  localStorage.removeItem('ddu_user');
                  setIsOnboarded(false);
                }}
                className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <LogOut size={18} />
                Log Out
              </button>

              <p className="text-center text-[10px] text-muted-foreground mt-4">
                Contact admin: <a href="https://t.me/dev_envologia" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@dev_envologia</a>
              </p>
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
          onViewProfile={openProfile}
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
        <SearchPanel
          currentUserId={user?.id}
          initialQuery={searchInitialQuery}
          onClose={() => {
            setShowSearch(false);
            setSearchInitialQuery('');
          }}
          onViewProfile={openProfile}
          onStartChat={startChatWithUser}
        />
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
            { icon: User, label: 'Profile', onClick: openOwnProfile },
            { icon: Settings, label: 'Settings', onClick: () => setActiveTab('settings') },
          ]}
          className="fixed bottom-0 left-0 right-0 z-40"
        />
      </div>
    );
}
