export type CommunitySection = 'feed' | 'groups' | 'events' | 'academics';

export type CommunityGroup = {
  id: string;
  name: string;
  summary: string;
  membersLabel: string;
  accent: string;
};

export const COMMUNITY_GROUPS: CommunityGroup[] = [
  {
    id: 'cs',
    name: 'Computer Science',
    summary: 'Projects, internships, and club updates.',
    membersLabel: 'CS',
    accent: 'from-sky-500/10 via-background to-transparent',
  },
  {
    id: 'business',
    name: 'Business',
    summary: 'Events, entrepreneurship, and case comps.',
    membersLabel: 'Biz',
    accent: 'from-emerald-500/10 via-background to-transparent',
  },
  {
    id: 'general',
    name: 'General',
    summary: 'Campus life, questions, and announcements.',
    membersLabel: 'All',
    accent: 'from-violet-500/10 via-background to-transparent',
  },
];

export function getGroupName(groupId: string): string {
  return COMMUNITY_GROUPS.find((g) => g.id === groupId)?.name || groupId;
}

export function normalizeContentType(input: any): 'feed' | 'group' | 'event' | 'academic' | 'announcement' {
  return input === 'group' || input === 'event' || input === 'academic' || input === 'announcement' ? input : 'feed';
}

export function getVisibleCommunityPosts(
  posts: any[],
  homeSection: CommunitySection,
  selectedGroupId: string = 'all',
  joinedGroups: string[] = []
): any[] {
  const normalized = Array.isArray(posts) ? posts : [];
  const approved = normalized.filter((p) => p.approvalStatus !== 'pending' && p.approvalStatus !== 'rejected');

  if (homeSection === 'groups') {
    const allowedGroups = selectedGroupId === 'all' ? joinedGroups : [selectedGroupId];
    return approved.filter((p) => {
      const type = normalizeContentType(p.contentType);
      return type === 'announcement' || (type === 'group' && allowedGroups.includes(p.groupId));
    });
  }

  if (homeSection === 'events') {
    return approved.filter((p) => normalizeContentType(p.contentType) === 'event');
  }

  if (homeSection === 'academics') {
    return approved.filter((p) => {
      const t = normalizeContentType(p.contentType);
      return t === 'academic' || t === 'announcement';
    });
  }

  // feed
  return approved.filter((p) => {
    const type = normalizeContentType(p.contentType);
    return type === 'feed' || type === 'announcement';
  });
}

export function validateComposeInput(input: {
  content: string;
  contentType: 'feed' | 'group' | 'event' | 'academic' | 'announcement';
  userRole?: string;
  title?: string;
  place?: string;
  eventTime?: string;
  mediaCount?: number;
  groupId?: string;
}): string | null {
  const content = (input.content || '').trim();
  const hasMedia = (input.mediaCount || 0) > 0;
  const userRole = input.userRole || 'user';

  if (!content && !hasMedia) return 'Write something or add photos.';

  if (input.contentType === 'group' && !input.groupId) return 'Pick a group.';

  if (input.contentType === 'event') {
    if (!input.title?.trim()) return 'Event requests need a title.';
    if (!input.place?.trim()) return 'Event requests need a place.';
    if (!input.eventTime) return 'Event requests need a time.';
    if (!hasMedia) return 'Event requests need at least one photo.';
  }

  if ((input.contentType === 'academic' || input.contentType === 'announcement') && userRole !== 'admin') {
    return 'Only admins can publish to this section.';
  }

  return null;
}
