import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  caption?: string;
  duration?: number; // for videos, in seconds
  views: mongoose.Types.ObjectId[]; // Users who viewed the story
  expiresAt: Date; // Stories expire after 24 hours
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    thumbnailUrl: { type: String },
    caption: { type: String, maxlength: 200 },
    duration: { type: Number }, // for videos
    views: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for performance
StorySchema.index({ userId: 1, createdAt: -1 });
StorySchema.index({ expiresAt: 1 }); // For cleanup queries
StorySchema.index({ isActive: 1, expiresAt: 1 }); // For active stories query

// Virtual for checking if story has expired
StorySchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

export const Story = mongoose.model<IStory>('Story', StorySchema);
