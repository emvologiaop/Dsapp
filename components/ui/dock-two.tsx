import React from 'react';
import { cn } from '../../src/lib/utils';

type DockItem = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
};

interface DockProps {
  items: DockItem[];
  className?: string;
}

export const Dock: React.FC<DockProps> = ({ items, className }) => {
  return (
    <div
      className={cn(
        'pointer-events-none',
        className
      )}
    >
      <div className="mx-auto max-w-md px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="pointer-events-auto rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
          <div className="flex items-center justify-around gap-2">
            {items.map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon size={18} />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
