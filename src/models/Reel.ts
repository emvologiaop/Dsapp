import mongoose, { Document, Schema } from 'mongoose';

export interface IReel extends Document {
  userId: mongoose.Types.ObjectId;
  videoUrl: string;
  caption: string;
  isAnonymous: boolean;
  likedBy: mongoose.Types.ObjectId[];
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReelSchema = new Schema<IReel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videoUrl: { type: String, required: true },
    caption: { type: String, default: '' },
    isAnonymous: { type: Boolean, default: false },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Reel = mongoose.model<IReel>('Reel', ReelSchema);
