import { Router }            from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listArchives, getArchive, createArchive, deleteArchived
} from '../controllers/archiveController.js';

const r = Router();
r.use(protect, authorize('super_admin', 'admin', 'principal'));

r.get('/',        listArchives);
r.get('/:id',     getArchive);
r.post('/',       createArchive);
r.delete('/:id/purge', deleteArchived);

export default r;
