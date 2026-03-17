import mongoose, { Document, Schema } from 'mongoose';

export interface IVideoQuality {
  quality: string;
  url: string;
  width: number;
  height: number;
}

export interface IReel extends Document {
  userId: mongoose.Types.ObjectId;
  videoUrl: string; // Kept for backward compatibility with base64 videos
  videoQualities?: IVideoQuality[]; // Multiple quality versions
  thumbnailUrl?: string; // Thumbnail image URL
  duration?: number; // Video duration in seconds
  originalUrl?: string; // Original uploaded video URL
  caption: string;
  isAnonymous: boolean;
  likedBy: mongoose.Types.ObjectId[];
  bookmarkedBy: mongoose.Types.ObjectId[];
  taggedUsers: mongoose.Types.ObjectId[]; // Users tagged in this reel
  mentions: string[]; // Array of mentioned usernames
  hashtags: string[];
  commentsCount: number;
  sharesCount: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VideoQualitySchema = new Schema<IVideoQuality>({
  quality: { type: String, required: true },
  url: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
});

const ReelSchema = new Schema<IReel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videoUrl: { type: String, required: true }, // Backward compatibility
    videoQualities: [VideoQualitySchema],
    thumbnailUrl: { type: String },
    duration: { type: Number },
    originalUrl: { type: String },
    caption: { type: String, default: '' },
    isAnonymous: { type: Boolean, default: false },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bookmarkedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    taggedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Tagged users
    mentions: [{ type: String }], // Mentioned usernames for search optimization
    hashtags: [{ type: String }],
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes for performance optimization
ReelSchema.index({ userId: 1, createdAt: -1 }); // Compound index for user's reels sorted by date
ReelSchema.index({ isDeleted: 1, createdAt: -1 }); // For filtering non-deleted reels
ReelSchema.index({ createdAt: -1 }); // For recent reels feed (most important for infinite scroll)
ReelSchema.index({ likedBy: 1 }); // For finding reels liked by a user
ReelSchema.index({ bookmarkedBy: 1 }); // For finding saved reels by a user
ReelSchema.index({ duration: 1 }); // For filtering by video duration
ReelSchema.index({ taggedUsers: 1, createdAt: -1 }); // For finding reels where user is tagged
ReelSchema.index({ mentions: 1 }); // For searching reels by mentions
ReelSchema.index({ hashtags: 1 }); // For hashtag discovery

export const Reel = mongoose.model<IReel>('Reel', ReelSchema);
