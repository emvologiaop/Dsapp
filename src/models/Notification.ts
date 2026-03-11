import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'like' | 'follow' | 'share' | 'comment' | 'message';
  content: string;
  relatedUserId?: mongoose.Types.ObjectId;
  relatedPostId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['like', 'follow', 'share', 'comment', 'message'],
      required: true,
    },
    content: { type: String, required: true },
    relatedUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    relatedPostId: { type: Schema.Types.ObjectId, ref: 'Post' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for performance optimization
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 }); // Compound index for user's unread notifications
NotificationSchema.index({ userId: 1, createdAt: -1 }); // For user's notification feed
NotificationSchema.index({ createdAt: -1 }); // For recent notifications

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
