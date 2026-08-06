import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: String,
  caption: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 }
}, { _id: true });

const slugify = value => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90);

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, index: true },
  slug: { type: String, trim: true, lowercase: true, index: true },
  description: { type: String, trim: true, maxlength: 1200 },
  eventDate: { type: Date, default: Date.now, index: true },
  category: { type: String, required: true, trim: true, index: true },
  coverImage: { type: String },
  coverPublicId: String,
  galleryImages: [imageSchema],
  imageUrl: { type: String },
  publicId: String,
  isPublished: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  displayOrder: { type: Number, default: 0, index: true }
}, { timestamps: true });

schema.index({ isPublished: 1, eventDate: -1 });
schema.index({ slug: 1 }, { unique: true, sparse: true });
schema.index({ createdAt: -1 });

schema.pre('validate', function setGalleryDefaults(next) {
  if (!this.slug && this.title) this.slug = slugify(this.title);
  if (!this.coverImage && this.imageUrl) this.coverImage = this.imageUrl;
  if (!this.imageUrl && this.coverImage) this.imageUrl = this.coverImage;
  if ((!this.galleryImages || !this.galleryImages.length) && this.imageUrl) {
    this.galleryImages = [{ url: this.imageUrl, publicId: this.publicId, displayOrder: 0 }];
  }
  next();
});

schema.virtual('photoCount').get(function photoCount() {
  return this.galleryImages?.length || (this.imageUrl ? 1 : 0);
});

schema.set('toJSON', { virtuals: true });
schema.set('toObject', { virtuals: true });

export const createGallerySlug = slugify;
export default mongoose.model('Gallery', schema);
