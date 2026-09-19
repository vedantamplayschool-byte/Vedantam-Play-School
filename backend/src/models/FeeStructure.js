import mongoose from 'mongoose';

const FEE_TYPES = ['Admission', 'Monthly', 'Transport', 'Activity', 'Exam', 'Annual', 'Other'];
const PROGRAMS  = ['Play Group', 'Nursery', 'LKG', 'UKG', 'All'];

const schema = new mongoose.Schema(
  {
    session:  { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true, index: true },
    program:  { type: String, required: true, enum: PROGRAMS, index: true },
    feeType:  { type: String, required: true, enum: FEE_TYPES },
    label:    { type: String, trim: true }, // custom label e.g. "April Monthly Fee"
    amount:   { type: Number, required: true, min: 0 },
    dueDay:   { type: Number, min: 1, max: 28, default: 10 }, // day of month fee is due

    // Late fee
    lateFeeAmount:    { type: Number, default: 0 },
    lateFeeAfterDays: { type: Number, default: 10 },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

schema.index({ session: 1, program: 1, feeType: 1 });

export default mongoose.model('FeeStructure', schema);
