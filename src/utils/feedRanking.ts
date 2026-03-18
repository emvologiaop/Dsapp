type RankedPost = {
  _id: string;
  createdAt: string | Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isFollowing?: boolean;
  mutualCount?: number;
  contentType?: string;
};

function ageHours(createdAt: string | Date) {
  const created = new Date(createdAt).getTime();
  const diff = Math.max(Date.now() - created, 0);
  return Math.max(diff / (1000 * 60 * 60), 1);
}

export function scoreFeedPost(post: RankedPost) {
  const hours = ageHours(post.createdAt);
  const engagement = post.likesCount + post.commentsCount * 2 + post.sharesCount * 3;
  const engagementScore = engagement / Math.pow(hours + 2, 0.9);
  const followingBoost = post.isFollowing ? 18 : 0;
  const mutualBoost = Math.min(post.mutualCount || 0, 5) * 3;
  const freshnessBoost = Math.max(24 - hours, 0) * 0.8;
  const announcementBoost = post.contentType === 'announcement' ? 6 : 0;
  const academicBoost = post.contentType === 'academic' ? 4 : 0;

  return engagementScore + followingBoost + mutualBoost + freshnessBoost + announcementBoost + academicBoost;
}

export function rankFeedPosts<T extends RankedPost>(posts: T[]) {
  return [...posts].sort((a, b) => {
    const scoreDiff = scoreFeedPost(b) - scoreFeedPost(a);
    if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
