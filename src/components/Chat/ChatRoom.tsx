import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Loader2, Send, X } from 'lucide-react';
import { FriendlyCard } from '../FriendlyCard';
import socket from '../../services/socket';
import { cn } from '../../lib/utils';
import { compressImage } from '../../utils/r2Upload';
import { withAuthHeaders } from '../../utils/clientAuth';

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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const focusMessageIdRef = useRef<string | undefined>(focusMessageId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const clearSelectedImage = (options?: { revokePreview?: boolean }) => {
    if (options?.revokePreview !== false && selectedImagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImage(null);
    setSelectedImagePreview(null);
  };

  useEffect(() => {
    return () => {
      if (selectedImagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

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
          headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
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
    if (!trimmed && !selectedImage) return;
    if (sending) return;
    if (!canMessage) return;

    setSending(true);
    setComposerError(null);
    const tempId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const queuedImage = selectedImage;
    const queuedPreview = selectedImagePreview;
    const optimistic: Message = {
      _id: tempId,
      tempId,
      senderId: currentUserId,
      receiverId: otherUserId,
      text: trimmed,
      imageUrl: queuedPreview || undefined,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setSelectedImage(null);
    setSelectedImagePreview(null);
    queueMicrotask(scrollToBottom);

    try {
      let uploadedImageUrl: string | undefined;
      if (queuedImage) {
        const form = new FormData();
        form.append('image', queuedImage);
        const uploadResponse = await fetch('/api/images/upload-r2', {
          method: 'POST',
          headers: withAuthHeaders(),
          body: form,
        });
        const uploadData = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok || !uploadData?.url) {
          throw new Error(uploadData?.error || 'Failed to upload image');
        }
        uploadedImageUrl = uploadData.url;
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: otherUserId,
          text: trimmed,
          imageUrl: uploadedImageUrl,
          tempId,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send message');
      }

      if (data?.message) {
        if (queuedPreview?.startsWith('blob:')) {
          URL.revokeObjectURL(queuedPreview);
        }
        setMessages((prev) => prev.map((message) => (
          message.tempId === tempId ? { ...data.message, tempId: undefined } : message
        )));
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      setText(trimmed);
      if (queuedImage) {
        setSelectedImage(queuedImage);
        setSelectedImagePreview(queuedPreview || null);
      }
      setComposerError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setComposerError('Only image attachments are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setComposerError('Images must be 10MB or smaller.');
      return;
    }

    try {
      const compressed = await compressImage(file, 1600, 1600, 0.82);
      if (selectedImagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImagePreview);
      }
      setSelectedImage(compressed);
      setSelectedImagePreview(URL.createObjectURL(compressed));
      setComposerError(null);
    } catch (error) {
      console.error('Failed to prepare chat image:', error);
      setComposerError('Failed to prepare the image. Please choose another file.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/30 bg-background/70 px-4 py-3 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-[24px] border border-white/25 bg-background/65 px-3 py-2 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.65)]">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-border/70 bg-background/80 p-2 transition-colors hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => onViewProfile?.(otherUserId)}
          className="flex items-center gap-3 min-w-0 text-left"
        >
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-muted font-bold text-foreground ring-1 ring-white/40">
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
        </div>
      </header>

      <div ref={listRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-4 py-5">
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
                  'max-w-[85%] rounded-[24px] border px-4 py-3 text-sm shadow-[0_18px_45px_-30px_rgba(15,23,42,0.75)] backdrop-blur',
                  isMine
                    ? 'border-primary/20 bg-primary text-primary-foreground'
                    : 'border-white/40 bg-background/82 text-foreground'
                )}
              >
                {m.imageUrl && (
                  <img src={m.imageUrl} alt="" className="w-full max-w-sm rounded-xl mb-2 object-cover" />
                )}
                {m.text ? <p className="whitespace-pre-wrap break-words">{m.text}</p> : null}
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

      <div className="border-t border-white/30 bg-background/80 p-3 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl">
        {composerError && (
          <FriendlyCard className="mb-3 border border-amber-500/20 bg-amber-500/10 text-sm text-amber-700 dark:text-amber-300">
            {composerError}
          </FriendlyCard>
        )}
        {selectedImagePreview && (
          <div className="mb-3 flex items-start gap-3 rounded-[24px] border border-white/35 bg-background/75 p-3 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.7)] backdrop-blur">
            <img src={selectedImagePreview} alt="Selected attachment" className="h-20 w-20 rounded-2xl object-cover ring-1 ring-white/30" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Image ready to send</p>
              <p className="text-xs text-muted-foreground">This photo will be uploaded and delivered with your message.</p>
            </div>
            <button
              type="button"
              onClick={() => clearSelectedImage()}
              className="rounded-full border border-border/70 bg-background/80 p-2 transition-colors hover:bg-muted"
              aria-label="Remove image"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-[26px] border border-white/40 bg-background/75 p-2 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.7)] backdrop-blur">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border border-border/70 bg-background/80 p-2 text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted"
            title="Attach image"
            aria-label="Attach image"
          >
            <ImageIcon size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={canMessage ? (selectedImage ? 'Add a caption (optional)...' : 'Message...') : 'Follow each other to send messages'}
            disabled={!canMessage}
            className="flex-1 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!canMessage || (!text.trim() && !selectedImage) || sending}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-[0_18px_35px_-24px_rgba(15,23,42,0.9)] transition-all duration-300 active:scale-95 disabled:opacity-50"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {sending ? 'Sending' : 'Send'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
