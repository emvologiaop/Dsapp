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
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
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
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes for performance optimization
PostSchema.index({ userId: 1, createdAt: -1 }); // Compound index for user's posts sorted by date
PostSchema.index({ isDeleted: 1, createdAt: -1 }); // For filtering non-deleted posts
PostSchema.index({ createdAt: -1 }); // For recent posts feed
PostSchema.index({ likedBy: 1 }); // For finding posts liked by a user
PostSchema.index({ bookmarkedBy: 1 }); // For finding bookmarked posts

export const Post = mongoose.model<IPost>('Post', PostSchema);
