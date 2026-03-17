import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';

interface StoryUploadProps {
  userId: string;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export const StoryUpload: React.FC<StoryUploadProps> = ({ userId, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!userId || !file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('media', file);
      form.append('userId', userId);
      form.append('caption', caption);
      form.append('mediaType', file.type.startsWith('video/') ? 'video' : 'image');

      const res = await fetch('/api/stories', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to upload story');
      }
      onUploadSuccess?.();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to upload story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Upload size={18} className="text-primary" />
          <h2 className="text-lg font-bold">New Story</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl w-full mx-auto">
        <FriendlyCard className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Media</p>
            <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading} />
            {file && <p className="text-xs text-muted-foreground">Selected: <span className="font-medium">{file.name}</span></p>}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Caption (optional)</p>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              disabled={uploading}
            />
          </div>
          <button
            type="button"
            onClick={upload}
            disabled={!file || uploading}
            className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Share to story'}
          </button>
        </FriendlyCard>
      </div>
    </div>
  );
};

