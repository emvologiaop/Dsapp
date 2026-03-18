import { describe, expect, it } from 'vitest';
import { buildUserSuggestions, getMutualFriendIds } from '../src/utils/socialGraph';

describe('social graph helpers', () => {
  it('deduplicates and filters mutual friend ids', () => {
    expect(
      getMutualFriendIds(['u2', 'u3', 'u2', 'u4'], ['u2', 'u4', 'u5'], 'u4')
    ).toEqual(['u2']);
  });

  it('ranks suggestions by mutual connections and excludes followed users', () => {
    const suggestions = buildUserSuggestions(
      'me',
      ['followed-user', 'mutual-1'],
      ['mutual-2'],
      [
        {
          id: 'user-a',
          name: 'Alice',
          username: 'alice',
          avatarUrl: '',
          followerIds: ['mutual-1', 'mutual-2', 'outsider'],
        },
        {
          id: 'followed-user',
          name: 'Already Followed',
          username: 'followed',
          avatarUrl: '',
          followerIds: ['mutual-1', 'mutual-2'],
        },
        {
          id: 'user-b',
          name: 'Ben',
          username: 'ben',
          avatarUrl: '',
          followerIds: ['mutual-2'],
        },
      ],
      [
        { id: 'mutual-1', name: 'Mutual One', username: 'm1', avatarUrl: '' },
        { id: 'mutual-2', name: 'Mutual Two', username: 'm2', avatarUrl: '' },
      ],
      5
    );

    expect(suggestions.map((suggestion) => suggestion.id)).toEqual(['user-a', 'user-b']);
    expect(suggestions[0].mutualCount).toBe(2);
    expect(suggestions[0].mutuals.map((mutual) => mutual?.id)).toEqual(['mutual-1', 'mutual-2']);
  });

  it('falls back to username ordering when mutual counts match', () => {
    const suggestions = buildUserSuggestions(
      'me',
      [],
      [],
      [
        { id: 'u2', name: 'Zed', username: 'zed', followerIds: [] },
        { id: 'u1', name: 'Amy', username: 'amy', followerIds: [] },
      ],
      [],
      5
    );

    expect(suggestions.map((suggestion) => suggestion.username)).toEqual(['amy', 'zed']);
  });
});
