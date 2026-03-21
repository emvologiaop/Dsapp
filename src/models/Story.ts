import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  drawings: Array<{
    tool: 'brush' | 'eraser';
    color: string;
    size: number;
    points: Array<{ x: number; y: number }>;
  }>;
  stickers: Array<{
    pack: 'basic' | 'reactions' | 'neon';
    value: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }>;
  cameraEffect: 'none' | 'vintage' | 'cool' | 'vivid' | 'mono';
  overlayTexts: Array<{
    text: string;
    x: number;
    y: number;
    color: string;
    size: 'sm' | 'md' | 'lg';
    background: 'none' | 'soft' | 'solid';
  }>;
  visualFilter: 'none' | 'warm' | 'mono' | 'dream' | 'boost';
  userId: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  audience: 'followers' | 'mutuals';
  mentions: string[];
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
    drawings: [{
      tool: { type: String, enum: ['brush', 'eraser'], default: 'brush' },
      color: { type: String, default: '#ffffff' },
      size: { type: Number, default: 4 },
      points: [{
        x: { type: Number, required: true },
        y: { type: Number, required: true },
      }],
    }],
    stickers: [{
      pack: { type: String, enum: ['basic', 'reactions', 'neon'], default: 'basic' },
      value: { type: String, required: true, maxlength: 10 },
      x: { type: Number, default: 50 },
      y: { type: Number, default: 50 },
      scale: { type: Number, default: 1 },
      rotation: { type: Number, default: 0 },
    }],
    cameraEffect: { type: String, enum: ['none', 'vintage', 'cool', 'vivid', 'mono'], default: 'none' },
    overlayTexts: [{
      text: { type: String, required: true, maxlength: 80 },
      x: { type: Number, default: 50 },
      y: { type: Number, default: 50 },
      color: { type: String, default: '#ffffff' },
      size: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
      background: { type: String, enum: ['none', 'soft', 'solid'], default: 'soft' },
    }],
    visualFilter: { type: String, enum: ['none', 'warm', 'mono', 'dream', 'boost'], default: 'none' },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    audience: { type: String, enum: ['followers', 'mutuals'], default: 'followers' },
    mentions: [{ type: String }],
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
