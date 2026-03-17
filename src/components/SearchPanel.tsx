import React, { useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';

interface SearchPanelProps {
  currentUserId?: string;
  initialQuery?: string;
  onClose: () => void;
  onViewProfile?: (userId?: string | null) => void;
  onStartChat?: (user: any) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ initialQuery = '', onClose, onViewProfile, onStartChat, currentUserId }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any>({ users: [], posts: [], reels: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults({ users: [], posts: [], reels: [] });
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
    <div className="fixed inset-0 z-50 bg-background flex flex-col md:bg-background/95 md:backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-primary" />
          <h2 className="text-lg font-bold">Search</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full mx-auto space-y-4 rounded-none border-0 p-4 shadow-none md:max-w-2xl md:px-6 md:py-6">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, posts, reels..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        <FriendlyCard className="space-y-3">
          <p className="text-sm font-bold">Users</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Searching...</p>
          ) : (results?.users?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No users.</p>
          ) : (
            results.users
              .filter((u: any) => (u._id || u.id) !== currentUserId)
              .map((u: any) => (
                <div key={u._id || u.id} className="flex items-center justify-between gap-3">
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
                    className="px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold"
                  >
                    Message
                  </button>
                </div>
              ))
          )}
        </FriendlyCard>
      </div>
    </div>
  );
};
