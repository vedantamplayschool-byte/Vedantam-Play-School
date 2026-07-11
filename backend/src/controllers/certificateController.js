import Student  from '../models/Student.js';
import Settings from '../models/Settings.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const pad = n => String(n).padStart(2, '0');
const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

const baseStyles = () => `
  @page { size: A4; margin: 18mm 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #1a1a1a; background: #fff; }
  .cert {
    max-width: 750px; margin: 0 auto; padding: 36px 44px;
    border: 3px double #f97316;
    box-shadow: inset 0 0 0 6px #fff, inset 0 0 0 8px #fed7aa;
    min-height: 200px; position: relative;
  }
  .cert::before {
    content: ''; position: absolute; inset: 12px;
    border: 1px solid #fed7aa; pointer-events: none;
  }
  .header { text-align: center; margin-bottom: 28px; }
  .logo { width: 76px; height: 76px; object-fit: contain; border-radius: 50%; border: 3px solid #f97316; padding: 2px; }
  .school { font-size: 26px; font-weight: 900; color: #f97316; margin: 10px 0 4px; font-family: 'Segoe UI', sans-serif; letter-spacing: 0.5px; }
  .tagline { font-size: 12px; color: #ea580c; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; }
  .school-address { font-size: 11px; color: #888; margin-top: 4px; }
  .divider { border: none; border-top: 2px solid #f97316; margin: 16px auto; width: 80%; }
  .divider-thin { border: none; border-top: 1px solid #fed7aa; margin: 10px auto; width: 60%; }
  .cert-type { font-size: 22px; font-weight: 800; text-align: center; color: #c2410c; margin: 18px 0 8px; letter-spacing: 3px; text-transform: uppercase; font-family: 'Segoe UI', sans-serif; }
  .cert-no { text-align: right; font-size: 11px; color: #aaa; margin-bottom: 18px; }
  .body-text { font-size: 15px; line-height: 2.1; text-align: justify; margin: 18px 0; }
  .highlight { font-weight: 700; text-decoration: underline; color: #c2410c; }
  .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-block { text-align: center; min-width: 160px; }
  .sig-line { border-top: 1.5px solid #333; padding-top: 6px; font-size: 12px; font-weight: 600; }
  .date-block { font-size: 13px; }
  .school-seal { width: 60px; height: 60px; border-radius: 50%; border: 2px dashed #f97316; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; opacity: 0.4; font-size: 22px; }
  @media print { body { margin: 0; } .cert { box-shadow: none; } }
`;

const certNo = () => `VPS/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
const todayStr = () => fmtDate(new Date());

const getSchoolInfo = async () => {
  const s = await Settings.findOne().lean();
  return {
    name:    s?.schoolName || 'Vedantam Play School',
    tagline: s?.tagline    || 'Play · Learn · Grow',
    logo:    s?.logoUrl    || '',
    address: s?.address    || 'Damoh, Madhya Pradesh',
    phone:   s?.phone      || '',
    email:   s?.email      || ''
  };
};

/* ── BONAFIDE ─────────────────────────────────────────────────────── */
export const bonafide = asyncHandler(async (req, res) => {
  const [student, school] = await Promise.all([
    Student.findById(req.params.id).lean(),
    getSchoolInfo()
  ]);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bonafide Certificate</title>
<style>${baseStyles()}</style></head><body>
<div class="cert">
  <div class="header">
    ${school.logo ? `<img class="logo" src="${school.logo}" alt="">` : ''}
    <div class="school">${school.name}</div>
    <div class="tagline">${school.tagline}</div>
    <div style="font-size:12px;color:#888;margin-top:4px">${school.address}${school.phone ? ' | ' + school.phone : ''}</div>
  </div>
  <hr class="divider">
  <div class="cert-type">Bonafide Certificate</div>
  <div class="cert-no">Cert. No.: ${certNo()}</div>
  <div class="body-text">
    This is to certify that <span class="highlight">${student.studentName}</span>
    ${student.gender === 'Male' ? 'S/o' : student.gender === 'Female' ? 'D/o' : 'C/o'}
    <span class="highlight">${student.parentName}</span>,
    ${student.dateOfBirth ? `born on <span class="highlight">${fmtDate(student.dateOfBirth)}</span>,` : ''}
    is / was a <em>bonafide</em> student of this institution and is currently enrolled in
    <span class="highlight">${student.program}</span>
    ${student.section ? `– Section <span class="highlight">${student.section}</span>` : ''}
    with Admission Number <span class="highlight">${student.admissionNumber || '—'}</span>
    for the academic year <span class="highlight">${new Date().getFullYear()}–${new Date().getFullYear() + 1}</span>.
  </div>
  <div class="body-text">This certificate is issued on request for educational purposes.</div>
  <div class="footer">
    <div class="date-block">Date: ${todayStr()}<br>Place: ${school.address.split(',')[0] || 'Damoh'}</div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">Principal / Head of School<br>${school.name}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/* ── ADMISSION CERTIFICATE ───────────────────────────────────────── */
export const admissionCert = asyncHandler(async (req, res) => {
  const [student, school] = await Promise.all([
    Student.findById(req.params.id).lean(),
    getSchoolInfo()
  ]);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admission Certificate</title>
<style>${baseStyles()}</style></head><body>
<div class="cert">
  <div class="header">
    ${school.logo ? `<img class="logo" src="${school.logo}" alt="">` : ''}
    <div class="school">${school.name}</div>
    <div class="tagline">${school.tagline}</div>
  </div>
  <hr class="divider">
  <div class="cert-type">Admission Certificate</div>
  <div class="cert-no">Adm. No.: <strong>${student.admissionNumber || '—'}</strong></div>
  <div class="body-text">
    This is to certify that <span class="highlight">${student.studentName}</span>
    has been admitted to <span class="highlight">${school.name}</span>
    in the <span class="highlight">${student.program}</span> programme
    ${student.section ? `(Section <span class="highlight">${student.section}</span>)` : ''}
    with effect from <span class="highlight">${fmtDate(student.admissionDate || student.createdAt)}</span>.
  </div>
  <div class="body-text" style="margin-top:16px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;width:200px;color:#555">Student Name</td><td><strong>${student.studentName}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#555">Parent / Guardian</td><td><strong>${student.parentName}</strong></td></tr>
      ${student.dateOfBirth ? `<tr><td style="padding:6px 0;color:#555">Date of Birth</td><td><strong>${fmtDate(student.dateOfBirth)}</strong></td></tr>` : ''}
      ${student.gender ? `<tr><td style="padding:6px 0;color:#555">Gender</td><td><strong>${student.gender}</strong></td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#555">Programme</td><td><strong>${student.program}</strong></td></tr>
      ${student.bloodGroup ? `<tr><td style="padding:6px 0;color:#555">Blood Group</td><td><strong>${student.bloodGroup}</strong></td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#555">Contact</td><td><strong>${student.phone}</strong></td></tr>
    </table>
  </div>
  <div class="footer">
    <div class="date-block">Date: ${todayStr()}</div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">Authorised Signatory<br>${school.name}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/* ── CHARACTER CERTIFICATE ───────────────────────────────────────── */
export const characterCert = asyncHandler(async (req, res) => {
  const [student, school] = await Promise.all([
    Student.findById(req.params.id).lean(),
    getSchoolInfo()
  ]);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Character Certificate</title>
<style>${baseStyles()}</style></head><body>
<div class="cert">
  <div class="header">
    ${school.logo ? `<img class="logo" src="${school.logo}" alt="">` : ''}
    <div class="school">${school.name}</div>
    <div class="tagline">${school.tagline}</div>
  </div>
  <hr class="divider">
  <div class="cert-type">Character Certificate</div>
  <div class="cert-no">Cert. No.: ${certNo()}</div>
  <div class="body-text">
    This is to certify that <span class="highlight">${student.studentName}</span>,
    ${student.gender === 'Male' ? 'son' : student.gender === 'Female' ? 'daughter' : 'ward'} of
    <span class="highlight">${student.parentName}</span>,
    Admission No. <span class="highlight">${student.admissionNumber || '—'}</span>,
    was a student of this school in <span class="highlight">${student.program}</span>.
  </div>
  <div class="body-text">
    During ${student.gender === 'Male' ? 'his' : student.gender === 'Female' ? 'her' : 'their'}
    association with our institution,
    ${student.gender === 'Male' ? 'his' : student.gender === 'Female' ? 'her' : 'their'}
    character and conduct have been found to be
    <span class="highlight">Excellent</span>.
    ${student.gender === 'Male' ? 'He' : student.gender === 'Female' ? 'She' : 'They'}
    has always been sincere, obedient, and well-behaved.
  </div>
  <div class="body-text">We wish ${student.gender === 'Male' ? 'him' : student.gender === 'Female' ? 'her' : 'them'} all the best in future endeavours.</div>
  <div class="footer">
    <div class="date-block">Date: ${todayStr()}</div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">Principal<br>${school.name}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/* ── TRANSFER CERTIFICATE ────────────────────────────────────────── */
export const transferCert = asyncHandler(async (req, res) => {
  const [student, school] = await Promise.all([
    Student.findById(req.params.id).lean(),
    getSchoolInfo()
  ]);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Transfer Certificate</title>
<style>${baseStyles()}</style></head><body>
<div class="cert">
  <div class="header">
    ${school.logo ? `<img class="logo" src="${school.logo}" alt="">` : ''}
    <div class="school">${school.name}</div>
    <div class="tagline">${school.tagline}</div>
    <div style="font-size:12px;color:#888;margin-top:4px">${school.address}</div>
  </div>
  <hr class="divider">
  <div class="cert-type">Transfer Certificate</div>
  <div class="cert-no">TC No.: ${certNo()}</div>
  <div class="body-text">
    <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:2">
      <tr><td style="width:260px;color:#555">1. Name of Student</td><td><strong>${student.studentName}</strong></td></tr>
      <tr><td style="color:#555">2. Father's Name</td><td><strong>${student.fatherName || student.parentName}</strong></td></tr>
      <tr><td style="color:#555">3. Mother's Name</td><td><strong>${student.motherName || '—'}</strong></td></tr>
      <tr><td style="color:#555">4. Date of Birth</td><td><strong>${fmtDate(student.dateOfBirth)}</strong></td></tr>
      <tr><td style="color:#555">5. Admission No.</td><td><strong>${student.admissionNumber || '—'}</strong></td></tr>
      <tr><td style="color:#555">6. Programme / Class</td><td><strong>${student.program}</strong></td></tr>
      <tr><td style="color:#555">7. Date of Admission</td><td><strong>${fmtDate(student.admissionDate || student.createdAt)}</strong></td></tr>
      <tr><td style="color:#555">8. Date of Leaving</td><td><strong>${fmtDate(student.transferCertificateDate || new Date())}</strong></td></tr>
      <tr><td style="color:#555">9. Conduct</td><td><strong>Good</strong></td></tr>
      <tr><td style="color:#555">10. Reason for Leaving</td><td><strong>${req.query.reason || 'At Parent\'s Request'}</strong></td></tr>
    </table>
  </div>
  <div class="footer">
    <div class="date-block">Date: ${todayStr()}<br>Place: ${school.address.split(',')[0] || 'Damoh'}</div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">Principal / Head of School<br>${school.name}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/* ── NURSERY COMPLETION CERTIFICATE ─────────────────────────────── */
export const completionCert = asyncHandler(async (req, res) => {
  const [student, school] = await Promise.all([
    Student.findById(req.params.id).lean(),
    getSchoolInfo()
  ]);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Completion Certificate</title>
<style>
${baseStyles()}
.cert { border: 4px double #f6c90e; }
.cert-type { color: #c47900; }
.star { color: #f6c90e; font-size: 28px; text-align: center; margin: 12px 0; }
</style></head><body>
<div class="cert">
  <div class="header">
    ${school.logo ? `<img class="logo" src="${school.logo}" alt="">` : ''}
    <div class="school">${school.name}</div>
    <div class="tagline">${school.tagline}</div>
  </div>
  <hr class="divider">
  <div class="star">★ ★ ★</div>
  <div class="cert-type">Certificate of Completion</div>
  <div style="text-align:center;font-size:14px;color:#888;margin-bottom:20px">${student.program} Programme · ${new Date().getFullYear()}</div>
  <div class="body-text" style="text-align:center">
    This is to certify that<br><br>
    <span style="font-size:26px;font-weight:900;color:#c2410c;font-style:italic;font-family:'Segoe UI',sans-serif">${student.studentName}</span><br><br>
    ${student.parentName ? `<span style="font-size:13px;color:#777">${student.gender==='Male'?'S/o':'D/o'} ${student.parentName}</span><br><br>` : ''}
    has successfully completed the <strong>${student.program}</strong> programme
    at <strong>${school.name}</strong> for the academic year
    <strong>${new Date().getFullYear()}–${new Date().getFullYear() + 1}</strong>.<br><br>
    We wish ${student.gender === 'Female' ? 'her' : 'him'} continued success and happiness in
    ${student.gender === 'Female' ? 'her' : 'his'} educational journey.
  </div>
  <div class="star">★ ★ ★</div>
  <div class="footer" style="margin-top:30px">
    <div class="date-block">Date: ${todayStr()}</div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">Principal<br>${school.name}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});
