export interface StoryUser {
  _id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export interface StoryItem {
  _id: string;
  userId: StoryUser;
  createdAt: string;
  expiresAt: string;
  views: string[];
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  duration?: number;
}

export interface StoryGroup {
  user: StoryUser;
  stories: StoryItem[];
  hasViewed?: boolean;
}

export function sortStoryGroups(groups: StoryGroup[], currentUserId: string) {
  return [...groups].sort((left, right) => {
    const leftIsOwn = left.user._id === currentUserId;
    const rightIsOwn = right.user._id === currentUserId;

    if (leftIsOwn !== rightIsOwn) {
      return leftIsOwn ? -1 : 1;
    }

    if (!!left.hasViewed !== !!right.hasViewed) {
      return left.hasViewed ? 1 : -1;
    }

    const leftLatest = left.stories[0]?.createdAt ? new Date(left.stories[0].createdAt).getTime() : 0;
    const rightLatest = right.stories[0]?.createdAt ? new Date(right.stories[0].createdAt).getTime() : 0;

    return rightLatest - leftLatest;
  });
}

export function orderStoriesForViewer(stories: StoryItem[]) {
  return [...stories].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

export function getStoryTimeRemaining(expiresAt: string, now = new Date()) {
  const timeRemaining = new Date(expiresAt).getTime() - now.getTime();

  if (timeRemaining <= 0) {
    return 'Expired';
  }

  const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
  if (minutesRemaining < 60) {
    return `${minutesRemaining}m left`;
  }

  const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));
  return `${hoursRemaining}h left`;
}
