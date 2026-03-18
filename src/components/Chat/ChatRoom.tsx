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
  onViewProfile?: (userId?: string | null) => void;
  focusMessageId?: string;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, otherUser, onBack, onViewProfile, focusMessageId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [canMessage, setCanMessage] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const focusMessageIdRef = useRef<string | undefined>(focusMessageId);

  useEffect(() => {
    focusMessageIdRef.current = focusMessageId;
  }, [focusMessageId]);

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

    const fetchMessagingAccess = async () => {
      try {
        const res = await fetch(`/api/users/${otherUserId}/profile?currentUserId=${currentUserId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.canMessage === 'boolean') {
          setCanMessage(data.canMessage);
          setComposerError(data.canMessage ? null : 'You can only message users after you both follow each other.');
        }
      } catch (e) {
        console.error('Failed to load messaging access:', e);
      }
    };

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
        queueMicrotask(() => {
          const targetId = focusMessageIdRef.current;
          if (targetId) {
            // Clear after first use so normal navigation doesn't keep focusing
            sessionStorage.removeItem('ddu_focus_message_id');
            focusMessageIdRef.current = undefined;
            const node = document.getElementById(`msg_${targetId}`);
            if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
            else scrollToBottom();
          } else {
            scrollToBottom();
          }
        });
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load messages');
      }
    };

    fetchMessagingAccess();
    fetchMessages();
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    if (!currentUserId || !otherUserId) return;

    const markThreadRead = async () => {
      try {
        await fetch('/api/messages/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId, otherUserId }),
        });
      } catch (e) {
        console.error('Failed to mark messages as read:', e);
      }
    };

    markThreadRead();
  }, [currentUserId, otherUserId, messages.length]);

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

    const handleMessageStatus = (payload: any) => {
      const messageId = payload?.messageId;
      const status = payload?.status as Message['status'] | undefined;
      if (!messageId || !status) return;

      setMessages((prev) =>
        prev.map((message) =>
          message._id === messageId ? { ...message, status } : message
        )
      );
    };

    socket.on('receive_private_message', handleReceive);
    socket.on('message_sent', handleMessageSent);
    socket.on('message_status', handleMessageStatus);

    return () => {
      socket.off('receive_private_message', handleReceive);
      socket.off('message_sent', handleMessageSent);
      socket.off('message_status', handleMessageStatus);
    };
  }, [currentUserId, otherUserId]);

  const sendMessage = async () => {
    if (!currentUserId || !otherUserId) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (sending) return;
    if (!canMessage) return;

    setSending(true);
    setComposerError(null);
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
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: otherUserId,
          text: trimmed,
          tempId,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send message');
      }

      if (data?.message) {
        setMessages((prev) => prev.map((message) => (
          message.tempId === tempId ? { ...data.message, tempId: undefined } : message
        )));
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      setComposerError(e instanceof Error ? e.message : 'Failed to send message');
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
        <button
          type="button"
          onClick={() => onViewProfile?.(otherUserId)}
          className="flex items-center gap-3 min-w-0 text-left"
        >
          <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-foreground">
            {otherUser?.avatarUrl ? (
              <img src={otherUser.avatarUrl} alt={title} className="h-full w-full object-cover" />
            ) : (
              otherUser?.name?.[0] || 'U'
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">@{otherUser?.username || 'user'}</p>
          </div>
        </button>
        <div className="flex-1 min-w-0" />
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loadError && (
          <FriendlyCard className="border border-red-500/20 bg-red-500/10 text-sm text-red-600 dark:text-red-300">
            {loadError}
          </FriendlyCard>
        )}

        {messages.map((m) => {
          const isMine = m.senderId === currentUserId;
          const isLatestOwnMessage = isMine && [...messages].reverse().find((message) => message.senderId === currentUserId)?._id === m._id;
          return (
            <div id={`msg_${m._id}`} key={m._id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
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
                <div className={cn('mt-1 flex items-center gap-2 text-[10px] opacity-80', isMine ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isLatestOwnMessage && m.status && (
                    <span className="uppercase tracking-wide">{m.status}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-3 bg-background">
        {composerError && (
          <FriendlyCard className="mb-3 border border-amber-500/20 bg-amber-500/10 text-sm text-amber-700 dark:text-amber-300">
            {composerError}
          </FriendlyCard>
        )}
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
            placeholder={canMessage ? 'Message...' : 'Follow each other to send messages'}
            disabled={!canMessage}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!canMessage || !text.trim() || sending}
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
