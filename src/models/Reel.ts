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
  commentsCount: number;
  sharesCount: number;
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
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Reel = mongoose.model<IReel>('Reel', ReelSchema);
