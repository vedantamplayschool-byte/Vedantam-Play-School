import { Router } from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { uploadImage } from '../services/uploadService.js';
import Settings from '../models/Settings.js';

const r = Router();

// GET /settings — public (frontend can read school info)
r.get(
  '/',
  asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    ok(res, { data: settings });
  })
);

// PUT /settings — protected, admin+ only
r.put(
  '/',
  protect,
  authorize('super_admin', 'admin', 'principal'),
  [
    body('schoolName').optional().trim().isLength({ max: 200 }),
    body('tagline').optional().trim().isLength({ max: 300 }),
    body('phone').optional().trim(),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('address').optional().trim().isLength({ max: 500 }),
    body('googleMapsUrl').optional().trim(),
    body('socialLinks.facebook').optional().trim(),
    body('socialLinks.instagram').optional().trim(),
    body('socialLinks.youtube').optional().trim(),
    body('socialLinks.twitter').optional().trim()
  ],
  validate,
  asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    const { socialLinks, ...rest } = req.body;
    Object.assign(settings, rest);
    if (socialLinks && typeof socialLinks === 'object') {
      settings.socialLinks = {
        ...(settings.socialLinks?.toObject?.() ?? settings.socialLinks ?? {}),
        ...socialLinks
      };
    }
    await settings.save();
    ok(res, { message: 'Settings updated successfully', data: settings });
  })
);

// PATCH /settings/logo — protected, admin+ only
r.patch(
  '/logo',
  protect,
  authorize('super_admin', 'admin', 'principal'),
  upload.single('logo'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      const e = new Error('Logo image is required');
      e.status = 400;
      throw e;
    }
    const uploaded = await uploadImage(req.file, 'vedantam/settings', req);
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    settings.logoUrl = uploaded.url;
    settings.logoPublicId = uploaded.publicId || '';
    await settings.save();
    ok(res, { message: 'Logo updated successfully', data: { logoUrl: settings.logoUrl } });
  })
);

export default r;
