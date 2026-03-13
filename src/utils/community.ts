export type CommunityContentType = 'feed' | 'group' | 'event' | 'academic' | 'announcement';
export type CommunityApprovalStatus = 'approved' | 'pending' | 'rejected';
export type CommunitySection = 'feed' | 'groups' | 'events' | 'academics';

export interface CommunityGroup {
  id: string;
  name: string;
  summary: string;
  accent: string;
  membersLabel: string;
}

export interface CommunityPostShape {
  approvalStatus?: CommunityApprovalStatus;
  contentType?: CommunityContentType;
  groupId?: string;
}

export interface ComposeValidationInput {
  content: string;
  contentType: CommunityContentType;
  userRole?: string;
  title?: string;
  place?: string;
  eventTime?: string;
  mediaCount?: number;
  groupId?: string;
}

export const COMMUNITY_GROUPS: CommunityGroup[] = [
  {
    id: 'campus-updates',
    name: 'Campus Updates',
    summary: 'Daily notices, timetable changes, and quick peer support.',
    accent: 'from-sky-500/20 to-cyan-500/10',
    membersLabel: 'Open group',
  },
  {
    id: 'placements',
    name: 'Placements',
    summary: 'Interview prep, hiring alerts, and resume review threads.',
    accent: 'from-violet-500/20 to-fuchsia-500/10',
    membersLabel: 'Career circle',
  },
  {
    id: 'clubs-societies',
    name: 'Clubs & Societies',
    summary: 'Club announcements, auditions, and collaboration requests.',
    accent: 'from-amber-500/20 to-orange-500/10',
    membersLabel: 'Student hub',
  },
];

export function normalizeContentType(contentType?: string): CommunityContentType {
  if (contentType === 'group' || contentType === 'event' || contentType === 'academic' || contentType === 'announcement') {
    return contentType;
  }

  return 'feed';
}

export function getVisibleCommunityPosts<T extends CommunityPostShape>(
  posts: T[],
  section: CommunitySection,
  activeGroupId: string = 'all'
): T[] {
  return posts.filter((post) => {
    const approvalStatus = post.approvalStatus || 'approved';
    if (approvalStatus !== 'approved') {
      return false;
    }

    const contentType = normalizeContentType(post.contentType);

    if (section === 'feed') {
      return contentType === 'feed' || contentType === 'announcement';
    }

    if (section === 'groups') {
      if (contentType === 'announcement') {
        return true;
      }

      if (contentType !== 'group') {
        return false;
      }

      return activeGroupId === 'all' ? true : post.groupId === activeGroupId;
    }

    if (section === 'events') {
      return contentType === 'event';
    }

    return contentType === 'academic';
  });
}

export function validateComposeInput(input: ComposeValidationInput): string | null {
  const content = input.content.trim();
  if (!content) {
    return 'Please add a description before posting.';
  }

  if (input.contentType === 'group' && !input.groupId) {
    return 'Choose a group before sharing this update.';
  }

  if (input.contentType === 'event') {
    if (!input.title?.trim()) {
      return 'Event requests need a title.';
    }

    if (!input.place?.trim()) {
      return 'Event requests need a place.';
    }

    if (!input.eventTime?.trim()) {
      return 'Event requests need a time.';
    }

    if (!input.mediaCount) {
      return 'Event requests need at least one photo.';
    }
  }

  if ((input.contentType === 'academic' || input.contentType === 'announcement') && input.userRole !== 'admin') {
    return 'Only admins can publish to this section.';
  }

  return null;
}

export function getGroupName(groupId?: string): string {
  return COMMUNITY_GROUPS.find((group) => group.id === groupId)?.name || 'Community Group';
}
