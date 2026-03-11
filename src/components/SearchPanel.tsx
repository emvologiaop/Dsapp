import { useState, useEffect } from 'react';
import { Search, X, User, FileText, Film } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';

interface SearchResult {
  users: any[];
  posts: any[];
  reels: any[];
}

interface SearchPanelProps {
  currentUserId?: string;
  initialQuery?: string;
  onClose: () => void;
  onViewProfile?: (userId?: string | null) => void;
  onStartChat?: (user: any) => void;
}

export function SearchPanel({ currentUserId, initialQuery = '', onClose, onViewProfile, onStartChat }: SearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult>({ users: [], posts: [], reels: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts' | 'reels'>('all');

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ users: [], posts: [], reels: [] });
      return;
    }

    const debounce = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&type=all&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredResults = () => {
    if (activeTab === 'all') return results;
    return {
      users: activeTab === 'users' ? results.users : [],
      posts: activeTab === 'posts' ? results.posts : [],
      reels: activeTab === 'reels' ? results.reels : [],
    };
  };

  const filteredResults = getFilteredResults();
  const totalResults = filteredResults.users.length + filteredResults.posts.length + filteredResults.reels.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20 overflow-y-auto">
      <FriendlyCard className="max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Search</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, posts, reels, or #hashtags..."
            className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-border">
          {[
            { id: 'all', label: 'All', icon: Search },
            { id: 'users', label: 'Users', icon: User },
            { id: 'posts', label: 'Posts', icon: FileText },
            { id: 'reels', label: 'Reels', icon: Film },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading && (
          <div className="text-center py-8 text-muted-foreground">Searching...</div>
        )}

        {!loading && query.trim().length < 2 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search size={48} className="mx-auto mb-2 opacity-50" />
            <p>Start typing to search</p>
          </div>
        )}

        {!loading && query.trim().length >= 2 && totalResults === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search size={48} className="mx-auto mb-2 opacity-50" />
            <p>No results found for "{query}"</p>
          </div>
        )}

        {!loading && totalResults > 0 && (
          <div className="space-y-6">
            {/* Users */}
            {(activeTab === 'all' || activeTab === 'users') && filteredResults.users.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  Users ({filteredResults.users.length})
                </h3>
                <div className="space-y-2">
                  {filteredResults.users.map((user: any) => (
                    <div
                      key={user._id}
                      className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 justify-between">
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(user._id)}
                          className="flex items-center gap-3 text-left flex-1 min-w-0"
                        >
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            user.name?.[0] || 'U'
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                          {user.bio && <p className="text-xs text-muted-foreground line-clamp-1">{user.bio}</p>}
                        </div>
                        </button>
                        {user._id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => onStartChat?.(user)}
                            className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg shrink-0"
                          >
                            Message
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts */}
            {(activeTab === 'all' || activeTab === 'posts') && filteredResults.posts.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  Posts ({filteredResults.posts.length})
                </h3>
                <div className="space-y-2">
                  {filteredResults.posts.map((post: any) => (
                    <div
                      key={post._id}
                      className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    >
                      <button
                        type="button"
                        onClick={() => onViewProfile?.(post.userId?._id)}
                        className="flex items-center gap-2 mb-2 text-left"
                      >
                        <p className="font-bold text-sm hover:text-primary transition-colors">{post.userId?.name || 'Unknown'}</p>
                        <span className="text-xs text-muted-foreground">@{post.userId?.username}</span>
                      </button>
                      <p className="text-sm line-clamp-3">{post.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reels */}
            {(activeTab === 'all' || activeTab === 'reels') && filteredResults.reels.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  Reels ({filteredResults.reels.length})
                </h3>
                <div className="space-y-2">
                  {filteredResults.reels.map((reel: any) => (
                    <div
                      key={reel._id}
                      className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    >
                      <button
                        type="button"
                        onClick={() => onViewProfile?.(reel.userId?._id)}
                        className="flex items-center gap-2 mb-2 text-left"
                      >
                        <Film size={16} className="text-primary" />
                        <p className="font-bold text-sm hover:text-primary transition-colors">{reel.userId?.name || 'Unknown'}</p>
                        <span className="text-xs text-muted-foreground">@{reel.userId?.username}</span>
                      </button>
                      <p className="text-sm line-clamp-2">{reel.caption || 'No caption'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(reel.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </FriendlyCard>
    </div>
  );
}
