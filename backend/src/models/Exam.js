import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    key:      { type: String, required: true, trim: true, maxlength: 80 },
    name:     { type: String, required: true, trim: true, maxlength: 100 },
    maxMarks: { type: Number, required: true, min: 1 },
    order:    { type: Number, default: 0 }
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    schoolName: { type: String, trim: true, default: 'Vedantam Play School, Damoh' },
    examName:   { type: String, required: true, trim: true, maxlength: 100 },
    academicSession: { type: String, required: true, trim: true, maxlength: 30 },
    session:    { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
    program:    { type: String, required: true, enum: ['Play Group', 'Nursery', 'LKG', 'UKG'] },
    subjects:   { type: [subjectSchema], required: true, validate: v => v.length > 0 },
    isActive:   { type: Boolean, default: true, index: true },
    importedAt: Date,
    notes:      { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

examSchema.virtual('maxTotal').get(function () {
  return this.subjects.reduce((total, subject) => total + Number(subject.maxMarks || 0), 0);
});

examSchema.set('toJSON', { virtuals: true });
examSchema.index({ academicSession: 1, program: 1, examName: 1 }, { unique: true });

export default mongoose.model('Exam', examSchema);