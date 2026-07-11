import Notification from '../models/Notification.js';
import Student      from '../models/Student.js';
import FeePayment   from '../models/FeePayment.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';

/* ── LIST (for current admin — filter expired) ───────────────────── */
export const listNotifications = asyncHandler(async (req, res) => {
  const filter = {
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: new Date() } }]
  };
  if (req.query.type) filter.type = req.query.type;

  const limit = Math.min(100, parseInt(req.query.limit || 50));
  const skip  = Math.max(0,  parseInt(req.query.skip  || 0));

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort('-createdAt')
      .skip(skip).limit(limit)
      .populate('createdBy', 'name')
      .lean(),
    Notification.countDocuments(filter)
  ]);

  // Attach unread flag per admin
  const adminId = String(req.admin._id);
  const result  = items.map(n => ({
    ...n,
    isRead: (n.readBy || []).some(id => String(id) === adminId)
  }));

  const unreadCount = result.filter(n => !n.isRead).length;

  ok(res, { data: result, total, unreadCount });
});

/* ── UNREAD COUNT (lightweight) ──────────────────────────────────── */
export const unreadCount = asyncHandler(async (req, res) => {
  const now = new Date();
  const count = await Notification.countDocuments({
    readBy: { $ne: req.admin._id },
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }]
  });
  ok(res, { data: { count } });
});

/* ── CREATE ──────────────────────────────────────────────────────── */
export const createNotification = asyncHandler(async (req, res) => {
  const doc = await Notification.create({ ...req.body, createdBy: req.admin._id });
  ok(res, { status: 201, message: 'Notification created', data: doc });
});

/* ── MARK READ ───────────────────────────────────────────────────── */
export const markRead = asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { readBy: req.admin._id } }
  );
  ok(res, { message: 'Marked as read' });
});

/* ── MARK ALL READ ───────────────────────────────────────────────── */
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { readBy: { $ne: req.admin._id } },
    { $addToSet: { readBy: req.admin._id } }
  );
  ok(res, { message: 'All notifications marked as read' });
});

/* ── DELETE ──────────────────────────────────────────────────────── */
export const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  ok(res, { message: 'Notification deleted' });
});

/* ── AUTO-GENERATE birthday notifications ────────────────────────── */
export const generateBirthdayNotifications = asyncHandler(async (req, res) => {
  const today = new Date();
  const start = new Date(today); start.setHours(0, 0, 0, 0);
  const end   = new Date(today); end.setHours(23, 59, 59, 999);

  const students = await Student.find({
    isActive: true,
    dateOfBirth: {
      $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      $lt:  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    }
  }).select('studentName program').lean();

  let created = 0;
  for (const s of students) {
    const exists = await Notification.findOne({
      type: 'birthday',
      entityId: s._id,
      createdAt: { $gte: start, $lte: end }
    });
    if (!exists) {
      await Notification.create({
        type:    'birthday',
        title:   `🎂 Birthday: ${s.studentName}`,
        message: `Today is ${s.studentName}'s birthday! (${s.program})`,
        priority: 'normal',
        entityType: 'Student',
        entityId:   s._id
      });
      created++;
    }
  }

  ok(res, { message: `${created} birthday notification(s) created`, data: { created } });
});
