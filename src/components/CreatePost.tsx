import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Image as ImageIcon, Ghost, X } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';
import { cn } from '../lib/utils';

interface CreatePostProps {
  user: any;
  isAnonymous: boolean;
  onPostCreated: () => void;
}

export const CreatePost: React.FC<CreatePostProps> = ({ user, isAnonymous, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...imageFiles].slice(0, 10)); // Max 10 images

      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews(prev => [...prev, e.target?.result as string].slice(0, 10));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setIsPosting(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          content,
          isAnonymous,
          mediaUrls: imagePreviews
        })
      });
      if (response.ok) {
        setContent('');
        setSelectedImages([]);
        setImagePreviews([]);
        onPostCreated();
      }
    } catch (error) {
      console.error("Post error:", error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <FriendlyCard className="space-y-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-muted shrink-0 flex items-center justify-center">
          {isAnonymous ? <Ghost size={20} className="text-muted-foreground" /> : (user?.name?.[0] || 'U')}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isAnonymous ? "Post anonymously as DDU Ghost..." : "What's happening on campus?"}
          className="w-full bg-transparent outline-none text-sm py-2 resize-none h-20 text-foreground placeholder-muted-foreground"
        />
      </div>

      {imagePreviews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
              <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-4">
          <label className="text-muted-foreground hover:text-primary transition-all cursor-pointer">
            <ImageIcon size={20} />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
              disabled={imagePreviews.length >= 10}
            />
          </label>
          {imagePreviews.length > 0 && (
            <span className="text-xs text-muted-foreground">{imagePreviews.length}/10</span>
          )}
        </div>
        <button
          onClick={handlePost}
          disabled={isPosting || !content.trim()}
          className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
        >
          {isPosting ? "Posting..." : "Post"}
        </button>
      </div>
    </FriendlyCard>
  );
};
