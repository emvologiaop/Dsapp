import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Send } from 'lucide-react';
import { FriendlyCard } from '../FriendlyCard';
import socket from '../../services/socket';
import { cn } from '../../lib/utils';

type UserLite = {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
};

type Message = {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  status?: 'sent' | 'delivered' | 'seen';
  imageUrl?: string;
  tempId?: string;
};

interface ChatRoomProps {
  currentUser: UserLite;
  otherUser: UserLite;
  onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, otherUser, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const currentUserId = currentUser?.id;
  const otherUserId = otherUser?.id;

  const title = useMemo(() => otherUser?.name || otherUser?.username || 'Chat', [otherUser]);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (!currentUserId) return;
    socket.emit('join_chat', currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !otherUserId) return;

    const fetchMessages = async () => {
      try {
        setLoadError(null);
        const res = await fetch(`/api/messages/${currentUserId}/${otherUserId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || 'Failed to load messages');
        }
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        queueMicrotask(scrollToBottom);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load messages');
      }
    };

    fetchMessages();
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    if (!currentUserId || !otherUserId) return;

    const handleReceive = (msg: any) => {
      if (!msg) return;
      // Only append if it belongs to this conversation
      const s = msg.senderId?.toString?.() ?? msg.senderId;
      const r = msg.receiverId?.toString?.() ?? msg.receiverId;
      const isThisThread =
        (s === currentUserId && r === otherUserId) ||
        (s === otherUserId && r === currentUserId);
      if (!isThisThread) return;

      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      queueMicrotask(scrollToBottom);
    };

    const handleMessageSent = (payload: any) => {
      const msg = payload?.message;
      const tempId = payload?.tempId as string | undefined;
      if (!msg) return;

      setMessages((prev) => {
        if (tempId) {
          const idx = prev.findIndex((m) => m.tempId && m.tempId === tempId);
          if (idx >= 0) {
            const copy = prev.slice();
            copy[idx] = { ...msg, tempId: undefined };
            return copy;
          }
        }
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      queueMicrotask(scrollToBottom);
    };

    socket.on('receive_private_message', handleReceive);
    socket.on('message_sent', handleMessageSent);

    return () => {
      socket.off('receive_private_message', handleReceive);
      socket.off('message_sent', handleMessageSent);
    };
  }, [currentUserId, otherUserId]);

  const sendMessage = async () => {
    if (!currentUserId || !otherUserId) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (sending) return;

    setSending(true);
    const tempId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const optimistic: Message = {
      _id: tempId,
      tempId,
      senderId: currentUserId,
      receiverId: otherUserId,
      text: trimmed,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    queueMicrotask(scrollToBottom);

    try {
      socket.emit('send_private_message', {
        senderId: currentUserId,
        receiverId: otherUserId,
        text: trimmed,
        tempId,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">@{otherUser?.username || 'user'}</p>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loadError && (
          <FriendlyCard className="border border-red-500/20 bg-red-500/10 text-sm text-red-600 dark:text-red-300">
            {loadError}
          </FriendlyCard>
        )}

        {messages.map((m) => {
          const isMine = m.senderId === currentUserId;
          return (
            <div key={m._id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm border',
                  isMine
                    ? 'bg-primary text-primary-foreground border-primary/20'
                    : 'bg-muted text-foreground border-border'
                )}
              >
                {m.imageUrl && (
                  <img src={m.imageUrl} alt="" className="w-full max-w-sm rounded-xl mb-2 object-cover" />
                )}
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <div className={cn('mt-1 text-[10px] opacity-80', isMine ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-3 bg-background">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-xl border border-border bg-muted text-muted-foreground opacity-60 cursor-not-allowed"
            title="Image sending coming next"
            aria-label="Attach image (disabled)"
            disabled
          >
            <ImageIcon size={18} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Message..."
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 transition-all active:scale-95 inline-flex items-center gap-2"
          >
            <Send size={18} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

