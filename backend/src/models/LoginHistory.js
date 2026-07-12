import mongoose from 'mongoose';

/* Tracks every login attempt across all three portals (admin/teacher/parent).
   Read-only audit trail — nothing here should ever be mutated after creation. */
const schema = new mongoose.Schema(
  {
    portal:     { type: String, enum: ['admin', 'teacher', 'parent'], required: true, index: true },
    identifier: { type: String, trim: true }, // email/phone used to attempt login
    userId:     { type: mongoose.Schema.Types.ObjectId, refPath: 'userModel' },
    userModel:  { type: String, enum: ['Admin', 'Teacher', 'Parent'] },
    userName:   { type: String, trim: true },
    success:    { type: Boolean, required: true, index: true },
    reason:     { type: String, trim: true }, // failure reason, blank on success
    ipAddress:  { type: String, trim: true },
    userAgent:  { type: String, trim: true, maxlength: 300 }
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });

export default mongoose.model('LoginHistory', schema);
