import mongoose from 'mongoose';

/* ------------------------------------------------------------------
   v2.5: Extended for teacher check-in / check-out (Module 3).
   Existing fields (status, checkIn string, checkOut string, remarks)
   are fully preserved. New fields are nullable / optional.
   ------------------------------------------------------------------ */

const schema = new mongoose.Schema(
  {
    teacher:  { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    date:     { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Leave', 'Holiday', 'Half Day'],
      default: 'Absent'
    },

    // Legacy string fields (kept for backward compat — admin UI uses these)
    checkIn:  { type: String, trim: true },   // "09:00 AM"
    checkOut: { type: String, trim: true },   // "04:00 PM"

    remarks:  { type: String, trim: true, maxlength: 200 },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    /* ── v2.5: Check-in / Check-out via Teacher Portal ─────────── */
    checkInAt:     { type: Date },            // Actual DateTime for check-in
    checkOutAt:    { type: Date },            // Actual DateTime for check-out
    workingHours:  { type: Number, min: 0 },  // Computed on check-out

    lateEntry:     { type: Boolean, default: false },
    earlyExit:     { type: Boolean, default: false },

    // Device / location (Module 3)
    deviceInfo:    { type: String, trim: true, maxlength: 300 },  // "Chrome / Windows / Desktop"
    ipAddress:     { type: String, trim: true },
    gpsLat:        { type: Number },
    gpsLng:        { type: Number },

    // Future-ready: image verification (always NULL — never stored, brief requirement)
    checkInImageUrl:  { type: String, default: null },
    checkOutImageUrl: { type: String, default: null },

    // Source: 'admin' (marked by admin) | 'self' (teacher portal check-in)
    source: { type: String, enum: ['admin', 'self'], default: 'admin' }
  },
  { timestamps: true }
);

// One record per teacher per day
schema.index({ teacher: 1, date: 1 }, { unique: true });

export default mongoose.model('TeacherAttendance', schema);
