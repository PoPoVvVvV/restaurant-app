import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Le nom d\'utilisateur est obligatoire'],
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
  },
  role: {
    type: String,
    enum: ['employe', 'admin'],
    default: 'employe',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', UserSchema);

export default User;