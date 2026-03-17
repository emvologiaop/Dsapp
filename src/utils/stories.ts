export type StoryGroup = {
  user: { _id: string; name: string; username?: string; avatarUrl?: string };
  stories: any[];
  hasViewed: boolean;
};

export function sortStoryGroups(groups: StoryGroup[], currentUserId: string): StoryGroup[] {
  const list = Array.isArray(groups) ? groups.slice() : [];
  // Keep current user's group first, then unviewed, then viewed, then newest by first story createdAt.
  const score = (g: StoryGroup) => {
    if (g.user?._id === currentUserId) return -1000;
    return g.hasViewed ? 10 : 0;
  };
  return list.sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    if (sa !== sb) return sa - sb;
    const ta = new Date(a.stories?.[0]?.createdAt || 0).getTime();
    const tb = new Date(b.stories?.[0]?.createdAt || 0).getTime();
    return tb - ta;
  });
}

export function orderStoriesForViewer<T extends { createdAt?: string }>(stories: T[]): T[] {
  return (Array.isArray(stories) ? stories.slice() : []).sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
}

export function getStoryTimeRemaining(expiresAt?: string | Date | null, now: Date = new Date()): string {
  if (!expiresAt) return 'Expired';
  const expires = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  if (diffMs <= 0) return 'Expired';

  const totalMinutes = Math.ceil(diffMs / (60 * 1000));
  if (totalMinutes >= 60) {
    return `${Math.ceil(totalMinutes / 60)}h left`;
  }
  return `${totalMinutes}m left`;
}
