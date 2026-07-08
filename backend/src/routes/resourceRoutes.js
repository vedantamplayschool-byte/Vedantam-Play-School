import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { idParam, pagination } from '../validators/common.js';
import { list, getOne, create, update, remove } from '../controllers/factoryController.js';

export const crudRouter = (Model, publicFilter = {}, searchFields = ['title', 'name']) => {
  const r = Router();
  r.get('/', optionalAuth, pagination, validate, (req, res, next) => list(Model, searchFields, req.admin ? {} : publicFilter)(req, res, next));
  r.get('/:id', idParam, validate, getOne(Model));
  r.use(protect);
  r.post('/', upload.single('image'), validate, create(Model));
  r.put('/:id', upload.single('image'), idParam, validate, update(Model));
  r.patch('/:id', upload.single('image'), idParam, validate, update(Model));
  r.delete('/:id', idParam, validate, remove(Model));
  return r;
};
