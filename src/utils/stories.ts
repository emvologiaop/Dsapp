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

export const STORY_LIFETIME_TEXT = 'Stories expire after 24 hours.';

function getLatestStoryTimestamp(stories: StoryItem[]) {
  return stories.reduce((latestTimestamp, story) => {
    const storyTimestamp = new Date(story.createdAt).getTime();
    return storyTimestamp > latestTimestamp ? storyTimestamp : latestTimestamp;
  }, 0);
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

    const leftLatest = getLatestStoryTimestamp(left.stories);
    const rightLatest = getLatestStoryTimestamp(right.stories);

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
  if (minutesRemaining <= 60) {
    return `${minutesRemaining}m left`;
  }

  const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));
  return `${hoursRemaining}h left`;
}
