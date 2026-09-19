import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { upload } from '../middleware/upload.js';
import { listGallery, getGallery, createGallery, updateGallery, deleteGallery } from '../controllers/galleryController.js';

const r = Router();
const galleryUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 60 }
]);

r.get('/', optionalAuth, listGallery);
r.get('/:idOrSlug', optionalAuth, getGallery);
r.use(protect);
r.post('/', galleryUpload, createGallery);
r.put('/:idOrSlug', galleryUpload, updateGallery);
r.patch('/:idOrSlug', galleryUpload, updateGallery);
r.delete('/:idOrSlug', deleteGallery);

export default r;
