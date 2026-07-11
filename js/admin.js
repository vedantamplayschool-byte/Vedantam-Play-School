'use strict';
/* ================================================================
   VEDANTAM PLAY SCHOOL — ADMIN PANEL v2.0
   Full SPA: Auth · Dashboard · ERP Modules · CMS · Settings
   ================================================================ */

// ── 1. CONFIG ────────────────────────────────────────────────────
const API = (window.VedantamAPIConfig?.baseUrl || 'http://localhost:5000/api/v1').replace(/\/$/, '');

// ── 2. STATE ─────────────────────────────────────────────────────
const S = {
  token: localStorage.getItem('v_adm_tok') || sessionStorage.getItem('v_adm_tok') || '',
  admin: null,
  page:  'dashboard'
};
const _cache  = {};
const _search = {};

// ── 3. DOM HELPERS ────────────────────────────────────────────────
const $  = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>'"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);

const fmtDate = d => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtCurrency = n => {
  if (n == null || n === '') return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN');
};

const timeAgo = d => {
  if (!d) return '';
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// ── 4. API LAYER ──────────────────────────────────────────────────
async function api(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(S.token ? { Authorization: `Bearer ${S.token}` } : {}),
    ...(opts.headers || {})
  };
  const res  = await fetch(API + path, { ...opts, headers, credentials: 'include' });
  const json = await res.json().catch(() => ({ success: false, message: 'Unexpected server response' }));
  if (!res.ok || json.success === false) {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return json;
}

// ── 5. TOAST ──────────────────────────────────────────────────────
let _toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  clearTimeout(_toastTimer);
  const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
  el.className = `toast toast-${type} show`;
  el.innerHTML = `<span class="material-icons-round">${icons[type] || 'info'}</span>${esc(msg)}`;
  _toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

// ── 6. AUTH HELPERS ───────────────────────────────────────────────
function saveToken(token, remember) {
  S.token = token;
  if (remember) {
    localStorage.setItem('v_adm_tok', token);
    sessionStorage.removeItem('v_adm_tok');
  } else {
    sessionStorage.setItem('v_adm_tok', token);
    localStorage.removeItem('v_adm_tok');
  }
}

function clearToken() {
  S.token = '';
  S.admin = null;
  localStorage.removeItem('v_adm_tok');
  sessionStorage.removeItem('v_adm_tok');
}

function showPage(id) {
  ['loginPage', 'forceChangePage', 'adminShell'].forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = p === id ? '' : 'none';
  });
}

const canAdmin = () => ['super_admin', 'admin', 'principal'].includes(S.admin?.role);
const canEdit  = () => canAdmin() || S.admin?.role === 'office_staff';

// ── 7. SIDEBAR & NAV ──────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: null,
    items: [{ key: 'dashboard', label: 'Dashboard', icon: 'dashboard' }]
  },
  {
    label: 'Students',
    items: [
      { key: 'students',   label: 'All Students', icon: 'child_care' },
      { key: 'parents',    label: 'Parents',       icon: 'family_restroom' },
      { key: 'admissions', label: 'Admissions',   icon: 'assignment' },
      { key: 'enquiries',  label: 'Enquiries',    icon: 'forum' }
    ]
  },
  {
    label: 'Finance',
    items: [
      { key: 'fees', label: 'Fee Management', icon: 'payments', admin: true }
    ]
  },
  {
    label: 'Attendance',
    items: [
      { key: 'attendance', label: 'Attendance', icon: 'how_to_reg' }
    ]
  },
  {
    label: 'Content',
    items: [
      { key: 'gallery',  label: 'Gallery',  icon: 'photo_library' },
      { key: 'teachers', label: 'Teachers', icon: 'school' },
      { key: 'events',   label: 'Events',   icon: 'event' },
      { key: 'notices',  label: 'Notices',  icon: 'campaign' }
    ]
  },
  {
    label: 'Reports',
    items: [
      { key: 'reports', label: 'Reports & Export', icon: 'assessment', admin: true }
    ]
  },
  {
    label: 'More',
    items: [
      { key: 'slides',       label: 'Hero Slides',  icon: 'slideshow',   admin: true },
      { key: 'testimonials', label: 'Testimonials', icon: 'rate_review', admin: true },
      { key: 'newsletter',   label: 'Newsletter',   icon: 'email',       admin: true },
      { key: 'contacts',     label: 'Messages',     icon: 'chat',        admin: true }
    ]
  },
  {
    label: 'Account',
    items: [
      { key: 'sessions', label: 'Academic Sessions', icon: 'calendar_today', admin: true },
      { key: 'settings', label: 'Settings',          icon: 'settings',       admin: true },
      { key: 'profile',  label: 'My Profile',        icon: 'account_circle' }
    ]
  }
];

function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  if (!nav) return;

  let html = '';
  NAV_GROUPS.forEach(group => {
    const visible = group.items.filter(i => !i.admin || canAdmin());
    if (!visible.length) return;
    if (group.label) html += `<div class="nav-section">${esc(group.label)}</div>`;
    visible.forEach(item => {
      html += `<button class="nav-btn${S.page === item.key ? ' active' : ''}"
        data-key="${item.key}" title="${esc(item.label)}">
        <span class="material-icons-round">${item.icon}</span>
        <span>${esc(item.label)}</span>
      </button>`;
    });
  });
  nav.innerHTML = html;
  nav.onclick = e => {
    const btn = e.target.closest('[data-key]');
    if (btn) navigate(btn.dataset.key);
  };

  const userEl = document.getElementById('sidebarUser');
  if (userEl && S.admin) {
    const initials = (S.admin.name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const roleName = (S.admin.role || 'admin').replace(/_/g, ' ');
    userEl.innerHTML = `
      <div class="sidebar-avatar">
        ${S.admin.profilePhoto ? `<img src="${esc(S.admin.profilePhoto)}" alt="">` : initials}
      </div>
      <div style="min-width:0">
        <div class="sidebar-uname">${esc(S.admin.name)}</div>
        <div class="sidebar-role">${esc(roleName)}</div>
      </div>`;
  }

  const av = document.getElementById('topbarAvatar');
  if (av && S.admin) {
    const initials = (S.admin.name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    av.innerHTML = S.admin.profilePhoto ? `<img src="${esc(S.admin.profilePhoto)}" alt="">` : initials;
    av.onclick    = () => navigate('profile');
    av.onkeydown  = e => e.key === 'Enter' && navigate('profile');
  }
}

// ── 8. NAVIGATION ─────────────────────────────────────────────────
function navigate(key) {
  S.page = key;
  history.replaceState(null, '', `#${key}`);

  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.key === key)
  );

  let title = key.charAt(0).toUpperCase() + key.slice(1);
  for (const g of NAV_GROUPS) for (const it of g.items)
    if (it.key === key) { title = it.label; break; }
  document.getElementById('pageTitle').textContent = title;

  closeMobileSidebar();
  closeSearch();

  const area = document.getElementById('contentArea');
  area.innerHTML = '<div class="loader-center"><span class="spin spin-lg"></span></div>';

  const pages = {
    dashboard,
    settings,
    profile,
    sessions:     sessionsPage,
    fees:         feesPage,
    attendance:   attendancePage,
    reports:      reportsPage,
    parents:      parentsPage,
    students:     () => resourcePage(RESOURCES.students),
    admissions:   () => resourcePage(RESOURCES.admissions),
    enquiries:    () => resourcePage(RESOURCES.enquiries),
    gallery:      () => resourcePage(RESOURCES.gallery),
    teachers:     () => resourcePage(RESOURCES.teachers),
    events:       () => resourcePage(RESOURCES.events),
    notices:      () => resourcePage(RESOURCES.notices),
    slides:       () => resourcePage(RESOURCES.slides),
    testimonials: () => resourcePage(RESOURCES.testimonials),
    newsletter:   () => resourcePage(RESOURCES.newsletter),
    contacts:     () => resourcePage(RESOURCES.contacts)
  };

  Promise.resolve((pages[key] || dashboard)()).catch(err => {
    area.innerHTML = `<div class="form-card">
      <div class="alert alert-error">
        <span class="material-icons-round">error</span>
        ${esc(err.message)}
      </div>
    </div>`;
  });
}

window.navigate = navigate;

function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarBackdrop').style.display = '';
  document.body.style.overflow = 'hidden';
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').style.display = 'none';
  document.body.style.overflow = '';
}

// ── 9. GLOBAL SEARCH ─────────────────────────────────────────────
let _searchTimer;

function initGlobalSearch() {
  const inp  = document.getElementById('globalSearch');
  const drop = document.getElementById('searchDrop');
  if (!inp || !drop) return;

  inp.addEventListener('input', () => {
    clearTimeout(_searchTimer);
    const q = inp.value.trim();
    if (q.length < 2) { drop.style.display = 'none'; return; }
    _searchTimer = setTimeout(() => runGlobalSearch(q), 300);
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-global-wrap')) closeSearch();
  });
}

function closeSearch() {
  const drop = document.getElementById('searchDrop');
  const inp  = document.getElementById('globalSearch');
  if (drop) drop.style.display = 'none';
  if (inp)  inp.value = '';
}

async function runGlobalSearch(q) {
  const drop = document.getElementById('searchDrop');
  if (!drop) return;
  drop.style.display = '';
  drop.innerHTML = `<div style="padding:12px;text-align:center;color:var(--txt-sm)">
    <span class="spin"></span> Searching…
  </div>`;

  try {
    const { data } = await api(`/search?q=${encodeURIComponent(q)}`);
    const sections = [
      { key: 'students',   label: 'Students',   icon: 'child_care',    page: 'students'   },
      { key: 'parents',    label: 'Parents',    icon: 'family_restroom',page: 'parents'    },
      { key: 'teachers',   label: 'Teachers',   icon: 'school',        page: 'teachers'   },
      { key: 'admissions', label: 'Admissions', icon: 'assignment',    page: 'admissions' }
    ];

    let html = '';
    let total = 0;
    sections.forEach(s => {
      const items = data[s.key] || [];
      if (!items.length) return;
      total += items.length;
      html += `<div class="sdrop-group">${esc(s.label)}</div>`;
      items.forEach(it => {
        const name = it.studentName || it.name || it.email || '—';
        const sub  = it.admissionNumber || it.phone || it.employeeId || '';
        html += `<button class="sdrop-item" data-sdpage="${s.page}">
          <span class="material-icons-round sdrop-icon">${s.icon}</span>
          <span>
            <span class="sdrop-name">${esc(name)}</span>
            ${sub ? `<span class="sdrop-sub">${esc(sub)}</span>` : ''}
          </span>
        </button>`;
      });
    });

    drop.innerHTML = total
      ? html
      : `<div class="sdrop-empty">No results for "${esc(q)}"</div>`;

    drop.querySelectorAll('[data-sdpage]').forEach(btn => {
      btn.addEventListener('click', () => { navigate(btn.dataset.sdpage); closeSearch(); });
    });
  } catch (err) {
    drop.innerHTML = `<div class="sdrop-empty">Search failed: ${esc(err.message)}</div>`;
  }
}

// ── 10. DASHBOARD ──────────────────────────────────────────────────
async function dashboard() {
  const { data: d } = await api('/dashboard/stats');

  const cards = [
    { label: 'Total Students',      value: d.students,           icon: 'child_care',       cls: 'stat-blue',   note: `${d.todayAdmissions || 0} enrolled today` },
    { label: 'Total Parents',        value: d.parents,            icon: 'family_restroom',  cls: 'stat-purple', note: 'Registered families' },
    { label: 'Pending Admissions',   value: d.pendingAdmissions,  icon: 'pending_actions',  cls: 'stat-amber',  note: 'Awaiting review' },
    { label: 'Approved Admissions',  value: d.approvedAdmissions, icon: 'check_circle',     cls: 'stat-green',  note: 'All time' },
    { label: 'Monthly Collection',   value: fmtCurrency(d.monthlyCollection), icon: 'account_balance_wallet', cls: 'stat-teal',   note: new Date().toLocaleString('en-IN',{month:'long',year:'numeric'}) },
    { label: "Today's Collection",   value: fmtCurrency(d.todayCollection),   icon: 'payments',               cls: 'stat-green',  note: 'Fee received today' },
    { label: 'Fee Due (Records)',     value: d.feeDue,             icon: 'receipt_long',     cls: 'stat-red',    note: 'Balance pending' },
    { label: 'Active Teachers',       value: d.teachers,           icon: 'school',           cls: 'stat-orange', note: 'Staff members' }
  ];

  const statsHtml = cards.map(c => `
    <div class="stat-card ${c.cls}">
      <div>
        <div class="stat-label">${esc(c.label)}</div>
        <div class="stat-value">${c.value ?? 0}</div>
        <div class="stat-note">${esc(c.note)}</div>
      </div>
      <div class="stat-icon"><span class="material-icons-round">${c.icon}</span></div>
    </div>`).join('');

  // Birthdays today
  const bdays = d.birthdaysToday || [];
  const birthdayHtml = bdays.length
    ? bdays.map(s => `
        <div class="act-item">
          <div class="act-dot dot-birthday">
            <span class="material-icons-round">cake</span>
          </div>
          <div class="act-info">
            <div class="act-label">${esc(s.studentName)}</div>
            <div class="act-sub">${esc(s.program || '')}</div>
          </div>
          <div class="act-time">🎂</div>
        </div>`).join('')
    : `<div class="empty-state" style="padding:16px">
        <span class="material-icons-round empty-icon" style="font-size:28px">cake</span>
        <p class="empty-sub">No birthdays today</p>
       </div>`;

  const dotCls  = { admission:'dot-admission', contact:'dot-contact', student:'dot-student', enquiry:'dot-enquiry', notice:'dot-notice', fee:'dot-fee' };
  const dotIcon = { admission:'assignment', contact:'chat', student:'child_care', enquiry:'forum', notice:'campaign', fee:'payments' };

  const actHtml = (d.activityFeed || []).length
    ? d.activityFeed.map(a => `
        <div class="act-item">
          <div class="act-dot ${dotCls[a.type] || 'dot-admission'}">
            <span class="material-icons-round">${dotIcon[a.type] || 'circle'}</span>
          </div>
          <div class="act-info">
            <div class="act-label">${esc(a.label)}</div>
            ${a.sub ? `<div class="act-sub">${esc(a.sub)}</div>` : ''}
          </div>
          <div class="act-time">${timeAgo(a.time)}</div>
        </div>`).join('')
    : `<div class="empty-state"><span class="material-icons-round empty-icon">inbox</span><p class="empty-title">No recent activity</p></div>`;

  const recentAdmHtml = (d.recentAdmissions || []).length
    ? `<table>
        <thead><tr><th>Student</th><th>Program</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${d.recentAdmissions.map(r => `
          <tr>
            <td><div class="td-main">${esc(r.studentName)}</div>
                <div class="td-sub">${esc(r.parentName)}</div></td>
            <td>${esc(r.program)}</td>
            <td><span class="badge badge-${(r.status || '').toLowerCase()}">${esc(r.status)}</span></td>
            <td>${fmtDate(r.createdAt)}</td>
          </tr>`).join('')}
        </tbody>
       </table>`
    : `<div class="empty-state"><span class="material-icons-round empty-icon">assignment</span><p class="empty-sub">No admissions yet</p></div>`;

  const activeSession = d.activeSession;

  const qaItems = [
    { label: 'Add Student',     icon: 'child_care',          page: 'students',   newForm: true },
    { label: 'Add Parent',      icon: 'family_restroom',     page: 'parents',    newForm: true },
    { label: 'Collect Fee',     icon: 'payments',            page: 'fees',       newForm: false },
    { label: 'Mark Attendance', icon: 'how_to_reg',          page: 'attendance', newForm: false },
    { label: 'Create Notice',   icon: 'campaign',            page: 'notices',    newForm: true },
    { label: 'View Reports',    icon: 'assessment',          page: 'reports',    newForm: false }
  ];

  document.getElementById('contentArea').innerHTML = `
    ${activeSession ? `
    <div class="alert alert-info" style="margin-bottom:16px;display:flex;align-items:center;gap:8px">
      <span class="material-icons-round">calendar_today</span>
      <strong>Active Session:</strong>&nbsp;${esc(activeSession.name)}
      &nbsp;·&nbsp;${fmtDate(activeSession.startDate)} – ${fmtDate(activeSession.endDate)}
    </div>` : ''}

    <div class="stats-grid">${statsHtml}</div>

    <div class="quick-actions">
      ${qaItems.map(q => `
        <button class="qa-btn" data-qa="${q.page}" data-qa-new="${q.newForm}">
          <span class="material-icons-round">${q.icon}</span>
          ${esc(q.label)}
        </button>`).join('')}
    </div>

    <div class="row-2">
      <div class="card">
        <div class="card-head">
          <span class="card-title">Recent Admissions</span>
          <button class="btn btn-secondary btn-sm" onclick="navigate('admissions')">View All</button>
        </div>
        <div class="table-wrap">${recentAdmHtml}</div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Recent Activity</span></div>
        <div class="card-body"><div class="activity-list">${actHtml}</div></div>
      </div>
    </div>

    <div class="row-2">
      <div class="card">
        <div class="card-head"><span class="card-title">Today's Birthdays 🎂</span></div>
        <div class="card-body"><div class="activity-list">${birthdayHtml}</div></div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Quick Stats</span></div>
        <div class="card-body">
          <div style="display:grid;gap:12px">
            ${[
              ['Waiting List',      d.waitingAdmissions || 0, 'hourglass_top',           'var(--amber)'],
              ['Upcoming Events',   d.upcomingEvents    || 0, 'event',                    'var(--blue)'],
              ['Unread Messages',   d.unreadMessages    || 0, 'mark_unread_chat_alt',     'var(--err)'],
              ['Total Enquiries',   d.enquiries         || 0, 'forum',                    'var(--purple)'],
              ['Gallery Photos',    d.gallery           || 0, 'photo_library',            'var(--teal)'],
              ['Newsletter Subs',   d.subscribers       || 0, 'email',                    'var(--green)']
            ].map(([label, val, icon, color]) => `
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--bd)">
                <span class="material-icons-round" style="color:${color};font-size:20px">${icon}</span>
                <span style="flex:1;font-size:14px;color:var(--txt-sm)">${esc(label)}</span>
                <span style="font-weight:700;font-size:15px">${val}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;

  document.querySelectorAll('[data-qa]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.dataset.qa);
      if (btn.dataset.qaNew === 'true') {
        setTimeout(() => document.getElementById('newBtn')?.click(), 300);
      }
    });
  });
}

// ── 11. RESOURCE CONFIGS ───────────────────────────────────────────
const PROGRAMS = ['Play Group', 'Nursery', 'LKG', 'UKG'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const RESOURCES = {
  students: {
    label: 'Students', endpoint: '/students',
    getTitle: r => r.studentName,
    getSubtitle: r => `${r.parentName} · ${r.phone}`,
    badge: r => {
      const st = r.status || (r.isActive !== false ? 'Active' : 'Inactive');
      const cls = st === 'Active' ? 'badge-active' : st === 'Transferred' ? 'badge-approved' : 'badge-inactive';
      return { text: st, cls };
    },
    columns: ['', 'Student', 'Adm. No.', 'Parent / Phone', 'Program', 'Status', 'Admitted', 'Actions'],
    renderCells: r => `
      <td>${r.photoUrl ? `<img class="thumb" src="${esc(r.photoUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td>
        <div class="td-main">${esc(r.studentName)}</div>
        ${r.gender ? `<div class="td-sub">${esc(r.gender)}</div>` : ''}
      </td>
      <td style="font-family:monospace;font-size:12px">${esc(r.admissionNumber || '—')}</td>
      <td>
        <div>${esc(r.parentName)}</div>
        <div class="td-sub">${esc(r.phone)}</div>
      </td>
      <td>${esc(r.program)}</td>`,
    hasImage: true,
    studentActions: true,
    fields: [
      { name: 'studentName',  label: 'Student Name',    type: 'text',     required: true },
      { name: 'parentName',   label: 'Parent Name',     type: 'text',     required: true },
      { name: 'phone',        label: 'Phone',           type: 'tel',      required: true },
      { name: 'program',      label: 'Program',         type: 'select',   required: true, options: PROGRAMS },
      { name: 'gender',       label: 'Gender',          type: 'select',   options: ['Male', 'Female', 'Other'] },
      { name: 'dateOfBirth',  label: 'Date of Birth',   type: 'date' },
      { name: 'admissionDate',label: 'Admission Date',  type: 'date' },
      { name: 'bloodGroup',   label: 'Blood Group',     type: 'select',   options: BLOOD_GROUPS },
      { name: 'religion',     label: 'Religion',        type: 'text' },
      { name: 'category',     label: 'Category',        type: 'select',   options: ['General', 'OBC', 'SC', 'ST', 'Minority'] },
      { name: 'section',      label: 'Section',         type: 'text' },
      { name: 'rollNumber',   label: 'Roll Number',     type: 'text' },
      { name: 'address',      label: 'Address',         type: 'textarea', wide: true },
      { name: 'medicalNotes', label: 'Medical Notes',   type: 'textarea', wide: true },
      { name: 'photo',        label: 'Student Photo',   type: 'file',     wide: true },
      { name: 'status',       label: 'Status',          type: 'select',   options: ['Active', 'Inactive', 'Transferred', 'Graduated', 'Dropped'] },
      { name: 'notes',        label: 'Notes',           type: 'textarea', wide: true }
    ]
  },

  admissions: {
    label: 'Admissions', endpoint: '/admissions',
    getTitle: r => r.studentName,
    getSubtitle: r => `${r.parentName} · ${r.phone}`,
    badge: r => ({ text: r.status, cls: `badge-${(r.status || '').toLowerCase()}` }),
    columns: ['Student', 'Parent / Phone', 'Program', 'Age', 'Status', 'Date', 'Actions'],
    renderCells: r => `
      <td>
        <div class="td-main">${esc(r.studentName)}</div>
        <div class="td-sub">${esc(r.email || '')}</div>
      </td>
      <td>
        <div>${esc(r.parentName)}</div>
        <div class="td-sub">${esc(r.phone)}</div>
      </td>
      <td>${esc(r.program)}</td>
      <td>${esc(r.age || '—')}</td>`,
    noCreate: true,
    admissionActions: true,
    fields: [
      { name: 'studentName', label: 'Student Name', type: 'text',    required: true },
      { name: 'parentName',  label: 'Parent Name',  type: 'text',    required: true },
      { name: 'phone',       label: 'Phone',        type: 'tel',     required: true },
      { name: 'email',       label: 'Email',        type: 'email' },
      { name: 'age',         label: 'Age',          type: 'text',    required: true },
      { name: 'gender',      label: 'Gender',       type: 'select',  options: ['Male', 'Female', 'Other'] },
      { name: 'program',     label: 'Program',      type: 'select',  required: true, options: PROGRAMS },
      { name: 'message',     label: 'Notes',        type: 'textarea', wide: true }
    ]
  },

  enquiries: {
    label: 'Enquiries', endpoint: '/enquiries',
    getTitle: r => r.name,
    getSubtitle: r => r.phone,
    badge: r => ({
      text: r.status,
      cls: r.status === 'New' ? 'badge-new' : r.status === 'Contacted' ? 'badge-contacted' : 'badge-closed'
    }),
    columns: ['Name', 'Contact', 'Program', 'Status', 'Date', 'Actions'],
    renderCells: r => `
      <td><div class="td-main">${esc(r.name)}</div></td>
      <td><div>${esc(r.phone)}</div><div class="td-sub">${esc(r.email || '')}</div></td>
      <td>${esc(r.program || 'General')}</td>`,
    noCreate: true,
    statusOptions: ['New', 'Contacted', 'Closed'],
    fields: [
      { name: 'name',    label: 'Name',    type: 'text',    required: true },
      { name: 'phone',   label: 'Phone',   type: 'tel',     required: true },
      { name: 'email',   label: 'Email',   type: 'email' },
      { name: 'program', label: 'Program', type: 'select',  options: [...PROGRAMS, 'General'] },
      { name: 'message', label: 'Message', type: 'textarea', wide: true },
      { name: 'status',  label: 'Status',  type: 'select',  options: ['New', 'Contacted', 'Closed'] }
    ]
  },

  gallery: {
    label: 'Gallery', endpoint: '/gallery',
    getTitle: r => r.title,
    getSubtitle: r => r.category,
    badge: r => ({ text: r.isFeatured ? 'Featured' : 'Active', cls: r.isFeatured ? 'badge-approved' : 'badge-default' }),
    columns: ['Photo', 'Title', 'Category', 'Status', 'Date', 'Actions'],
    hasImage: true,
    renderCells: r => `
      <td>${r.imageUrl ? `<img class="thumb" src="${esc(r.imageUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td><div class="td-main">${esc(r.title)}</div></td>
      <td>${esc(r.category || '')}</td>`,
    fields: [
      { name: 'title',        label: 'Title',         type: 'text',     required: true },
      { name: 'category',     label: 'Category',      type: 'text' },
      { name: 'description',  label: 'Description',   type: 'textarea', wide: true },
      { name: 'image',        label: 'Photo',         type: 'file',     wide: true },
      { name: 'isFeatured',   label: 'Featured',      type: 'boolean' },
      { name: 'displayOrder', label: 'Display Order', type: 'number' }
    ]
  },

  teachers: {
    label: 'Teachers', endpoint: '/teachers',
    getTitle: r => r.name,
    getSubtitle: r => r.qualification,
    badge: r => ({ text: r.isActive !== false ? 'Active' : 'Inactive', cls: r.isActive !== false ? 'badge-active' : 'badge-inactive' }),
    columns: ['Photo', 'Name', 'Designation', 'Qualification', 'Status', 'Actions'],
    hasImage: true,
    renderCells: r => `
      <td>${r.photoUrl || r.imageUrl ? `<img class="thumb" src="${esc(r.photoUrl || r.imageUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td>
        <div class="td-main">${esc(r.name)}</div>
        ${r.employeeId ? `<div class="td-sub" style="font-family:monospace">${esc(r.employeeId)}</div>` : ''}
      </td>
      <td>${esc(r.designation || r.experience || '')}</td>
      <td>${esc(r.qualification || '')}</td>`,
    fields: [
      { name: 'name',          label: 'Full Name',      type: 'text',     required: true },
      { name: 'qualification', label: 'Qualification',  type: 'text',     required: true },
      { name: 'designation',   label: 'Designation',    type: 'text' },
      { name: 'department',    label: 'Department',     type: 'text' },
      { name: 'phone',         label: 'Phone',          type: 'tel' },
      { name: 'email',         label: 'Email',          type: 'email' },
      { name: 'gender',        label: 'Gender',         type: 'select',   options: ['Male', 'Female', 'Other'] },
      { name: 'dateOfBirth',   label: 'Date of Birth',  type: 'date' },
      { name: 'joiningDate',   label: 'Joining Date',   type: 'date' },
      { name: 'salary',        label: 'Salary (₹)',     type: 'number' },
      { name: 'experience',    label: 'Experience',     type: 'text' },
      { name: 'description',   label: 'About',          type: 'textarea', wide: true },
      { name: 'image',         label: 'Photo',          type: 'file',     wide: true },
      { name: 'displayOrder',  label: 'Display Order',  type: 'number' },
      { name: 'isActive',      label: 'Active',         type: 'boolean' }
    ]
  },

  events: {
    label: 'Events', endpoint: '/events',
    getTitle: r => r.title,
    getSubtitle: r => r.location,
    badge: r => ({ text: r.isPublished !== false ? 'Published' : 'Draft', cls: r.isPublished !== false ? 'badge-approved' : 'badge-inactive' }),
    columns: ['Photo', 'Event', 'Location', 'Date', 'Status', 'Actions'],
    hasImage: true,
    renderCells: r => `
      <td>${r.imageUrl ? `<img class="thumb" src="${esc(r.imageUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td><div class="td-main">${esc(r.title)}</div></td>
      <td>${esc(r.location || '')}</td>
      <td>${fmtDate(r.eventDate)}</td>`,
    fields: [
      { name: 'title',       label: 'Event Title',  type: 'text',     required: true },
      { name: 'location',    label: 'Location',     type: 'text' },
      { name: 'eventDate',   label: 'Event Date',   type: 'date' },
      { name: 'description', label: 'Description',  type: 'textarea', wide: true },
      { name: 'image',       label: 'Banner Image', type: 'file',     wide: true },
      { name: 'isFeatured',  label: 'Featured',     type: 'boolean' },
      { name: 'isPublished', label: 'Published',    type: 'boolean' }
    ]
  },

  notices: {
    label: 'Notices', endpoint: '/notices',
    getTitle: r => r.title,
    getSubtitle: r => r.priority || 'Normal',
    badge: r => ({ text: r.isPublished !== false ? 'Published' : 'Draft', cls: r.isPublished !== false ? 'badge-approved' : 'badge-inactive' }),
    columns: ['Title', 'Priority', 'Publish Date', 'Expires', 'Status', 'Actions'],
    renderCells: r => `
      <td>
        <div class="td-main">${esc(r.title)}</div>
        <div class="td-sub" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${esc((r.body || '').slice(0, 80))}
        </div>
      </td>
      <td><span class="badge badge-default">${esc(r.priority || 'Normal')}</span></td>
      <td>${fmtDate(r.publishDate)}</td>
      <td>${fmtDate(r.expiresAt)}</td>`,
    fields: [
      { name: 'title',       label: 'Title',          type: 'text',     required: true, wide: true },
      { name: 'body',        label: 'Notice Content', type: 'textarea', required: true, wide: true },
      { name: 'priority',    label: 'Priority',       type: 'select',   options: ['Normal', 'Important', 'Urgent'] },
      { name: 'publishDate', label: 'Publish Date',   type: 'date' },
      { name: 'expiresAt',   label: 'Expires At',     type: 'date' },
      { name: 'isPublished', label: 'Published',      type: 'boolean' }
    ]
  },

  slides: {
    label: 'Hero Slides', endpoint: '/hero-slides',
    getTitle: r => r.title,
    getSubtitle: r => r.subtitle,
    badge: r => ({ text: r.isActive !== false ? 'Active' : 'Inactive', cls: r.isActive !== false ? 'badge-active' : 'badge-inactive' }),
    columns: ['Photo', 'Title', 'Subtitle', 'Order', 'Status', 'Actions'],
    hasImage: true,
    renderCells: r => `
      <td>${r.imageUrl ? `<img class="thumb" src="${esc(r.imageUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td><div class="td-main">${esc(r.title)}</div></td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.subtitle || '')}</td>
      <td>${esc(r.displayOrder ?? '')}</td>`,
    fields: [
      { name: 'title',        label: 'Title',       type: 'text',     required: true },
      { name: 'subtitle',     label: 'Subtitle',    type: 'textarea', wide: true },
      { name: 'badge',        label: 'Badge Text',  type: 'text' },
      { name: 'ctaText',      label: 'Button Text', type: 'text' },
      { name: 'ctaLink',      label: 'Button Link', type: 'text' },
      { name: 'image',        label: 'Slide Image', type: 'file',     wide: true },
      { name: 'displayOrder', label: 'Order',       type: 'number' },
      { name: 'isActive',     label: 'Active',      type: 'boolean' }
    ]
  },

  testimonials: {
    label: 'Testimonials', endpoint: '/testimonials',
    getTitle: r => r.parentName,
    getSubtitle: r => `Student: ${r.studentName}`,
    badge: r => ({ text: r.isPublished !== false ? 'Published' : 'Draft', cls: r.isPublished !== false ? 'badge-approved' : 'badge-inactive' }),
    columns: ['Photo', 'Parent', 'Student', 'Message', 'Status', 'Actions'],
    hasImage: true,
    renderCells: r => `
      <td>${r.imageUrl ? `<img class="thumb" src="${esc(r.imageUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td><div class="td-main">${esc(r.parentName)}</div></td>
      <td>${esc(r.studentName || '')}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${esc(r.message || '')}</td>`,
    fields: [
      { name: 'parentName',   label: 'Parent Name',  type: 'text',     required: true },
      { name: 'studentName',  label: 'Student Name', type: 'text',     required: true },
      { name: 'message',      label: 'Message',      type: 'textarea', required: true, wide: true },
      { name: 'image',        label: 'Photo',        type: 'file',     wide: true },
      { name: 'rating',       label: 'Rating (1–5)', type: 'number' },
      { name: 'displayOrder', label: 'Order',        type: 'number' },
      { name: 'isPublished',  label: 'Published',    type: 'boolean' }
    ]
  },

  newsletter: {
    label: 'Newsletter Subscribers', endpoint: '/newsletter',
    getTitle: r => r.email,
    badge: r => ({ text: r.isActive !== false ? 'Subscribed' : 'Unsubscribed', cls: r.isActive !== false ? 'badge-active' : 'badge-inactive' }),
    columns: ['Email', 'Status', 'Subscribed On', 'Actions'],
    noCreate: true,
    renderCells: r => `<td><div class="td-main">${esc(r.email)}</div></td>`,
    fields: [
      { name: 'isActive', label: 'Active', type: 'boolean' }
    ]
  },

  contacts: {
    label: 'Contact Messages', endpoint: '/contacts',
    getTitle: r => r.name,
    getSubtitle: r => r.email || r.phone,
    badge: r => ({ text: r.status, cls: r.status === 'New' ? 'badge-new' : 'badge-read' }),
    columns: ['Name', 'Contact', 'Subject', 'Message', 'Status', 'Date', 'Actions'],
    noCreate: true,
    renderCells: r => `
      <td><div class="td-main">${esc(r.name)}</div></td>
      <td><div>${esc(r.email || '')}</div><div class="td-sub">${esc(r.phone || '')}</div></td>
      <td>${esc(r.subject || '')}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${esc((r.message || '').slice(0, 80))}</td>`,
    fields: [
      { name: 'status', label: 'Status', type: 'select', options: ['New', 'Read', 'Closed'] }
    ]
  }
};

// ── 12. RESOURCE PAGE ──────────────────────────────────────────────
async function resourcePage(config) {
  const key    = Object.keys(RESOURCES).find(k => RESOURCES[k] === config);
  const search = _search[key] || '';
  const params = new URLSearchParams({ limit: 100, sort: '-createdAt' });
  if (search) params.set('search', search);

  const { data } = await api(`${config.endpoint}?${params}`);
  _cache[key] = data;

  const showNew    = !config.noCreate && canEdit();
  const showDelete = canAdmin();
  const showEdit   = canEdit();

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">${esc(config.label)}</div>
        <div class="page-header-sub">${data.length} record${data.length !== 1 ? 's' : ''}</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${showNew ? `<button class="btn btn-primary" id="newBtn">
          <span class="material-icons-round" style="font-size:18px">add</span> Add New
        </button>` : ''}
        <button class="btn btn-secondary" id="exportBtn">
          <span class="material-icons-round" style="font-size:18px">download</span> Export CSV
        </button>
      </div>
    </div>
    <div id="formHost"></div>
    <div class="card">
      <div class="card-head" style="padding:12px 16px">
        <div class="table-toolbar" style="width:100%;margin:0;border:none;gap:8px">
          <div class="search-wrap">
            <span class="material-icons-round">search</span>
            <input class="search-input" id="searchBox"
              placeholder="Search ${esc(config.label.toLowerCase())}…"
              value="${esc(search)}">
          </div>
          <button class="btn btn-secondary btn-sm" id="searchBtn">Search</button>
        </div>
      </div>
      <div class="table-wrap">${buildTable(key, config, data, showEdit, showDelete)}</div>
    </div>`;

  if (showNew) document.getElementById('newBtn').addEventListener('click', () => openForm(key, config, null));
  document.getElementById('exportBtn').addEventListener('click', () => exportCSV(key, data));
  document.getElementById('searchBtn').addEventListener('click', () => {
    _search[key] = document.getElementById('searchBox').value.trim();
    navigate(key);
  });
  document.getElementById('searchBox').addEventListener('keydown', e => {
    if (e.key === 'Enter') { _search[key] = e.target.value.trim(); navigate(key); }
  });
}

function buildTable(key, config, items, showEdit, showDelete) {
  if (!items.length) {
    return `<div class="empty-state">
      <span class="material-icons-round empty-icon">inbox</span>
      <p class="empty-title">No records found</p>
      <p class="empty-sub">Use the Add New button to create the first ${config.label.toLowerCase()} record.</p>
    </div>`;
  }
  const cols = config.columns.map(c => `<th>${esc(c)}</th>`).join('');
  const rows = items.map(item => buildRow(key, config, item, showEdit, showDelete)).join('');
  return `<table><thead><tr>${cols}</tr></thead><tbody>${rows}</tbody></table>`;
}

function buildRow(key, config, item, showEdit, showDelete) {
  const id  = item._id;
  const bdg = config.badge(item);

  let customCells = '';
  if (config.renderCells) customCells = config.renderCells(item);

  const badgeTd = `<td><span class="badge ${bdg.cls}">${esc(bdg.text)}</span></td>`;
  const dateTd  = `<td>${fmtDate(item.createdAt)}</td>`;

  let acts = '<td class="td-actions">';

  // Admission workflow actions
  if (key === 'admissions' && canEdit()) {
    const st = item.status;
    if (st === 'Pending') {
      acts += `<button class="btn btn-secondary btn-sm" data-action="verify" data-id="${id}" title="Verify">
        <span class="material-icons-round" style="font-size:13px">verified</span> Verify
      </button>`;
    }
    if (st === 'Pending' || st === 'Verified') {
      acts += `<button class="btn btn-success btn-sm" data-action="approve" data-id="${id}">Approve</button>`;
      acts += `<button class="btn btn-secondary btn-sm" data-action="waiting" data-id="${id}" title="Waiting List">Wait</button>`;
      acts += `<button class="btn btn-danger btn-sm" data-action="reject" data-id="${id}">Reject</button>`;
    }
    if (st === 'Approved') {
      acts += `<button class="btn btn-primary btn-sm" data-action="convert" data-id="${id}" title="Convert to Student">
        <span class="material-icons-round" style="font-size:13px">person_add</span> Enroll
      </button>`;
    }
  }

  // Student archive/restore
  if (key === 'students' && canAdmin()) {
    if (item.isActive !== false && (item.status === 'Active' || !item.status)) {
      acts += `<button class="btn btn-secondary btn-sm" data-action="archive" data-id="${id}" title="Archive student">
        <span class="material-icons-round" style="font-size:13px">archive</span>
      </button>`;
    } else if (item.isActive === false || item.status === 'Inactive') {
      acts += `<button class="btn btn-success btn-sm" data-action="restore" data-id="${id}" title="Restore student">
        <span class="material-icons-round" style="font-size:13px">unarchive</span>
      </button>`;
    }
  }

  // Enquiry status cycle
  if (key === 'enquiries' && canEdit()) {
    const opts = (config.statusOptions || []).filter(s => s !== item.status);
    if (opts[0]) acts += `<button class="btn btn-secondary btn-sm" data-action="setstatus" data-id="${id}" data-status="${opts[0]}">→ ${esc(opts[0])}</button>`;
  }

  // Contact mark-read
  if (key === 'contacts' && item.status === 'New' && canEdit()) {
    acts += `<button class="btn btn-secondary btn-sm" data-action="setstatus" data-id="${id}" data-status="Read">Mark Read</button>`;
  }

  // Edit / Delete
  if (showEdit && !config.noCreate) {
    acts += `<button class="btn btn-secondary btn-sm" data-action="edit" data-id="${id}" title="Edit">
      <span class="material-icons-round" style="font-size:14px">edit</span>
    </button>`;
  }
  if (showDelete) {
    acts += `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${id}" title="Delete">
      <span class="material-icons-round" style="font-size:14px">delete</span>
    </button>`;
  }
  acts += '</td>';

  const skipDate = ['slides', 'testimonials', 'teachers', 'gallery'].includes(key);
  return `<tr>${customCells}${badgeTd}${skipDate ? '' : dateTd}${acts}</tr>`;
}

// ── 13. FORM ───────────────────────────────────────────────────────
function openForm(key, config, id) {
  const host = document.getElementById('formHost');
  const item = id ? (_cache[key] || []).find(x => x._id === id) || {} : {};
  const isEdit = !!id;

  host.innerHTML = `
    <div class="form-card" id="editPanel">
      <h2>${isEdit ? 'Edit' : 'Add New'} ${esc(config.label)}</h2>
      <form id="editForm" novalidate>
        <div class="form-grid">
          ${config.fields.map(f => renderField(f, item[f.name])).join('')}
          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="saveBtn">
              <span id="saveTxt">Save</span>
              <span id="saveSpin" class="btn-loader" style="display:none"><span class="spin"></span></span>
            </button>
            <button type="button" class="btn btn-secondary" id="cancelFormBtn">Cancel</button>
          </div>
          <div class="col-full" id="formMsg"></div>
        </div>
      </form>
    </div>`;

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('cancelFormBtn').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('editForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('saveBtn');
    const txt  = document.getElementById('saveTxt');
    const spin = document.getElementById('saveSpin');
    const msg  = document.getElementById('formMsg');
    btn.disabled = true; txt.style.display = 'none'; spin.style.display = '';
    try {
      const fd = new FormData(e.target);
      for (const [k, v] of [...fd.entries()]) {
        if (v instanceof File && !v.name) fd.delete(k);
      }
      const method   = id ? 'PATCH' : 'POST';
      const endpoint = `${config.endpoint}${id ? '/' + id : ''}`;
      await api(endpoint, { method, body: fd });
      host.innerHTML = '';
      toast(`${config.label} ${id ? 'updated' : 'created'} successfully!`, 'success');
      navigate(key);
    } catch (err) {
      msg.innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false; txt.style.display = ''; spin.style.display = 'none';
    }
  });
}

function renderField(f, value) {
  const wrapCls = f.wide ? 'form-group col-full' : 'form-group';
  const req     = f.required ? 'required' : '';
  const reqMark = f.required ? ' <span style="color:var(--err)">*</span>' : '';
  const label   = `<label class="form-label" for="ff_${f.name}">${esc(f.label)}${reqMark}</label>`;

  if (f.type === 'file') {
    const preview = value ? `<img src="${esc(value)}" alt="" style="height:58px;margin-top:8px;border-radius:8px;object-fit:cover">` : '';
    return `<div class="${wrapCls}">${label}
      <input id="ff_${f.name}" name="${f.name}" type="file" accept="image/*" class="form-input" style="padding:8px">
      ${preview}
    </div>`;
  }
  if (f.type === 'textarea') {
    return `<div class="${wrapCls}">${label}
      <textarea id="ff_${f.name}" name="${f.name}" class="form-textarea" ${req}>${esc(value ?? '')}</textarea>
    </div>`;
  }
  if (f.type === 'select') {
    const opts = (f.options || []).map(o => `<option value="${esc(o)}" ${String(value) === String(o) ? 'selected' : ''}>${esc(o)}</option>`).join('');
    return `<div class="${wrapCls}">${label}
      <select id="ff_${f.name}" name="${f.name}" class="form-select" ${req}>
        <option value="">— Select —</option>${opts}
      </select>
    </div>`;
  }
  if (f.type === 'boolean') {
    return `<div class="${wrapCls}">${label}
      <select id="ff_${f.name}" name="${f.name}" class="form-select">
        <option value="true"  ${value !== false ? 'selected' : ''}>Yes</option>
        <option value="false" ${value === false  ? 'selected' : ''}>No</option>
      </select>
    </div>`;
  }
  const inputType = f.type || 'text';
  const val = inputType === 'date' && value ? new Date(value).toISOString().slice(0, 10) : (value ?? '');
  return `<div class="${wrapCls}">${label}
    <input id="ff_${f.name}" name="${f.name}" type="${inputType}" value="${esc(val)}" class="form-input" ${req}>
  </div>`;
}

async function confirmDelete(key, config, id) {
  if (!confirm(`Delete this ${config.label.toLowerCase()} record?\n\nThis action cannot be undone.`)) return;
  try {
    await api(`${config.endpoint}/${id}`, { method: 'DELETE' });
    toast('Record deleted successfully', 'success');
    navigate(key);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function updateAdmStatus(id, status) {
  try {
    await api(`/admissions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`Admission ${status.toLowerCase()} successfully`, 'success');
    navigate('admissions');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function convertAdmission(admissionId) {
  if (!confirm('Convert this admission to an enrolled student?\n\nA student profile will be created.')) return;
  try {
    await api(`/students/convert-admission/${admissionId}`, { method: 'POST' });
    toast('Student enrolled successfully!', 'success');
    navigate('students');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function archiveStudent(id) {
  if (!confirm('Archive this student? They will be marked Inactive.')) return;
  try {
    await api(`/students/${id}/archive`, { method: 'POST' });
    toast('Student archived', 'info');
    navigate('students');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function restoreStudent(id) {
  try {
    await api(`/students/${id}/restore`, { method: 'POST' });
    toast('Student restored to Active', 'success');
    navigate('students');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function updateItemStatus(endpoint, id, status, key) {
  try {
    await api(`${endpoint}/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`Status updated to "${status}"`, 'success');
    navigate(key);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function exportCSV(key, items) {
  if (!items.length) { toast('No data to export', 'info'); return; }
  const cols = Object.keys(items[0]).filter(k => k !== '__v');
  const csv  = [cols, ...items.map(o => cols.map(k => `"${String(o[k] ?? '').replace(/"/g, '""')}"`))]
    .map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${key}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV exported successfully', 'success');
}

// ── 14. PARENTS PAGE ──────────────────────────────────────────────
async function parentsPage() {
  const search = _search['parents'] || '';
  const params = new URLSearchParams({ limit: 100, sort: '-createdAt' });
  if (search) params.set('search', search);

  const { data } = await api(`/parents?${params}`);
  _cache['parents'] = data;

  const showNew    = canEdit();
  const showDelete = canAdmin();

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">Parents / Guardians</div>
        <div class="page-header-sub">${data.length} record${data.length !== 1 ? 's' : ''}</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${showNew ? `<button class="btn btn-primary" id="newParentBtn">
          <span class="material-icons-round" style="font-size:18px">add</span> Add Parent
        </button>` : ''}
        <button class="btn btn-secondary" id="exportParentBtn">
          <span class="material-icons-round" style="font-size:18px">download</span> Export CSV
        </button>
      </div>
    </div>
    <div id="parentFormHost"></div>
    <div class="card">
      <div class="card-head" style="padding:12px 16px">
        <div class="table-toolbar" style="width:100%;margin:0;border:none;gap:8px">
          <div class="search-wrap">
            <span class="material-icons-round">search</span>
            <input class="search-input" id="parentSearch" placeholder="Search parents…" value="${esc(search)}">
          </div>
          <button class="btn btn-secondary btn-sm" id="parentSearchBtn">Search</button>
        </div>
      </div>
      <div class="table-wrap">${buildParentsTable(data, showDelete)}</div>
    </div>`;

  if (showNew) {
    document.getElementById('newParentBtn').addEventListener('click', () => openParentForm(null));
  }
  document.getElementById('exportParentBtn').addEventListener('click', () => exportCSV('parents', data));
  document.getElementById('parentSearchBtn').addEventListener('click', () => {
    _search['parents'] = document.getElementById('parentSearch').value.trim();
    parentsPage();
  });
  document.getElementById('parentSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') { _search['parents'] = e.target.value.trim(); parentsPage(); }
  });

  document.getElementById('contentArea').addEventListener('click', async e => {
    const btn = e.target.closest('[data-parent-action]');
    if (!btn) return;
    const { parentAction, id } = btn.dataset;
    if (parentAction === 'edit')   openParentForm(id);
    if (parentAction === 'delete') {
      if (!confirm('Delete this parent record? This cannot be undone.')) return;
      try {
        await api(`/parents/${id}`, { method: 'DELETE' });
        toast('Parent deleted', 'success');
        parentsPage();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

function buildParentsTable(items, showDelete) {
  if (!items.length) return `<div class="empty-state">
    <span class="material-icons-round empty-icon">family_restroom</span>
    <p class="empty-title">No parents found</p>
    <p class="empty-sub">Add a parent record to get started.</p>
  </div>`;

  const rows = items.map(p => {
    const fatherName = p.father?.name || '—';
    const motherName = p.mother?.name || p.guardian?.name || '—';
    const phone      = p.father?.phone || p.mother?.phone || p.guardian?.phone || '—';
    const children   = (p.students || []).length;
    return `<tr>
      <td>
        <div class="td-main">${esc(fatherName)}</div>
        <div class="td-sub">${esc(motherName)}</div>
      </td>
      <td>${esc(phone)}</td>
      <td>${esc(p.father?.email || p.mother?.email || '—')}</td>
      <td style="text-align:center">
        <span class="badge badge-default">${children} child${children !== 1 ? 'ren' : ''}</span>
      </td>
      <td>${esc(p.address?.city || '—')}</td>
      <td>${fmtDate(p.createdAt)}</td>
      <td class="td-actions">
        ${canEdit() ? `<button class="btn btn-secondary btn-sm" data-parent-action="edit" data-id="${p._id}" title="Edit">
          <span class="material-icons-round" style="font-size:14px">edit</span>
        </button>` : ''}
        ${showDelete ? `<button class="btn btn-danger btn-sm" data-parent-action="delete" data-id="${p._id}" title="Delete">
          <span class="material-icons-round" style="font-size:14px">delete</span>
        </button>` : ''}
      </td>
    </tr>`;
  }).join('');

  return `<table>
    <thead><tr>
      <th>Father / Mother</th><th>Phone</th><th>Email</th>
      <th>Children</th><th>City</th><th>Registered</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function openParentForm(id) {
  const host = document.getElementById('parentFormHost');
  const item = id ? (_cache['parents'] || []).find(x => x._id === id) || {} : {};
  const isEdit = !!id;

  host.innerHTML = `
    <div class="form-card">
      <h2>${isEdit ? 'Edit' : 'Add New'} Parent / Guardian</h2>
      <form id="parentForm" novalidate>
        <div class="form-grid">

          <div class="form-group col-full" style="background:var(--bg);border-radius:var(--r-sm);padding:14px">
            <div style="font-weight:600;margin-bottom:12px;color:var(--primary)">
              <span class="material-icons-round" style="font-size:16px;vertical-align:middle">man</span>
              Father's Information
            </div>
            <div class="form-grid" style="margin:0">
              ${renderField({name:'father.name',     label:'Father Name',       type:'text'},      item.father?.name)}
              ${renderField({name:'father.phone',    label:'Father Mobile',     type:'tel'},       item.father?.phone)}
              ${renderField({name:'father.whatsapp', label:'Father WhatsApp',   type:'tel'},       item.father?.whatsapp)}
              ${renderField({name:'father.email',    label:'Father Email',      type:'email'},     item.father?.email)}
              ${renderField({name:'father.occupation',label:'Father Occupation',type:'text'},      item.father?.occupation)}
            </div>
          </div>

          <div class="form-group col-full" style="background:var(--bg);border-radius:var(--r-sm);padding:14px">
            <div style="font-weight:600;margin-bottom:12px;color:var(--primary)">
              <span class="material-icons-round" style="font-size:16px;vertical-align:middle">woman</span>
              Mother's Information
            </div>
            <div class="form-grid" style="margin:0">
              ${renderField({name:'mother.name',       label:"Mother Name",         type:'text'},  item.mother?.name)}
              ${renderField({name:'mother.phone',      label:"Mother Mobile",       type:'tel'},   item.mother?.phone)}
              ${renderField({name:'mother.whatsapp',   label:"Mother WhatsApp",     type:'tel'},   item.mother?.whatsapp)}
              ${renderField({name:'mother.email',      label:"Mother Email",        type:'email'}, item.mother?.email)}
              ${renderField({name:'mother.occupation', label:"Mother's Occupation", type:'text'},  item.mother?.occupation)}
            </div>
          </div>

          <div class="form-group col-full" style="background:var(--bg);border-radius:var(--r-sm);padding:14px">
            <div style="font-weight:600;margin-bottom:12px;color:var(--primary)">
              <span class="material-icons-round" style="font-size:16px;vertical-align:middle">home</span>
              Address & Income
            </div>
            <div class="form-grid" style="margin:0">
              ${renderField({name:'address.street',  label:'Street / Area',  type:'text', wide:true}, item.address?.street)}
              ${renderField({name:'address.city',    label:'City',           type:'text'},              item.address?.city)}
              ${renderField({name:'address.state',   label:'State',          type:'text'},              item.address?.state)}
              ${renderField({name:'address.pincode', label:'Pincode',        type:'text'},              item.address?.pincode)}
              ${renderField({name:'annualIncome',    label:'Annual Income (₹)', type:'number'},         item.annualIncome)}
            </div>
          </div>

          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="parentSaveBtn">
              <span id="parentSaveTxt">Save</span>
              <span id="parentSaveSpin" class="btn-loader" style="display:none"><span class="spin"></span></span>
            </button>
            <button type="button" class="btn btn-secondary" id="parentCancelBtn">Cancel</button>
          </div>
          <div class="col-full" id="parentFormMsg"></div>
        </div>
      </form>
    </div>`;

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('parentCancelBtn').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('parentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('parentSaveBtn');
    const txt  = document.getElementById('parentSaveTxt');
    const spin = document.getElementById('parentSaveSpin');
    btn.disabled = true; txt.style.display = 'none'; spin.style.display = '';

    try {
      // Build nested object from dot-notation form fields
      const raw = Object.fromEntries(new FormData(e.target));
      const body = {};
      for (const [k, v] of Object.entries(raw)) {
        const parts = k.split('.');
        if (parts.length === 2) {
          body[parts[0]] = body[parts[0]] || {};
          body[parts[0]][parts[1]] = v;
        } else {
          body[k] = v;
        }
      }
      const method   = id ? 'PATCH' : 'POST';
      const endpoint = `/parents${id ? '/' + id : ''}`;
      await api(endpoint, { method, body: JSON.stringify(body) });
      host.innerHTML = '';
      toast(`Parent ${id ? 'updated' : 'created'} successfully!`, 'success');
      parentsPage();
    } catch (err) {
      document.getElementById('parentFormMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false; txt.style.display = ''; spin.style.display = 'none';
    }
  });
}

// ── 15. FEE MANAGEMENT PAGE ───────────────────────────────────────
async function feesPage() {
  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">Fee Management</div>
        <div class="page-header-sub">Structures · Payments · Monthly Summary</div>
      </div>
    </div>
    <div class="tab-bar">
      <button class="tab-btn active" data-tab="payments">Payments</button>
      <button class="tab-btn" data-tab="structures">Fee Structures</button>
      <button class="tab-btn" data-tab="monthly">Monthly Summary</button>
    </div>
    <div id="feeTabContent"></div>`;

  const tabs = document.querySelectorAll('.tab-btn');
  const showTab = async tabKey => {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabKey));
    const el = document.getElementById('feeTabContent');
    el.innerHTML = '<div class="loader-center"><span class="spin spin-lg"></span></div>';
    try {
      if (tabKey === 'payments')   await renderFeePayments(el);
      if (tabKey === 'structures') await renderFeeStructures(el);
      if (tabKey === 'monthly')    await renderMonthlyFees(el);
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error" style="margin-top:16px"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    }
  };

  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  await showTab('payments');
}

async function renderFeePayments(el) {
  const { data } = await api('/fees/payments?limit=100&sort=-paymentDate');

  const addBtn = canEdit() ? `<button class="btn btn-primary" id="addPaymentBtn">
    <span class="material-icons-round" style="font-size:18px">add</span> Record Payment
  </button>` : '';

  el.innerHTML = `
    <div id="paymentFormHost"></div>
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Fee Payments (${data.length})</span>
        <div style="display:flex;gap:8px">${addBtn}</div>
      </div>
      <div class="table-wrap">${buildPaymentsTable(data)}</div>
    </div>`;

  if (canEdit()) {
    document.getElementById('addPaymentBtn')?.addEventListener('click', () => openPaymentForm(null));
  }

  el.addEventListener('click', async e => {
    const btn = e.target.closest('[data-pay-action]');
    if (!btn) return;
    const { payAction, id } = btn.dataset;
    if (payAction === 'edit')   openPaymentForm(id, data.find(x => x._id === id));
    if (payAction === 'delete' && canAdmin()) {
      if (!confirm('Delete this payment record? This cannot be undone.')) return;
      try {
        await api(`/fees/payments/${id}`, { method: 'DELETE' });
        toast('Payment deleted', 'success');
        renderFeePayments(el);
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

function buildPaymentsTable(items) {
  if (!items.length) return `<div class="empty-state">
    <span class="material-icons-round empty-icon">payments</span>
    <p class="empty-title">No payment records</p>
    <p class="empty-sub">Record the first fee payment.</p>
  </div>`;

  const rows = items.map(p => {
    const statusCls = p.status === 'Paid' ? 'badge-active' : p.status === 'Partial' ? 'badge-pending' : p.status === 'Waived' ? 'badge-approved' : 'badge-rejected';
    return `<tr>
      <td style="font-family:monospace;font-size:12px">${esc(p.receiptNumber || '—')}</td>
      <td>
        <div class="td-main">${esc(p.student?.studentName || '—')}</div>
        <div class="td-sub">${esc(p.student?.admissionNumber || '')}</div>
      </td>
      <td>${esc(p.feeType || '—')}</td>
      <td style="font-weight:600">${fmtCurrency(p.amountDue)}</td>
      <td style="color:var(--green);font-weight:600">${fmtCurrency(p.amountPaid)}</td>
      <td style="color:var(--err)">${fmtCurrency(p.balance)}</td>
      <td><span class="badge ${statusCls}">${esc(p.status)}</span></td>
      <td>${fmtDate(p.paymentDate)}</td>
      <td>${esc(p.paymentMode || '—')}</td>
      <td class="td-actions">
        ${canEdit() ? `<button class="btn btn-secondary btn-sm" data-pay-action="edit" data-id="${p._id}">
          <span class="material-icons-round" style="font-size:14px">edit</span>
        </button>` : ''}
        ${canAdmin() ? `<button class="btn btn-danger btn-sm" data-pay-action="delete" data-id="${p._id}">
          <span class="material-icons-round" style="font-size:14px">delete</span>
        </button>` : ''}
      </td>
    </tr>`;
  }).join('');

  return `<table>
    <thead><tr>
      <th>Receipt No.</th><th>Student</th><th>Fee Type</th>
      <th>Due</th><th>Paid</th><th>Balance</th>
      <th>Status</th><th>Date</th><th>Mode</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function openPaymentForm(id, item = {}) {
  const host = document.getElementById('paymentFormHost');
  const isEdit = !!id;
  const feeTypes = ['Admission Fee', 'Monthly Fee', 'Transport Fee', 'Activity Fee', 'Annual Fee', 'Exam Fee', 'Other'];
  const payModes = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Online'];

  host.innerHTML = `
    <div class="form-card">
      <h2>${isEdit ? 'Edit' : 'Record'} Fee Payment</h2>
      <form id="paymentForm" novalidate>
        <div class="form-grid">
          ${renderField({name:'studentId', label:'Student ID (MongoDB)', type:'text', required:true, wide:true}, item.student?._id || item.student)}
          ${renderField({name:'feeType',   label:'Fee Type',            type:'select', required:true, options:feeTypes}, item.feeType)}
          ${renderField({name:'month',     label:'Month (e.g. June 2025)', type:'text'}, item.month)}
          ${renderField({name:'amountDue', label:'Amount Due (₹)',      type:'number', required:true}, item.amountDue)}
          ${renderField({name:'amountPaid',label:'Amount Paid (₹)',     type:'number', required:true}, item.amountPaid)}
          ${renderField({name:'paymentDate',label:'Payment Date',       type:'date',   required:true}, item.paymentDate ? new Date(item.paymentDate).toISOString().slice(0,10) : '')}
          ${renderField({name:'paymentMode',label:'Payment Mode',       type:'select', options:payModes}, item.paymentMode)}
          ${renderField({name:'transactionId',label:'Transaction / Ref No.',type:'text'}, item.transactionId)}
          ${renderField({name:'discount',  label:'Discount (₹)',        type:'number'}, item.discount)}
          ${renderField({name:'lateFee',   label:'Late Fee (₹)',        type:'number'}, item.lateFee)}
          ${renderField({name:'remarks',   label:'Remarks',             type:'textarea', wide:true}, item.remarks)}
          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="paySaveBtn">
              <span id="paySaveTxt">Save</span>
              <span id="paySaveSpin" class="btn-loader" style="display:none"><span class="spin"></span></span>
            </button>
            <button type="button" class="btn btn-secondary" id="payCancel">Cancel</button>
          </div>
          <div class="col-full" id="payMsg"></div>
        </div>
      </form>
    </div>`;

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('payCancel').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('paymentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('paySaveBtn');
    const txt  = document.getElementById('paySaveTxt');
    const spin = document.getElementById('paySaveSpin');
    btn.disabled = true; txt.style.display = 'none'; spin.style.display = '';
    try {
      const body = Object.fromEntries(new FormData(e.target));
      const method   = id ? 'PATCH' : 'POST';
      const endpoint = id ? `/fees/payments/${id}` : '/fees/payments';
      await api(endpoint, { method, body: JSON.stringify(body) });
      host.innerHTML = '';
      toast('Payment saved successfully!', 'success');
      feesPage();
    } catch (err) {
      document.getElementById('payMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false; txt.style.display = ''; spin.style.display = 'none';
    }
  });
}

async function renderFeeStructures(el) {
  const { data } = await api('/fees/structures?limit=100');

  const addBtn = canAdmin() ? `<button class="btn btn-primary" id="addStructBtn">
    <span class="material-icons-round" style="font-size:18px">add</span> Add Structure
  </button>` : '';

  el.innerHTML = `
    <div id="structFormHost"></div>
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Fee Structures (${data.length})</span>
        ${addBtn}
      </div>
      <div class="table-wrap">${buildStructuresTable(data)}</div>
    </div>`;

  if (canAdmin()) {
    document.getElementById('addStructBtn')?.addEventListener('click', () => openStructureForm(null));
  }

  el.addEventListener('click', async e => {
    const btn = e.target.closest('[data-struct-action]');
    if (!btn) return;
    const { structAction, id } = btn.dataset;
    if (structAction === 'delete' && canAdmin()) {
      if (!confirm('Delete this fee structure?')) return;
      try {
        await api(`/fees/structures/${id}`, { method: 'DELETE' });
        toast('Structure deleted', 'success');
        renderFeeStructures(el);
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

function buildStructuresTable(items) {
  if (!items.length) return `<div class="empty-state">
    <span class="material-icons-round empty-icon">receipt_long</span>
    <p class="empty-title">No fee structures</p>
  </div>`;

  const rows = items.map(s => `<tr>
    <td><div class="td-main">${esc(s.name || s.feeType || '—')}</div></td>
    <td>${esc(s.program || 'All')}</td>
    <td>${esc(s.feeType || '—')}</td>
    <td style="font-weight:600">${fmtCurrency(s.amount)}</td>
    <td>${esc(s.frequency || 'Monthly')}</td>
    <td>${fmtDate(s.dueDate)}</td>
    <td class="td-actions">
      ${canAdmin() ? `<button class="btn btn-danger btn-sm" data-struct-action="delete" data-id="${s._id}">
        <span class="material-icons-round" style="font-size:14px">delete</span>
      </button>` : ''}
    </td>
  </tr>`).join('');

  return `<table>
    <thead><tr><th>Name</th><th>Program</th><th>Type</th><th>Amount</th><th>Frequency</th><th>Due Date</th><th>Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function openStructureForm(id) {
  const host = document.getElementById('structFormHost');
  const feeTypes  = ['Admission Fee', 'Monthly Fee', 'Transport Fee', 'Activity Fee', 'Annual Fee', 'Exam Fee', 'Other'];
  const freqTypes = ['Monthly', 'Annual', 'One-time', 'Term-wise'];

  host.innerHTML = `
    <div class="form-card">
      <h2>Add Fee Structure</h2>
      <form id="structForm" novalidate>
        <div class="form-grid">
          ${renderField({name:'name',      label:'Structure Name',    type:'text',   required:true}, '')}
          ${renderField({name:'program',   label:'Program',           type:'select', required:true, options:['All', ...PROGRAMS]}, '')}
          ${renderField({name:'feeType',   label:'Fee Type',          type:'select', required:true, options:feeTypes}, '')}
          ${renderField({name:'amount',    label:'Amount (₹)',        type:'number', required:true}, '')}
          ${renderField({name:'frequency', label:'Frequency',         type:'select', options:freqTypes}, '')}
          ${renderField({name:'dueDate',   label:'Due Date',          type:'date'}, '')}
          ${renderField({name:'lateFeePerDay', label:'Late Fee/Day (₹)',type:'number'}, '')}
          ${renderField({name:'description',label:'Description',       type:'textarea', wide:true}, '')}
          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="structSaveBtn">Save Structure</button>
            <button type="button" class="btn btn-secondary" id="structCancel">Cancel</button>
          </div>
          <div class="col-full" id="structMsg"></div>
        </div>
      </form>
    </div>`;

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('structCancel').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('structForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('structSaveBtn');
    btn.disabled = true;
    try {
      const body = Object.fromEntries(new FormData(e.target));
      await api('/fees/structures', { method: 'POST', body: JSON.stringify(body) });
      host.innerHTML = '';
      toast('Fee structure created!', 'success');
      renderFeeStructures(document.getElementById('feeTabContent'));
    } catch (err) {
      document.getElementById('structMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

async function renderMonthlyFees(el) {
  const year  = new Date().getFullYear();
  const { data } = await api(`/fees/payments/monthly?year=${year}`);

  const totalYear = (data || []).reduce((s, m) => s + (m.total || 0), 0);

  el.innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Monthly Collection — ${year}</span>
        <span style="font-weight:700;font-size:18px;color:var(--green)">${fmtCurrency(totalYear)}</span>
      </div>
      <div class="card-body">
        <div class="monthly-bars">
          ${(data || []).map(m => {
            const pct = totalYear ? Math.round((m.total / totalYear) * 100) : 0;
            const monthName = new Date(year, (m._id || m.month) - 1).toLocaleString('en-IN', { month: 'short' });
            return `<div class="month-bar-wrap">
              <div class="month-bar-track">
                <div class="month-bar-fill" style="height:${Math.max(pct, 2)}%"></div>
              </div>
              <div class="month-bar-val">${fmtCurrency(m.total)}</div>
              <div class="month-bar-label">${monthName}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

// ── 16. ATTENDANCE PAGE ───────────────────────────────────────────
async function attendancePage() {
  const today = new Date().toISOString().slice(0, 10);

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">Attendance</div>
        <div class="page-header-sub">Students · Teachers · Holidays</div>
      </div>
    </div>
    <div class="tab-bar">
      <button class="tab-btn active" data-tab="student-att">Student Attendance</button>
      <button class="tab-btn" data-tab="teacher-att">Teacher Attendance</button>
      <button class="tab-btn" data-tab="holidays">Holidays</button>
    </div>
    <div id="attTabContent"></div>`;

  const tabs = document.querySelectorAll('.tab-btn');
  const showTab = async tabKey => {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabKey));
    const el = document.getElementById('attTabContent');
    el.innerHTML = '<div class="loader-center"><span class="spin spin-lg"></span></div>';
    try {
      if (tabKey === 'student-att') await renderStudentAttendance(el, today);
      if (tabKey === 'teacher-att') await renderTeacherAttendance(el, today);
      if (tabKey === 'holidays')    await renderHolidays(el);
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error" style="margin-top:16px"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    }
  };

  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  await showTab('student-att');
}

async function renderStudentAttendance(el, dateStr) {
  const { data: students } = await api('/students?limit=200&sort=studentName');
  const { data: attendance } = await api(`/attendance/students?date=${dateStr}`).catch(() => ({ data: [] }));

  const attMap = {};
  (attendance || []).forEach(a => { attMap[a.student?._id || a.student] = a.status; });

  el.innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Student Attendance</span>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="date" id="attDate" class="form-input" style="width:160px" value="${dateStr}">
          <button class="btn btn-secondary btn-sm" id="loadAttBtn">Load</button>
          ${canEdit() ? `<button class="btn btn-primary btn-sm" id="saveAttBtn">Save Attendance</button>` : ''}
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Student</th><th>Program</th><th>Present</th><th>Absent</th><th>Late</th><th>Holiday</th></tr></thead>
          <tbody>
            ${students.map((s, i) => {
              const cur = attMap[s._id] || 'Present';
              return `<tr>
                <td style="font-size:12px;color:var(--txt-sm)">${i + 1}</td>
                <td>
                  <div class="td-main">${esc(s.studentName)}</div>
                  <div class="td-sub">${esc(s.admissionNumber || '')}</div>
                </td>
                <td>${esc(s.program)}</td>
                ${['Present','Absent','Late','Holiday'].map(st => `
                  <td style="text-align:center">
                    <input type="radio" name="att_${s._id}" value="${st}" ${cur === st ? 'checked' : ''}>
                  </td>`).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('loadAttBtn').addEventListener('click', () => {
    renderStudentAttendance(el, document.getElementById('attDate').value);
  });

  if (canEdit()) {
    document.getElementById('saveAttBtn')?.addEventListener('click', async () => {
      const date     = document.getElementById('attDate').value;
      const records  = students.map(s => {
        const radio = document.querySelector(`input[name="att_${s._id}"]:checked`);
        return { student: s._id, date, status: radio?.value || 'Present' };
      });
      try {
        await api('/attendance/students', { method: 'POST', body: JSON.stringify({ date, records }) });
        toast('Student attendance saved!', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }
}

async function renderTeacherAttendance(el, dateStr) {
  const { data: teachers } = await api('/teachers?limit=100&sort=name');
  const { data: attendance } = await api(`/attendance/teachers?date=${dateStr}`).catch(() => ({ data: [] }));

  const attMap = {};
  (attendance || []).forEach(a => { attMap[a.teacher?._id || a.teacher] = a.status; });

  el.innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Teacher Attendance</span>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="date" id="teachAttDate" class="form-input" style="width:160px" value="${dateStr}">
          <button class="btn btn-secondary btn-sm" id="loadTeachAttBtn">Load</button>
          ${canEdit() ? `<button class="btn btn-primary btn-sm" id="saveTeachAttBtn">Save Attendance</button>` : ''}
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Teacher</th><th>Designation</th><th>Present</th><th>Absent</th><th>Late</th><th>Half Day</th></tr></thead>
          <tbody>
            ${teachers.map((t, i) => {
              const cur = attMap[t._id] || 'Present';
              return `<tr>
                <td style="font-size:12px;color:var(--txt-sm)">${i + 1}</td>
                <td><div class="td-main">${esc(t.name)}</div></td>
                <td>${esc(t.designation || t.qualification || '')}</td>
                ${['Present','Absent','Late','Half Day'].map(st => `
                  <td style="text-align:center">
                    <input type="radio" name="tatt_${t._id}" value="${st}" ${cur === st ? 'checked' : ''}>
                  </td>`).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('loadTeachAttBtn').addEventListener('click', () => {
    renderTeacherAttendance(el, document.getElementById('teachAttDate').value);
  });

  if (canEdit()) {
    document.getElementById('saveTeachAttBtn')?.addEventListener('click', async () => {
      const date    = document.getElementById('teachAttDate').value;
      const records = teachers.map(t => {
        const radio = document.querySelector(`input[name="tatt_${t._id}"]:checked`);
        return { teacher: t._id, date, status: radio?.value || 'Present' };
      });
      try {
        await api('/attendance/teachers', { method: 'POST', body: JSON.stringify({ date, records }) });
        toast('Teacher attendance saved!', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }
}

async function renderHolidays(el) {
  const { data } = await api('/attendance/holidays?limit=100&sort=startDate');

  el.innerHTML = `
    <div id="holidayFormHost"></div>
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Holiday Calendar (${data.length})</span>
        ${canAdmin() ? `<button class="btn btn-primary btn-sm" id="addHolidayBtn">
          <span class="material-icons-round" style="font-size:16px">add</span> Add Holiday
        </button>` : ''}
      </div>
      <div class="table-wrap">${buildHolidaysTable(data)}</div>
    </div>`;

  document.getElementById('addHolidayBtn')?.addEventListener('click', () => openHolidayForm(el));

  el.addEventListener('click', async e => {
    const btn = e.target.closest('[data-hol-delete]');
    if (!btn || !canAdmin()) return;
    if (!confirm('Delete this holiday?')) return;
    try {
      await api(`/attendance/holidays/${btn.dataset.holDelete}`, { method: 'DELETE' });
      toast('Holiday deleted', 'success');
      renderHolidays(el);
    } catch (err) { toast(err.message, 'error'); }
  });
}

function buildHolidaysTable(items) {
  if (!items.length) return `<div class="empty-state">
    <span class="material-icons-round empty-icon">event_busy</span>
    <p class="empty-title">No holidays added</p>
  </div>`;

  const rows = items.map(h => `<tr>
    <td><div class="td-main">${esc(h.name)}</div></td>
    <td>${fmtDate(h.startDate)}</td>
    <td>${fmtDate(h.endDate)}</td>
    <td><span class="badge badge-default">${esc(h.type || 'Holiday')}</span></td>
    <td class="td-actions">
      ${canAdmin() ? `<button class="btn btn-danger btn-sm" data-hol-delete="${h._id}">
        <span class="material-icons-round" style="font-size:14px">delete</span>
      </button>` : ''}
    </td>
  </tr>`).join('');

  return `<table>
    <thead><tr><th>Holiday Name</th><th>Start Date</th><th>End Date</th><th>Type</th><th>Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function openHolidayForm(el) {
  const host = document.getElementById('holidayFormHost');
  host.innerHTML = `
    <div class="form-card">
      <h2>Add Holiday</h2>
      <form id="holidayForm" novalidate>
        <div class="form-grid">
          ${renderField({name:'name',      label:'Holiday Name', type:'text',   required:true}, '')}
          ${renderField({name:'type',      label:'Type',         type:'select', options:['Holiday','Exam','Event','Other']}, '')}
          ${renderField({name:'startDate', label:'Start Date',   type:'date',   required:true}, '')}
          ${renderField({name:'endDate',   label:'End Date',     type:'date'}, '')}
          ${renderField({name:'description',label:'Description', type:'textarea', wide:true}, '')}
          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="holSaveBtn">Save</button>
            <button type="button" class="btn btn-secondary" id="holCancel">Cancel</button>
          </div>
          <div class="col-full" id="holMsg"></div>
        </div>
      </form>
    </div>`;

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('holCancel').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('holidayForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('holSaveBtn');
    btn.disabled = true;
    try {
      await api('/attendance/holidays', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      host.innerHTML = '';
      toast('Holiday added!', 'success');
      renderHolidays(el);
    } catch (err) {
      document.getElementById('holMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

// ── 17. ACADEMIC SESSIONS PAGE ────────────────────────────────────
async function sessionsPage() {
  const { data } = await api('/academic-sessions?limit=20&sort=-startDate');

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">Academic Sessions</div>
        <div class="page-header-sub">Manage school academic years</div>
      </div>
      ${canAdmin() ? `<button class="btn btn-primary" id="newSessionBtn">
        <span class="material-icons-round" style="font-size:18px">add</span> New Session
      </button>` : ''}
    </div>
    <div id="sessionFormHost"></div>
    <div class="card">
      <div class="table-wrap">${buildSessionsTable(data)}</div>
    </div>`;

  document.getElementById('newSessionBtn')?.addEventListener('click', () => openSessionForm());

  document.getElementById('contentArea').addEventListener('click', async e => {
    const btn = e.target.closest('[data-sess-action]');
    if (!btn) return;
    const { sessAction, id } = btn.dataset;
    if (sessAction === 'activate') {
      if (!confirm('Set this session as active? The current active session will be deactivated.')) return;
      try {
        await api(`/academic-sessions/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: true }) });
        toast('Session activated!', 'success');
        sessionsPage();
      } catch (err) { toast(err.message, 'error'); }
    }
    if (sessAction === 'delete' && canAdmin()) {
      if (!confirm('Delete this session?')) return;
      try {
        await api(`/academic-sessions/${id}`, { method: 'DELETE' });
        toast('Session deleted', 'success');
        sessionsPage();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

function buildSessionsTable(items) {
  if (!items.length) return `<div class="empty-state">
    <span class="material-icons-round empty-icon">calendar_today</span>
    <p class="empty-title">No academic sessions</p>
    <p class="empty-sub">Create the first academic session.</p>
  </div>`;

  const rows = items.map(s => `<tr>
    <td>
      <div class="td-main">${esc(s.name)}</div>
      ${s.description ? `<div class="td-sub">${esc(s.description)}</div>` : ''}
    </td>
    <td>${fmtDate(s.startDate)}</td>
    <td>${fmtDate(s.endDate)}</td>
    <td>
      <span class="badge ${s.isActive ? 'badge-active' : 'badge-inactive'}">
        ${s.isActive ? 'Active' : 'Inactive'}
      </span>
    </td>
    <td class="td-actions">
      ${!s.isActive && canAdmin() ? `<button class="btn btn-success btn-sm" data-sess-action="activate" data-id="${s._id}">Set Active</button>` : ''}
      ${canAdmin() && !s.isActive ? `<button class="btn btn-danger btn-sm" data-sess-action="delete" data-id="${s._id}">
        <span class="material-icons-round" style="font-size:14px">delete</span>
      </button>` : ''}
    </td>
  </tr>`).join('');

  return `<table>
    <thead><tr><th>Session Name</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function openSessionForm() {
  const host = document.getElementById('sessionFormHost');
  host.innerHTML = `
    <div class="form-card">
      <h2>Create Academic Session</h2>
      <form id="sessionForm" novalidate>
        <div class="form-grid">
          ${renderField({name:'name',        label:'Session Name (e.g. 2025-26)', type:'text', required:true}, '')}
          ${renderField({name:'startDate',   label:'Start Date',                  type:'date', required:true}, '')}
          ${renderField({name:'endDate',     label:'End Date',                    type:'date', required:true}, '')}
          ${renderField({name:'description', label:'Description',                 type:'textarea', wide:true}, '')}
          ${renderField({name:'isActive',    label:'Set as Active Session',       type:'boolean'}, 'false')}
          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="sessSaveBtn">Create Session</button>
            <button type="button" class="btn btn-secondary" id="sessCancel">Cancel</button>
          </div>
          <div class="col-full" id="sessMsg"></div>
        </div>
      </form>
    </div>`;

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('sessCancel').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('sessionForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('sessSaveBtn');
    btn.disabled = true;
    try {
      await api('/academic-sessions', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      host.innerHTML = '';
      toast('Academic session created!', 'success');
      sessionsPage();
    } catch (err) {
      document.getElementById('sessMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

// ── 18. REPORTS PAGE ──────────────────────────────────────────────
async function reportsPage() {
  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">Reports & Export</div>
        <div class="page-header-sub">Download CSV reports for all modules</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">

      ${[
        { key:'students',   label:'Students Report',    icon:'child_care',    desc:'Full student list with demographics, status and parent info.', endpoint:'/reports/students' },
        { key:'admissions', label:'Admissions Report',  icon:'assignment',    desc:'All admission records with status, program and dates.',         endpoint:'/reports/admissions' },
        { key:'fees',       label:'Fee Collection',     icon:'payments',      desc:'All fee payment records with receipt numbers and status.',      endpoint:'/reports/fees' },
        { key:'teachers',   label:'Teachers Report',    icon:'school',        desc:'Staff list with qualifications, salary and joining dates.',     endpoint:'/reports/teachers' },
        { key:'attendance', label:'Attendance Report',  icon:'how_to_reg',    desc:'Attendance records for a selected date or month.',              endpoint:'/reports/attendance' }
      ].map(r => `
        <div class="card">
          <div class="card-head" style="border-bottom:0">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:44px;height:44px;border-radius:12px;background:var(--primary-light);display:flex;align-items:center;justify-content:center">
                <span class="material-icons-round" style="color:var(--primary)">${r.icon}</span>
              </div>
              <div>
                <div style="font-weight:700;font-size:15px">${esc(r.label)}</div>
              </div>
            </div>
          </div>
          <div class="card-body" style="padding-top:4px">
            <p style="font-size:13px;color:var(--txt-sm);margin:0 0 16px">${esc(r.desc)}</p>
            <button class="btn btn-primary" style="width:100%" data-report-url="${esc(r.endpoint)}">
              <span class="material-icons-round" style="font-size:16px">download</span>
              Download CSV
            </button>
          </div>
        </div>`).join('')}
    </div>

    <div class="card" style="margin-top:24px">
      <div class="card-head"><span class="card-title">Custom Date Range Report</span></div>
      <div class="card-body">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="margin:0">
            <label class="form-label">From Date</label>
            <input type="date" id="reportFrom" class="form-input" style="width:160px">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">To Date</label>
            <input type="date" id="reportTo" class="form-input" style="width:160px">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Module</label>
            <select id="reportModule" class="form-select" style="width:180px">
              <option value="students">Students</option>
              <option value="admissions">Admissions</option>
              <option value="fees">Fee Payments</option>
              <option value="attendance">Attendance</option>
            </select>
          </div>
          <button class="btn btn-primary" id="customReportBtn">
            <span class="material-icons-round" style="font-size:16px">download</span>
            Download
          </button>
        </div>
      </div>
    </div>`;

  document.querySelectorAll('[data-report-url]').forEach(btn => {
    btn.addEventListener('click', () => downloadReport(btn.dataset.reportUrl));
  });

  document.getElementById('customReportBtn').addEventListener('click', () => {
    const from   = document.getElementById('reportFrom').value;
    const to     = document.getElementById('reportTo').value;
    const module = document.getElementById('reportModule').value;
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to',   to);
    downloadReport(`/reports/${module}?${params}`);
  });
}

function downloadReport(endpoint) {
  const url = `${API}${endpoint}`;
  const a   = document.createElement('a');
  a.href    = url;
  a.setAttribute('download', '');
  // Add auth via query param for file downloads
  const sep = endpoint.includes('?') ? '&' : '?';
  a.href = `${API}${endpoint}${sep}token=${encodeURIComponent(S.token)}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast('Download started…', 'info');
}

// ── 19. SETTINGS PAGE ─────────────────────────────────────────────
async function settings() {
  const { data: s } = await api('/settings');

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">School Settings</div>
        <div class="page-header-sub">Manage your school's information and preferences</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

      <div>
        <div class="form-card">
          <h2>School Information</h2>
          <form id="infoForm">
            <div class="form-grid">
              <div class="form-group col-full">
                <label class="form-label">School Name</label>
                <input name="schoolName" class="form-input" value="${esc(s.schoolName || '')}" placeholder="Vedantam Play School">
              </div>
              <div class="form-group col-full">
                <label class="form-label">Tagline</label>
                <input name="tagline" class="form-input" value="${esc(s.tagline || '')}" placeholder="Where Little Dreams Take Flight">
              </div>
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input name="phone" type="tel" class="form-input" value="${esc(s.phone || '')}" placeholder="+91 98765 43210">
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input name="email" type="email" class="form-input" value="${esc(s.email || '')}" placeholder="info@vedantam.edu.in">
              </div>
              <div class="form-group col-full">
                <label class="form-label">Address</label>
                <textarea name="address" class="form-textarea" placeholder="Full school address">${esc(s.address || '')}</textarea>
              </div>
              <div class="form-group col-full">
                <label class="form-label">Google Maps URL</label>
                <input name="googleMapsUrl" class="form-input" value="${esc(s.googleMapsUrl || '')}" placeholder="https://maps.google.com/...">
              </div>
            </div>
            <div class="form-actions" style="margin-top:16px">
              <button type="submit" class="btn btn-primary" id="infoSaveBtn">
                <span id="infoSaveTxt">Save Information</span>
                <span id="infoSaveSpin" class="btn-loader" style="display:none"><span class="spin"></span></span>
              </button>
            </div>
            <div id="infoMsg" style="margin-top:12px"></div>
          </form>
        </div>

        <div class="form-card">
          <h2>Social Media Links</h2>
          <form id="socialForm">
            <div class="form-grid">
              ${[['facebook','Facebook Page URL','https://facebook.com/...'],
                 ['instagram','Instagram URL','https://instagram.com/...'],
                 ['youtube','YouTube Channel URL','https://youtube.com/...'],
                 ['twitter','Twitter / X URL','https://twitter.com/...']].map(([k, l, ph]) => `
                <div class="form-group col-full">
                  <label class="form-label">${l}</label>
                  <input name="${k}" class="form-input" value="${esc(s.socialLinks?.[k] || '')}" placeholder="${ph}">
                </div>`).join('')}
            </div>
            <div class="form-actions" style="margin-top:16px">
              <button type="submit" class="btn btn-primary" id="socialSaveBtn">Save Social Links</button>
            </div>
            <div id="socialMsg" style="margin-top:12px"></div>
          </form>
        </div>
      </div>

      <div>
        <div class="form-card">
          <h2>School Logo</h2>
          <div style="text-align:center;padding:12px 0">
            <img id="logoPreview" src="${esc(s.logoUrl || 'logo.png')}" alt="Logo"
              style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid var(--bd);margin-bottom:18px">
            <div>
              <form id="logoForm">
                <label class="btn btn-secondary" style="display:inline-flex;cursor:pointer;gap:8px">
                  <span class="material-icons-round" style="font-size:18px">upload</span>
                  <span id="logoLabel">Choose Logo File</span>
                  <input type="file" id="logoFile" name="logo" accept="image/*" style="display:none">
                </label>
                <button type="submit" class="btn btn-primary" id="logoSaveBtn" style="display:none;margin-top:10px">Upload Logo</button>
              </form>
              <div id="logoMsg" style="margin-top:10px"></div>
            </div>
          </div>
        </div>

        <div class="form-card">
          <h2>API Configuration</h2>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="padding:12px;background:var(--bg);border-radius:var(--r-sm)">
              <div class="form-label" style="margin-bottom:4px">Current API Endpoint</div>
              <div style="font-size:12px;font-family:monospace;color:var(--txt-sm);word-break:break-all">${esc(API)}</div>
            </div>
            <div class="alert alert-info">
              <span class="material-icons-round">info</span>
              <span>Configure the API base URL via <code>js/api-config.js</code> or the <code>vedantam-api-base</code> meta tag.</span>
            </div>
          </div>
        </div>
      </div>

    </div>`;

  document.getElementById('infoForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('infoSaveBtn');
    const txt  = document.getElementById('infoSaveTxt');
    const spin = document.getElementById('infoSaveSpin');
    btn.disabled = true; txt.style.display = 'none'; spin.style.display = '';
    try {
      await api('/settings', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      document.getElementById('infoMsg').innerHTML = `<div class="alert alert-success"><span class="material-icons-round">check_circle</span>Settings saved successfully!</div>`;
      toast('Settings saved!', 'success');
    } catch (err) {
      document.getElementById('infoMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    } finally {
      btn.disabled = false; txt.style.display = ''; spin.style.display = 'none';
    }
  });

  document.getElementById('socialForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/settings', { method: 'PUT', body: JSON.stringify({ socialLinks: Object.fromEntries(new FormData(e.target)) }) });
      document.getElementById('socialMsg').innerHTML = `<div class="alert alert-success"><span class="material-icons-round">check_circle</span>Social links saved!</div>`;
      toast('Social links saved!', 'success');
    } catch (err) {
      document.getElementById('socialMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    }
  });

  document.getElementById('logoFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('logoLabel').textContent = file.name;
    document.getElementById('logoPreview').src = URL.createObjectURL(file);
    document.getElementById('logoSaveBtn').style.display = '';
  });

  document.getElementById('logoForm').addEventListener('submit', async e => {
    e.preventDefault();
    const file = document.getElementById('logoFile').files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      await api('/settings/logo', { method: 'PATCH', body: fd });
      document.getElementById('logoMsg').innerHTML = `<div class="alert alert-success"><span class="material-icons-round">check_circle</span>Logo updated!</div>`;
      document.getElementById('logoSaveBtn').style.display = 'none';
      toast('Logo updated!', 'success');
    } catch (err) {
      document.getElementById('logoMsg').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  });
}

// ── 20. PROFILE PAGE ──────────────────────────────────────────────
async function profile() {
  const { data } = await api('/auth/me');
  const a         = data.admin;
  const initials  = (a.name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const roleName  = (a.role || 'admin').replace(/_/g, ' ');
  const lastLogin = a.lastLoginAt
    ? new Date(a.lastLoginAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'This is your first login';

  document.getElementById('contentArea').innerHTML = `
    <div class="profile-hero">
      <div class="profile-photo-wrap">
        <div class="profile-photo" id="profPhotoEl">
          ${a.profilePhoto
            ? `<img src="${esc(a.profilePhoto)}" alt="">`
            : `<span style="font-size:36px;font-weight:900;color:rgba(255,255,255,.8)">${esc(initials)}</span>`}
        </div>
        <label class="profile-cam" title="Change photo">
          <span class="material-icons-round">camera_alt</span>
          <input type="file" id="photoInput" accept="image/*" style="display:none">
        </label>
      </div>
      <div>
        <div class="profile-name">${esc(a.name)}</div>
        <div class="profile-email">${esc(a.email)}</div>
        <div class="profile-badge">
          <span class="material-icons-round" style="font-size:14px">verified</span>
          ${esc(roleName)}
        </div>
        <div class="profile-meta">
          <div class="profile-meta-item">
            <strong>${esc(lastLogin)}</strong>
            Last Login
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="form-card">
        <h2>Profile Information</h2>
        <form id="profileForm">
          <div class="form-grid">
            <div class="form-group col-full">
              <label class="form-label">Full Name <span style="color:var(--err)">*</span></label>
              <input name="name" class="form-input" value="${esc(a.name || '')}" required>
            </div>
            <div class="form-group col-full">
              <label class="form-label">Email Address <span style="color:var(--err)">*</span></label>
              <input name="email" type="email" class="form-input" value="${esc(a.email || '')}" required>
            </div>
          </div>
          <div class="form-actions" style="margin-top:16px">
            <button type="submit" class="btn btn-primary" id="profSaveBtn">Save Profile</button>
          </div>
          <div id="profMsg" style="margin-top:12px"></div>
        </form>
      </div>

      <div class="form-card">
        <h2>Change Password</h2>
        <form id="passForm">
          <div class="form-grid">
            <div class="form-group col-full">
              <label class="form-label">Current Password</label>
              <input name="currentPassword" type="password" class="form-input" placeholder="Enter current password" required>
            </div>
            <div class="form-group col-full">
              <label class="form-label">New Password</label>
              <input name="newPassword" type="password" class="form-input" placeholder="Minimum 8 characters" minlength="8" required>
            </div>
            <div class="form-group col-full">
              <label class="form-label">Confirm New Password</label>
              <input name="confirmPassword" type="password" class="form-input" placeholder="Repeat new password" required>
            </div>
          </div>
          <div class="form-actions" style="margin-top:16px">
            <button type="submit" class="btn btn-primary">Change Password</button>
          </div>
          <div id="passMsg" style="margin-top:12px"></div>
        </form>
      </div>
    </div>`;

  document.getElementById('photoInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const { data: r } = await api('/auth/profile-photo', { method: 'PATCH', body: fd });
      S.admin.profilePhoto = r.profilePhoto;
      document.getElementById('profPhotoEl').innerHTML = `<img src="${esc(r.profilePhoto)}" alt="">`;
      renderSidebar();
      toast('Profile photo updated!', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const { data: r } = await api('/auth/profile', { method: 'PATCH', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      S.admin = { ...S.admin, ...r.admin };
      renderSidebar();
      document.getElementById('profMsg').innerHTML = `<div class="alert alert-success"><span class="material-icons-round">check_circle</span>Profile updated!</div>`;
      toast('Profile saved!', 'success');
    } catch (err) {
      document.getElementById('profMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    }
  });

  document.getElementById('passForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd  = new FormData(e.target);
    const np  = fd.get('newPassword');
    const cp2 = fd.get('confirmPassword');
    if (np !== cp2) {
      document.getElementById('passMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>New passwords do not match.</div>`;
      return;
    }
    try {
      await api('/auth/change-password', { method: 'PATCH', body: JSON.stringify({ currentPassword: fd.get('currentPassword'), newPassword: np }) });
      document.getElementById('passMsg').innerHTML = `<div class="alert alert-success"><span class="material-icons-round">check_circle</span>Password changed successfully!</div>`;
      toast('Password changed!', 'success');
      e.target.reset();
    } catch (err) {
      document.getElementById('passMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    }
  });
}

// ── 21. LOGIN PAGE ────────────────────────────────────────────────
function initLogin() {
  const pwInput = document.getElementById('loginPassword');
  const pwIcon  = document.getElementById('pwToggleIcon');
  document.getElementById('pwToggle').addEventListener('click', () => {
    const show = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    pwIcon.textContent = show ? 'visibility_off' : 'visibility';
  });

  document.getElementById('forgotBtn').addEventListener('click', () => {
    toast('Please contact your system administrator to reset your password.', 'info');
  });

  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl  = document.getElementById('loginError');
    const btnTxt = document.getElementById('loginBtnText');
    const btnSpin= document.getElementById('loginSpinner');
    const btn    = document.getElementById('loginBtn');

    errEl.style.display = 'none';
    btn.disabled = true;
    btnTxt.style.display = 'none';
    btnSpin.style.display = '';

    try {
      const fd       = new FormData(e.target);
      const { data } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) });
      saveToken(data.token, fd.get('remember') === 'on');
      S.admin = data.admin;
      if (data.admin.mustChangePassword) showPage('forceChangePage');
      else bootAdmin();
    } catch (err) {
      errEl.innerHTML = `<span class="material-icons-round">error</span>${esc(err.message)}`;
      errEl.style.display = 'flex';
    } finally {
      btn.disabled = false;
      btnTxt.style.display = '';
      btnSpin.style.display = 'none';
    }
  });
}

// ── 22. FORCE CHANGE PAGE ─────────────────────────────────────────
function initForceChange() {
  document.getElementById('forceChangeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl  = document.getElementById('forceChangeError');
    const btnTxt = document.getElementById('fcBtnText');
    const btnSpin= document.getElementById('fcSpinner');
    const btn    = document.getElementById('forceChangeBtn');
    const fd     = new FormData(e.target);
    const newPassword = fd.get('newPassword');
    const confirmPassword = fd.get('confirmPassword');

    if (newPassword !== confirmPassword) {
      errEl.innerHTML = `<span class="material-icons-round">error</span>New passwords do not match`;
      errEl.style.display = 'flex'; return;
    }
    if (newPassword.length < 8) {
      errEl.innerHTML = `<span class="material-icons-round">error</span>Password must be at least 8 characters`;
      errEl.style.display = 'flex'; return;
    }

    errEl.style.display = 'none';
    btn.disabled = true; btnTxt.style.display = 'none'; btnSpin.style.display = '';

    try {
      await api('/auth/change-password', { method: 'PATCH', body: JSON.stringify({ currentPassword: fd.get('currentPassword'), newPassword }) });
      S.admin.mustChangePassword = false;
      toast('Password set successfully! Welcome to your dashboard.', 'success');
      bootAdmin();
    } catch (err) {
      errEl.innerHTML = `<span class="material-icons-round">error</span>${esc(err.message)}`;
      errEl.style.display = 'flex';
    } finally {
      btn.disabled = false; btnTxt.style.display = ''; btnSpin.style.display = 'none';
    }
  });
}

// ── 23. ADMIN SHELL ───────────────────────────────────────────────
function bootAdmin() {
  showPage('adminShell');
  renderSidebar();
  initGlobalSearch();

  document.getElementById('menuBtn').addEventListener('click', openMobileSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeMobileSidebar);
  document.getElementById('sidebarBackdrop').addEventListener('click', closeMobileSidebar);

  // Single delegated handler for resource-row actions
  document.getElementById('contentArea').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id, status } = btn.dataset;
    const key    = S.page;
    const config = RESOURCES[key];
    if (!config) return;
    if (action === 'edit')      openForm(key, config, id);
    if (action === 'delete')    confirmDelete(key, config, id);
    if (action === 'approve')   updateAdmStatus(id, 'Approved');
    if (action === 'reject')    updateAdmStatus(id, 'Rejected');
    if (action === 'verify')    updateAdmStatus(id, 'Verified');
    if (action === 'waiting')   updateAdmStatus(id, 'Waiting');
    if (action === 'convert')   convertAdmission(id);
    if (action === 'archive')   archiveStudent(id);
    if (action === 'restore')   restoreStudent(id);
    if (action === 'setstatus') updateItemStatus(config.endpoint, id, status, key);
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch (_) { /* ignore */ }
    clearToken();
    showPage('loginPage');
    document.getElementById('loginForm').reset();
    toast('Signed out successfully', 'info');
  });

  const startPage = (location.hash || '').slice(1) || 'dashboard';
  navigate(startPage);
}

// ── 24. INIT ──────────────────────────────────────────────────────
function init() {
  initLogin();
  initForceChange();

  if (S.token) {
    api('/auth/me')
      .then(({ data }) => {
        S.admin = data.admin;
        if (data.admin.mustChangePassword) showPage('forceChangePage');
        else bootAdmin();
      })
      .catch(() => {
        clearToken();
        showPage('loginPage');
      });
  } else {
    showPage('loginPage');
  }
}

init();
