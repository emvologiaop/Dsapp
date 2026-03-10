import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Image as ImageIcon, ArrowLeft, MoreVertical } from 'lucide-react';
import socket from '../../services/socket';
import { FriendlyCard } from '../FriendlyCard';
import { cn } from '../../lib/utils';

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
}

interface ChatRoomProps {
  currentUser: any;
  otherUser: any;
  onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, otherUser, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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
      .then(data => setMessages(data))
      .catch(err => console.error("Error fetching messages:", err));

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      if (message.senderId === otherUser.id || message.senderId === currentUser.id) {
        setMessages(prev => [...prev, message]);
      }
    };

    socket.on('receive_private_message', handleNewMessage);

    return () => {
      socket.off('receive_private_message', handleNewMessage);
    };
  }, [currentUser.id, otherUser.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const messageData = {
      senderId: currentUser.id,
      receiverId: otherUser.id,
      text: inputText,
    };

    socket.emit('send_private_message', messageData);
    
    // Optimistically add to UI (or wait for server echo if we emit to sender too)
    // In our server.ts, we only emit to receiver, so we should add it here
    const tempMessage: Message = {
      _id: Date.now().toString(),
      ...messageData,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);
    setInputText('');
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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality compression
        
        socket.emit('send_private_message', {
          senderId: currentUser.id,
          receiverId: otherUser.id,
          text: "Sent an image",
          imageUrl: dataUrl
        });

        const tempMessage: Message = {
          _id: Date.now().toString(),
          senderId: currentUser.id,
          receiverId: otherUser.id,
          text: "Sent an image",
          imageUrl: dataUrl,
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMessage]);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* ... existing header ... */}
      <header className="bg-background/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-white/60">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10" />
            <div>
              <p className="font-bold text-sm">{otherUser.name}</p>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Online</p>
            </div>
          </div>
        </div>
        <button className="p-2 text-white/40">
          <MoreVertical size={20} />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={cn(
              "flex flex-col max-w-[80%]",
              msg.senderId === currentUser.id ? "ml-auto items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "px-4 py-3 rounded-2xl text-sm overflow-hidden",
                msg.senderId === currentUser.id
                  ? "bg-neon-blue text-black font-medium rounded-tr-none"
                  : "bg-white/5 border border-white/10 text-white rounded-tl-none"
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
            </div>
            <p className="text-[10px] text-white/20 mt-1">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-background border-t border-white/5">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 pl-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent outline-none text-sm py-2"
          />
          <label className="p-2 text-white/40 hover:text-white/60 transition-all cursor-pointer">
            <ImageIcon size={20} />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <button
            onClick={sendMessage}
            className="p-3 bg-neon-blue text-black rounded-xl neon-glow transition-all active:scale-90"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
