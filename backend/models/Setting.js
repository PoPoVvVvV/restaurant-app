import mongoose from 'mongoose';

const SettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // Peut stocker n'importe quel type de valeur
    required: true,
  },
});

const Setting = mongoose.model('Setting', SettingSchema);
export default Setting;