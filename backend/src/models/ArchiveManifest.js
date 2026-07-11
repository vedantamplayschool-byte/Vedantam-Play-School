import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    description:  { type: String, trim: true },
    archivedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    archivedAt:   { type: Date, default: Date.now },

    // What was archived
    collections: [{
      name:       String,
      count:      Number,
      filter:     mongoose.Schema.Types.Mixed,
      ids:        [mongoose.Schema.Types.ObjectId]
    }],

    // Export formats generated
    formats:      [{ type: String, enum: ['json', 'excel', 'csv'] }],
    exportSizeKB: Number,

    // Cloudinary items removed
    cloudinaryPublicIds: [String],
    cloudinaryDeleted:   { type: Number, default: 0 },

    // Whether original records were deleted from live DB
    deletedFromDB:  { type: Boolean, default: false },
    deletedAt:      Date,

    // Restore info
    canRestore:     { type: Boolean, default: true },
    restoredAt:     Date,

    status: {
      type: String,
      enum: ['Creating', 'Ready', 'Deleted', 'Restored'],
      default: 'Creating'
    },

    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

schema.index({ archivedAt: -1 });
schema.index({ status: 1 });

export default mongoose.model('ArchiveManifest', schema);
