'use strict';
/* ================================================================
   VEDANTAM PLAY SCHOOL — PARENT PORTAL v3.0
   View-only portal: children, attendance, homework, fees, notices,
   events, gallery, profile, change password.
   ================================================================ */

const API = (window.VedantamAPIConfig?.baseUrl || '/api/v1').replace(/\/$/, '');

const S = {
  token:  localStorage.getItem('v_par_tok') || sessionStorage.getItem('v_par_tok') || '',
  parent: null,
  page:   'dashboard'
};

/* ── HELPERS ──────────────────────────────────────────────────────── */
const esc = v => String(v ?? '').replace(/[&<>'"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtCur  = n => n != null ? '₹' + Number(n).toLocaleString('en-IN') : '₹0';
const getInit = name => (name||'P').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

/* ── API ──────────────────────────────────────────────────────────── */
async function api(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(S.token ? { Authorization: `Bearer ${S.token}` } : {}),
    ...(opts.headers || {})
  };
  const res  = await fetch(API + path, { ...opts, headers, credentials: 'include' });
  const json = await res.json().catch(() => ({ success: false, message: 'Unexpected response' }));
  if (!res.ok || json.success === false) {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.status = res.status; throw err;
  }
  return json;
}

/* ── TOAST ────────────────────────────────────────────────────────── */
let _tt;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  clearTimeout(_tt);
  el.className = `show ${type}`;
  el.innerHTML = `<span class="material-icons-round" style="font-size:16px">${type==='success'?'check_circle':'error'}</span>${esc(msg)}`;
  _tt = setTimeout(() => el.classList.remove('show'), 3500);
}

/* ── TOKEN ────────────────────────────────────────────────────────── */
function saveToken(t) { S.token = t; localStorage.setItem('v_par_tok', t); }
function clearToken() {
  S.token = ''; S.parent = null;
  localStorage.removeItem('v_par_tok');
  sessionStorage.removeItem('v_par_tok');
}

/* ── SHOW PAGE ────────────────────────────────────────────────────── */
function showPage(id) {
  ['loginPage','forceChangePage','parentShell'].forEach(p => {
    const el = document.getElementById(p);
    if (!el) return;
    if (p === 'parentShell') {
      el.classList.toggle('hidden', p !== id);
      return;
    }
    el.style.display = p === id ? '' : 'none';
    if (p === 'forceChangePage' && p === id) el.style.display = 'flex';
  });
  if (id === 'parentShell') {
    const sn = document.getElementById('sidebarNav');
    if (sn && window.innerWidth >= 640) sn.style.display = '';
  }
}

/* ── NAV ──────────────────────────────────────────────────────────── */
function navigate(page) {
  S.page = page;
  document.querySelectorAll('.bnav-btn, .snav-btn[data-page]')
    .forEach(b => b.classList.toggle('active', b.dataset.page === page));
  const area = document.getElementById('contentArea');
  area.innerHTML = '<div style="text-align:center;padding:48px"><span class="spin" style="width:28px;height:28px;border-width:3px;border-color:var(--bd);border-top-color:var(--primary)"></span></div>';
  const pages = {
    dashboard, children: childrenPage, attendance: attendancePage,
    homework: homeworkPage, fees: feesPage, notices: noticesPage,
    events: eventsPage, gallery: galleryPage, profile: profilePage
  };
  Promise.resolve((pages[page] || dashboard)()).catch(err => {
    area.innerHTML = `<div class="card"><div class="card-body"><p style="color:var(--red)">${esc(err.message)}</p></div></div>`;
  });
}
window.navigate = navigate;

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════════════════ */
async function dashboard() {
  const { data: d } = await api('/parent-portal/dashboard');
  const area = document.getElementById('contentArea');

  const studentCards = (d.students || []).map(s => `
    <div class="list-item">
      <div class="list-avatar">
        ${s.photoUrl ? `<img src="${esc(s.photoUrl)}" alt="">` : `<span class="material-icons-round" style="color:var(--txt-sm)">child_care</span>`}
      </div>
      <div class="list-main">
        <div class="list-name">${esc(s.studentName)}</div>
        <div class="list-sub">${esc(s.program)}${s.section?' · Sec '+esc(s.section):''} · Adm# ${esc(s.admissionNumber||'N/A')}</div>
      </div>
      <div class="list-end">
        <span class="badge badge-${(s.todayAttendance||'').toLowerCase()}">${esc(s.todayAttendance||'Not Marked')}</span>
      </div>
    </div>`).join('') || `<div class="empty"><span class="material-icons-round">child_care</span><p>No children linked</p></div>`;

  const hwHtml = (d.upcomingHomework || []).map(hw => `
    <div class="list-item">
      <div class="list-main">
        <div class="list-name">${esc(hw.subject||hw.title||'Homework')}</div>
        <div class="list-sub">${esc(hw.program)} · Due ${fmtDate(hw.dueDate)}</div>
      </div>
    </div>`).join('') || `<div class="empty"><span class="material-icons-round">assignment</span><p>No upcoming homework</p></div>`;

  const noticeHtml = (d.recentNotices || []).map(n => `
    <div class="list-item">
      <div class="list-main">
        <div class="list-name">${esc(n.title)}</div>
        <div class="list-sub">${fmtDate(n.createdAt)}</div>
      </div>
      <div class="list-end"><span class="badge badge-${(n.priority||'normal').toLowerCase()}">${esc(n.priority||'Normal')}</span></div>
    </div>`).join('') || `<div class="empty"><span class="material-icons-round">campaign</span><p>No notices</p></div>`;

  area.innerHTML = `
    ${d.parent.mustChangePassword ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:8px">
      <span class="material-icons-round" style="color:#b91c1c">warning</span>
      <span>Please <button onclick="navigate('profile')" style="background:none;border:none;color:#b91c1c;font-weight:600;cursor:pointer;font-size:inherit">change your password</button> — you are using a temporary password.</span>
    </div>` : ''}

    <div style="background:linear-gradient(135deg,#f97316,#8b5cf6);color:#fff;border-radius:14px;padding:20px;margin-bottom:14px">
      <div style="font-size:13px;opacity:.85">Welcome back</div>
      <div style="font-size:18px;font-weight:700;margin-top:4px">${esc(d.parent.fatherName || d.parent.motherName || 'Parent')}</div>
      <div style="font-size:12px;opacity:.8;margin-top:2px">${d.activeSession ? esc(d.activeSession.name) : 'Vedantam Play School'}</div>
    </div>

    <div class="stat-strip">
      <div class="stat-item">
        <div class="stat-val">${(d.students||[]).length}</div>
        <div class="stat-lbl">Children</div>
      </div>
      <div class="stat-item">
        <div class="stat-val" style="color:var(--amber)">${d.pendingFees||0}</div>
        <div class="stat-lbl">Fee Due</div>
      </div>
      <div class="stat-item">
        <div class="stat-val" style="color:var(--blue)">${(d.upcomingHomework||[]).length}</div>
        <div class="stat-lbl">Homework</div>
      </div>
      <div class="stat-item">
        <div class="stat-val" style="color:var(--purple)">${(d.recentNotices||[]).length}</div>
        <div class="stat-lbl">Notices</div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">My Children — Today's Status</span>
        <button onclick="navigate('children')" style="background:none;border:none;color:var(--primary);font-size:12px;cursor:pointer;font-weight:600">View All</button>
      </div>
      <div>${studentCards}</div>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">Upcoming Homework</span>
        <button onclick="navigate('homework')" style="background:none;border:none;color:var(--primary);font-size:12px;cursor:pointer;font-weight:600">View All</button>
      </div>
      <div>${hwHtml}</div>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">School Notices</span>
        <button onclick="navigate('notices')" style="background:none;border:none;color:var(--primary);font-size:12px;cursor:pointer;font-weight:600">View All</button>
      </div>
      <div>${noticeHtml}</div>
    </div>`;
}

/* ════════════════════════════════════════════════════════════════════
   CHILDREN
   ════════════════════════════════════════════════════════════════════ */
async function childrenPage() {
  const { data: students } = await api('/parent-portal/students');
  const area = document.getElementById('contentArea');

  if (!students.length) {
    area.innerHTML = `<div class="empty"><span class="material-icons-round">child_care</span><p>No children linked to your account</p></div>`;
    return;
  }

  area.innerHTML = students.map(s => `
    <div class="card">
      <div class="card-body">
        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="width:60px;height:60px;border-radius:50%;overflow:hidden;background:var(--bg);flex-shrink:0;display:flex;align-items:center;justify-content:center">
            ${s.photoUrl ? `<img src="${esc(s.photoUrl)}" style="width:100%;height:100%;object-fit:cover">` : `<span class="material-icons-round" style="font-size:28px;color:var(--txt-sm)">child_care</span>`}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:16px">${esc(s.studentName)}</div>
            <div style="font-size:12px;color:var(--txt-sm);margin-top:2px">${esc(s.program)}${s.section?' · Section '+esc(s.section):''}</div>
            ${s.admissionNumber ? `<div style="font-size:11px;color:var(--txt-sm);font-family:monospace;margin-top:2px">Adm# ${esc(s.admissionNumber)}</div>` : ''}
          </div>
          <span class="badge badge-${(s.status||'active').toLowerCase()}">${esc(s.status||'Active')}</span>
        </div>
        <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
          ${s.dateOfBirth ? `<div><span style="color:var(--txt-sm)">DOB:</span> ${fmtDate(s.dateOfBirth)}</div>` : ''}
          ${s.gender ? `<div><span style="color:var(--txt-sm)">Gender:</span> ${esc(s.gender)}</div>` : ''}
          ${s.bloodGroup ? `<div><span style="color:var(--txt-sm)">Blood Group:</span> ${esc(s.bloodGroup)}</div>` : ''}
          ${s.rollNumber ? `<div><span style="color:var(--txt-sm)">Roll No:</span> ${esc(s.rollNumber)}</div>` : ''}
        </div>
        ${s.medicalNotes ? `<div style="margin-top:10px;font-size:12px;color:var(--txt-sm);background:var(--bg);border-radius:8px;padding:8px 10px"><strong>Medical Notes:</strong> ${esc(s.medicalNotes)}</div>` : ''}
        ${s.emergencyContact?.name ? `<div style="margin-top:8px;font-size:12px;color:var(--txt-sm)"><strong>Emergency:</strong> ${esc(s.emergencyContact.name)} · ${esc(s.emergencyContact.phone||'')} (${esc(s.emergencyContact.relation||'')})</div>` : ''}
      </div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════════════
   ATTENDANCE
   ════════════════════════════════════════════════════════════════════ */
async function attendancePage() {
  const area = document.getElementById('contentArea');

  // Default: last 30 days
  const to   = new Date();
  const from = new Date(to); from.setDate(from.getDate() - 29);
  const fmtISO = d => d.toISOString().split('T')[0];

  const { data: records, summary } = await api(`/parent-portal/attendance?from=${fmtISO(from)}&to=${fmtISO(to)}`);

  const statusBadge = s => {
    const map = { Present:'badge-present', Absent:'badge-absent', Late:'badge-late', Leave:'badge-leave' };
    return `<span class="badge ${map[s]||'badge-low'}">${esc(s)}</span>`;
  };

  const rows = records.map(r => `
    <tr>
      <td>${fmtDate(r.date)}</td>
      <td>${esc(r.student?.studentName||'')}</td>
      <td>${esc(r.student?.program||'')}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>`).join('');

  area.innerHTML = `
    <div class="card">
      <div class="card-head"><span class="card-title">Attendance — Last 30 Days</span></div>
      <div class="card-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px">
        ${Object.entries(summary||{}).map(([sid, s]) => Object.entries(s).map(([k,v]) => `
          <div style="background:var(--bg);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:20px;font-weight:700">${v}</div>
            <div style="font-size:11px;color:var(--txt-sm)">${k}</div>
          </div>`).join('')).join('')}
      </div>
    </div>

    <div class="card">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:var(--bg)">
            <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:11px;color:var(--txt-sm)">Date</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:11px;color:var(--txt-sm)">Student</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:11px;color:var(--txt-sm)">Program</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:11px;color:var(--txt-sm)">Status</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--txt-sm)">No attendance records</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

/* ════════════════════════════════════════════════════════════════════
   HOMEWORK
   ════════════════════════════════════════════════════════════════════ */
async function homeworkPage() {
  const { data: items } = await api('/parent-portal/homework');
  const area = document.getElementById('contentArea');

  if (!items.length) {
    area.innerHTML = `<div class="empty"><span class="material-icons-round">assignment</span><p>No homework found</p></div>`;
    return;
  }

  area.innerHTML = `
    <div style="margin-bottom:14px;font-size:13px;color:var(--txt-sm)">${items.length} homework assignment${items.length===1?'':'s'} found</div>
    ${items.map(hw => {
      const past = hw.dueDate && new Date(hw.dueDate) < new Date();
      return `
      <div class="card">
        <div class="card-body">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <div style="width:40px;height:40px;border-radius:10px;background:${past?'#fee2e2':'#dbeafe'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span class="material-icons-round" style="color:${past?'#b91c1c':'#1d4ed8'};font-size:20px">assignment</span>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:14px">${esc(hw.subject||hw.title||'Homework')}</div>
              <div style="font-size:12px;color:var(--txt-sm);margin-top:2px">${esc(hw.program)} · Due: <strong style="color:${past?'var(--red)':'var(--txt)'}">${fmtDate(hw.dueDate)}</strong></div>
              ${hw.description ? `<div style="font-size:13px;margin-top:8px;color:var(--txt)">${esc(hw.description)}</div>` : ''}
              ${hw.teacher ? `<div style="font-size:11px;color:var(--txt-sm);margin-top:6px">By: ${esc(hw.teacher.name||'')}</div>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    }).join('')}`;
}

/* ════════════════════════════════════════════════════════════════════
   FEES
   ════════════════════════════════════════════════════════════════════ */
async function feesPage() {
  const { data: payments, summary } = await api('/parent-portal/fees');
  const area = document.getElementById('contentArea');

  const statusBadge = s => {
    const map = { Paid:'badge-paid', Pending:'badge-pending', Partial:'badge-partial' };
    return `<span class="badge ${map[s]||'badge-low'}">${esc(s)}</span>`;
  };

  area.innerHTML = `
    <div class="stat-strip" style="margin-bottom:14px">
      <div class="stat-item">
        <div class="stat-val" style="color:var(--green)">${fmtCur(summary?.totalPaid)}</div>
        <div class="stat-lbl">Total Paid</div>
      </div>
      <div class="stat-item">
        <div class="stat-val" style="color:var(--red)">${fmtCur(summary?.totalPending)}</div>
        <div class="stat-lbl">Outstanding</div>
      </div>
    </div>
    ${payments.length ? payments.map(p => `
    <div class="card">
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <div style="font-weight:600;font-size:14px">${esc(p.student?.studentName||'')}</div>
            <div style="font-size:12px;color:var(--txt-sm)">${esc(p.feeType)} ${p.month?'· '+esc(p.month):''} ${p.year?esc(String(p.year)):''}</div>
            ${p.receiptNumber ? `<div style="font-size:11px;color:var(--txt-sm);font-family:monospace;margin-top:2px">Receipt# ${esc(p.receiptNumber)}</div>` : ''}
          </div>
          ${statusBadge(p.status)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px">
          <div><div style="color:var(--txt-sm)">Amount</div><div style="font-weight:600">${fmtCur(p.totalAmount)}</div></div>
          <div><div style="color:var(--txt-sm)">Paid</div><div style="font-weight:600;color:var(--green)">${fmtCur(p.amountPaid)}</div></div>
          <div><div style="color:var(--txt-sm)">Balance</div><div style="font-weight:600;color:${(p.balance||0)>0?'var(--red)':'var(--green)'}">${fmtCur(p.balance)}</div></div>
        </div>
        ${p.paymentDate ? `<div style="font-size:11px;color:var(--txt-sm);margin-top:8px">Paid on: ${fmtDate(p.paymentDate)} · ${esc(p.paymentMode||'')}</div>` : ''}
        ${p.amountPaid ? `<div style="margin-top:10px"><button class="btn-icon" style="background:var(--bg);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;color:var(--primary)" onclick="downloadReceipt('${p._id}')"><span class="material-icons-round" style="font-size:16px">picture_as_pdf</span>&nbsp;Download Receipt</button></div>` : ''}
      </div>
    </div>`).join('') : `<div class="empty"><span class="material-icons-round">payments</span><p>No fee records found</p></div>`}`;
}

async function downloadReceipt(paymentId) {
  try {
    const res = await fetch(`${API}/parent-portal/fees/${paymentId}/receipt/pdf`, {
      headers: S.token ? { Authorization: `Bearer ${S.token}` } : {},
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Could not generate receipt');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `receipt-${paymentId}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (err) { toast(err.message, 'error'); }
}
window.downloadReceipt = downloadReceipt;

/* ════════════════════════════════════════════════════════════════════
   NOTICES
   ════════════════════════════════════════════════════════════════════ */
async function noticesPage() {
  const { data: notices } = await api('/parent-portal/notices');
  const area = document.getElementById('contentArea');

  area.innerHTML = notices.length ? notices.map(n => {
    const priBg = { High:'#fee2e2', Normal:'#dbeafe', Low:'#f3f4f6' };
    return `
    <div class="card" style="border-left:4px solid ${n.priority==='High'?'var(--red)':n.priority==='Normal'?'var(--blue)':'var(--bd)'}">
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="font-weight:600;font-size:14px;flex:1;padding-right:10px">${esc(n.title)}</div>
          <span class="badge badge-${(n.priority||'normal').toLowerCase()}">${esc(n.priority||'Normal')}</span>
        </div>
        ${n.body ? `<div style="font-size:13px;color:var(--txt-sm);line-height:1.6">${esc(n.body)}</div>` : ''}
        <div style="font-size:11px;color:var(--txt-sm);margin-top:8px">${fmtDate(n.createdAt)}</div>
      </div>
    </div>`;
  }).join('') : `<div class="empty"><span class="material-icons-round">campaign</span><p>No notices at this time</p></div>`;
}

/* ════════════════════════════════════════════════════════════════════
   EVENTS
   ════════════════════════════════════════════════════════════════════ */
async function eventsPage(category) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  const { data: events } = await api(`/parent-portal/events${qs}`);
  const area = document.getElementById('contentArea');

  const categories = ['General','PTM','Exam','Holiday','Sports','Cultural','Other'];
  const filterBar = `
    <div class="filter-bar">
      <select id="eventCatFilter" onchange="eventsPage(this.value)">
        <option value="">All Categories</option>
        ${categories.map(c => `<option value="${c}" ${category===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>`;

  const list = events.length ? events.map(ev => {
    const isPast = ev.eventDate && new Date(ev.eventDate) < new Date();
    return `
    <div class="card">
      <div class="card-body">
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="flex-shrink:0;width:50px;height:50px;border-radius:12px;background:${isPast?'var(--bg)':'#eff6ff'};display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div style="font-size:16px;font-weight:700;color:${isPast?'var(--txt-sm)':'var(--blue)'}">${ev.eventDate?new Date(ev.eventDate).getDate():'?'}</div>
            <div style="font-size:9px;font-weight:600;color:${isPast?'var(--txt-sm)':'var(--blue)'}">${ev.eventDate?new Date(ev.eventDate).toLocaleString('en-IN',{month:'short'}):''}</div>
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <div style="font-weight:600;font-size:14px">${esc(ev.title)}</div>
              ${ev.category && ev.category !== 'General' ? `<span class="badge badge-normal">${esc(ev.category)}</span>` : ''}
            </div>
            ${ev.description ? `<div style="font-size:13px;color:var(--txt-sm);margin-top:4px">${esc(ev.description)}</div>` : ''}
            ${ev.location ? `<div style="font-size:12px;color:var(--txt-sm);margin-top:4px"><span class="material-icons-round" style="font-size:14px;vertical-align:middle">place</span> ${esc(ev.location)}</div>` : ''}
          </div>
          ${isPast ? `<span class="badge badge-low">Past</span>` : `<span class="badge badge-paid">Upcoming</span>`}
        </div>
      </div>
    </div>`;
  }).join('') : `<div class="empty"><span class="material-icons-round">event</span><p>No events found</p></div>`;

  area.innerHTML = filterBar + list;
}
window.eventsPage = eventsPage;

/* ════════════════════════════════════════════════════════════════════
   GALLERY
   ════════════════════════════════════════════════════════════════════ */
async function galleryPage() {
  const { data: items } = await api('/parent-portal/gallery');
  const area = document.getElementById('contentArea');

  if (!items.length) {
    area.innerHTML = `<div class="empty"><span class="material-icons-round">photo_library</span><p>No gallery photos yet</p></div>`;
    return;
  }

  area.innerHTML = `
    <div class="card">
      <div class="gallery-grid">
        ${items.map(g => `
          <div class="gallery-item">
            ${g.imageUrl ? `<img src="${esc(g.imageUrl)}" alt="${esc(g.title||'')}" loading="lazy">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg)"><span class="material-icons-round" style="font-size:32px;color:var(--bd)">image</span></div>`}
            <div class="gallery-lbl">${esc(g.title||'')}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ════════════════════════════════════════════════════════════════════
   PROFILE
   ════════════════════════════════════════════════════════════════════ */
async function profilePage() {
  const area = document.getElementById('contentArea');
  const p = S.parent;

  area.innerHTML = `
    <div class="card">
      <div class="profile-header">
        <div class="profile-avatar">${getInit(p.fatherName||p.motherName||'P')}</div>
        <div class="profile-name">${esc(p.fatherName || p.motherName || 'Parent')}</div>
        <div class="profile-role">Parent Portal · Vedantam Play School</div>
      </div>
      <div class="card-body">
        ${p.fatherName ? `<div class="info-row"><span class="material-icons-round">person</span><div><div class="info-label">Father's Name</div><div class="info-value">${esc(p.fatherName)}</div></div></div>` : ''}
        ${p.motherName ? `<div class="info-row"><span class="material-icons-round">person</span><div><div class="info-label">Mother's Name</div><div class="info-value">${esc(p.motherName)}</div></div></div>` : ''}
        ${p.fatherPhone ? `<div class="info-row"><span class="material-icons-round">phone</span><div><div class="info-label">Father's Phone</div><div class="info-value">${esc(p.fatherPhone)}</div></div></div>` : ''}
        ${p.motherPhone ? `<div class="info-row"><span class="material-icons-round">phone</span><div><div class="info-label">Mother's Phone</div><div class="info-value">${esc(p.motherPhone)}</div></div></div>` : ''}
        ${p.portalEmail ? `<div class="info-row"><span class="material-icons-round">email</span><div><div class="info-label">Portal Email</div><div class="info-value">${esc(p.portalEmail)}</div></div></div>` : ''}
        ${p.address ? `<div class="info-row"><span class="material-icons-round">place</span><div><div class="info-label">Address</div><div class="info-value">${esc(p.address)}${p.city?', '+esc(p.city):''}</div></div></div>` : ''}
        ${p.lastLoginAt ? `<div class="info-row"><span class="material-icons-round">history</span><div><div class="info-label">Last Login</div><div class="info-value">${fmtDate(p.lastLoginAt)}</div></div></div>` : ''}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Update Contact Info</span></div>
      <div class="card-body">
        <div id="profileError" style="display:none;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:8px;padding:10px;font-size:13px;margin-bottom:12px"></div>
        <form id="profileForm" class="pw-form" style="max-width:none;display:grid;grid-template-columns:1fr 1fr;gap:14px 16px">
          <div class="form-group"><label>Father's Phone</label><input type="text" name="fatherPhone" value="${esc(p.fatherPhone||'')}"></div>
          <div class="form-group"><label>Mother's Phone</label><input type="text" name="motherPhone" value="${esc(p.motherPhone||'')}"></div>
          <div class="form-group"><label>Guardian Phone</label><input type="text" name="guardianPhone" value="${esc(p.guardianPhone||'')}"></div>
          <div class="form-group"><label>Address</label><input type="text" name="address" value="${esc(p.address||'')}"></div>
          <div class="form-group"><label>City</label><input type="text" name="city" value="${esc(p.city||'')}"></div>
          <div class="form-group"><label>State</label><input type="text" name="state" value="${esc(p.state||'')}"></div>
          <div class="form-group"><label>Pincode</label><input type="text" name="pincode" value="${esc(p.pincode||'')}"></div>
          <div style="grid-column:1/-1">
            <button type="submit" style="padding:10px 20px;background:linear-gradient(135deg,#f97316,#8b5cf6);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">
              <span class="material-icons-round" style="font-size:18px">save</span>Save Contact Info
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Change Password</span></div>
      <div class="card-body">
        ${p.mustChangePassword ? `<div style="background:#fef9c3;border:1px solid #fef08a;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:13px;color:#854d0e"><strong>Action required:</strong> Please change your temporary password.</div>` : ''}
        <div class="pw-form">
          <div id="pwError" style="display:none;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:8px;padding:10px;font-size:13px;margin-bottom:12px"></div>
          <form id="pwForm">
            <div class="form-group"><label>Current Password</label><input type="password" name="currentPassword" required autocomplete="current-password"></div>
            <div class="form-group"><label>New Password</label><input type="password" name="newPassword" required minlength="6" autocomplete="new-password"></div>
            <div class="form-group"><label>Confirm New Password</label><input type="password" name="confirmPassword" required autocomplete="new-password"></div>
            <button type="submit" style="padding:10px 20px;background:linear-gradient(135deg,#f97316,#8b5cf6);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">
              <span class="material-icons-round" style="font-size:18px">lock</span>Update Password
            </button>
          </form>
        </div>
      </div>
    </div>`;

  document.getElementById('profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = document.getElementById('profileError');
    errEl.style.display = 'none';
    const body = Object.fromEntries(fd.entries());
    try {
      const { data } = await api('/parent-auth/profile', { method: 'PUT', body: JSON.stringify(body) });
      S.parent = { ...S.parent, ...data };
      toast('Contact info updated');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = '';
    }
  });

  document.getElementById('pwForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd   = new FormData(e.target);
    const curr = fd.get('currentPassword');
    const nw   = fd.get('newPassword');
    const conf = fd.get('confirmPassword');
    const errEl = document.getElementById('pwError');
    errEl.style.display = 'none';
    if (nw !== conf) { errEl.textContent = 'Passwords do not match'; errEl.style.display = ''; return; }
    try {
      await api('/parent-auth/change-password', { method:'PUT', body: JSON.stringify({ currentPassword: curr, newPassword: nw }) });
      toast('Password changed successfully!');
      S.parent.mustChangePassword = false;
      e.target.reset();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = '';
    }
  });
}

/* ════════════════════════════════════════════════════════════════════
   AUTH FLOWS
   ════════════════════════════════════════════════════════════════════ */
async function initApp() {
  if (!S.token) { showPage('loginPage'); return; }
  try {
    const { data } = await api('/parent-auth/me');
    S.parent = data;
    mountShell();
    if (data.mustChangePassword) showPage('forceChangePage');
    else navigate('dashboard');
  } catch (_) {
    clearToken(); showPage('loginPage');
  }
}

function mountShell() {
  showPage('parentShell');
  const initials = getInit(S.parent.fatherName || S.parent.motherName || 'P');
  const av = document.getElementById('topAvatar');
  if (av) av.textContent = initials;

  // Logout buttons
  ['logoutBtn','logoutBtnSidebar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', logout);
  });

  // Bottom nav
  document.getElementById('bottomNav')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (btn) navigate(btn.dataset.page);
  });

  // Desktop sidebar nav
  document.getElementById('sidebarNav')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (btn) navigate(btn.dataset.page);
  });
}

async function logout() {
  try { await api('/parent-auth/logout', { method: 'POST' }); } catch (_) {}
  clearToken();
  showPage('loginPage');
}

/* ── LOGIN FORM ───────────────────────────────────────────────────── */
document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const fd  = new FormData(e.target);
  const btn = document.getElementById('loginBtn');
  const txt = document.getElementById('loginBtnText');
  const spn = document.getElementById('loginSpin');
  const err = document.getElementById('loginError');
  err.style.display = 'none';
  btn.disabled = true; txt.textContent = 'Signing in…'; spn.style.display = '';
  try {
    const { data } = await api('/parent-auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: fd.get('identifier'), password: fd.get('password') })
    });
    saveToken(data.token);
    S.parent = data.parent;
    mountShell();
    if (data.mustChangePassword) showPage('forceChangePage');
    else navigate('dashboard');
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = '';
  } finally {
    btn.disabled = false; txt.textContent = 'Sign In'; spn.style.display = 'none';
  }
});

/* ── FORCE CHANGE PASSWORD FORM ───────────────────────────────────── */
document.getElementById('forceChangeForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const fd  = new FormData(e.target);
  const btn = document.getElementById('fcBtn');
  const txt = document.getElementById('fcBtnText');
  const spn = document.getElementById('fcSpin');
  const err = document.getElementById('fcError');
  err.style.display = 'none';
  const nw   = fd.get('newPassword');
  const conf = fd.get('confirmPassword');
  if (nw !== conf) { err.textContent = 'Passwords do not match'; err.style.display = ''; return; }
  btn.disabled = true; txt.textContent = 'Saving…'; spn.style.display = '';
  try {
    await api('/parent-auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: fd.get('currentPassword'), newPassword: nw })
    });
    if (S.parent) S.parent.mustChangePassword = false;
    toast('Password set! Welcome.');
    navigate('dashboard');
  } catch (ex) {
    err.textContent = ex.message; err.style.display = '';
  } finally {
    btn.disabled = false; txt.textContent = 'Set Password'; spn.style.display = 'none';
  }
});

/* ── BOOT ─────────────────────────────────────────────────────────── */
initApp();
