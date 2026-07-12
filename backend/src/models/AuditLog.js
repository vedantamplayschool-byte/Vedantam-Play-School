import mongoose from 'mongoose';

/* Generic activity log for admin-side mutating actions (create/update/delete). */
const schema = new mongoose.Schema(
  {
    admin:      { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    adminName:  { type: String, trim: true },
    method:     { type: String, trim: true },
    path:       { type: String, trim: true, index: true },
    statusCode: { type: Number },
    ipAddress:  { type: String, trim: true }
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', schema);
