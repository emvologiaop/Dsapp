import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Ghost, X, Loader2, UserPlus, CalendarDays, MapPin, Megaphone, Newspaper, Users } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';
import { MentionInput } from './MentionInput';
import { UserTagSelector } from './UserTagSelector';
import { cn } from '../lib/utils';
import { uploadMultipleImagesToR2, compressImage, UploadProgress } from '../utils/r2Upload';
import { COMMUNITY_GROUPS, CommunitySection, validateComposeInput } from '../utils/community';
import { GHOST_MODE_MIN_ACCOUNT_AGE_DAYS, GHOST_POST_RATE_LIMIT_HOURS, canUseGhostMode } from '../utils/ghostPolicy';
import { withAuthHeaders } from '../utils/clientAuth';

interface User {
  _id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface CreatePostProps {
  user: any;
  isAnonymous: boolean;
  currentSection: CommunitySection;
  selectedGroupId?: string;
  joinedGroupIds?: string[];
  onPostCreated: (post?: any) => void;
}

export const CreatePost: React.FC<CreatePostProps> = ({
  user,
  isAnonymous,
  currentSection,
  selectedGroupId = 'all',
  joinedGroupIds = [],
  onPostCreated,
}) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [place, setPlace] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useR2Upload, setUseR2Upload] = useState(true); // Toggle for R2 vs base64
  const [taggedUsers, setTaggedUsers] = useState<User[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [contentType, setContentType] = useState<'feed' | 'group' | 'event' | 'academic' | 'announcement'>('feed');
  const [groupId, setGroupId] = useState(selectedGroupId !== 'all' ? selectedGroupId : joinedGroupIds[0] || '');

  const userRole = user?.role || 'user';
  const ghostModeLocked = isAnonymous && !canUseGhostMode(user?.createdAt);
  const availableGroups = useMemo(() => COMMUNITY_GROUPS.filter((group) => joinedGroupIds.includes(group.id)), [joinedGroupIds]);
  const composerTitle =
    contentType === 'event'
      ? 'Request an event'
      : contentType === 'academic'
        ? 'Post academic news'
        : contentType === 'group'
          ? 'Share with your group'
          : contentType === 'announcement'
            ? 'Publish announcement'
            : 'Share an update';
  const composerDescription =
    contentType === 'event'
      ? 'Events are reviewed by admins before they appear publicly.'
      : contentType === 'academic'
        ? 'Academic updates are reserved for admins.'
        : contentType === 'group'
          ? 'Posts stay inside the selected community group.'
          : contentType === 'announcement'
            ? 'Announcements appear across the main feed and group spaces.'
            : 'Post a quick update with text or photos for everyone.';
  const contentPlaceholder =
    contentType === 'event'
      ? 'Describe the event agenda, who should attend, and any registration details...'
      : contentType === 'academic'
        ? 'Share the full academic update for students...'
        : contentType === 'announcement'
          ? 'Write the announcement or ad that should appear across the platform...'
          : contentType === 'group'
            ? 'What does your group need to know?'
            : isAnonymous
              ? 'Post anonymously as DDU Ghost...'
              : 'Share what is on your mind.';
  const submitLabel =
    contentType === 'event'
      ? 'Request'
      : contentType === 'announcement'
        ? 'Publish'
        : contentType === 'academic'
          ? 'Post News'
          : 'Post';

  useEffect(() => {
    if (currentSection === 'groups') {
      setContentType('group');
      setGroupId(selectedGroupId !== 'all' ? selectedGroupId : joinedGroupIds[0] || '');
      return;
    }

    if (currentSection === 'events') {
      setContentType('event');
      return;
    }

    if (currentSection === 'academics') {
      setContentType('academic');
      return;
    }

    setContentType((previous) => (previous === 'announcement' ? 'announcement' : 'feed'));
  }, [currentSection, joinedGroupIds, selectedGroupId]);

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
    if (!content.trim() && selectedImages.length === 0) return;
    const validationError = validateComposeInput({
      content,
      contentType,
      userRole,
      title,
      place,
      eventTime,
      mediaCount: selectedImages.length || imagePreviews.length,
      groupId,
    });

    if (validationError) {
      alert(validationError);
      return;
    }

    setIsPosting(true);
    setUploadProgress(0);

    try {
      let mediaUrls = imagePreviews;

      // If R2 upload is enabled and there are images to upload
      if (useR2Upload && selectedImages.length > 0) {
        setUploadProgress(10);

        // Compress images before upload
        const compressedImages = await Promise.all(
          selectedImages.map(file => compressImage(file, 1920, 1920, 0.85))
        );

        setUploadProgress(30);

        // Upload to R2
        mediaUrls = await uploadMultipleImagesToR2(
          compressedImages,
          (progress: UploadProgress) => {
            setUploadProgress(30 + (progress.percentage * 0.6)); // 30-90%
          }
        );

        setUploadProgress(90);
      }

      // Create post with R2 URLs or base64 previews
      const normalizedContent = isAnonymous ? stripMentionsFromGhostContent(content).trim() : content;
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          userId: user.id,
          content: normalizedContent.trim(),
          isAnonymous,
          mediaUrls,
          taggedUsers: taggedUsers.map(u => u._id),
          contentType,
          groupId: contentType === 'group' ? groupId : undefined,
          place: contentType === 'event' ? place.trim() : undefined,
          eventTime: contentType === 'event' ? eventTime : undefined,
        })
      });

      if (response.ok) {
        const createdPost = await response.json();
        setContent('');
        setTitle('');
        setEventTime('');
        setPlace('');
        setSelectedImages([]);
        setImagePreviews([]);
        setTaggedUsers([]);
        setShowTagSelector(false);
        setUploadProgress(100);
        if (currentSection === 'groups') {
          setGroupId(selectedGroupId !== 'all' ? selectedGroupId : joinedGroupIds[0] || '');
        }
        onPostCreated(createdPost);
      } else {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Post failed');
      }
    } catch (error) {
      console.error("Post error:", error);
      alert(error instanceof Error ? error.message : 'Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
      setUploadProgress(0);
    }
  };

  function stripMentionsFromGhostContent(text: string) {
    return (text || '').replace(/@\w+/g, '').replace(/\s{2,}/g, ' ');
  }

  return (
    <FriendlyCard className="space-y-5 border border-primary/12 bg-gradient-to-br from-background via-background to-primary/8 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.68)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Composer</p>
          <p className="text-lg font-bold tracking-[-0.03em]">{composerTitle}</p>
          <p className="text-xs text-muted-foreground">{composerDescription}</p>
        </div>
        {currentSection === 'feed' && userRole === 'admin' && (
          <div className="flex rounded-2xl border border-white/35 bg-background/75 p-1 shadow-sm">
            {[
              { id: 'feed', label: 'Post' },
              { id: 'announcement', label: 'Announcement' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setContentType(option.id as 'feed' | 'announcement')}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                  contentType === option.id ? 'bg-primary text-primary-foreground shadow-[0_12px_30px_-20px_rgba(15,23,42,0.9)]' : 'text-muted-foreground'
                )}
                disabled={isPosting}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {(contentType === 'event' || contentType === 'academic' || contentType === 'announcement') && (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={contentType === 'event' ? 'Event title' : contentType === 'academic' ? 'News headline' : 'Announcement title'}
          className="w-full rounded-2xl border border-white/35 bg-background/80 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
          disabled={isPosting}
        />
      )}

      {contentType === 'group' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Users size={14} />
            Group destination
          </div>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full rounded-2xl border border-white/35 bg-background/80 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
            disabled={isPosting || availableGroups.length === 0}
          >
            {availableGroups.length === 0 ? (
              <option value="">Join a group first</option>
            ) : (
              availableGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {contentType === 'event' && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-white/35 bg-background/80 px-4 py-3 text-sm">
            <CalendarDays size={16} className="text-primary" />
            <input
              type="datetime-local"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="w-full bg-transparent outline-none"
              disabled={isPosting}
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/35 bg-background/80 px-4 py-3 text-sm">
            <MapPin size={16} className="text-primary" />
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Place"
              className="w-full bg-transparent outline-none"
              disabled={isPosting}
            />
          </label>
        </div>
      )}

      <div className="flex gap-3 rounded-[24px] border border-white/35 bg-background/75 p-3 shadow-sm backdrop-blur">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
          {contentType === 'feed' && isAnonymous ? <Ghost size={20} className="text-muted-foreground" /> : (user?.name?.[0] || 'U')}
        </div>
        <div className="flex-1">
            <MentionInput
              value={content}
              onChange={setContent}
              placeholder={isAnonymous ? "Post anonymously as DDU Ghost..." : "Write a caption or upload photos..."}
            textareaClassName="border-0 bg-transparent p-0 focus:ring-0"
            rows={3}
            disabled={isPosting}
          />
        </div>
      </div>

      {isAnonymous && (
        <div className={cn(
          'rounded-2xl border p-3 text-xs',
          ghostModeLocked ? 'border-border bg-muted text-muted-foreground' : 'border-white/35 bg-background/70 text-muted-foreground'
        )}>
          {ghostModeLocked ? (
            <ul className="space-y-1 list-disc pl-4">
              <li>Ghost mode unlocks after {GHOST_MODE_MIN_ACCOUNT_AGE_DAYS} days.</li>
              <li>Once unlocked, ghost posts are limited to 1 per {GHOST_POST_RATE_LIMIT_HOURS} hours.</li>
            </ul>
          ) : (
            <ul className="space-y-1 list-disc pl-4">
              <li>Ghost posts go to the Ghost Board.</li>
              <li>@mentions are stripped from ghost posts.</li>
              <li>Moderators can still trace reported ghost posts.</li>
              <li>You can only make 1 ghost post every {GHOST_POST_RATE_LIMIT_HOURS} hours.</li>
            </ul>
          )}
        </div>
      )}

      {imagePreviews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/35">
              <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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

      {/* Tag selector - only show if not anonymous */}
      {contentType === 'feed' && !isAnonymous && (
        <div className="space-y-2">
          {showTagSelector && (
            <UserTagSelector
              selectedUsers={taggedUsers}
              onUsersChange={setTaggedUsers}
              maxTags={20}
              placeholder="Search and tag people..."
            />
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-white/30 pt-3">
        <div className="flex items-center gap-4">
          <label className="cursor-pointer text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-primary">
            <ImageIcon size={20} />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
              disabled={imagePreviews.length >= 10 || isPosting}
            />
          </label>
          {contentType === 'feed' && !isAnonymous && (
            <button
              onClick={() => setShowTagSelector(!showTagSelector)}
              className={cn(
                'text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-primary',
                showTagSelector && 'text-primary'
              )}
              disabled={isPosting}
            >
              <UserPlus size={20} />
            </button>
          )}
          {contentType === 'announcement' && <Megaphone size={18} className="text-amber-500" />}
          {contentType === 'academic' && <Newspaper size={18} className="text-sky-500" />}
          {imagePreviews.length > 0 && (
            <span className="text-xs text-muted-foreground">{imagePreviews.length}/10</span>
          )}
        </div>
        <button
          onClick={handlePost}
          disabled={isPosting || (!content.trim() && imagePreviews.length === 0)}
          className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-[0_18px_35px_-24px_rgba(15,23,42,0.9)] transition-all duration-300 active:scale-95 disabled:opacity-50"
        >
          {isPosting && <Loader2 size={16} className="animate-spin" />}
          {isPosting ? (uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : "Posting...") : submitLabel}
        </button>
      </div>
    </FriendlyCard>
  );
};
