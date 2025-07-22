import mongoose from 'mongoose';

const InvitationCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
});

const InvitationCode = mongoose.model('InvitationCode', InvitationCodeSchema);

export default InvitationCode;