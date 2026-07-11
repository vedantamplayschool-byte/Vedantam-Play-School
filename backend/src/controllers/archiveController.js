import ExcelJS           from 'exceljs';
import Student           from '../models/Student.js';
import Teacher           from '../models/Teacher.js';
import StudentAttendance from '../models/StudentAttendance.js';
import TeacherAttendance from '../models/TeacherAttendance.js';
import FeePayment        from '../models/FeePayment.js';
import Gallery           from '../models/Gallery.js';
import AcademicSession   from '../models/AcademicSession.js';
import ArchiveManifest   from '../models/ArchiveManifest.js';
import cloudinary        from '../config/cloudinary.js';
import { asyncHandler }  from '../utils/asyncHandler.js';
import { ok }            from '../utils/apiResponse.js';

/* ── LIST ARCHIVES ───────────────────────────────────────────────── */
export const listArchives = asyncHandler(async (req, res) => {
  const items = await ArchiveManifest.find()
    .populate('archivedBy', 'name')
    .sort('-archivedAt')
    .lean();
  ok(res, { data: items });
});

/* ── GET SINGLE ARCHIVE ──────────────────────────────────────────── */
export const getArchive = asyncHandler(async (req, res) => {
  const doc = await ArchiveManifest.findById(req.params.id)
    .populate('archivedBy', 'name')
    .lean();
  if (!doc) { const e = new Error('Archive not found'); e.status = 404; throw e; }
  ok(res, { data: doc });
});

/* ── EXPORT + (optionally) DELETE ────────────────────────────────── */
export const createArchive = asyncHandler(async (req, res) => {
  const {
    name, description, collectionName, filter = {},
    formats = ['json'], deleteAfterExport = false
  } = req.body;

  if (!name || !collectionName) {
    const e = new Error('name and collectionName are required'); e.status = 400; throw e;
  }

  const ALLOWED = ['students', 'teachers', 'attendance', 'teacher_attendance', 'fees', 'gallery'];
  if (!ALLOWED.includes(collectionName)) {
    const e = new Error(`collectionName must be one of: ${ALLOWED.join(', ')}`); e.status = 400; throw e;
  }

  // Build date filter from optional sessionId or date range
  const queryFilter = {};
  if (filter.sessionId) queryFilter.session = filter.sessionId;
  if (filter.before)    queryFilter.createdAt = { $lte: new Date(filter.before) };
  if (filter.program)   queryFilter.program   = filter.program;

  // Fetch data
  const ModelMap = {
    students:           Student,
    teachers:           Teacher,
    attendance:         StudentAttendance,
    teacher_attendance: TeacherAttendance,
    fees:               FeePayment,
    gallery:            Gallery
  };

  const Model = ModelMap[collectionName];
  const records = await Model.find(queryFilter).lean();

  if (!records.length) {
    const e = new Error('No records found for the given filter'); e.status = 400; throw e;
  }

  // Collect Cloudinary publicIds
  const cloudPublicIds = [];
  if (collectionName === 'gallery') {
    records.forEach(r => { if (r.publicId) cloudPublicIds.push(r.publicId); });
  } else if (collectionName === 'students') {
    records.forEach(r => {
      if (r.photoPublicId) cloudPublicIds.push(r.photoPublicId);
      (r.documents || []).forEach(d => { if (d.publicId) cloudPublicIds.push(d.publicId); });
    });
  }

  // Create manifest
  const manifest = await ArchiveManifest.create({
    name, description,
    archivedBy: req.admin._id,
    collections: [{ name: collectionName, count: records.length, filter: queryFilter, ids: records.map(r => r._id) }],
    formats,
    cloudinaryPublicIds: cloudPublicIds,
    status: 'Creating'
  });

  // Return manifest + data as JSON download (primary export)
  // For Excel, stream workbook
  if (formats.includes('excel')) {
    const wb  = new ExcelJS.Workbook();
    const ws  = wb.addWorksheet(collectionName);
    if (records.length > 0) {
      const keys = Object.keys(records[0]).filter(k => k !== '__v');
      ws.columns = keys.map(k => ({ header: k, key: k, width: 20 }));
      records.forEach(r => {
        const row = {};
        keys.forEach(k => { row[k] = Array.isArray(r[k]) ? JSON.stringify(r[k]) : String(r[k] ?? ''); });
        ws.addRow(row);
      });
    }

    // Mark manifest ready before streaming
    await ArchiveManifest.findByIdAndUpdate(manifest._id, {
      status: 'Ready',
      exportSizeKB: Math.round(JSON.stringify(records).length / 1024)
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="archive-${collectionName}-${Date.now()}.xlsx"`);
    res.setHeader('X-Archive-Id', String(manifest._id));
    await wb.xlsx.write(res);
    res.end();
    return;
  }

  // CSV export
  if (formats.includes('csv') && !formats.includes('excel')) {
    const keys = records.length > 0 ? Object.keys(records[0]).filter(k => k !== '__v') : [];
    const csvRows = [
      keys.join(','),
      ...records.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))
    ];
    const csv = csvRows.join('\n');

    await ArchiveManifest.findByIdAndUpdate(manifest._id, {
      status: 'Ready',
      exportSizeKB: Math.round(Buffer.byteLength(csv) / 1024)
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="archive-${collectionName}-${Date.now()}.csv"`);
    res.setHeader('X-Archive-Id', String(manifest._id));
    res.send(csv);
    return;
  }

  // Default: JSON export
  const json = JSON.stringify({ manifest: manifest._id, collection: collectionName, exportedAt: new Date(), count: records.length, records }, null, 2);
  await ArchiveManifest.findByIdAndUpdate(manifest._id, {
    status: deleteAfterExport ? 'Ready' : 'Ready',
    exportSizeKB: Math.round(Buffer.byteLength(json) / 1024)
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="archive-${collectionName}-${Date.now()}.json"`);
  res.setHeader('X-Archive-Id', String(manifest._id));
  res.send(json);
});

/* ── DELETE ARCHIVED RECORDS ─────────────────────────────────────── */
export const deleteArchived = asyncHandler(async (req, res) => {
  const manifest = await ArchiveManifest.findById(req.params.id);
  if (!manifest) { const e = new Error('Archive not found'); e.status = 404; throw e; }
  if (manifest.deletedFromDB) {
    const e = new Error('Records already deleted from database'); e.status = 400; throw e;
  }

  const { confirm } = req.body;
  if (confirm !== 'DELETE') {
    const e = new Error('Send confirm: "DELETE" to proceed with deletion'); e.status = 400; throw e;
  }

  const ModelMap = {
    students:           Student,
    teachers:           Teacher,
    attendance:         StudentAttendance,
    teacher_attendance: TeacherAttendance,
    fees:               FeePayment,
    gallery:            Gallery
  };

  let deletedCount = 0;
  let cloudDeleted = 0;

  for (const col of manifest.collections) {
    const Model = ModelMap[col.name];
    if (!Model) continue;
    const result = await Model.deleteMany({ _id: { $in: col.ids } });
    deletedCount += result.deletedCount || 0;
  }

  // Delete Cloudinary files
  for (const pid of manifest.cloudinaryPublicIds) {
    try {
      await cloudinary.uploader.destroy(pid);
      cloudDeleted++;
    } catch (_) {}
  }

  await ArchiveManifest.findByIdAndUpdate(manifest._id, {
    deletedFromDB: true,
    deletedAt:     new Date(),
    cloudinaryDeleted: cloudDeleted,
    status: 'Deleted'
  });

  ok(res, { message: `Deleted ${deletedCount} records and ${cloudDeleted} Cloudinary files`, data: { deletedCount, cloudDeleted } });
});
