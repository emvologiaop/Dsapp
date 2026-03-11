import React from 'react';
import { cn } from '../lib/utils';

interface MentionTextProps {
  text: string;
  onMentionClick?: (username: string) => void;
  className?: string;
}

export const MentionText: React.FC<MentionTextProps> = ({
  text,
  onMentionClick,
  className
}) => {
  // Regex to match @username mentions
  const mentionRegex = /@(\w+)/g;

  const renderTextWithMentions = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const [fullMatch, username] = match;
      const matchIndex = match.index;

      // Add text before the mention
      if (matchIndex > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, matchIndex)}
          </span>
        );
      }

      // Add the mention as a clickable element
      parts.push(
        <span
          key={`mention-${matchIndex}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onMentionClick) {
              onMentionClick(username);
            }
          }}
          className={cn(
            'text-primary font-medium cursor-pointer hover:underline',
            onMentionClick && 'cursor-pointer'
          )}
        >
          @{username}
        </span>
      );

      lastIndex = matchIndex + fullMatch.length;
    }

    // Add remaining text after the last mention
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <span className={className}>
      {renderTextWithMentions()}
    </span>
  );
};
