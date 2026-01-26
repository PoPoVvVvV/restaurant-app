import mongoose from 'mongoose';

const AdminNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
    message: {
      type: String,
      required: [true, 'Le message est obligatoire'],
      trim: true,
      maxlength: 2000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    // Liste des utilisateurs ayant marqué la notification comme lue
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

AdminNotificationSchema.index({ createdAt: -1 });
AdminNotificationSchema.index({ readBy: 1 });

const AdminNotification = mongoose.model('AdminNotification', AdminNotificationSchema);

export default AdminNotification;
