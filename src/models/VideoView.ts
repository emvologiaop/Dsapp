import mongoose, { Document, Schema } from 'mongoose';

export interface IVideoView extends Document {
  reelId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  watchDuration: number; // seconds watched
  totalDuration: number; // total video duration
  watchPercentage: number; // percentage watched (0-100)
  completed: boolean; // watched >= 80%
  createdAt: Date;
}

const VideoViewSchema = new Schema<IVideoView>(
  {
    reelId: { type: Schema.Types.ObjectId, ref: 'Reel', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    watchDuration: { type: Number, required: true, default: 0 },
    totalDuration: { type: Number, required: true },
    watchPercentage: { type: Number, required: true, default: 0 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for efficient querying
VideoViewSchema.index({ reelId: 1, userId: 1 });
VideoViewSchema.index({ userId: 1, createdAt: -1 });
VideoViewSchema.index({ reelId: 1, createdAt: -1 });

export const VideoView = mongoose.model<IVideoView>('VideoView', VideoViewSchema);
