import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { idParam, pagination } from '../validators/common.js';
import { list, getOne, create, update, remove } from '../controllers/factoryController.js';

export const crudRouter = (Model, publicFilter = {}, searchFields = ['title', 'name']) => {
  const r = Router();
  const visibleFilter = req => (req.admin ? {} : publicFilter);
  r.get('/', optionalAuth, pagination, validate, (req, res, next) => list(Model, searchFields, visibleFilter(req))(req, res, next));
  r.get('/:id', optionalAuth, idParam, validate, (req, res, next) => getOne(Model, visibleFilter(req))(req, res, next));
  r.use(protect);
  r.post('/', upload.single('image'), validate, create(Model));
  r.put('/:id', upload.single('image'), idParam, validate, update(Model));
  r.patch('/:id', upload.single('image'), idParam, validate, update(Model));
  r.delete('/:id', idParam, validate, remove(Model));
  return r;
};
