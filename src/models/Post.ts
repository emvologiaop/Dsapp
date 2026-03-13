import mongoose, { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  title?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  contentType?: 'feed' | 'group' | 'event' | 'academic' | 'announcement';
  groupId?: string;
  place?: string;
  eventTime?: Date;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  isAnonymous: boolean;
  likedBy: mongoose.Types.ObjectId[];
  bookmarkedBy: mongoose.Types.ObjectId[];
  taggedUsers: mongoose.Types.ObjectId[]; // Users tagged in this post
  mentions: string[]; // Array of mentioned usernames (for efficient searching)
  hashtags: string[];
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
    title: { type: String },
    mediaUrl: { type: String },
    mediaUrls: [{ type: String }],
    contentType: {
      type: String,
      enum: ['feed', 'group', 'event', 'academic', 'announcement'],
      default: 'feed',
    },
    groupId: { type: String },
    place: { type: String },
    eventTime: { type: Date },
    approvalStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
    },
    isAnonymous: { type: Boolean, default: false },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bookmarkedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    taggedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Tagged users
    mentions: [{ type: String }], // Mentioned usernames for search optimization
    hashtags: [{ type: String }],
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
PostSchema.index({ taggedUsers: 1, createdAt: -1 }); // For finding posts where user is tagged
PostSchema.index({ mentions: 1 }); // For searching posts by mentions
PostSchema.index({ hashtags: 1 }); // For hashtag discovery

export const Post = mongoose.model<IPost>('Post', PostSchema);
