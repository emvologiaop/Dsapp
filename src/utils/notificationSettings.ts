export interface NotificationSettings {
  messages: boolean;
  comments: boolean;
  likes: boolean;
  follows: boolean;
  mentions: boolean;
  shares: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  messages: true,
  comments: true,
  likes: true,
  follows: true,
  mentions: true,
  shares: true,
};

export function normalizeNotificationSettings(
  input?: Partial<NotificationSettings> | null
): NotificationSettings {
  return {
    messages: typeof input?.messages === 'boolean' ? input.messages : DEFAULT_NOTIFICATION_SETTINGS.messages,
    comments: typeof input?.comments === 'boolean' ? input.comments : DEFAULT_NOTIFICATION_SETTINGS.comments,
    likes: typeof input?.likes === 'boolean' ? input.likes : DEFAULT_NOTIFICATION_SETTINGS.likes,
    follows: typeof input?.follows === 'boolean' ? input.follows : DEFAULT_NOTIFICATION_SETTINGS.follows,
    mentions: typeof input?.mentions === 'boolean' ? input.mentions : DEFAULT_NOTIFICATION_SETTINGS.mentions,
    shares: typeof input?.shares === 'boolean' ? input.shares : DEFAULT_NOTIFICATION_SETTINGS.shares,
  };
}
