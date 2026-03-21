import React from 'react';
import { splitTextWithSocialTokens } from '../utils/socialText';

interface SocialTextProps {
  text: string;
  className?: string;
  hashtagClassName?: string;
  mentionClassName?: string;
  onHashtagClick?: (hashtag: string) => void;
  onMentionClick?: (username: string) => void;
}

export const SocialText: React.FC<SocialTextProps> = ({
  text,
  className,
  hashtagClassName,
  mentionClassName,
  onHashtagClick,
  onMentionClick,
}) => {
  const parts = splitTextWithSocialTokens(text);

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('#')) {
          return onHashtagClick ? (
            <button
              key={index}
              type="button"
              onClick={() => onHashtagClick(part)}
              className={hashtagClassName || 'text-primary hover:underline'}
            >
              {part}
            </button>
          ) : (
            <span key={index} className={hashtagClassName || 'text-primary'}>
              {part}
            </span>
          );
        }

        if (part.startsWith('@')) {
          const username = part.slice(1);
          return onMentionClick ? (
            <button
              key={index}
              type="button"
              onClick={() => onMentionClick(username)}
              className={mentionClassName || 'font-semibold text-foreground hover:underline'}
            >
              {part}
            </button>
          ) : (
            <span key={index} className={mentionClassName || 'font-semibold text-foreground'}>
              {part}
            </span>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
};
