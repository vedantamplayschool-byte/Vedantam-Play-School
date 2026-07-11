import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    teacher:  { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    date:     { type: Date, required: true, index: true },
    status:   {
      type: String,
      // 'Half Day' added to support the admin attendance UI
      enum: ['Present', 'Absent', 'Late', 'Leave', 'Holiday', 'Half Day'],
      default: 'Absent'
    },
    checkIn:  { type: String, trim: true }, // "09:00 AM"
    checkOut: { type: String, trim: true }, // "04:00 PM"
    remarks:  { type: String, trim: true, maxlength: 200 },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
  },
  { timestamps: true }
);

// One record per teacher per day
schema.index({ teacher: 1, date: 1 }, { unique: true });

export default mongoose.model('TeacherAttendance', schema);
