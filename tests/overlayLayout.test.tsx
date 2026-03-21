import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Home } from 'lucide-react';
import { Dock } from '../components/ui/dock-two';
import { CommentsPanel } from '../src/components/CommentsPanel';
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

    expect(html).toContain('fixed inset-0 z-50 flex flex-col bg-background/95');
    expect(html).toContain('md:max-h-[78vh]');
  });

  it('renders the search panel full-screen on mobile while keeping the desktop card layout', () => {
    const html = renderToStaticMarkup(<SearchPanel onClose={() => {}} />);

    expect(html).toContain('fixed inset-0 z-50 flex flex-col bg-background/90');
    expect(html).toContain('border-white/35 bg-background/78');
    expect(html).toContain('max-w-2xl');
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

    expect(html).toContain('fixed inset-0 z-50 flex w-full flex-col bg-background/95');
    expect(html).toContain('md:w-[420px]');
  });

  it('renders the bottom dock as a compact bottom bar instead of a centered tall container', () => {
    const html = renderToStaticMarkup(
      <Dock
        items={[{ icon: Home, label: 'Home', onClick: () => {} }]}
        className="fixed bottom-0 left-0 right-0 z-40"
      />
    );

    expect(html).toContain('fixed bottom-0 left-0 right-0 z-40');
    expect(html).toContain('pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]');
    expect(html).toContain('max-w-md');
    expect(html).not.toContain('h-64');
  });
});
