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
  telegramChatId?: string;
  telegramAuthCode?: string;
  followingIds: mongoose.Types.ObjectId[];
  followerIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    department: { type: String },
    avatarUrl: { type: String },
    telegramChatId: { type: String },
    telegramAuthCode: { type: String },
    followingIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
