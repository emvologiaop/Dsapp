import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Send } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';

type UserResult = {
  _id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
};

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  userId: string;
  onShareComplete?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  postId,
  userId,
  onShareComplete,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedCount = selected.size;

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setResults([]);
    setSelected(new Set());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/search?type=users&limit=10&query=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const users = Array.isArray(data?.users) ? data.users : [];
        setResults(users);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, isOpen]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = async () => {
    if (!postId || !userId) return;
    if (selectedIds.length === 0) return;
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, receiverIds: selectedIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to share');
      }
      onShareComplete?.();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to share');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm hidden md:block" onClick={onClose} />
    <div className="fixed inset-0 bg-background z-50 w-full flex flex-col md:bg-transparent md:items-center md:justify-center" onClick={onClose}>
      <div
        className="w-full flex-1 bg-background border-0 shadow-none md:w-[400px] md:max-w-lg md:flex-none md:rounded-2xl md:border md:border-border md:shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold">Share post</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          <FriendlyCard className="p-3 space-y-2 max-h-[45vh] overflow-y-auto">
            {loading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Searching...</div>
            ) : results.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Type a name to search.</div>
            ) : (
              results
                .filter((u) => u._id !== userId)
                .map((u) => {
                  const checked = selected.has(u._id);
                  return (
                    <button
                      type="button"
                      key={u._id}
                      onClick={() => toggle(u._id)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center font-bold">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : (u.name?.[0] || 'U')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.name}</p>
                      </div>
                      <div className="w-5 h-5 rounded border border-border flex items-center justify-center">
                        {checked ? <div className="w-3 h-3 rounded bg-primary" /> : null}
                      </div>
                    </button>
                  );
                })
            )}
          </FriendlyCard>

          <button
            type="button"
            onClick={send}
            disabled={selectedCount === 0 || sending}
            className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold disabled:opacity-60 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {sending ? 'Sending...' : `Send (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>
    </>
  );
};
