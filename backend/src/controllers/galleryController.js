import mongoose from 'mongoose';
import Gallery, { createGallerySlug } from '../models/Gallery.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { buildQuery, paginate } from '../utils/apiFeatures.js';
import { uploadImage } from '../services/uploadService.js';

const publicVisibilityFilter = { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] };

const findByIdOrSlug = (value, filter = {}) => Gallery.findOne({
  ...(mongoose.Types.ObjectId.isValid(value) ? { _id: value } : { slug: value }),
  ...filter
});

async function uniqueSlug(title, id) {
  const base = createGallerySlug(title) || `activity-${Date.now()}`;
  let slug = base;
  let i = 2;
  while (await Gallery.exists({ slug, ...(id ? { _id: { $ne: id } } : {}) })) slug = `${base}-${i++}`;
  return slug;
}

const normalize = async (req, existing) => {
  const payload = { ...req.body };
  if (payload.isPublished !== undefined) payload.isPublished = ['true', '1', 'on', true].includes(payload.isPublished);
  if (payload.isFeatured !== undefined) payload.isFeatured = ['true', '1', 'on', true].includes(payload.isFeatured);
  if (payload.eventDate === '') delete payload.eventDate;
  if (!payload.slug && payload.title && payload.title !== existing?.title) payload.slug = await uniqueSlug(payload.title, existing?._id);

  const cover = req.files?.coverImage?.[0] || req.files?.image?.[0];
  if (cover) {
    const uploaded = await uploadImage(cover, 'vedantam/gallery', req);
    payload.coverImage = uploaded.url;
    payload.imageUrl = uploaded.url;
    payload.coverPublicId = uploaded.publicId;
    payload.publicId = uploaded.publicId;
  }

  const uploads = req.files?.galleryImages || [];
  if (uploads.length) {
    const existingImages = existing?.galleryImages?.length ? existing.galleryImages.map(img => img.toObject ? img.toObject() : img) : [];
    const uploadedImages = [];
    for (const [idx, file] of uploads.entries()) {
      const uploaded = await uploadImage(file, 'vedantam/gallery', req);
      uploadedImages.push({ url: uploaded.url, publicId: uploaded.publicId, displayOrder: existingImages.length + idx });
    }
    payload.galleryImages = [...existingImages, ...uploadedImages];
    if (!payload.coverImage && !existing?.coverImage && uploadedImages[0]) {
      payload.coverImage = uploadedImages[0].url;
      payload.imageUrl = uploadedImages[0].url;
      payload.coverPublicId = uploadedImages[0].publicId;
      payload.publicId = uploadedImages[0].publicId;
    }
  }

  if (payload.galleryImagesOrder) {
    try {
      const order = JSON.parse(payload.galleryImagesOrder);
      if (Array.isArray(order) && existing?.galleryImages?.length) {
        const byId = new Map(existing.galleryImages.map(img => [String(img._id), img]));
        payload.galleryImages = order.map((id, idx) => ({ ...byId.get(String(id))?.toObject(), displayOrder: idx })).filter(img => img.url);
      }
    } catch { /* ignore malformed optional order */ }
    delete payload.galleryImagesOrder;
  }

  return payload;
};

export const listGallery = asyncHandler(async (req, res) => {
  const userFilter = buildQuery(req.query, ['title', 'description', 'category']);
  if (!req.admin) delete userFilter.isPublished;
  const filter = req.admin ? userFilter : { $and: [userFilter, publicVisibilityFilter] };
  const { items, pagination } = await paginate(Gallery, filter, { ...req.query, sort: req.query.sort || '-eventDate,-createdAt' });
  ok(res, { data: items, pagination });
});

export const getGallery = asyncHandler(async (req, res) => {
  const doc = await findByIdOrSlug(req.params.idOrSlug, req.admin ? {} : publicVisibilityFilter);
  if (!doc) { const e = new Error('Gallery activity not found'); e.status = 404; throw e; }
  ok(res, { data: doc });
});

export const createGallery = asyncHandler(async (req, res) => {
  const payload = await normalize(req);
  const doc = await Gallery.create(payload);
  ok(res, { status: 201, message: 'Activity created successfully', data: doc });
});

export const updateGallery = asyncHandler(async (req, res) => {
  const existing = await findByIdOrSlug(req.params.idOrSlug, {});
  if (!existing) { const e = new Error('Gallery activity not found'); e.status = 404; throw e; }
  const payload = await normalize(req, existing);
  Object.assign(existing, payload);
  await existing.save();
  ok(res, { message: 'Activity updated successfully', data: existing });
});

export const deleteGallery = asyncHandler(async (req, res) => {
  const doc = await findByIdOrSlug(req.params.idOrSlug, {});
  if (!doc) { const e = new Error('Gallery activity not found'); e.status = 404; throw e; }
  await doc.deleteOne();
  ok(res, { message: 'Activity deleted successfully', data: doc });
});
