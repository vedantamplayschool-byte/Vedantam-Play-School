import { Router }        from 'express';
import { protectParent } from '../middleware/parentAuth.js';
import {
  parentDashboard, myStudents, myChildAttendance,
  myChildHomework, myChildFees, feeReceipt,
  schoolNotices, schoolEvents, schoolGallery
} from '../controllers/parentPortalController.js';

const r = Router();
r.use(protectParent);

r.get('/dashboard',   parentDashboard);
r.get('/students',    myStudents);
r.get('/attendance',  myChildAttendance);
r.get('/homework',    myChildHomework);
r.get('/fees',        myChildFees);
r.get('/fees/:id/receipt', feeReceipt);
r.get('/notices',     schoolNotices);
r.get('/events',      schoolEvents);
r.get('/gallery',     schoolGallery);

export default r;
