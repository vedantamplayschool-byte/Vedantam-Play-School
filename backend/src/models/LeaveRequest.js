import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    teacher:    { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    date:       { type: Date, required: true, index: true },
    endDate:    { type: Date },
    days:       { type: Number, default: 1, min: 0.5 },
    type:       { type: String, enum: ['Sick', 'Personal', 'Emergency', 'Casual', 'Other'], default: 'Casual', index: true },
    reason:     { type: String, trim: true, maxlength: 500 },
    status:     { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    approvedAt: { type: Date },
    remarks:    { type: String, trim: true, maxlength: 200 }
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });

export default mongoose.model('LeaveRequest', schema);
