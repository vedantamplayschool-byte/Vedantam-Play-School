import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true, unique: true }, // e.g. "2024-25"
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    isActive:  { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

// Only one session can be active at a time
schema.pre('save', async function (next) {
  if (this.isModified('isActive') && this.isActive) {
    await this.constructor.updateMany({ _id: { $ne: this._id } }, { isActive: false });
  }
  next();
});

export default mongoose.model('AcademicSession', schema);
