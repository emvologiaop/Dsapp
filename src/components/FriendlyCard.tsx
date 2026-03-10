import React from 'react';
import { cn } from '../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const FriendlyCard: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div 
      className={cn("friendly-card", className)} 
      {...props}
    >
      {children}
    </div>
  );
};
