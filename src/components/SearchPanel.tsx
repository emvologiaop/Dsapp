import React, { useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';

interface SearchPanelProps {
  currentUserId?: string;
  initialQuery?: string;
  onClose: () => void;
  onViewProfile?: (userId?: string | null) => void;
  onStartChat?: (user: any) => void;
  onOpenPost?: (post: any) => void;
}

const formatSearchTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const SearchPanel: React.FC<SearchPanelProps> = ({ initialQuery = '', onClose, onViewProfile, onStartChat, onOpenPost, currentUserId }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any>({ users: [], posts: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults({ users: [], posts: [] });
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/search?query=${encodeURIComponent(q)}&type=all&limit=10`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/90 md:bg-background/80 md:backdrop-blur-2xl">
      <div className="border-b border-white/30 bg-background/60 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-primary" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Discover</p>
            <h2 className="text-lg font-bold tracking-[-0.03em]">Search</h2>
          </div>
        </div>
        <button onClick={onClose} className="rounded-full border border-border/70 bg-background/80 p-2 transition-colors hover:bg-muted" aria-label="Close">
          <X size={20} />
        </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 overflow-y-auto p-4 md:px-6 md:py-6">
        <div className="w-full space-y-4">
        <div className="flex items-center gap-2 rounded-2xl border border-white/40 bg-background/80 px-4 py-3 shadow-sm backdrop-blur">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users and posts..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        <FriendlyCard className="space-y-3 border-white/35 bg-background/78">
          <div>
            <p className="text-sm font-bold">Users</p>
            <p className="text-xs text-muted-foreground">Find classmates, creators, and campus connections.</p>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Searching...</p>
          ) : (results?.users?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No users.</p>
          ) : (
            results.users
              .filter((u: any) => (u._id || u.id) !== currentUserId)
              .map((u: any) => (
                <div key={u._id || u.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/35 bg-background/75 px-3 py-3 shadow-sm">
                  <button
                    type="button"
                    onClick={() => onViewProfile?.(u._id || u.id)}
                    className="flex items-center gap-3 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center font-bold">
                      {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : (u.name?.[0] || 'U')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{u.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.name}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartChat?.(u)}
                    className="rounded-xl border border-border/70 bg-background/85 px-3 py-2 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted"
                  >
                    Message
                  </button>
                </div>
              ))
          )}
        </FriendlyCard>

        <FriendlyCard className="space-y-3 border-white/35 bg-background/78">
          <div>
            <p className="text-sm font-bold">Posts</p>
            <p className="text-xs text-muted-foreground">Jump into matching conversations and campus updates.</p>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Searching...</p>
          ) : (results?.posts?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No posts.</p>
          ) : (
            results.posts.map((post: any) => {
              const author = post.userId;
              const previewImages = Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0
                ? post.mediaUrls
                : post.mediaUrl
                  ? [post.mediaUrl]
                  : [];
              const excerpt = typeof post.content === 'string' ? post.content.trim() : '';

              return (
                <button
                  key={post._id}
                  type="button"
                  onClick={() => onOpenPost?.(post)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-white/35 bg-background/75 px-3 py-3 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
                >
                  {previewImages[0] ? (
                    <img
                      src={previewImages[0]}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-white/30"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-muted/80 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground ring-1 ring-white/30">
                      Post
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onViewProfile?.(author?._id);
                        }}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate text-sm font-semibold">{author?.username || 'user'}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{author?.name || 'Campus member'}</p>
                      </button>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{formatSearchTime(post.createdAt)}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-foreground/90">
                      {excerpt || 'Open this post to view the attached photo.'}
                    </p>
                    <div className="flex gap-3 text-[11px] text-muted-foreground">
                      <span>{post.likedBy?.length || 0} likes</span>
                      <span>{post.commentsCount || 0} comments</span>
                      <span>{post.sharesCount || 0} shares</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </FriendlyCard>
        </div>
      </div>
    </div>
  );
};
