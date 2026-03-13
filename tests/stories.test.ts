import { describe, expect, it } from 'vitest';
import { getStoryTimeRemaining, orderStoriesForViewer, sortStoryGroups } from '../src/utils/stories';

describe('story utilities', () => {
  it('sorts story groups with your story first, then unviewed stories, then viewed stories', () => {
    const groups = [
      {
        user: { _id: 'followed-viewed', name: 'Viewed', username: 'viewed' },
        stories: [{ _id: '3', createdAt: '2026-03-12T08:00:00.000Z', expiresAt: '2026-03-13T08:00:00.000Z', views: [], mediaUrl: '', mediaType: 'image' as const, userId: { _id: 'followed-viewed', name: 'Viewed', username: 'viewed' } }],
        hasViewed: true
      },
      {
        user: { _id: 'me', name: 'Me', username: 'me' },
        stories: [{ _id: '1', createdAt: '2026-03-12T09:00:00.000Z', expiresAt: '2026-03-13T09:00:00.000Z', views: [], mediaUrl: '', mediaType: 'image' as const, userId: { _id: 'me', name: 'Me', username: 'me' } }],
        hasViewed: false
      },
      {
        user: { _id: 'followed-new', name: 'New', username: 'new' },
        stories: [{ _id: '2', createdAt: '2026-03-12T10:00:00.000Z', expiresAt: '2026-03-13T10:00:00.000Z', views: [], mediaUrl: '', mediaType: 'image' as const, userId: { _id: 'followed-new', name: 'New', username: 'new' } }],
        hasViewed: false
      }
    ];

    expect(sortStoryGroups(groups, 'me').map((group) => group.user._id)).toEqual([
      'me',
      'followed-new',
      'followed-viewed'
    ]);
  });

  it('orders stories for the viewer from oldest to newest', () => {
    const stories = [
      { _id: 'latest', createdAt: '2026-03-12T10:00:00.000Z', expiresAt: '2026-03-13T10:00:00.000Z', views: [], mediaUrl: '', mediaType: 'image' as const, userId: { _id: 'u1', name: 'A', username: 'a' } },
      { _id: 'oldest', createdAt: '2026-03-12T08:00:00.000Z', expiresAt: '2026-03-13T08:00:00.000Z', views: [], mediaUrl: '', mediaType: 'image' as const, userId: { _id: 'u1', name: 'A', username: 'a' } },
      { _id: 'middle', createdAt: '2026-03-12T09:00:00.000Z', expiresAt: '2026-03-13T09:00:00.000Z', views: [], mediaUrl: '', mediaType: 'image' as const, userId: { _id: 'u1', name: 'A', username: 'a' } }
    ];

    expect(orderStoriesForViewer(stories).map((story) => story._id)).toEqual(['oldest', 'middle', 'latest']);
  });

  it('formats remaining story lifetime in hours and minutes', () => {
    const now = new Date('2026-03-12T08:00:00.000Z');

    expect(getStoryTimeRemaining('2026-03-12T09:30:00.000Z', now)).toBe('2h left');
    expect(getStoryTimeRemaining('2026-03-12T08:20:00.000Z', now)).toBe('20m left');
    expect(getStoryTimeRemaining('2026-03-12T07:59:00.000Z', now)).toBe('Expired');
  });
});
