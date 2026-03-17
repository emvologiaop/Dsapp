import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  isAnonymous: boolean;
  parentCommentId?: mongoose.Types.ObjectId; // For comment replies
  replyCount: number; // Count of replies to this comment
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    isAnonymous: { type: Boolean, default: false },
    parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' }, // For threaded replies
    replyCount: { type: Number, default: 0 }, // Count of replies to this comment
  },
  { timestamps: true }
);

// Indexes for performance optimization
CommentSchema.index({ postId: 1, createdAt: -1 }); // Compound index for post comments sorted by date
CommentSchema.index({ userId: 1, createdAt: -1 }); // For user's comment history
CommentSchema.index({ parentCommentId: 1, createdAt: 1 }); // For fetching replies to a comment

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
