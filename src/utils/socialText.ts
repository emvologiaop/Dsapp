export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const hashtags = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.add(match[1].toLowerCase());
  }

  return [...hashtags];
}

export function normalizeHashtagQuery(query: string): string {
  return query.trim().replace(/^#+/, '').toLowerCase();
}

export function splitTextWithHashtags(text: string): string[] {
  return text.split(/(#\w+)/g).filter(Boolean);
}
