import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  type: 'post' | 'reel' | 'user' | 'bug' | 'suggestion';
  targetId?: mongoose.Types.ObjectId; // For post or user reports
  reason: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['post', 'reel', 'user', 'bug', 'suggestion'],
      required: true
    },
    targetId: { type: Schema.Types.ObjectId }, // Can reference Post or User
    reason: { type: String, required: true },
    description: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
      default: 'pending'
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    resolution: { type: String },
  },
  { timestamps: true }
);

// Indexes for performance
ReportSchema.index({ reporterId: 1, createdAt: -1 });
ReportSchema.index({ type: 1, status: 1 });
ReportSchema.index({ targetId: 1 });
ReportSchema.index({ status: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema);
