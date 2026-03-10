import mongoose, { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  isAnonymous: boolean;
  likedBy: mongoose.Types.ObjectId[];
  bookmarkedBy: mongoose.Types.ObjectId[];
  sharesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    mediaUrl: { type: String },
    mediaUrls: [{ type: String }],
    isAnonymous: { type: Boolean, default: false },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bookmarkedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    sharesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Post = mongoose.model<IPost>('Post', PostSchema);
