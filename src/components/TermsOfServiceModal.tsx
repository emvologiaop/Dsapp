import React from 'react';
import { X } from 'lucide-react';

interface TermsOfServiceModalProps {
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-of-service-title"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 id="terms-of-service-title" className="text-xl font-bold">Terms of Service</h2>
          <p className="text-sm text-muted-foreground">Community rules for posting and ghost mode</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Close terms"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-foreground">
        <section className="space-y-2">
          <h3 className="font-semibold text-base">Ghost mode rules</h3>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Ghost posts are anonymous to other users, but never anonymous to moderators.</li>
            <li>Moderators may review reported ghost posts and take action on the originating account.</li>
            <li>Ghost mode unlocks only after your account is at least 7 days old.</li>
            <li>You may publish at most 1 ghost post every 24 hours.</li>
            <li>Ghost posts cannot contain @mentions, and mention notifications are not generated for them.</li>
            <li>Comments and replies are never anonymous.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold text-base">Community safety</h3>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>No harassment, threats, targeted abuse, impersonation, or hate speech.</li>
            <li>No attempts to use ghost mode to evade moderation or target specific individuals.</li>
            <li>Reported content may be removed and accounts may be restricted or banned.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};
