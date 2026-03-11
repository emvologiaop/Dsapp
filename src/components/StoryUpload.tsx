import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface StoryUploadProps {
  userId: string;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export const StoryUpload: React.FC<StoryUploadProps> = ({
  userId,
  onClose,
  onUploadSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!type) {
      alert('Please select an image or video file');
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    setMediaType(type);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !mediaType || !preview) return;

    setIsUploading(true);

    try {
      // For now, we'll use base64 encoding for the media
      // In production, you should upload to cloud storage (R2, S3, etc.)
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          mediaUrl: preview,
          mediaType,
          caption: caption.trim() || undefined,
          duration: mediaType === 'video' ? 15 : undefined // Default 15s for videos
        })
      });

      if (res.ok) {
        if (onUploadSuccess) onUploadSuccess();
        onClose();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to upload story');
      }
    } catch (error) {
      console.error('Failed to upload story:', error);
      alert('Failed to upload story. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Create Story</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            disabled={isUploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!preview ? (
            // Upload area
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium mb-1">Upload a photo or video</p>
                  <p className="text-sm text-muted-foreground">
                    Tap to select from your device
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-4 h-4" />
                    <span>Image</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    <span>Video</span>
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            // Preview
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-[9/16] max-h-[60vh]">
                {mediaType === 'image' ? (
                  <img
                    src={preview}
                    alt="Story preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={preview}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                    setMediaType(null);
                    setCaption('');
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Caption input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Caption (optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  maxLength={200}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {caption.length}/200 characters
                </p>
              </div>

              {/* Upload button */}
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className={cn(
                  'w-full py-3 rounded-lg font-medium transition-colors',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center justify-center gap-2'
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  'Share to Story'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
