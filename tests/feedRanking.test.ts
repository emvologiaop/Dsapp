import { describe, expect, it } from 'vitest';
import { rankFeedPosts, scoreFeedPost } from '../src/utils/feedRanking';

describe('feed ranking helpers', () => {
  it('boosts followed users over equally fresh non-followed users', () => {
    const now = new Date().toISOString();
    const ranked = rankFeedPosts([
      { _id: 'b', createdAt: now, likesCount: 1, commentsCount: 0, sharesCount: 0, isFollowing: false, mutualCount: 0 },
      { _id: 'a', createdAt: now, likesCount: 1, commentsCount: 0, sharesCount: 0, isFollowing: true, mutualCount: 0 },
    ]);

    expect(ranked.map((post) => post._id)).toEqual(['a', 'b']);
  });

  it('lets strong engagement beat weaker engagement when recency is similar', () => {
    const now = new Date().toISOString();
    expect(scoreFeedPost({
      _id: 'high',
      createdAt: now,
      likesCount: 10,
      commentsCount: 4,
      sharesCount: 2,
      isFollowing: false,
      mutualCount: 0,
    })).toBeGreaterThan(scoreFeedPost({
      _id: 'low',
      createdAt: now,
      likesCount: 1,
      commentsCount: 0,
      sharesCount: 0,
      isFollowing: false,
      mutualCount: 0,
    }));
  });

  it('uses mutual connections as a tiebreaking boost', () => {
    const now = new Date().toISOString();
    const ranked = rankFeedPosts([
      { _id: 'less', createdAt: now, likesCount: 2, commentsCount: 0, sharesCount: 0, mutualCount: 0 },
      { _id: 'more', createdAt: now, likesCount: 2, commentsCount: 0, sharesCount: 0, mutualCount: 3 },
    ]);

    expect(ranked[0]._id).toBe('more');
  });
});
