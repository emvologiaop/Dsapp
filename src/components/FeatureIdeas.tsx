import React, { useMemo, useState } from 'react';
import { FriendlyCard } from './FriendlyCard';
import { cn } from '../lib/utils';
import { Sparkles, TrendingUp, Hammer, Plus, Lightbulb, CheckCircle2 } from 'lucide-react';

type IdeaType = 'feature' | 'enhancement';
type ImpactLevel = 'High' | 'Medium' | 'Low';
type Status = 'Now' | 'Next' | 'Later';

type Idea = {
  id: string;
  title: string;
  description: string;
  area: string;
  type: IdeaType;
  impact: ImpactLevel;
  status: Status;
  votes: number;
};

const seedIdeas: Idea[] = [
  {
    id: 'threads',
    title: 'Threaded comments',
    description: 'Let students reply to specific comments so busy posts stay readable.',
    area: 'Engagement',
    type: 'feature',
    impact: 'High',
    status: 'Now',
    votes: 18,
  },
  {
    id: 'reels',
    title: 'Reels upload beta',
    description: 'Ship the first cut of vertical video with auto-captions and campus-safe filters.',
    area: 'Media',
    type: 'feature',
    impact: 'High',
    status: 'Next',
    votes: 15,
  },
  {
    id: 'moderation',
    title: 'Better reporting and mute controls',
    description: 'Quick-report, keyword muting, and clear audit trail for moderators.',
    area: 'Safety',
    type: 'enhancement',
    impact: 'High',
    status: 'Now',
    votes: 22,
  },
  {
    id: 'offline',
    title: 'Offline-friendly feed',
    description: 'Cache the last 25 posts so campus Wi-Fi drops do not stop browsing.',
    area: 'Reliability',
    type: 'enhancement',
    impact: 'Medium',
    status: 'Next',
    votes: 12,
  },
  {
    id: 'events',
    title: 'Events and RSVP',
    description: 'Lightweight events with reminders and headcount for clubs and hostels.',
    area: 'Community',
    type: 'feature',
    impact: 'Medium',
    status: 'Later',
    votes: 9,
  },
  {
    id: 'profiles',
    title: 'Profile polish',
    description: 'Show streaks, badges, and quick links to reels and posts.',
    area: 'Identity',
    type: 'enhancement',
    impact: 'Low',
    status: 'Later',
    votes: 6,
  },
];

const typeCopy: Record<IdeaType, { label: string; icon: typeof Sparkles }> = {
  feature: { label: 'New Feature', icon: Sparkles },
  enhancement: { label: 'Enhancement', icon: Hammer },
};

const impactTone: Record<ImpactLevel, string> = {
  High: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20',
  Medium: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  Low: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
};

const statusTone: Record<Status, string> = {
  Now: 'bg-primary text-primary-foreground',
  Next: 'bg-muted text-foreground',
  Later: 'bg-white/5 text-white',
};

export const FeatureIdeas: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>(seedIdeas);
  const [filter, setFilter] = useState<IdeaType | 'all'>('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [type, setType] = useState<IdeaType>('feature');
  const [impact, setImpact] = useState<ImpactLevel>('Medium');

  const filteredIdeas = useMemo(() => {
    const list = filter === 'all' ? ideas : ideas.filter((idea) => idea.type === filter);
    return [...list].sort((a, b) => b.votes - a.votes);
  }, [filter, ideas]);

  const stats = useMemo(
    () => ({
      total: ideas.length,
      features: ideas.filter((idea) => idea.type === 'feature').length,
      enhancements: ideas.filter((idea) => idea.type === 'enhancement').length,
    }),
    [ideas],
  );

  const handleVote = (id: string) => {
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === id ? { ...idea, votes: idea.votes + 1 } : idea)),
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const newIdea: Idea = {
      id: typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      area: area.trim() || 'General',
      type,
      impact,
      status: 'Next',
      votes: 1,
    };

    setIdeas((prev) => [newIdea, ...prev]);
    setTitle('');
    setDescription('');
    setArea('');
    setType('feature');
    setImpact('Medium');
    setFilter('all');
  };

  return (
    <div className="space-y-4">
      <FriendlyCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-accent" />
            <p className="text-sm font-semibold">Feature and enhancement ideas</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp size={14} />
            <span>Vote to bubble up what ships next</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Features</p>
            <p className="text-2xl font-bold">{stats.features}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Enhancements</p>
            <p className="text-2xl font-bold">{stats.enhancements}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total asks</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'feature', 'enhancement'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-semibold transition-all border',
                filter === option
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-foreground border-border',
              )}
            >
              {option === 'all' ? 'All ideas' : typeCopy[option].label}
            </button>
          ))}
        </div>
      </FriendlyCard>

      <div className="space-y-3">
        {filteredIdeas.map((idea) => {
          const Icon = typeCopy[idea.type].icon;
          return (
            <FriendlyCard key={idea.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      <Icon size={12} />
                      {typeCopy[idea.type].label}
                    </span>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold', impactTone[idea.impact])}>
                      <TrendingUp size={12} />
                      {idea.impact} impact
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold border border-border/60',
                        statusTone[idea.status],
                      )}
                    >
                      <CheckCircle2 size={12} />
                      {idea.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold leading-tight">{idea.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{idea.description}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-1 border border-border">Area: {idea.area}</span>
                    <span>Votes: {idea.votes}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleVote(idea.id)}
                  className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
                >
                  Upvote +{idea.votes}
                </button>
              </div>
            </FriendlyCard>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <FriendlyCard className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-accent" />
              <p className="text-sm font-semibold">Propose a feature or enhancement</p>
            </div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Fast draft</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Idea title"
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Area (e.g., Safety, Media, Onboarding)"
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as IdeaType)}
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="feature">New Feature</option>
              <option value="enhancement">Enhancement</option>
            </select>
            <select
              value={impact}
              onChange={(e) => setImpact(e.target.value as ImpactLevel)}
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="High">High impact</option>
              <option value="Medium">Medium impact</option>
              <option value="Low">Low impact</option>
            </select>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What problem does this solve for DDU students?"
            className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 h-20 resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">We add new items to the roadmap weekly.</p>
            <button
              type="submit"
              disabled={!title.trim() || !description.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all active:scale-95 disabled:opacity-60"
            >
              <Sparkles size={14} />
              Add idea
            </button>
          </div>
        </FriendlyCard>
      </form>
    </div>
  );
};
