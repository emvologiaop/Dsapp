import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  normalizeNotificationSettings,
} from '../src/utils/notificationSettings';

describe('notification settings helpers', () => {
  it('returns defaults when settings are missing', () => {
    expect(normalizeNotificationSettings()).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    expect(normalizeNotificationSettings(null)).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('preserves provided boolean settings while filling missing values', () => {
    expect(
      normalizeNotificationSettings({
        messages: false,
        likes: false,
      })
    ).toEqual({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      messages: false,
      likes: false,
    });
  });

  it('ignores non-boolean values for safety', () => {
    expect(
      normalizeNotificationSettings({
        comments: 'yes' as any,
        follows: 1 as any,
        mentions: false,
      })
    ).toEqual({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      mentions: false,
    });
  });
});
