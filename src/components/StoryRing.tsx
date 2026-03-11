import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface StoryRingProps {
  hasActiveStory: boolean;
  hasViewedAll?: boolean;
  avatarUrl?: string;
  name: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg';
  isOwnStory?: boolean;
  onClick?: () => void;
  className?: string;
}

export const StoryRing: React.FC<StoryRingProps> = ({
  hasActiveStory,
  hasViewedAll = false,
  avatarUrl,
  name,
  username,
  size = 'md',
  isOwnStory = false,
  onClick,
  className
}) => {
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const innerSizes = {
    sm: 'w-11 h-11',
    md: 'w-[58px] h-[58px]',
    lg: 'w-[74px] h-[74px]'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const borderSize = {
    sm: 'p-[2px]',
    md: 'p-[3px]',
    lg: 'p-[3px]'
  };

  return (
    <div
      className={cn('flex flex-col items-center gap-1 cursor-pointer', className)}
      onClick={onClick}
    >
      {/* Avatar with gradient ring */}
      <div className="relative">
        <div
          className={cn(
            sizes[size],
            borderSize[size],
            'rounded-full flex items-center justify-center',
            hasActiveStory && !hasViewedAll && 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600',
            hasActiveStory && hasViewedAll && 'bg-border',
            !hasActiveStory && isOwnStory && 'bg-border',
            !hasActiveStory && !isOwnStory && 'bg-transparent'
          )}
        >
          <div
            className={cn(
              innerSizes[size],
              'rounded-full border-[3px] border-background bg-muted flex items-center justify-center overflow-hidden'
            )}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-foreground font-bold">{name[0]?.toUpperCase()}</span>
            )}
          </div>
        </div>

        {/* Plus icon for own story when no active story */}
        {isOwnStory && !hasActiveStory && (
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center">
            <Plus className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Username */}
      {username && (
        <span className={cn('text-center font-medium truncate max-w-[80px]', textSizes[size])}>
          {username}
        </span>
      )}
    </div>
  );
};
