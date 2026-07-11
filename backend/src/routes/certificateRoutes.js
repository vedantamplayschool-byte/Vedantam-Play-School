import { Router }           from 'express';
import { protect }          from '../middleware/auth.js';
import {
  bonafide, admissionCert, characterCert,
  transferCert, completionCert
} from '../controllers/certificateController.js';

const r = Router();
r.use(protect);

r.get('/student/:id/bonafide',   bonafide);
r.get('/student/:id/admission',  admissionCert);
r.get('/student/:id/character',  characterCert);
r.get('/student/:id/transfer',   transferCert);
r.get('/student/:id/completion', completionCert);

export default r;
