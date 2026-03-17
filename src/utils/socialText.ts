export function extractHashtags(text: string): string[] {
  const matches = (text || '').match(/#([\p{L}\p{N}_-]+)/gu) || [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
}

export function normalizeHashtagQuery(query: string): string {
  return (query || '').trim().replace(/^#+/, '').toLowerCase();
}

export function splitTextWithHashtags(text: string): string[] {
  return (text || '').split(/(#[\p{L}\p{N}_-]+)/gu).filter(Boolean);
}

export function extractMentions(text: string): string[] {
  const matches = (text || '').match(/@([\w.]+)/g) || [];
  return [...new Set(matches.map((mention) => mention.slice(1).toLowerCase()))];
}
