import { useState, useEffect } from 'react';
import { FriendlyCard } from './FriendlyCard';
import { Users, FileText, Film, Shield, Search, X, AlertCircle, Trash2, Ban, CheckCircle, ArrowLeft, Megaphone } from 'lucide-react';
import { AdManagement } from './AdManagement';

interface AdminStats {
  stats: {
    users: { total: number; banned: number; active: number };
    posts: { total: number; deleted: number; active: number };
    reels: { total: number; deleted: number; active: number };
  };
  recent: {
    users: any[];
    posts: any[];
  };
}

interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  isBanned: boolean;
  bannedAt?: string;
  banReason?: string;
  createdAt: string;
}

interface Post {
  _id: string;
  content: string;
  userId: { name: string; username: string };
  isDeleted: boolean;
  createdAt: string;
  mediaUrls?: string[];
  likesCount?: number;
}

interface Reel {
  _id: string;
  caption: string;
  userId: { name: string; username: string };
  isDeleted: boolean;
  createdAt: string;
  videoUrl: string;
}

interface Props {
  userId: string;
  onClose: () => void;
}

export function AdminDashboard({ userId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'posts' | 'reels' | 'ads'>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'posts') {
      fetchPosts();
    } else if (activeTab === 'reels') {
      fetchReels();
    }
  }, [activeTab, page, searchQuery]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/admin/stats?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 403) {
        alert('You do not have admin access');
        onClose();
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}&page=${page}&search=${searchQuery}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/posts?userId=${userId}&page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReels = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reels?userId=${userId}&page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setReels(data.reels);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch reels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (targetUserId: string) => {
    if (!banReason.trim()) {
      alert('Please provide a ban reason');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${targetUserId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason: banReason }),
      });

      if (response.ok) {
        setSelectedUser(null);
        setBanReason('');
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to ban user');
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Failed to ban user');
    }
  };

  const handleUnbanUser = async (targetUserId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${targetUserId}/unban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to unban user');
      }
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('Failed to unban user');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        fetchPosts();
      } else {
        alert('Failed to delete post');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (!confirm('Are you sure you want to delete this reel?')) return;

    try {
      const response = await fetch(`/api/admin/reels/${reelId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        fetchReels();
      } else {
        alert('Failed to delete reel');
      }
    } catch (error) {
      console.error('Failed to delete reel:', error);
      alert('Failed to delete reel');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <Shield size={24} className="text-primary" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-background/50 sticky top-[73px] z-10">
        <div className="flex gap-2 px-6 max-w-6xl mx-auto overflow-x-auto">
          {[
            { id: 'stats', label: 'Overview', icon: Shield },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'posts', label: 'Posts', icon: FileText },
            { id: 'reels', label: 'Reels', icon: Film },
            { id: 'ads', label: 'Ads', icon: Megaphone },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-6xl mx-auto">
        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FriendlyCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Users size={24} className="text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold">Users</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-bold">{stats.stats.users.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <span className="font-bold text-green-500">{stats.stats.users.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Banned</span>
                    <span className="font-bold text-red-500">{stats.stats.users.banned}</span>
                  </div>
                </div>
              </FriendlyCard>

              <FriendlyCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <FileText size={24} className="text-purple-500" />
                  </div>
                  <h3 className="text-lg font-bold">Posts</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-bold">{stats.stats.posts.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <span className="font-bold text-green-500">{stats.stats.posts.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Deleted</span>
                    <span className="font-bold text-red-500">{stats.stats.posts.deleted}</span>
                  </div>
                </div>
              </FriendlyCard>

              <FriendlyCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-pink-500/20 rounded-lg">
                    <Film size={24} className="text-pink-500" />
                  </div>
                  <h3 className="text-lg font-bold">Reels</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-bold">{stats.stats.reels.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <span className="font-bold text-green-500">{stats.stats.reels.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Deleted</span>
                    <span className="font-bold text-red-500">{stats.stats.reels.deleted}</span>
                  </div>
                </div>
              </FriendlyCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FriendlyCard className="p-6">
                <h3 className="text-lg font-bold mb-4">Recent Users</h3>
                <div className="space-y-3">
                  {stats.recent.users.map((user: any) => (
                    <div key={user._id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </FriendlyCard>

              <FriendlyCard className="p-6">
                <h3 className="text-lg font-bold mb-4">Recent Posts</h3>
                <div className="space-y-3">
                  {stats.recent.posts.map((post: any) => (
                    <div key={post._id} className="space-y-1">
                      <p className="text-sm font-medium">{post.userId?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                    </div>
                  ))}
                </div>
              </FriendlyCard>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users by name, username, or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20 text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <FriendlyCard key={user._id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{user.name}</p>
                          {user.role === 'admin' && (
                            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-medium">
                              Admin
                            </span>
                          )}
                          {user.isBanned && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-xs rounded-full font-medium">
                              Banned
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.isBanned && user.banReason && (
                          <p className="text-xs text-red-500 mt-1">Reason: {user.banReason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {user.role !== 'admin' && (
                          <>
                            {user.isBanned ? (
                              <button
                                onClick={() => handleUnbanUser(user._id)}
                                className="px-4 py-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-2"
                              >
                                <CheckCircle size={16} />
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
                              >
                                <Ban size={16} />
                                Ban
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </FriendlyCard>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-20 text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <FriendlyCard key={post._id} className="p-4">
                    <div className="flex justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold">{post.userId?.name || 'Unknown'}</p>
                          <span className="text-xs text-muted-foreground">@{post.userId?.username}</span>
                          {post.isDeleted && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-xs rounded-full font-medium">
                              Deleted
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground mb-2">{post.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!post.isDeleted && (
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="p-2 h-fit bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </FriendlyCard>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reels' && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-20 text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-3">
                {reels.map((reel) => (
                  <FriendlyCard key={reel._id} className="p-4">
                    <div className="flex justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold">{reel.userId?.name || 'Unknown'}</p>
                          <span className="text-xs text-muted-foreground">@{reel.userId?.username}</span>
                          {reel.isDeleted && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-xs rounded-full font-medium">
                              Deleted
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground mb-2">{reel.caption || 'No caption'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(reel.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!reel.isDeleted && (
                        <button
                          onClick={() => handleDeleteReel(reel._id)}
                          className="p-2 h-fit bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </FriendlyCard>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Ads Tab */}
        {activeTab === 'ads' && (
          <AdManagement userId={userId} />
        )}
      </div>

      {/* Ban User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <FriendlyCard className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Ban User</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-muted rounded">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">User</p>
                <p className="font-medium">{selectedUser.name} (@{selectedUser.username})</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ban Reason</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Enter reason for banning this user..."
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBanUser(selectedUser._id)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Ban User
                </button>
              </div>
            </div>
          </FriendlyCard>
        </div>
      )}
    </div>
  );
}
