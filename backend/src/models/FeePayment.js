import mongoose from 'mongoose';

const PAYMENT_MODES   = ['Cash', 'Online', 'Cheque', 'Demand Draft', 'UPI'];
const PAYMENT_STATUSES = ['Paid', 'Partial', 'Pending', 'Waived'];
const FEE_TYPES        = ['Admission', 'Monthly', 'Transport', 'Activity', 'Exam', 'Annual', 'Other'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const schema = new mongoose.Schema(
  {
    receiptNumber: { type: String, unique: true, index: true }, // VPS-2024-00001

    student:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student',         required: true, index: true },
    parent:       { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' },
    session:      { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true, index: true },
    feeStructure: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure' },

    feeType: { type: String, required: true, enum: FEE_TYPES },
    month:   { type: String, enum: MONTHS },   // for Monthly fees
    year:    { type: Number },

    // Amounts
    baseAmount:       { type: Number, required: true, min: 0 },
    discount:         { type: Number, default: 0 },
    discountReason:   { type: String, trim: true },
    scholarship:      { type: Number, default: 0 },
    lateFee:          { type: Number, default: 0 },
    totalAmount:      { type: Number, required: true },
    amountPaid:       { type: Number, required: true, default: 0 },
    balance:          { type: Number, default: 0 },

    paymentDate:   { type: Date, default: Date.now },
    paymentMode:   { type: String, enum: PAYMENT_MODES, default: 'Cash' },
    chequeNumber:  { type: String, trim: true },
    transactionId: { type: String, trim: true },

    status:   { type: String, enum: PAYMENT_STATUSES, default: 'Pending', index: true },
    paidBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }, // who recorded payment
    notes:    { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

schema.index({ student: 1, session: 1, feeType: 1 });
schema.index({ student: 1, month: 1, year: 1, feeType: 1 });
schema.index({ createdAt: -1 });

// Auto-compute balance before save
schema.pre('save', function (next) {
  this.totalAmount = (this.baseAmount || 0) - (this.discount || 0) - (this.scholarship || 0) + (this.lateFee || 0);
  this.balance     = this.totalAmount - (this.amountPaid || 0);
  if (this.balance <= 0) this.status = 'Paid';
  else if (this.amountPaid > 0) this.status = 'Partial';
  next();
});

export default mongoose.model('FeePayment', schema);
