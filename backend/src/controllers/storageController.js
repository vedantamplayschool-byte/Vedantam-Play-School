import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';
import Student         from '../models/Student.js';
import Teacher         from '../models/Teacher.js';
import Parent          from '../models/Parent.js';
import Gallery         from '../models/Gallery.js';
import StudentAttendance from '../models/StudentAttendance.js';
import TeacherAttendance from '../models/TeacherAttendance.js';
import FeePayment       from '../models/FeePayment.js';
import Admission        from '../models/Admission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';

/* ── CONSTANTS ───────────────────────────────────────────────────── */
const MONGO_FREE_MB       = 512;
const CLOUDINARY_FREE_GB  = 25;
const CLOUDINARY_FREE_MB  = CLOUDINARY_FREE_GB * 1024;

/* ── THRESHOLDS ──────────────────────────────────────────────────── */
function getLevel(pct) {
  if (pct >= 95) return 'critical';
  if (pct >= 90) return 'danger';
  if (pct >= 75) return 'warning';
  if (pct >= 50) return 'caution';
  return 'ok';
}

/* ── STORAGE STATS ───────────────────────────────────────────────── */
export const storageStats = asyncHandler(async (req, res) => {
  // ── MongoDB stats ──────────────────────────────────────────────
  let mongoStats = null;
  let collectionStats = [];
  try {
    const db = mongoose.connection.db;
    const dbStats = await db.command({ dbStats: 1, scale: 1 });

    // Per-collection stats
    const collections = await db.listCollections().toArray();
    const colStatsArr = await Promise.all(
      collections.map(async c => {
        try {
          const cs = await db.command({ collStats: c.name, scale: 1 });
          return {
            name: c.name,
            count: cs.count || 0,
            storageBytes: cs.storageSize || 0,
            indexBytes: cs.totalIndexSize || 0,
            avgObjBytes: cs.avgObjSize || 0
          };
        } catch (_) {
          return { name: c.name, count: 0, storageBytes: 0, indexBytes: 0, avgObjBytes: 0 };
        }
      })
    );

    collectionStats = colStatsArr.sort((a, b) => b.storageBytes - a.storageBytes);

    const usedBytes     = dbStats.dataSize + dbStats.indexSize;
    const usedMB        = usedBytes / (1024 * 1024);
    const freeMB        = Math.max(0, MONGO_FREE_MB - usedMB);
    const usedPct       = Math.min(100, (usedMB / MONGO_FREE_MB) * 100);

    mongoStats = {
      usedMB:      parseFloat(usedMB.toFixed(2)),
      freeMB:      parseFloat(freeMB.toFixed(2)),
      totalMB:     MONGO_FREE_MB,
      usedPct:     parseFloat(usedPct.toFixed(1)),
      level:       getLevel(usedPct),
      objects:     dbStats.objects || 0,
      collections: dbStats.collections || 0,
      indexes:     dbStats.indexes || 0,
      dataSizeMB:  parseFloat((dbStats.dataSize / (1024 * 1024)).toFixed(2)),
      indexSizeMB: parseFloat((dbStats.indexSize / (1024 * 1024)).toFixed(2))
    };
  } catch (err) {
    mongoStats = { error: err.message };
  }

  // ── Cloudinary stats ───────────────────────────────────────────
  let cloudStats = null;
  try {
    const usage = await cloudinary.api.usage();
    const usedGB   = usage.storage?.usage      ? usage.storage.usage / (1024 * 1024 * 1024)   : 0;
    const usedMBCl = usedGB * 1024;
    const freeMBCl = Math.max(0, CLOUDINARY_FREE_MB - usedMBCl);
    const usedPct  = Math.min(100, (usedMBCl / CLOUDINARY_FREE_MB) * 100);

    cloudStats = {
      usedMB:        parseFloat(usedMBCl.toFixed(2)),
      freeMB:        parseFloat(freeMBCl.toFixed(2)),
      totalMB:       CLOUDINARY_FREE_MB,
      usedPct:       parseFloat(usedPct.toFixed(1)),
      level:         getLevel(usedPct),
      totalResources:usage.resources       || 0,
      totalImages:   usage.resources       || 0,
      bandwidth:     usage.bandwidth?.usage || 0,
      transformations: usage.transformations?.usage || 0,
      creditsUsed:   usage.credits?.usage  || 0,
      plan:          usage.plan            || 'Free'
    };
  } catch (err) {
    cloudStats = { error: err.message };
  }

  // ── Record counts ──────────────────────────────────────────────
  const [
    totalStudents, totalTeachers, totalParents,
    totalAdmissions, totalGallery,
    totalStudentDocs, totalTeacherDocs,
    totalAttendance, totalFeePayments
  ] = await Promise.all([
    Student.countDocuments({ isActive: true }),
    Teacher.countDocuments({ isActive: true }),
    Parent.countDocuments({ isActive: true }),
    Admission.countDocuments(),
    Gallery.countDocuments(),
    Student.aggregate([
      { $project: { docCount: { $size: { $ifNull: ['$documents', []] } } } },
      { $group: { _id: null, total: { $sum: '$docCount' } } }
    ]),
    Teacher.aggregate([
      { $project: { docCount: { $size: { $ifNull: ['$documents', []] } } } },
      { $group: { _id: null, total: { $sum: '$docCount' } } }
    ]),
    StudentAttendance.countDocuments(),
    FeePayment.countDocuments()
  ]);

  // ── Capacity estimator ─────────────────────────────────────────
  let capacity = null;
  if (mongoStats && !mongoStats.error && mongoStats.objects > 0) {
    const bytesPerRecord = (mongoStats.dataSizeMB * 1024 * 1024) / Math.max(mongoStats.objects, 1);
    const freeBytes      = mongoStats.freeMB * 1024 * 1024;

    // Estimates: student record ~8KB, teacher ~4KB, attendance ~256B, fee ~512B
    const studentRecordBytes    = 8  * 1024;
    const teacherRecordBytes    = 4  * 1024;
    const attendanceRecordBytes = 256;
    const feeRecordBytes        = 512;

    const studentsRemaining    = Math.floor(freeBytes / studentRecordBytes);
    const teachersRemaining    = Math.floor(freeBytes / teacherRecordBytes);
    const attendanceRemaining  = Math.floor(freeBytes / attendanceRecordBytes);
    const feeRecordsRemaining  = Math.floor(freeBytes / feeRecordBytes);

    // Monthly growth estimate (based on attendance records per month)
    const avgMonthlyBytes  = totalAttendance > 0
      ? ((mongoStats.dataSizeMB * 1024 * 1024) / totalAttendance) * (totalStudents * 25)
      : studentRecordBytes * 5;
    const monthsRemaining  = avgMonthlyBytes > 0 ? Math.floor(freeBytes / avgMonthlyBytes) : 999;

    capacity = {
      studentsRemaining:   Math.max(0, studentsRemaining),
      teachersRemaining:   Math.max(0, teachersRemaining),
      attendanceRemaining: Math.max(0, attendanceRemaining),
      feeRecordsRemaining: Math.max(0, feeRecordsRemaining),
      estimatedMonthsLeft: Math.min(999, Math.max(0, monthsRemaining)),
      bytesPerRecord:      Math.round(bytesPerRecord),
      note: 'Estimates based on current average record size'
    };
  }

  // ── Recommendations ────────────────────────────────────────────
  const recommendations = [];
  if (mongoStats && mongoStats.usedPct > 50) {
    recommendations.push({ level: 'info', text: 'Consider archiving attendance records older than 1 year to free MongoDB space.' });
  }
  if (mongoStats && mongoStats.usedPct > 75) {
    recommendations.push({ level: 'warning', text: 'MongoDB over 75% — archive old academic sessions, attendance and fee records now.' });
  }
  if (mongoStats && mongoStats.usedPct > 90) {
    recommendations.push({ level: 'danger', text: 'CRITICAL: MongoDB nearly full. Archive or delete old data immediately.' });
  }
  if (cloudStats && !cloudStats.error && cloudStats.usedPct > 50) {
    recommendations.push({ level: 'info', text: 'Cloudinary over 50% — consider removing duplicate or unused images.' });
  }
  if (cloudStats && !cloudStats.error && cloudStats.usedPct > 75) {
    recommendations.push({ level: 'warning', text: 'Cloudinary over 75% — archive old gallery images or delete unused uploads.' });
  }

  ok(res, {
    data: {
      mongo:       mongoStats,
      cloudinary:  cloudStats,
      counts: {
        totalStudents, totalTeachers, totalParents,
        totalAdmissions, totalGallery,
        totalStudentDocs:  totalStudentDocs[0]?.total  || 0,
        totalTeacherDocs:  totalTeacherDocs[0]?.total  || 0,
        totalAttendance,   totalFeePayments
      },
      collections:     collectionStats,
      capacity,
      recommendations,
      timestamp: new Date().toISOString()
    }
  });
});
