import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../src/lib/utils';

type DockItem = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
};

interface DockProps {
  items: DockItem[];
  className?: string;
  activeLabel?: string;
}

export const Dock: React.FC<DockProps> = ({ items, className, activeLabel }) => {
  return (
    <div
      className={cn(
        'pointer-events-none',
        className
      )}
    >
      <div className="mx-auto max-w-md px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="pointer-events-auto rounded-[28px] border border-white/40 bg-background/75 p-2.5 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.7)] backdrop-blur-2xl">
          <div className="flex items-center justify-around gap-2">
            {items.map(({ icon: Icon, label, onClick }) => (
              <div key={label} className="relative flex min-w-0 flex-1">
                {activeLabel === label && (
                  <motion.div
                    layoutId="dock-active-pill"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary to-primary/80 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.85)]"
                    transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                  />
                )}
                <button
                  type="button"
                  onClick={onClick}
                  className={cn(
                    'relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-all duration-300',
                    activeLabel === label
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:-translate-y-0.5 hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <Icon size={18} className={cn(activeLabel === label && 'drop-shadow-[0_6px_12px_rgba(255,255,255,0.2)]')} />
                  <span className="truncate">{label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
