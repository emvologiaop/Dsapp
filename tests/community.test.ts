import { describe, expect, it } from 'vitest';
import { getVisibleCommunityPosts, validateComposeInput } from '../src/utils/community';

describe('community helpers', () => {
  const posts = [
    { _id: '1', contentType: 'feed', approvalStatus: 'approved' as const },
    { _id: '2', contentType: 'announcement', approvalStatus: 'approved' as const },
    { _id: '3', contentType: 'group', approvalStatus: 'approved' as const, groupId: 'campus-updates' },
    { _id: '4', contentType: 'group', approvalStatus: 'approved' as const, groupId: 'placements' },
    { _id: '5', contentType: 'event', approvalStatus: 'approved' as const },
    { _id: '6', contentType: 'academic', approvalStatus: 'approved' as const },
    { _id: '7', contentType: 'event', approvalStatus: 'pending' as const },
  ];

  it('shows announcements in the main feed', () => {
    expect(getVisibleCommunityPosts(posts, 'feed').map((post) => post._id)).toEqual(['1', '2']);
  });

  it('shows announcements and selected group content in groups view', () => {
    expect(getVisibleCommunityPosts(posts, 'groups', 'campus-updates').map((post) => post._id)).toEqual(['2', '3']);
  });

  it('keeps pending event requests out of public views', () => {
    expect(getVisibleCommunityPosts(posts, 'events').map((post) => post._id)).toEqual(['5']);
  });

  it('requires the full event request payload', () => {
    expect(validateComposeInput({
      contentType: 'event',
      content: 'A fun event',
      title: '',
      place: '',
      eventTime: '',
      mediaCount: 0,
    })).toBe('Event requests need a title.');

    expect(validateComposeInput({
      contentType: 'event',
      content: 'A fun event',
      title: 'Hack Night',
      place: 'Lab 4',
      eventTime: '2026-04-01T18:00',
      mediaCount: 1,
    })).toBeNull();
  });

  it('restricts announcement publishing to admins', () => {
    expect(validateComposeInput({
      contentType: 'announcement',
      content: 'Important notice',
      userRole: 'user',
    })).toBe('Only admins can publish to this section.');

    expect(validateComposeInput({
      contentType: 'announcement',
      content: 'Important notice',
      userRole: 'admin',
    })).toBeNull();
  });
});
