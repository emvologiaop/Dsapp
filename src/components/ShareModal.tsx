import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface User {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  userId: string;
  onShareComplete: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, postId, userId, onShareComplete }) => {
  const [mutuals, setMutuals] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchMutuals();
    } else {
      setSelectedUsers(new Set());
      setSearchQuery('');
    }
  }, [isOpen]);

  const fetchMutuals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/mutuals`);
      if (res.ok) {
        const data = await res.json();
        setMutuals(data);
      }
    } catch (error) {
      console.error('Failed to fetch mutuals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (id: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUsers(newSelected);
  };

  const handleShare = async () => {
    if (selectedUsers.size === 0) return;
    
    setIsSharing(true);
    try {
      const res = await fetch(`/api/posts/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          receiverIds: Array.from(selectedUsers)
        })
      });
      
      if (res.ok) {
        onShareComplete();
        onClose();
      }
    } catch (error) {
      console.error('Failed to share post:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const filteredMutuals = mutuals.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed inset-0 bg-background z-50 w-full flex flex-col shadow-2xl overflow-hidden md:inset-auto md:top-1/2 md:left-1/2 md:right-auto md:bottom-auto md:w-[400px] md:max-h-[80vh] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-border"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="font-bold text-lg">Share with friends</h3>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search mutual followers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredMutuals.length > 0 ? (
                <div className="space-y-1">
                  {filteredMutuals.map(user => (
                    <button
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-xl transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                          alt={user.name} 
                          className="w-10 h-10 rounded-full bg-muted"
                        />
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        selectedUsers.has(user.id) 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-muted-foreground/30"
                      )}>
                        {selectedUsers.has(user.id) && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                  <p className="mb-2">No mutual followers found.</p>
                  <p className="text-sm">You can only share posts directly with people who follow you back.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/10">
              <button
                onClick={handleShare}
                disabled={selectedUsers.size === 0 || isSharing}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                {isSharing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send to {selectedUsers.size > 0 ? `${selectedUsers.size} friend${selectedUsers.size > 1 ? 's' : ''}` : 'friends'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
