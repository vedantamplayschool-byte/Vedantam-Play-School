import { Router } from 'express';
import authRoutes              from './authRoutes.js';
import dashboardRoutes         from './dashboardRoutes.js';
import adminRoutes             from './adminRoutes.js';
import admissionRoutes         from './admissionRoutes.js';
import contactRoutes           from './contactRoutes.js';
import newsletterRoutes        from './newsletterRoutes.js';
import settingsRoutes          from './settingsRoutes.js';
import studentRoutes           from './studentRoutes.js';
import parentRoutes            from './parentRoutes.js';
import feeRoutes               from './feeRoutes.js';
import attendanceRoutes        from './attendanceRoutes.js';
import reportsRoutes           from './reportsRoutes.js';
import searchRoutes            from './searchRoutes.js';
import academicSessionRoutes   from './academicSessionRoutes.js';
/* v2.5 ── new modules */
import teacherAuthRoutes       from './teacherAuthRoutes.js';
import teacherPortalRoutes     from './teacherPortalRoutes.js';
import checkInRoutes           from './checkInRoutes.js';
import notificationRoutes      from './notificationRoutes.js';
import certificateRoutes       from './certificateRoutes.js';
import qrRoutes                from './qrRoutes.js';
import adminTeacherPortalRoutes from './adminTeacherPortalRoutes.js';
/* v3.0 ── enterprise modules */
import parentAuthRoutes        from './parentAuthRoutes.js';
import parentPortalRoutes      from './parentPortalRoutes.js';
import adminParentPortalRoutes from './adminParentPortalRoutes.js';
import storageRoutes           from './storageRoutes.js';
import archiveRoutes           from './archiveRoutes.js';
/* CMS */
import { crudRouter }  from './resourceRoutes.js';
import Teacher         from '../models/Teacher.js';
import Gallery         from '../models/Gallery.js';
import Notice          from '../models/Notice.js';
import Event           from '../models/Event.js';
import Testimonial     from '../models/Testimonial.js';
import HeroSlide       from '../models/HeroSlide.js';
import Enquiry         from '../models/Enquiry.js';

const r = Router();

r.get('/health', (req, res) =>
  res.json({ success: true, message: 'Vedantam Play School API is healthy ✅', data: { time: new Date().toISOString(), version: '3.0' } })
);

/* ── Core ──────────────────────────────────────────────────────────── */
r.use('/auth',              authRoutes);
r.use('/dashboard',         dashboardRoutes);
r.use('/admins',            adminRoutes);
r.use('/admissions',        admissionRoutes);
r.use('/contacts',          contactRoutes);
r.use('/newsletter',        newsletterRoutes);
r.use('/settings',          settingsRoutes);

/* ── ERP v2.0 ──────────────────────────────────────────────────────── */
r.use('/students',          studentRoutes);
r.use('/parents',           parentRoutes);
r.use('/fees',              feeRoutes);
r.use('/attendance',        attendanceRoutes);
r.use('/reports',           reportsRoutes);
r.use('/search',            searchRoutes);
r.use('/academic-sessions', academicSessionRoutes);

/* ── ERP v2.5 ──────────────────────────────────────────────────────── */
r.use('/teacher-auth',          teacherAuthRoutes);
r.use('/teacher-portal',        teacherPortalRoutes);
r.use('/teacher-checkin',       checkInRoutes);
r.use('/notifications',         notificationRoutes);
r.use('/certificates',          certificateRoutes);
r.use('/qr',                    qrRoutes);
r.use('/teacher-admin',         adminTeacherPortalRoutes);

/* ── ERP v3.0 Enterprise ───────────────────────────────────────────── */
r.use('/parent-auth',            parentAuthRoutes);
r.use('/parent-portal',          parentPortalRoutes);
r.use('/admin-parent-portal',    adminParentPortalRoutes);
r.use('/storage',                storageRoutes);
r.use('/archive',                archiveRoutes);

/* ── CMS resources (existing crudRouter — unchanged) ─────────────── */
r.use('/teachers',     crudRouter(Teacher,     { isActive: true }, ['name', 'qualification']));
r.use('/gallery',      crudRouter(Gallery,     {}, ['title', 'category']));
r.use('/notices',      crudRouter(Notice,      {
  isPublished: true,
  $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: new Date() } }]
}, ['title', 'body']));
r.use('/events',       crudRouter(Event,       { isPublished: true }, ['title', 'description', 'location']));
r.use('/testimonials', crudRouter(Testimonial, { isPublished: true }, ['parentName', 'studentName', 'message']));
r.use('/hero-slides',  crudRouter(HeroSlide,   { isActive: true },    ['title', 'subtitle']));
r.use('/enquiries',    crudRouter(Enquiry,     {}, ['name', 'phone', 'email']));

export default r;
