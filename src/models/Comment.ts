import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    isAnonymous: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for performance optimization
CommentSchema.index({ postId: 1, createdAt: -1 }); // Compound index for post comments sorted by date
CommentSchema.index({ userId: 1, createdAt: -1 }); // For user's comment history

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
