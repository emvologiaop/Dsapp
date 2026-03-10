import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image as ImageIcon, ArrowLeft, MoreVertical, Heart, Smile, Reply, Trash2, Check, CheckCheck } from 'lucide-react';
import socket from '../../services/socket';
import { FriendlyCard } from '../FriendlyCard';
import { cn } from '../../lib/utils';

interface Reaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  status?: 'sent' | 'delivered' | 'seen';
  readAt?: string;
  reactions: Reaction[];
  replyToId?: {
    _id: string;
    text: string;
    senderId: string;
  };
  deletedAt?: string;
}

interface ChatRoomProps {
  currentUser: any;
  otherUser: any;
  onBack: () => void;
}

const COMMON_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '🔥', '🎉'];

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, otherUser, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Join personal room for receiving messages
    socket.emit('join_chat', currentUser.id);

    // Fetch message history
    fetch(`/api/messages/${currentUser.id}/${otherUser.id}`)
      .then(async res => {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          return res.json();
        } else {
          const text = await res.text();
          throw new Error(text || "Non-JSON response");
        }
      })
      .then(data => {
        setMessages(data.filter((msg: Message) => !msg.deletedAt));

        // Mark messages as read
        const unreadMessageIds = data
          .filter((msg: Message) => msg.receiverId === currentUser.id && !msg.readAt)
          .map((msg: Message) => msg._id);

        if (unreadMessageIds.length > 0) {
          socket.emit('message_read', { messageIds: unreadMessageIds, userId: currentUser.id });
        }
      })
      .catch(err => console.error("Error fetching messages:", err));

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      if (message.senderId === otherUser.id || message.senderId === currentUser.id) {
        setMessages(prev => [...prev, message]);

        // Auto-mark as read if from other user
        if (message.senderId === otherUser.id) {
          socket.emit('message_read', { messageIds: [message._id], userId: currentUser.id });
        }
      }
    };

    // Listen for message status updates
    const handleMessageStatus = (data: { messageId: string; status: string; readAt?: string }) => {
      setMessages(prev => prev.map(msg =>
        msg._id === data.messageId
          ? { ...msg, status: data.status as any, readAt: data.readAt }
          : msg
      ));
    };

    // Listen for reactions
    const handleMessageReaction = (updatedMessage: Message) => {
      setMessages(prev => prev.map(msg =>
        msg._id === updatedMessage._id ? updatedMessage : msg
      ));
    };

    // Listen for deleted messages
    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
    };

    // Listen for typing indicator
    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === otherUser.id) {
        setOtherUserTyping(data.isTyping);
      }
    };

    // Listen for user status
    const handleUserStatus = (data: { userId: string; status: string }) => {
      if (data.userId === otherUser.id) {
        setOtherUserOnline(data.status === 'online');
      }
    };

    socket.on('receive_private_message', handleNewMessage);
    socket.on('message_status', handleMessageStatus);
    socket.on('message_reaction', handleMessageReaction);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_status', handleUserStatus);

    return () => {
      socket.off('receive_private_message', handleNewMessage);
      socket.off('message_status', handleMessageStatus);
      socket.off('message_reaction', handleMessageReaction);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_status', handleUserStatus);
    };
  }, [currentUser.id, otherUser.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { senderId: currentUser.id, receiverId: otherUser.id, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { senderId: currentUser.id, receiverId: otherUser.id, isTyping: false });
    }, 2000);
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const messageData = {
      senderId: currentUser.id,
      receiverId: otherUser.id,
      text: inputText,
      replyToId: replyingTo?._id,
    };

    socket.emit('send_private_message', messageData);

    // Optimistically add to UI
    const tempMessage: Message = {
      _id: Date.now().toString(),
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      text: messageData.text,
      createdAt: new Date().toISOString(),
      status: 'sent',
      reactions: [],
      ...(replyingTo && {
        replyToId: {
          _id: replyingTo._id,
          text: replyingTo.text,
          senderId: replyingTo.senderId
        }
      })
    };
    setMessages(prev => [...prev, tempMessage]);
    setInputText('');
    setReplyingTo(null);

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      socket.emit('typing', { senderId: currentUser.id, receiverId: otherUser.id, isTyping: false });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

        socket.emit('send_private_message', {
          senderId: currentUser.id,
          receiverId: otherUser.id,
          text: "📷 Photo",
          imageUrl: dataUrl,
          replyToId: replyingTo?._id,
        });

        const tempMessage: Message = {
          _id: Date.now().toString(),
          senderId: currentUser.id,
          receiverId: otherUser.id,
          text: "📷 Photo",
          imageUrl: dataUrl,
          createdAt: new Date().toISOString(),
          status: 'sent',
          reactions: [],
        };
        setMessages(prev => [...prev, tempMessage]);
        setReplyingTo(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    const message = messages.find(m => m._id === messageId);
    if (!message) return;

    const existingReaction = message.reactions.find(r => r.userId === currentUser.id);

    if (existingReaction && existingReaction.emoji === emoji) {
      // Remove reaction
      socket.emit('remove_reaction', { messageId, userId: currentUser.id });
    } else {
      // Add/update reaction
      socket.emit('add_reaction', { messageId, userId: currentUser.id, emoji });
    }

    setShowEmojiPicker(null);
  };

  const handleDoubleClick = (messageId: string) => {
    handleReaction(messageId, '❤️');
  };

  const handleDeleteMessage = (messageId: string) => {
    socket.emit('delete_message', { messageId, userId: currentUser.id });
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'seen') {
      return <CheckCheck size={14} className="text-neon-blue" />;
    } else if (status === 'delivered') {
      return <CheckCheck size={14} className="text-white/40" />;
    } else {
      return <Check size={14} className="text-white/40" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white font-bold">
                {otherUser.name?.[0]?.toUpperCase()}
              </div>
              {otherUserOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-background"></div>
              )}
            </div>
            <div>
              <p className="font-bold text-sm">{otherUser.name}</p>
              <p className="text-[10px] text-white/40 font-medium">
                {otherUserTyping ? 'typing...' : otherUserOnline ? 'Active now' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
        <button className="p-2 text-white/40 hover:text-white transition-colors">
          <MoreVertical size={20} />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        <AnimatePresence>
          {messages.map((msg, index) => {
            const isSentByMe = msg.senderId === currentUser.id;
            const showAvatar = !isSentByMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);

            return (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex gap-2 group",
                  isSentByMe ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className="w-7 flex-shrink-0">
                  {showAvatar && !isSentByMe && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white text-xs font-bold">
                      {otherUser.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                <div className={cn(
                  "flex flex-col max-w-[70%]",
                  isSentByMe ? "items-end" : "items-start"
                )}>
                  {/* Reply context */}
                  {msg.replyToId && (
                    <div className={cn(
                      "text-[10px] text-white/50 mb-1 px-3 py-1 rounded-lg border border-white/10",
                      isSentByMe ? "bg-neon-blue/10" : "bg-white/5"
                    )}>
                      <Reply size={10} className="inline mr-1" />
                      {msg.replyToId.text?.substring(0, 50)}
                      {msg.replyToId.text?.length > 50 ? '...' : ''}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className="relative">
                    <div
                      onDoubleClick={() => handleDoubleClick(msg._id)}
                      className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm break-words cursor-pointer select-none transition-all",
                        isSentByMe
                          ? "bg-neon-blue text-black font-medium rounded-tr-md"
                          : "bg-white/10 border border-white/10 text-white rounded-tl-md"
                      )}
                    >
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="Sent"
                          className="rounded-lg mb-2 max-w-full"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {msg.text}

                      {/* Reactions on message */}
                      {msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 -mb-1">
                          {Object.entries(
                            msg.reactions.reduce((acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([emoji, count]) => (
                            <span
                              key={emoji}
                              className="bg-background/90 px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 border border-white/20"
                            >
                              {emoji} {count > 1 && <span className="text-[10px]">{count}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons (shown on hover) */}
                    <div className={cn(
                      "absolute top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                      isSentByMe ? "right-full mr-2" : "left-full ml-2"
                    )}>
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === msg._id ? null : msg._id)}
                        className="w-7 h-7 rounded-full bg-background/90 border border-white/20 flex items-center justify-center hover:bg-white/10 transition-all"
                        title="React"
                      >
                        <Smile size={14} className="text-white/60" />
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(msg);
                          inputRef.current?.focus();
                        }}
                        className="w-7 h-7 rounded-full bg-background/90 border border-white/20 flex items-center justify-center hover:bg-white/10 transition-all"
                        title="Reply"
                      >
                        <Reply size={14} className="text-white/60" />
                      </button>
                      {isSentByMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg._id)}
                          className="w-7 h-7 rounded-full bg-background/90 border border-white/20 flex items-center justify-center hover:bg-red-500/20 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      )}
                    </div>

                    {/* Emoji picker */}
                    {showEmojiPicker === msg._id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "absolute top-full mt-1 bg-background/95 backdrop-blur-lg border border-white/20 rounded-2xl p-2 flex gap-1 z-10 shadow-2xl",
                          isSentByMe ? "right-0" : "left-0"
                        )}
                      >
                        {COMMON_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg._id, emoji)}
                            className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-lg transition-all hover:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Timestamp and status */}
                  <div className="flex items-center gap-1 mt-1 px-1">
                    <p className="text-[10px] text-white/30">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {isSentByMe && (
                      <span className="flex items-center">
                        {getStatusIcon(msg.status)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {otherUserTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white text-xs font-bold">
              {otherUser.name?.[0]?.toUpperCase()}
            </div>
            <div className="bg-white/10 px-4 py-2.5 rounded-2xl rounded-tl-md flex gap-1">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </motion.div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-6 py-2 bg-white/5 border-t border-white/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Reply size={16} className="text-neon-blue flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/60">Replying to</p>
                <p className="text-sm text-white truncate">{replyingTo.text}</p>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-2 text-white/40 hover:text-white transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-6 bg-background border-t border-white/5">
        <div className="flex items-end gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 pl-4">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Message..."
            className="flex-1 bg-transparent outline-none text-sm py-2 placeholder:text-white/30"
          />
          <label className="p-2 text-white/40 hover:text-white/60 transition-all cursor-pointer flex-shrink-0">
            <ImageIcon size={20} />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <button
            onClick={sendMessage}
            disabled={!inputText.trim()}
            className={cn(
              "p-3 rounded-xl transition-all active:scale-90 flex-shrink-0",
              inputText.trim()
                ? "bg-neon-blue text-black neon-glow"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            )}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
