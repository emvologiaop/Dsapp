import React, { useEffect, useState } from 'react';

interface UserTagSelectorProps {
  selectedUsers: Array<{ _id: string; name: string; username: string; avatarUrl?: string }>;
  onUsersChange: (users: Array<{ _id: string; name: string; username: string; avatarUrl?: string }>) => void;
  maxTags?: number;
  placeholder?: string;
}

export const UserTagSelector: React.FC<UserTagSelectorProps> = ({
  selectedUsers,
  onUsersChange,
  maxTags = 20,
  placeholder = 'Search users...',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?type=users&limit=8&query=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        setResults(Array.isArray(data?.users) ? data.users : []);
      } catch {
        setResults([]);
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const addUser = (user: any) => {
    if (selectedUsers.some((item) => item._id === user._id) || selectedUsers.length >= maxTags) return;
    onUsersChange([...selectedUsers, user]);
    setQuery('');
    setResults([]);
  };

  const removeUser = (userId: string) => {
    onUsersChange(selectedUsers.filter((user) => user._id !== userId));
  };

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
      />

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <button
              key={user._id}
              type="button"
              onClick={() => removeUser(user._id)}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
            >
              @{user.username} x
            </button>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border bg-background p-2">
          {results.map((user) => (
            <button
              key={user._id}
              type="button"
              onClick={() => addUser(user)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
            >
              <div className="h-8 w-8 overflow-hidden rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (user.name?.[0] || 'U')}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.username}</p>
                <p className="truncate text-xs text-muted-foreground">{user.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
