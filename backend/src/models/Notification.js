import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['birthday', 'fee', 'admission', 'attendance', 'teacher', 'leave', 'general'],
      default: 'general',
      index: true
    },
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    priority:{ type: String, enum: ['low', 'normal', 'high'], default: 'normal', index: true },

    // Who created it
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    // Linked entity (optional)
    entityType: { type: String, trim: true },   // 'Student', 'Teacher', 'FeePayment', etc.
    entityId:   { type: mongoose.Schema.Types.ObjectId },

    // Per-recipient read tracking
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }],

    // Auto-expire notifications
    expiresAt: { type: Date, index: true }
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });

export default mongoose.model('Notification', schema);
