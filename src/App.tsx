import { useState, useEffect } from 'react';
import { FriendlyCard } from './components/FriendlyCard';
import { Home, Film, MessageSquare, Settings, Ghost, LogOut, Shield, Bell, Zap, Plus, User, Search, Users, CalendarDays, GraduationCap, Megaphone, MapPin, Clock3, Sparkles } from 'lucide-react';
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
import { COMMUNITY_GROUPS, CommunitySection, getGroupName, getVisibleCommunityPosts, normalizeContentType } from './utils/community';
import { DEFAULT_NOTIFICATION_SETTINGS, NotificationSettings, normalizeNotificationSettings } from './utils/notificationSettings';

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'reels' | 'chat' | 'inbox' | 'profile' | 'settings'>('home');
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
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [homeSection, setHomeSection] = useState<CommunitySection>('feed');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]);
  const [composerNotice, setComposerNotice] = useState<string | null>(null);

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
    }
    if (isOnboarded && activeTab === 'chat') {
      fetchChats();
    }
  }, [isOnboarded, activeTab]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const savedGroups = localStorage.getItem(`ddu_joined_groups_${user.id}`);
    if (savedGroups) {
      try {
        setJoinedGroups(JSON.parse(savedGroups));
        return;
      } catch (error) {
        console.error('Failed to read joined groups:', error);
      }
    }

    setJoinedGroups([COMMUNITY_GROUPS[0].id]);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`ddu_joined_groups_${user.id}`, JSON.stringify(joinedGroups));
    }
  }, [joinedGroups, user?.id]);

  const fetchChats = async () => {
    try {
      const response = await fetch(`/api/users/${user?.id}/chats`);
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch(`/api/posts?userId=${user?.id}`);
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

  const handleOnboardingFinish = (userData: any) => {
    const normalizedUser = {
      ...userData,
      notificationSettings: normalizeNotificationSettings(userData.notificationSettings),
    };
    setUser(normalizedUser);
    setIsOnboarded(true);
    setTelegramNotificationsEnabled(Boolean(normalizedUser.telegramNotificationsEnabled));
    setNotificationSettings(normalizedUser.notificationSettings);
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
    try {
      const newValue = !telegramNotificationsEnabled;
      const response = await fetch(`/api/users/${user?.id}/telegram-notifications`, {
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

  const handleNotificationSettingToggle = async (key: keyof NotificationSettings) => {
    try {
      const nextSettings = {
        ...notificationSettings,
        [key]: !notificationSettings[key],
      };

      const response = await fetch(`/api/users/${user?.id}/telegram-notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: telegramNotificationsEnabled,
          settings: nextSettings,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const normalizedSettings = normalizeNotificationSettings(data.notificationSettings);
        setNotificationSettings(normalizedSettings);
        const updatedUser = {
          ...user,
          telegramNotificationsEnabled: data.telegramNotificationsEnabled,
          notificationSettings: normalizedSettings,
        };
        setUser(updatedUser);
        localStorage.setItem('ddu_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to update detailed notification settings:', error);
    }
  };

  const notificationSettingLabels: Array<{
    key: keyof NotificationSettings;
    title: string;
    description: string;
  }> = [
    { key: 'messages', title: 'Direct messages', description: 'Private chats and replies from other users' },
    { key: 'comments', title: 'Comments', description: 'Replies and discussions on your posts' },
    { key: 'likes', title: 'Likes', description: 'When someone likes your post or reel' },
    { key: 'follows', title: 'Followers', description: 'New followers and follow-backs' },
    { key: 'mentions', title: 'Mentions & tags', description: 'Mentions, tags, and direct callouts' },
    { key: 'shares', title: 'Shares & story views', description: 'Post shares and story-view style activity' },
  ];

  const toggleGroupMembership = (groupId: string) => {
    setJoinedGroups((current) => {
      if (current.includes(groupId)) {
        const nextGroups = current.filter((id) => id !== groupId);
        if (selectedGroupId === groupId) {
          setSelectedGroupId('all');
        }
        return nextGroups;
      }

      setSelectedGroupId(groupId);
      setHomeSection('groups');
      return [...current, groupId];
    });
  };

  const visiblePosts = getVisibleCommunityPosts(posts, homeSection, selectedGroupId);

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
            onClick={() => setIsAnonymous(!isAnonymous)}
            className={cn(
              "p-2 rounded-full transition-all",
              isAnonymous ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
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
                        ? 'Fresh campus feed'
                        : homeSection === 'groups'
                          ? 'Student groups'
                          : homeSection === 'events'
                            ? 'Events board'
                            : 'Academic updates'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {homeSection === 'feed'
                        ? 'A cleaner posting box, highlighted announcements, and quicker campus updates.'
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
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {post.isAnonymous ? <Ghost size={16} className="text-muted-foreground" /> : (post.userId?.name?.[0] || 'U')}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{post.isAnonymous ? 'Ghost' : (post.userId?.name || 'User')}</p>
                        {contentType === 'announcement' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600">
                            <Megaphone size={10} />
                            Announcement
                          </span>
                        )}
                        {contentType === 'academic' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-600">
                            <GraduationCap size={10} />
                            Academics
                          </span>
                        )}
                        {contentType === 'group' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                            <Users size={10} />
                            {getGroupName(post.groupId)}
                          </span>
                        )}
                        {contentType === 'event' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                            <CalendarDays size={10} />
                            Event
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</p>
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
                <div className="p-4 space-y-2">
                  {post.title && (
                    <p className="text-base font-bold text-foreground">{post.title}</p>
                  )}
                  {contentType === 'event' && (
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {post.eventTime && (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          {new Date(post.eventTime).toLocaleString()}
                        </span>
                      )}
                      {post.place && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          {post.place}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-foreground leading-relaxed">
                    {post.content}
                  </p>
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
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Admin</h3>
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
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Profile</h3>
              <FriendlyCard className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-2xl font-bold text-accent">
                  {user?.name?.[0] || 'U'}
                </div>
                <div>
                  <p className="font-bold text-lg">{user?.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">@{user?.username || 'username'}</p>
                </div>
              </FriendlyCard>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Data & Privacy</h3>
              <FriendlyCard className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap size={18} className="text-accent" />
                    <div>
                      <p className="text-sm font-medium">Lite Mode (240p)</p>
                      <p className="text-xs text-muted-foreground">Save data on campus Wi-Fi</p>
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
                      <p className="text-xs text-muted-foreground">Post as Ghost</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all",
                      isAnonymous ? "bg-accent" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      isAnonymous ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
              </FriendlyCard>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Integrations</h3>
              <FriendlyCard className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-accent" />
                    <div>
                      <p className="text-sm font-medium">Telegram Notifications</p>
                      <p className="text-xs text-muted-foreground">Telegram is required for account authentication and can also deliver alerts.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTelegramNotificationsToggle}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all",
                      telegramNotificationsEnabled ? "bg-accent" : "bg-muted"
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
                    ⚠️ Link your Telegram account to finish secure authentication and enable bot notifications.
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
                        className={cn(
                          'flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3 transition-colors',
                          !telegramNotificationsEnabled && 'opacity-60'
                        )}
                      >
                        <div>
                          <p className="text-sm font-medium">{setting.title}</p>
                          <p className="text-xs text-muted-foreground">{setting.description}</p>
                        </div>
                        <button
                          type="button"
                          disabled={!telegramNotificationsEnabled}
                          onClick={() => handleNotificationSettingToggle(setting.key)}
                          className={cn(
                            'w-12 h-6 rounded-full relative transition-all disabled:cursor-not-allowed',
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
                   className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  🐛 Report Bug to @dev_envologia
                </a>
                <br />
                <a
                  href="https://t.me/dev_envologia"
                  target="_blank"
                  rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
          isAnonymous={isAnonymous}
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
