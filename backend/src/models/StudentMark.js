import mongoose from 'mongoose';

const studentMarkSchema = new mongoose.Schema(
  {
    // Existing marks always have a student reference. Imported handwritten rows
    // may temporarily be unlinked when no safe match exists in Student.
    student:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
    teacher:  { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', index: true },
    session:  { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
    sessionName: { type: String, trim: true, index: true },
    exam:     { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', index: true },
    examName: { type: String, required: true, trim: true, maxlength: 100 },
    subject:  { type: String, required: true, trim: true, maxlength: 100 },
    subjectKey: { type: String, trim: true, maxlength: 100 },
    program:  { type: String, trim: true },
    rollNumber: { type: String, trim: true },
    studentNameSnapshot: { type: String, trim: true },
    markStatus: { type: String, enum: ['Present', 'Absent'], default: 'Present' },
    marks:    { type: Number, min: 0 },
    maxMarks: { type: Number, required: true, min: 1, default: 100 },
    remarks:  { type: String, trim: true, maxlength: 300 },
    recordedTotal: { type: Number, min: 0 },
    calculatedTotal: { type: Number, min: 0 },
    totalMismatch: { type: Boolean, default: false },
    source: { type: String, enum: ['manual', 'imported'], default: 'manual' },
    needsReview: { type: Boolean, default: false }
  },
  { timestamps: true }
);

studentMarkSchema.index(
  { student: 1, session: 1, examName: 1, subject: 1 },
  { unique: true, partialFilterExpression: { student: { $type: 'objectId' } } }
);
studentMarkSchema.index(
  { exam: 1, studentNameSnapshot: 1, subjectKey: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model('StudentMark', studentMarkSchema);