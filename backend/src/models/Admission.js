import mongoose from 'mongoose';

/* ------------------------------------------------------------------ */
/*  Extended with Waiting status & session link — backward compatible. */
/* ------------------------------------------------------------------ */

const schema = new mongoose.Schema(
  {
    /* ── Existing fields (UNCHANGED) ─────────────────────────────── */
    studentName: { type: String, required: true, trim: true, index: true },
    parentName:  { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true, index: true },
    email:       { type: String, trim: true, lowercase: true },
    age:         { type: String, required: true, trim: true },
    program:     { type: String, required: true, enum: ['Play Group', 'Nursery', 'LKG', 'UKG'] },
    message:     { type: String, trim: true, maxlength: 1000 },
    status:      {
      type: String,
      enum: ['Pending', 'Verified', 'Approved', 'Rejected', 'Waiting'],
      default: 'Pending',
      index: true
    },
    notes: { type: String, trim: true, maxlength: 1000 },

    /* ── New ERP fields ───────────────────────────────────────────── */
    session:       { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
    student:       { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },  // set when converted to student
    enquiry:       { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry' },  // source enquiry if converted
    waitingListNo: Number,

    // Extra info gathered during verification
    gender:      { type: String, enum: ['Male', 'Female', 'Other'] },
    dateOfBirth: Date,
    address:     { type: String, trim: true },

    reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt:  Date
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });

export default mongoose.model('Admission', schema);
