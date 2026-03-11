import { useState, useEffect } from 'react';
import { FriendlyCard } from './components/FriendlyCard';
import { Home, Film, MessageSquare, Settings, Ghost, LogOut, Shield, Bell, Zap, Plus, User } from 'lucide-react';
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';
import { ChatRoom } from './components/Chat/ChatRoom';
import { CreatePost } from './components/CreatePost';
import { PostActions } from './components/PostActions';
import { FollowButton } from './components/FollowButton';
import { Inbox } from './components/Inbox';
import { CommentsPanel } from './components/CommentsPanel';
import { ReelsTab } from './components/ReelsTab';
import { InstagramProfile } from './components/InstagramProfile';
import { EditProfileModal } from './components/EditProfileModal';
import { cn } from './lib/utils';
import { Dock } from '../components/ui/dock-two';
import { ThemeSwitch } from './components/ui/ThemeSwitch';
import { NotificationBell } from './components/NotificationBell';
import { NotificationPanel } from './components/NotificationPanel';
import { FeatureIdeas } from './components/FeatureIdeas';

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

  useEffect(() => {
    const savedUser = localStorage.getItem('ddu_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setIsOnboarded(true);
      } catch (e) {
        localStorage.removeItem('ddu_user');
      }
    }
  }, []);

  useEffect(() => {
    if (isOnboarded && activeTab === 'home') {
      fetchPosts();
    }
    if (isOnboarded && activeTab === 'chat') {
      fetchChats();
    }
  }, [isOnboarded, activeTab]);

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
    setUser(userData);
    setIsOnboarded(true);
    localStorage.setItem('ddu_user', JSON.stringify(userData));
  };

  const handleProfileUpdate = (updatedUser: any) => {
    const mergedUser = { ...user, ...updatedUser };
    setUser(mergedUser);
    localStorage.setItem('ddu_user', JSON.stringify(mergedUser));
  };

  if (!isOnboarded) {
    return <OnboardingFlow onFinish={handleOnboardingFinish} />;
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Feed</h2>
              <button 
                onClick={() => setShowCreatePost(!showCreatePost)}
                className="p-2 bg-primary text-primary-foreground rounded-lg"
              >
                <Plus size={20} />
              </button>
            </div>

            {showCreatePost && (
              <CreatePost 
                user={user} 
                isAnonymous={isAnonymous} 
                onPostCreated={() => {
                  setShowCreatePost(false);
                  fetchPosts();
                }} 
              />
            )}
            
            {posts.length > 0 ? posts.map((post) => (
              <FriendlyCard key={post._id} className="space-y-4 p-0 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {post.isAnonymous ? <Ghost size={16} className="text-muted-foreground" /> : (post.userId?.name?.[0] || 'U')}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{post.isAnonymous ? 'Ghost' : (post.userId?.name || 'User')}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {!post.isAnonymous && user && (
                    <FollowButton 
                      userId={user.id} 
                      targetId={post.userId._id} 
                      initialIsFollowing={post.isFollowing} 
                    />
                  )}
                </div>
                {post.mediaUrl && (
                  <div className="relative group">
                    <img 
                      src={post.mediaUrl} 
                      alt="Post" 
                      className="w-full aspect-video object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = post.mediaUrl;
                        link.download = `social_${post._id}.jpg`;
                        link.click();
                      }}
                      className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-md text-foreground px-4 py-2 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-all border border-border"
                    >
                      Save
                    </button>
                  </div>
                )}
                <div className="p-4 space-y-2">
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
            )) : (
              <div className="text-center py-20 text-muted-foreground">
                <p>No posts yet. Be the first!</p>
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
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all",
                      isAnonymous ? "bg-accent" : "bg-black/10"
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
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Integrations</h3>
              <FriendlyCard className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-accent" />
                    <div>
                      <p className="text-sm font-medium">Telegram Sync</p>
                      <p className="text-[10px] text-black/40">Mirror DMs to Telegram</p>
                    </div>
                  </div>
                  <button className="w-12 h-6 bg-accent rounded-full relative transition-all">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>
              </FriendlyCard>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Roadmap</h3>
              <FeatureIdeas />
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
              
              <div className="text-center">
                <a 
                  href="https://t.me/Dev_Envologia" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Report Bug to @Dev_Envologia
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
