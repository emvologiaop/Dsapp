import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommentsPanel } from '../src/components/CommentsPanel';
import { ReelCommentsPanel } from '../src/components/ReelCommentsPanel';
import { SearchPanel } from '../src/components/SearchPanel';
import { ShareModal } from '../src/components/ShareModal';

describe('mobile overlay layouts', () => {
  it('renders the post comments panel as a full-screen mobile overlay', () => {
    const html = renderToStaticMarkup(
      <CommentsPanel
        postId="post-1"
        userId="user-1"
        isAnonymous={false}
        onClose={() => {}}
      />
    );

    expect(html).toContain('fixed inset-0 bg-background z-50 flex flex-col');
    expect(html).toContain('md:max-h-[75vh]');
  });

  it('renders the reel comments panel as a full-screen mobile overlay', () => {
    const html = renderToStaticMarkup(
      <ReelCommentsPanel
        reelId="reel-1"
        userId="user-1"
        isAnonymous={false}
        onClose={() => {}}
      />
    );

    expect(html).toContain('fixed inset-0 w-full bg-background shadow-xl flex flex-col');
    expect(html).toContain('md:max-h-[80vh]');
  });

  it('renders the search panel full-screen on mobile while keeping the desktop card layout', () => {
    const html = renderToStaticMarkup(<SearchPanel onClose={() => {}} />);

    expect(html).toContain('fixed inset-0 z-50 bg-background flex flex-col');
    expect(html).toContain('rounded-none border-0 p-4 shadow-none');
    expect(html).toContain('md:max-w-2xl');
  });

  it('renders the share modal as a full-screen mobile overlay', () => {
    const html = renderToStaticMarkup(
      <ShareModal
        isOpen
        onClose={() => {}}
        postId="post-1"
        userId="user-1"
        onShareComplete={() => {}}
      />
    );

    expect(html).toContain('fixed inset-0 bg-background z-50 w-full flex flex-col');
    expect(html).toContain('md:w-[400px]');
  });
});
