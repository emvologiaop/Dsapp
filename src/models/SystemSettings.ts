import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'We are performing scheduled maintenance. We will be back shortly!' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
