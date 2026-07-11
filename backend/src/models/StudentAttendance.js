import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    student:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    session:  { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', index: true },
    date:     { type: Date, required: true, index: true },
    status:   { type: String, enum: ['Present', 'Absent', 'Late', 'Leave', 'Holiday'], default: 'Absent' },
    remarks:  { type: String, trim: true, maxlength: 200 },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
  },
  { timestamps: true }
);

// One record per student per day
schema.index({ student: 1, date: 1 }, { unique: true });

export default mongoose.model('StudentAttendance', schema);
