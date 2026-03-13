import { describe, expect, it } from 'vitest';
import { extractHashtags, normalizeHashtagQuery, splitTextWithHashtags } from '../src/utils/socialText';

describe('socialText helpers', () => {
  it('extracts unique lowercase hashtags', () => {
    expect(extractHashtags('Testing #Campus #campus #Reels today')).toEqual(['campus', 'reels']);
  });

  it('normalizes hashtag queries', () => {
    expect(normalizeHashtagQuery(' ##CampusLife ')).toBe('campuslife');
  });

  it('splits text while preserving hashtags', () => {
    expect(splitTextWithHashtags('hello #campus world')).toEqual(['hello ', '#campus', ' world']);
  });
});
