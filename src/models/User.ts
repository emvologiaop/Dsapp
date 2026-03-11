import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password: string;
  age?: number;
  gender?: string;
  department?: string;
  avatarUrl?: string;
  bio?: string;
  website?: string;
  location?: string;
  isVerified?: boolean;
  telegramChatId?: string;
  telegramAuthCode?: string;
  telegramNotificationsEnabled?: boolean;
  followingIds: mongoose.Types.ObjectId[];
  followerIds: mongoose.Types.ObjectId[];
  role: 'user' | 'admin';
  isBanned: boolean;
  bannedAt?: Date;
  bannedBy?: mongoose.Types.ObjectId;
  banReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    /** Stored as scrypt hash (salt:derivedKey). Never store plaintext passwords. */
    password: { type: String, required: true },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    department: { type: String },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: 150 },
    website: { type: String },
    location: { type: String },
    isVerified: { type: Boolean, default: false },
    telegramChatId: { type: String },
    telegramAuthCode: { type: String },
    telegramNotificationsEnabled: { type: Boolean, default: false },
    followingIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBanned: { type: Boolean, default: false },
    bannedAt: { type: Date },
    bannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    banReason: { type: String },
  },
  { timestamps: true }
);

// Indexes for performance optimization
UserSchema.index({ username: 1 }); // Already unique, but explicit for lookups
UserSchema.index({ email: 1 }); // Already unique, but explicit for lookups
UserSchema.index({ telegramChatId: 1 }); // For Telegram bot integration
UserSchema.index({ role: 1 }); // For admin queries
UserSchema.index({ isBanned: 1 }); // For filtering banned users
UserSchema.index({ createdAt: -1 }); // For sorting by registration date

export const User = mongoose.model<IUser>('User', UserSchema);
