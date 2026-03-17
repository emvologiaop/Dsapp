import mongoose, { Document, Schema } from 'mongoose';

export interface IAd extends Document {
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  targetAudience?: 'all' | 'verified' | 'admins';
  impressions: number;
  clicks: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdSchema = new Schema<IAd>(
  {
    title: { type: String, required: true, maxlength: 100 },
    content: { type: String, required: true, maxlength: 500 },
    imageUrl: { type: String },
    linkUrl: { type: String },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    targetAudience: {
      type: String,
      enum: ['all', 'verified', 'admins'],
      default: 'all'
    },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Index for efficient queries
AdSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

export const Ad = mongoose.model<IAd>('Ad', AdSchema);
