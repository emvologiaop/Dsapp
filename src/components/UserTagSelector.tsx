import React, { useState, useEffect, useRef } from 'react';
import { X, Search, UserPlus, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  _id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface UserTagSelectorProps {
  selectedUsers: User[];
  onUsersChange: (users: User[]) => void;
  maxTags?: number;
  placeholder?: string;
  className?: string;
}

export const UserTagSelector: React.FC<UserTagSelectorProps> = ({
  selectedUsers,
  onUsersChange,
  maxTags = 20,
  placeholder = 'Tag people...',
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const searchUsers = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/users/search/mentions?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out already selected users
        const filteredResults = data.filter(
          (user: User) => !selectedUsers.some(selected => selected._id === user._id)
        );
        setSearchResults(filteredResults);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: User) => {
    if (selectedUsers.length >= maxTags) {
      alert(`You can only tag up to ${maxTags} people`);
      return;
    }

    onUsersChange([...selectedUsers, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    onUsersChange(selectedUsers.filter(user => user._id !== userId));
  };

  const isUserSelected = (userId: string) => {
    return selectedUsers.some(user => user._id === userId);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Selected users chips */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedUsers.map((user) => (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
            >
              <div className="w-5 h-5 rounded-full bg-muted overflow-hidden flex-shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold flex items-center justify-center h-full">
                    {user.name[0]}
                  </span>
                )}
              </div>
              <span className="font-medium">{user.username}</span>
              <button
                onClick={() => handleRemoveUser(user._id)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
          <UserPlus className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="flex-1 outline-none bg-transparent text-sm"
            disabled={selectedUsers.length >= maxTags}
          />
          {selectedUsers.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {selectedUsers.length}/{maxTags}
            </span>
          )}
        </div>

        {/* Dropdown results */}
        <AnimatePresence>
          {isOpen && (searchQuery.trim().length > 0 || searchResults.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50"
            >
              {isSearching ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : searchResults.length === 0 && searchQuery.trim().length > 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="py-1">
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold flex items-center justify-center h-full">
                            {user.name[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                      </div>
                      {isUserSelected(user._id) && (
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
