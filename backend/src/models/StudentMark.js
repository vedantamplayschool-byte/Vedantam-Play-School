import mongoose from 'mongoose';

const studentMarkSchema = new mongoose.Schema(
  {
    student:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    teacher:  { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', index: true },
    session:  { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
    examName: { type: String, required: true, trim: true, maxlength: 100 },
    subject:  { type: String, required: true, trim: true, maxlength: 100 },
    marks:    { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, required: true, min: 1, default: 100 },
    remarks:  { type: String, trim: true, maxlength: 300 }
  },
  { timestamps: true }
);

studentMarkSchema.index(
  { student: 1, session: 1, examName: 1, subject: 1 },
  { unique: true }
);

export default mongoose.model('StudentMark', studentMarkSchema);