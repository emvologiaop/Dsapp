import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

interface StoryViewerProps {
  stories: any[];
  currentUserId: string;
  onClose: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ stories, onClose }) => {
  const [index, setIndex] = useState(0);
  const active = useMemo(() => (Array.isArray(stories) ? stories[index] : null), [stories, index]);

  useEffect(() => {
    setIndex(0);
  }, [stories]);

  if (!active) return null;

  const mediaUrl = active.mediaUrl || active.thumbnailUrl;
  const isVideo = (active.mediaType || '').toLowerCase() === 'video' || String(mediaUrl || '').includes('.mp4');

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-white text-sm font-semibold truncate">{active.caption || 'Story'}</div>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        {isVideo ? (
          <video src={mediaUrl} className="max-h-[85vh] w-full object-contain" controls playsInline />
        ) : (
          <img src={mediaUrl} alt="" className="max-h-[85vh] w-full object-contain" />
        )}
      </div>

      {Array.isArray(stories) && stories.length > 1 && (
        <div className="px-4 py-4 flex items-center justify-between text-white/80 text-xs">
          <button
            type="button"
            onClick={() => setIndex((p) => Math.max(0, p - 1))}
            disabled={index === 0}
            className="px-3 py-2 rounded-lg bg-white/10 disabled:opacity-40"
          >
            Prev
          </button>
          <div>
            {index + 1}/{stories.length}
          </div>
          <button
            type="button"
            onClick={() => setIndex((p) => Math.min(stories.length - 1, p + 1))}
            disabled={index === stories.length - 1}
            className="px-3 py-2 rounded-lg bg-white/10 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

