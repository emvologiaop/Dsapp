import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Send } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';
import { withAuthHeaders } from '../utils/clientAuth';

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
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
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
    <div className="fixed inset-0 z-50 flex w-full flex-col bg-background/95 md:items-center md:justify-center md:bg-transparent" onClick={onClose}>
      <div
        className="w-full flex-1 overflow-hidden bg-background/96 shadow-none md:w-[420px] md:max-w-lg md:flex-none md:rounded-[30px] md:border md:border-white/30 md:bg-background/88 md:shadow-[0_28px_80px_-34px_rgba(15,23,42,0.85)] md:backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/30 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Send</p>
            <h3 className="font-bold tracking-[-0.03em]">Share post</h3>
          </div>
          <button onClick={onClose} className="rounded-full border border-border/70 bg-background/80 p-2 transition-colors hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/35 bg-background/80 px-3 py-3 shadow-sm">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          <FriendlyCard className="max-h-[45vh] space-y-2 overflow-y-auto border-white/35 bg-background/78 p-3">
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
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/30 bg-background/75 p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted/40"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center font-bold">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : (u.name?.[0] || 'U')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.name}</p>
                      </div>
                      <div className="flex h-5 w-5 items-center justify-center rounded-md border border-border">
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-[0_20px_40px_-24px_rgba(15,23,42,0.9)] transition-all duration-300 active:scale-[0.99] disabled:opacity-60"
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
