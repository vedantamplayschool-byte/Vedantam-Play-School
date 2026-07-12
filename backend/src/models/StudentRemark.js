import mongoose from 'mongoose';

/* One daily remark per student, written by their class teacher. */
const schema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    date:    { type: Date, required: true, index: true },
    remark:  { type: String, trim: true, maxlength: 500, required: true }
  },
  { timestamps: true }
);

schema.index({ student: 1, date: 1 }, { unique: true });

export default mongoose.model('StudentRemark', schema);
