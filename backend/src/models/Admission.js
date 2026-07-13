import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    /* ── Core fields ─────────────────────────────────────────────── */
    studentName: { type: String, required: true, trim: true, index: true },
    parentName:  { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true, index: true },
    email:       { type: String, trim: true, lowercase: true },
    age:         { type: String, trim: true },
    program:     { type: String, required: true, enum: ['Play Group', 'Nursery', 'LKG', 'UKG'] },
    message:     { type: String, trim: true, maxlength: 1000 },
    status:      {
      type: String,
      enum: ['Pending', 'Verified', 'Approved', 'Rejected', 'Waiting'],
      default: 'Pending',
      index: true
    },
    notes: { type: String, trim: true, maxlength: 1000 },

    /* ── Student personal details ─────────────────────────────────── */
    gender:      { type: String, enum: ['Male', 'Female', 'Other'] },
    dateOfBirth: Date,
    nationality: { type: String, trim: true },
    religion:    { type: String, trim: true },
    caste:       { type: String, trim: true },
    address:     { type: String, trim: true },
    admissionDate: Date,

    /* ── Father's information ─────────────────────────────────────── */
    fatherName:       { type: String, trim: true },
    fatherPhone:      { type: String, trim: true },
    fatherOccupation: { type: String, trim: true },

    /* ── Mother's information ─────────────────────────────────────── */
    motherName:       { type: String, trim: true },
    motherPhone:      { type: String, trim: true },
    motherOccupation: { type: String, trim: true },

    /* ── ERP links ───────────────────────────────────────────────── */
    session:       { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
    student:       { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    enquiry:       { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry' },
    waitingListNo: Number,

    reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt:  Date
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });

export default mongoose.model('Admission', schema);
