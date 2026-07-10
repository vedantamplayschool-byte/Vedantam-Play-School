import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    schoolName: { type: String, default: 'Vedantam Play School', trim: true, maxlength: 200 },
    tagline: { type: String, default: 'Where Little Dreams Take Flight', trim: true, maxlength: 300 },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    address: { type: String, default: '', trim: true, maxlength: 500 },
    googleMapsUrl: { type: String, default: '', trim: true },
    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    socialLinks: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      youtube: { type: String, default: '' },
      twitter: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
