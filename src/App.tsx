import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { FriendlyCard } from './components/FriendlyCard';
import { Home, MessageSquare, Settings, Ghost, LogOut, Shield, Bell, Zap, Plus, User, Search, Lock, Eye, HelpCircle, Flag, ChevronRight, UserCog, Sparkles, Users, CalendarDays, GraduationCap, Copy, RefreshCw, ExternalLink, X } from 'lucide-react';
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';
import { PostActions } from './components/PostActions';
import { FollowButton } from './components/FollowButton';
import { CommentsPanel } from './components/CommentsPanel';
import { ImageCarousel } from './components/ImageCarousel';
import { cn } from './lib/utils';
import { Dock } from '../components/ui/dock-two';
import { ThemeSwitch } from './components/ui/ThemeSwitch';
import { NotificationBell } from './components/NotificationBell';
import socket from './services/socket';
import { PostOptions } from './components/PostOptions';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { HashtagText } from './components/HashtagText';

import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS, normalizeNotificationSettings } from './utils/notificationSettings';
import { CommunitySection, COMMUNITY_GROUPS, getGroupName, normalizeContentType, getVisibleCommunityPosts } from './utils/community';
import { sortStoryGroups, StoryGroup } from './utils/stories';
import { GHOST_MODE_MIN_ACCOUNT_AGE_DAYS, canUseGhostMode } from './utils/ghostPolicy';
import { getTelegramHandle, getTelegramProfileUrl, getTelegramDeepLink } from './utils/telegram';
import { getStoredDataSaverMode, setStoredDataSaverMode, shouldEnableDataSaverByDefault } from './utils/performance';

const ChatRoom = lazy(() => import('./components/Chat/ChatRoom').then((m) => ({ default: m.ChatRoom })));
const CreatePost = lazy(() => import('./components/CreatePost').then((m) => ({ default: m.CreatePost })));
const Inbox = lazy(() => import('./components/Inbox').then((m) => ({ default: m.Inbox })));
const NotificationPanel = lazy(() => import('./components/NotificationPanel').then((m) => ({ default: m.NotificationPanel })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const InstagramProfile = lazy(() => import('./components/InstagramProfile').then((m) => ({ default: m.InstagramProfile })));
const EditProfileModal = lazy(() => import('./components/EditProfileModal').then((m) => ({ default: m.EditProfileModal })));
const SearchPanel = lazy(() => import('./components/SearchPanel').then((m) => ({ default: m.SearchPanel })));
const StoryViewer = lazy(() => import('./components/StoryViewer').then((m) => ({ default: m.StoryViewer })));
const StoryUpload = lazy(() => import('./components/StoryUpload').then((m) => ({ default: m.StoryUpload })));

function LazyScreenFallback({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'inbox' | 'profile' | 'settings'>('home');
  const [homeFeedTab, setHomeFeedTab] = useState<'feed' | 'ghost'>('feed');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [profileSelectedPost, setProfileSelectedPost] = useState<any | null>(null);
  const profileReturnRef = useRef<{ tab: typeof activeTab; viewingProfileUserId: string | null } | null>(null);
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
  const [liteModeEnabled, setLiteModeEnabled] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Stable refs to avoid stale closures in socket effects
  const fetchChatsRef = useRef<(() => void) | null>(null);
  const chatDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Computed values
  const ghostModeDisabled = !canUseGhostMode(user?.createdAt);
  const visiblePosts = getVisibleCommunityPosts(posts, homeSection, selectedGroupId, joinedGroups);
  const botHandle = getTelegramHandle(import.meta.env.VITE_TELEGRAM_BOT_USERNAME);
  const botUrl = getTelegramProfileUrl(import.meta.env.VITE_TELEGRAM_BOT_USERNAME);
  const supportContactUrl = 'https://t.me/dev_envologia';

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
        const updatedUser = normalizeUser({ ...user, telegramAuthCode: data.telegramAuthCode, telegramChatId: undefined });
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
      setSettingsNotice({ type: 'success', message: 'Telegram code copied.' });
      setTimeout(() => setCopiedTelegramCode(false), 2000);
    } catch (error) {
      console.error('Failed to copy Telegram code:', error);
      setSettingsNotice({ type: 'error', message: 'Unable to copy Telegram code right now.' });
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
        const normalizedUser = normalizeUser({
          ...data.user,
          notificationSettings: normalizeNotificationSettings(data.user.notificationSettings),
        });
        setUser(normalizedUser);
        setTelegramNotificationsEnabled(Boolean(normalizedUser.telegramNotificationsEnabled));
        setNotificationSettings(normalizedUser.notificationSettings);
        setTelegramAuthCode(normalizedUser.telegramAuthCode || telegramAuthCode);
        localStorage.setItem('ddu_user', JSON.stringify(normalizedUser));
        setTelegramStatus('Telegram connected successfully.');
        setSettingsNotice({ type: 'success', message: 'Telegram connected successfully.' });
      } else {
        setTelegramStatus(`Still waiting for verification. Send the code to ${botHandle} on Telegram.`);
      }
    } catch (error) {
      console.error('Failed to verify Telegram link:', error);
      setTelegramStatus('Could not verify right now. Please try again in a moment.');
      setSettingsNotice({ type: 'error', message: 'Telegram verification failed. Please try again.' });
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
      const optimisticUser = normalizeUser({ ...user, notificationSettings: updatedSettings });
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
        const normalizedUpdatedUser = normalizeUser(updatedUser);
        setUser(normalizedUpdatedUser);
        localStorage.setItem('ddu_user', JSON.stringify(normalizedUpdatedUser));
        const label = notificationSettingLabels.find((item) => item.key === key)?.title || 'Notification setting';
        setSettingsNotice({ type: 'success', message: `${updatedSettings[key] ? 'Enabled' : 'Disabled'} ${label}.` });
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      setSettingsNotice({ type: 'error', message: 'Failed to update notification setting.' });
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

  const normalizeUser = useCallback((raw: any) => {
    if (!raw) return raw;
    const id = raw.id || raw._id?.toString?.() || raw._id;
    return { ...raw, id };
  }, []);

  const didHandleDeepLinkRef = useRef(false);

  useEffect(() => {
    const storedLiteMode = getStoredDataSaverMode();
    setLiteModeEnabled(storedLiteMode ?? shouldEnableDataSaverByDefault());

    const savedUser = localStorage.getItem('ddu_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const normalized = normalizeUser(parsedUser);
        setUser(normalized);
        setIsOnboarded(true);
        // Load telegram notifications preference
        if (normalized.telegramNotificationsEnabled !== undefined) {
          setTelegramNotificationsEnabled(normalized.telegramNotificationsEnabled);
        }
        setNotificationSettings(normalizeNotificationSettings(normalized.notificationSettings));
        if (normalized.telegramAuthCode) {
          setTelegramAuthCode(normalized.telegramAuthCode);
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

  // Handle deep links (e.g. from Telegram) like /?chatWith=<userId>&messageId=<messageId>
  useEffect(() => {
    if (didHandleDeepLinkRef.current) return;
    if (!isOnboarded || !user?.id) return;

    const params = new URLSearchParams(window.location.search);
    const chatWith = params.get('chatWith');
    const messageId = params.get('messageId');
    if (!chatWith) return;

    didHandleDeepLinkRef.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/users/${chatWith}/profile?currentUserId=${user.id}`);
        if (!res.ok) return;
        const data = await res.json();
        const other = data?.user || data;
        if (!other) return;
        const normalizedOther = {
          id: other.id || other._id,
          name: other.name || other.username || 'User',
          username: other.username || '',
          avatarUrl: other.avatarUrl || '',
        };
        // Store focus target so ChatRoom can scroll to it
        if (messageId) {
          sessionStorage.setItem('ddu_focus_message_id', messageId);
        }
        startChatWithUser(normalizedOther);
      } catch {
        // ignore deep link failures
      }
    })();
  }, [isOnboarded, user?.id]);

  useEffect(() => {
    setStoredDataSaverMode(liteModeEnabled);
  }, [liteModeEnabled]);

  useEffect(() => {
    if (!settingsNotice) return;

    const timeout = setTimeout(() => setSettingsNotice(null), 2500);
    return () => clearTimeout(timeout);
  }, [settingsNotice]);

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
      fetchSuggestions();
    }
    if (isOnboarded && activeTab === 'chat') {
      fetchChats();
    }
  }, [isOnboarded, activeTab, user?.id, liteModeEnabled]);

  useEffect(() => {
    const handleFollowChanged = () => {
      fetchSuggestions();
      if (activeTab === 'home') {
        fetchPosts();
      }
    };

    window.addEventListener('social:follow-changed', handleFollowChanged as EventListener);
    return () => window.removeEventListener('social:follow-changed', handleFollowChanged as EventListener);
  }, [activeTab, fetchSuggestions]);

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
    socket.on('message_sent', handleNewMessage);

    return () => {
      socket.off('receive_private_message', handleNewMessage);
      socket.off('message_sent', handleNewMessage);
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
      const limit = liteModeEnabled ? 20 : 50;
      const response = await fetch(`/api/posts?userId=${user.id}&limit=${limit}`);
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

  async function fetchSuggestions() {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/users/${user.id}/suggestions?limit=6`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }

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
    const normalizedUser = normalizeUser({
      ...userData,
      notificationSettings: normalizeNotificationSettings(userData.notificationSettings),
    });
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
    const normalized = normalizeUser(mergedUser);
    setUser(normalized);
    setNotificationSettings(mergedUser.notificationSettings);
    localStorage.setItem('ddu_user', JSON.stringify(normalized));
  };

  const handleTelegramNotificationsToggle = async () => {
    const newValue = !telegramNotificationsEnabled;
    setTelegramNotificationsEnabled(newValue);

    if (user) {
      const optimisticUser = { ...user, telegramNotificationsEnabled: newValue, notificationSettings };
      const normalizedOptimisticUser = normalizeUser(optimisticUser);
      setUser(normalizedOptimisticUser);
      localStorage.setItem('ddu_user', JSON.stringify(normalizedOptimisticUser));
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
        const normalizedUpdatedUser = normalizeUser(updatedUser);
        setUser(normalizedUpdatedUser);
        localStorage.setItem('ddu_user', JSON.stringify(normalizedUpdatedUser));
        setSettingsNotice({ type: 'success', message: `Telegram notifications ${data.telegramNotificationsEnabled ? 'enabled' : 'disabled'}.` });
      }
    } catch (error) {
      console.error('Failed to toggle Telegram notifications:', error);
      setSettingsNotice({ type: 'error', message: 'Failed to update Telegram notifications.' });
    }
  };

  const openSupportLink = (topic: 'bug' | 'feature') => {
    const message =
      topic === 'bug'
        ? 'Hi, I want to report a bug in DDU.'
        : 'Hi, I want to suggest a feature for DDU.';

    const url = `${supportContactUrl}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setSettingsNotice({ type: 'success', message: topic === 'bug' ? 'Opening bug report chat.' : 'Opening feature request chat.' });
  };

  const handleLogout = () => {
    localStorage.removeItem('ddu_user');
    setIsOnboarded(false);
    setUser(null);
    setPosts([]);
    setChats([]);
    setStoryGroups([]);
    setActiveStoryGroup(null);
    setProfileModalUserId(null);
    setProfileSelectedPost(null);
    setViewingProfileUserId(null);
    setShowEditProfile(false);
    setShowAdminDashboard(false);
    setShowNotifications(false);
    setShowSearch(false);
    setShowCreatePost(false);
    setShowCreateMenu(false);
    setShowStoryUpload(false);
    setCommentPostId(null);
    setActiveChat(null);
    setActiveTab('home');
    setHomeSection('feed');
    setSelectedGroupId('all');
    setJoinedGroups([]);
    setIsAnonymous(false);
    setTelegramNotificationsEnabled(false);
    setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    setTelegramAuthCode('');
    setTelegramStatus(null);
  };

  const openProfile = (targetUserId?: string | null, options?: { selectedPost?: any | null }) => {
    if (!targetUserId) return;
    if (!profileModalUserId) {
      profileReturnRef.current = { tab: activeTab, viewingProfileUserId };
    }
    setProfileModalUserId(targetUserId);
    setViewingProfileUserId(targetUserId);
    setProfileSelectedPost(options?.selectedPost || null);
    setShowSearch(false);
  };

  const openOwnProfile = () => {
    if (!user?.id) return;
    if (!profileModalUserId) {
      profileReturnRef.current = { tab: activeTab, viewingProfileUserId };
    }
    setProfileModalUserId(user.id);
    setViewingProfileUserId(user.id);
    setProfileSelectedPost(null);
  };

  const closeProfileModal = () => {
    setProfileModalUserId(null);
    setProfileSelectedPost(null);
    const ret = profileReturnRef.current;
    if (ret) {
      setActiveTab(ret.tab);
      setViewingProfileUserId(ret.viewingProfileUserId);
    }
    profileReturnRef.current = null;
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

    setActiveTab('chat');
    setActiveChat(normalizedUser);
    setShowSearch(false);
    setProfileModalUserId(null);
    setViewingProfileUserId(null);
    fetchChats();
  };

  const openCreateMenu = () => setShowCreateMenu(true);

  const startCreatePost = () => {
    setShowCreateMenu(false);
    setShowCreatePost(true);
  };

  const startCreateStory = () => {
    setShowCreateMenu(false);
    setShowStoryUpload(true);
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
    const focusMessageId = sessionStorage.getItem('ddu_focus_message_id') || undefined;
    return (
      <Suspense fallback={<LazyScreenFallback label="Loading chat..." />}>
        <ChatRoom
          currentUser={user}
          otherUser={activeChat}
          focusMessageId={focusMessageId}
          onBack={() => {
            setActiveChat(null);
            setActiveTab('chat');
            fetchChats();
          }}
          onViewProfile={openProfile}
        />
      </Suspense>
    );
  }

  if (showAdminDashboard) {
    return (
      <Suspense fallback={<LazyScreenFallback label="Loading admin tools..." />}>
        <AdminDashboard userId={user?.id} onClose={() => setShowAdminDashboard(false)} />
      </Suspense>
    );
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
        <Suspense fallback={<LazyScreenFallback label="Loading notifications..." />}>
          <NotificationPanel
            userId={user?.id}
            onClose={() => setShowNotifications(false)}
            onNavigate={(n) => {
              setShowNotifications(false);
              if (n.relatedUserId) {
                openProfile(n.relatedUserId);
                return;
              }
              if (n.relatedPostId) {
                // For now: go home; a dedicated post modal will be added next
                setActiveTab('home');
                return;
              }
            }}
          />
        </Suspense>
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
                  onClick={openCreateMenu}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90"
                  disabled={homeSection === 'academics' && user?.role !== 'admin'}
                >
                  <Plus size={18} />
                  Create
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
              <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 className="text-lg font-bold">Create</h2>
                  <button
                    type="button"
                    onClick={() => setShowCreatePost(false)}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl w-full mx-auto">
                  <Suspense fallback={<LazyScreenFallback label="Loading composer..." />}>
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
                  </Suspense>
                </div>
              </div>
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

            {homeSection === 'feed' && suggestedUsers.length > 0 && (
              <FriendlyCard className="space-y-4 border border-border/60 bg-card/70">
                <div>
                  <h3 className="text-base font-bold">Suggested for you</h3>
                  <p className="text-sm text-muted-foreground">People you may know from mutual connections.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {suggestedUsers.map((suggestion) => (
                    <div key={suggestion.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3">
                      <button
                        type="button"
                        onClick={() => openProfile(suggestion.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold">
                          {suggestion.avatarUrl ? (
                            <img src={suggestion.avatarUrl} alt={suggestion.name} className="h-full w-full object-cover" />
                          ) : (
                            suggestion.name?.[0] || 'U'
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{suggestion.username}</p>
                          <p className="truncate text-xs text-muted-foreground">{suggestion.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {suggestion.mutualCount > 0
                              ? `${suggestion.mutualCount} mutual connection${suggestion.mutualCount === 1 ? '' : 's'}`
                              : 'New on campus'}
                          </p>
                        </div>
                      </button>
                      <FollowButton
                        userId={user?.id}
                        targetId={suggestion.id}
                        initialIsFollowing={false}
                        className="shrink-0 rounded-lg px-3 py-2 text-xs"
                        onChange={(isFollowing) => {
                          if (isFollowing) {
                            setSuggestedUsers((prev) => prev.filter((item) => item.id !== suggestion.id));
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </FriendlyCard>
            )}

            {visiblePosts.length > 0 ? visiblePosts.map((post) => {
              const contentType = normalizeContentType(post.contentType);
              return (
              <FriendlyCard key={post._id} className="p-0 overflow-hidden border border-border/60 shadow-sm">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => !post.isAnonymous && openProfile(post.userId?._id)}
                      disabled={post.isAnonymous || !post.userId?._id}
                      className="flex items-center gap-3 text-left disabled:cursor-default group"
                    >
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border shrink-0">
                        {post.isAnonymous ? (
                          <Ghost size={16} className="text-muted-foreground" />
                        ) : post.userId?.avatarUrl ? (
                          <img src={post.userId.avatarUrl} alt={post.userId.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">{post.userId?.name?.[0] || 'U'}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold group-hover:text-primary transition-colors">{post.isAnonymous ? 'Ghost' : (post.userId?.name || 'User')}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </button>
                  </div>
                </div>
                {post.mediaUrls && post.mediaUrls.length > 0 ? (
                  <div
                    onClick={() => !post.isAnonymous && openProfile(post.userId?._id, { selectedPost: post })}
                    className={cn('block w-full text-left', !post.isAnonymous && post.userId?._id ? 'cursor-pointer' : '')}
                  >
                    <ImageCarousel
                      images={post.mediaUrls}
                      onLike={() => handleDoubleTapLike(post._id)}
                      dataSaverEnabled={liteModeEnabled}
                    />
                  </div>
                ) : post.mediaUrl ? (
                  <div
                    onClick={() => !post.isAnonymous && openProfile(post.userId?._id, { selectedPost: post })}
                    className={cn('block w-full text-left', !post.isAnonymous && post.userId?._id ? 'cursor-pointer' : '')}
                  >
                    <ImageCarousel
                      images={[post.mediaUrl]}
                      onLike={() => handleDoubleTapLike(post._id)}
                      dataSaverEnabled={liteModeEnabled}
                    />
                  </div>
                ) : null}
                <div className="px-4 py-3 space-y-2">
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
                  <div className="w-12 h-12 rounded-full bg-muted shrink-0 flex items-center justify-center overflow-hidden font-bold text-foreground">
                    {chat.user.avatarUrl ? (
                      <img src={chat.user.avatarUrl} alt={chat.user.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      chat.user.name?.[0] || 'U'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold truncate">{chat.user.name}</p>
                      <div className="flex items-center gap-2">
                        {chat.lastMessage.unreadCount > 0 && (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            {chat.lastMessage.unreadCount}
                          </span>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <p className={cn('text-xs truncate', chat.lastMessage.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {chat.lastMessage.isMine ? 'You: ' : ''}
                      {chat.lastMessage.text}
                    </p>
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
          <Suspense fallback={<LazyScreenFallback label="Loading inbox..." />}>
            <Inbox userId={user.id} onViewProfile={openProfile} />
          </Suspense>
        )}

        {/* Profile is now full-screen modal so it behaves like Instagram */}
        {profileModalUserId && user && (
          <div className="fixed inset-0 z-50 bg-background">
            <div className="h-full overflow-y-auto">
              <Suspense fallback={<LazyScreenFallback label="Loading profile..." />}>
                <InstagramProfile
                  userId={profileModalUserId}
                  currentUserId={user.id}
                  currentUser={user}
                  dataSaverEnabled={liteModeEnabled}
                  initialSelectedPost={profileSelectedPost}
                  onEditProfile={() => setShowEditProfile(true)}
                  onBack={closeProfileModal}
                  onClose={closeProfileModal}
                  onOpenSettings={() => {
                    closeProfileModal();
                    setActiveTab('settings');
                  }}
                  onMessageUser={startChatWithUser}
                  onViewProfile={openProfile}
                />
              </Suspense>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Settings</h2>

            {settingsNotice && (
              <FriendlyCard
                className={cn(
                  'border text-sm',
                  settingsNotice.type === 'success'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300'
                )}
              >
                {settingsNotice.message}
              </FriendlyCard>
            )}

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
                    <p className="text-xs text-muted-foreground">Manage users and posts</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </FriendlyCard>
              </div>
            )}

            {/* Account Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Account</h3>
              <FriendlyCard className="divide-y divide-border">
                <button
                  type="button"
                  onClick={openOwnProfile}
                  className="flex w-full items-center gap-4 p-4 text-left cursor-pointer hover:bg-muted/50 transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center text-xl font-bold overflow-hidden">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <span className="text-primary">{user?.name?.[0] || 'U'}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{user?.name || 'User'}</p>
                    <p className="text-sm text-muted-foreground">@{user?.username || 'username'}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditProfile(true)}
                  className="flex w-full items-center gap-3 p-4 text-left cursor-pointer hover:bg-muted/50 transition-all"
                >
                  <UserCog size={20} className="text-muted-foreground" />
                  <span className="text-sm flex-1">Edit Profile</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
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
                  <button
                    onClick={() => setLiteModeEnabled((prev) => {
                      const nextValue = !prev;
                      setSettingsNotice({ type: 'success', message: `Lite Mode ${nextValue ? 'enabled' : 'disabled'}.` });
                      return nextValue;
                    })}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all",
                      liteModeEnabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                      liteModeEnabled ? "right-1" : "left-1"
                    )} />
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
                <button
                  type="button"
                  onClick={() => openSupportLink('bug')}
                  className="flex w-full items-center gap-3 p-4 text-left cursor-pointer hover:bg-muted/50 transition-all"
                >
                  <Flag size={18} className="text-muted-foreground" />
                  <span className="text-sm flex-1">Report a Bug</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => openSupportLink('feature')}
                  className="flex w-full items-center gap-3 p-4 text-left cursor-pointer hover:bg-muted/50 transition-all"
                >
                  <HelpCircle size={18} className="text-muted-foreground" />
                  <span className="text-sm flex-1">Suggest a Feature</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </FriendlyCard>
            </div>

            {/* Logout */}
            <div className="pt-2">
              <button 
                type="button"
                onClick={handleLogout}
                className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <LogOut size={18} />
                Log Out
              </button>

              <p className="text-center text-[10px] text-muted-foreground mt-4">
                Contact admin: <a href={supportContactUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@dev_envologia</a>
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
        <Suspense fallback={<LazyScreenFallback label="Loading editor..." />}>
          <EditProfileModal
            user={user}
            isOpen={showEditProfile}
            onClose={() => setShowEditProfile(false)}
            onSave={handleProfileUpdate}
          />
        </Suspense>
      )}

      {showSearch && (
        <Suspense fallback={<LazyScreenFallback label="Loading search..." />}>
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
        </Suspense>
      )}

      {activeStoryGroup && user && (
        <Suspense fallback={<LazyScreenFallback label="Loading story..." />}>
          <StoryViewer
            stories={activeStoryGroup.stories}
            currentUserId={user.id}
            onClose={() => {
              setActiveStoryGroup(null);
              fetchStories();
            }}
          />
        </Suspense>
      )}

      {showStoryUpload && user && (
        <Suspense fallback={<LazyScreenFallback label="Loading story upload..." />}>
          <StoryUpload
            userId={user.id}
            onClose={() => setShowStoryUpload(false)}
            onUploadSuccess={() => {
              fetchStories();
            }}
          />
        </Suspense>
      )}

      {showCreateMenu && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end" onClick={() => setShowCreateMenu(false)}>
          <div
            className="w-full bg-background rounded-t-3xl border border-border shadow-2xl p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-lg">Create</p>
              <button
                type="button"
                onClick={() => setShowCreateMenu(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={startCreatePost}
                className="w-full rounded-2xl border border-border bg-background hover:bg-muted transition-colors px-4 py-4 text-left"
              >
                <p className="font-semibold">Post</p>
                <p className="text-xs text-muted-foreground">Share a photo or text post</p>
              </button>
              <button
                type="button"
                onClick={startCreateStory}
                className="w-full rounded-2xl border border-border bg-background hover:bg-muted transition-colors px-4 py-4 text-left"
              >
                <p className="font-semibold">Story</p>
                <p className="text-xs text-muted-foreground">Share to your story</p>
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Bottom Nav */}
        <Dock
          items={[
            { icon: Home, label: 'Home', onClick: () => (activeTab === 'home' ? (fetchPosts(), fetchStories()) : setActiveTab('home')) },
            { icon: Plus, label: 'Create', onClick: openCreateMenu },
            { icon: MessageSquare, label: 'Chat', onClick: () => (activeTab === 'chat' ? fetchChats() : setActiveTab('chat')) },
            { icon: User, label: 'Profile', onClick: openOwnProfile },
          ]}
          className="fixed bottom-0 left-0 right-0 z-40"
        />
      </div>
    );
}
