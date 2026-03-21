import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  _id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  textareaClassName?: string;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
  textareaClassName,
  maxLength,
  rows = 3,
  disabled = false
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (mentionQuery.length > 0) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(mentionQuery);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [mentionQuery]);

  const searchUsers = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/users/search/mentions?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(newValue);

    // Check for @ mention trigger
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
      // Check if there's no space after @ (valid mention)
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 30) {
        setMentionStartPos(lastAtSymbol);
        setMentionQuery(textAfterAt);
        return;
      }
    }

    // Reset mention state if not in a mention
    setMentionStartPos(-1);
    setMentionQuery('');
    setShowSuggestions(false);
  };

  const insertMention = (user: User) => {
    if (mentionStartPos === -1) return;

    const beforeMention = value.slice(0, mentionStartPos);
    const afterMention = value.slice(mentionStartPos + mentionQuery.length + 1);
    const newValue = `${beforeMention}@${user.username} ${afterMention}`;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStartPos(-1);
    setSuggestions([]);

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStartPos + user.username.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        insertMention(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setMentionQuery('');
      setMentionStartPos(-1);
    }
  };

  // Calculate position for dropdown
  const getDropdownPosition = () => {
    if (!textareaRef.current || mentionStartPos === -1) return {};

    const textarea = textareaRef.current;
    const textBeforeCursor = value.slice(0, mentionStartPos);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length - 1;
    const lineHeight = 20; // Approximate line height

    return {
      top: `${(currentLine + 1) * lineHeight + 8}px`,
      left: '0px'
    };
  };

  return (
    <div className={cn('relative', className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
        className={cn(
          'w-full resize-none rounded-2xl border border-white/35 bg-background/80 px-4 py-3',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
          'text-foreground shadow-sm backdrop-blur',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          textareaClassName
        )}
      />

      {/* Mention suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={getDropdownPosition()}
            className="absolute z-50 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/35 bg-background/92 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.85)] backdrop-blur-xl"
          >
            {isSearching ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="py-1">
                {suggestions.map((user, index) => (
                  <button
                    key={user._id}
                    onClick={() => insertMention(user)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
                      selectedIndex === index ? 'bg-muted/80' : 'hover:bg-muted/60'
                    )}
                  >
                    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-2xl bg-muted">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold flex items-center justify-center h-full">
                          {user.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
