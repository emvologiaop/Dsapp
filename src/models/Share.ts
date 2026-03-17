import mongoose, { Document, Schema } from 'mongoose';

export interface IShare extends Document {
  postId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShareSchema = new Schema<IShare>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ShareSchema.index({ receiverId: 1, createdAt: -1 }); // For inbox queries
ShareSchema.index({ senderId: 1, createdAt: -1 }); // For sent shares queries

export const Share = mongoose.model<IShare>('Share', ShareSchema);
