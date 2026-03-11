import React from 'react';
import { splitTextWithHashtags } from '../utils/socialText';

interface HashtagTextProps {
  text: string;
  className?: string;
  hashtagClassName?: string;
  onHashtagClick?: (hashtag: string) => void;
}

export const HashtagText: React.FC<HashtagTextProps> = ({
  text,
  className,
  hashtagClassName,
  onHashtagClick,
}) => {
  const parts = splitTextWithHashtags(text);

  return (
    <p className={className}>
      {parts.map((part, index) => (
        part.startsWith('#') && onHashtagClick ? (
          <button
            key={`${part}-${index}`}
            type="button"
            onClick={() => onHashtagClick?.(part)}
            className={hashtagClassName || 'text-primary hover:underline'}
          >
            {part}
          </button>
        ) : part.startsWith('#') ? (
          <span key={`${part}-${index}`} className={hashtagClassName || 'text-primary'}>
            {part}
          </span>
        ) : (
          <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        )
      ))}
    </p>
  );
};
