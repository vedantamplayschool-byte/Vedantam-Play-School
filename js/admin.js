'use strict';
/* ================================================================
   VEDANTAM PLAY SCHOOL — ADMIN PANEL v2.0
   Full SPA: Auth · Dashboard · CRUD · Settings · Profile
   ================================================================ */

// ── 1. CONFIG ────────────────────────────────────────────────────
const API = (window.VedantamAPIConfig?.baseUrl || 'http://localhost:5000/api/v1').replace(/\/$/, '');

// ── 2. STATE ─────────────────────────────────────────────────────
const S = {
  token: localStorage.getItem('v_adm_tok') || sessionStorage.getItem('v_adm_tok') || '',
  admin: null,
  page:  'dashboard'
};
const _cache  = {}; // cached list items per resource key
const _search = {}; // search strings per resource key

// ── 3. DOM HELPERS ────────────────────────────────────────────────
const $  = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>'"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);

const fmtDate = d => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const timeAgo = d => {
  if (!d) return '';
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60)  return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
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
  const icons = { success: 'check_circle', error: 'error', info: 'info' };
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
      { key: 'admissions', label: 'Admissions',   icon: 'assignment' },
      { key: 'enquiries',  label: 'Enquiries',    icon: 'forum' }
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
    label: 'More',
    items: [
      { key: 'slides',        label: 'Hero Slides',  icon: 'slideshow',   admin: true },
      { key: 'testimonials',  label: 'Testimonials', icon: 'rate_review', admin: true },
      { key: 'newsletter',    label: 'Newsletter',   icon: 'email',       admin: true },
      { key: 'contacts',      label: 'Messages',     icon: 'chat',        admin: true }
    ]
  },
  {
    label: 'Account',
    items: [
      { key: 'settings', label: 'Settings',   icon: 'settings',       admin: true },
      { key: 'profile',  label: 'My Profile', icon: 'account_circle' }
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
  // Use .onclick so repeated renderSidebar calls replace—rather than stack—the handler
  nav.onclick = e => {
    const btn = e.target.closest('[data-key]');
    if (btn) navigate(btn.dataset.key);
  };

  // Sidebar user info
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

  // Topbar avatar
  const av = document.getElementById('topbarAvatar');
  if (av && S.admin) {
    const initials = (S.admin.name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    av.innerHTML = S.admin.profilePhoto ? `<img src="${esc(S.admin.profilePhoto)}" alt="">` : initials;
    av.onclick = () => navigate('profile');
    av.onkeydown = e => e.key === 'Enter' && navigate('profile');
  }
}

// ── 8. NAVIGATION ─────────────────────────────────────────────────
function navigate(key) {
  S.page = key;
  history.replaceState(null, '', `#${key}`);

  // Update nav active
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.key === key)
  );

  // Update topbar title
  let title = key.charAt(0).toUpperCase() + key.slice(1);
  for (const g of NAV_GROUPS) for (const it of g.items)
    if (it.key === key) { title = it.label; break; }
  document.getElementById('pageTitle').textContent = title;

  closeMobileSidebar();

  const area = document.getElementById('contentArea');
  area.innerHTML = '<div class="loader-center"><span class="spin spin-lg"></span></div>';

  const pages = {
    dashboard, settings, profile,
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

window.navigate = navigate; // allow inline nav buttons in rendered HTML

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

// ── 9. DASHBOARD ──────────────────────────────────────────────────
async function dashboard() {
  const { data: d } = await api('/dashboard/stats');

  const cards = [
    { label: 'Total Students',      value: d.students,          icon: 'child_care',       cls: 'stat-blue',   note: `${d.todayAdmissions || 0} new today` },
    { label: 'Pending Admissions',  value: d.pendingAdmissions,  icon: 'pending_actions', cls: 'stat-amber',  note: 'Awaiting review' },
    { label: 'Approved Admissions', value: d.approvedAdmissions, icon: 'check_circle',    cls: 'stat-green',  note: 'All time' },
    { label: "Today's Admissions",  value: d.todayAdmissions,    icon: 'event_available', cls: 'stat-purple', note: new Date().toDateString() },
    { label: "Today's Enquiries",   value: d.todayEnquiries,     icon: 'forum',           cls: 'stat-pink',   note: 'New leads today' },
    { label: 'Gallery Photos',      value: d.gallery,            icon: 'photo_library',   cls: 'stat-teal',   note: 'Media files' },
    { label: 'Active Teachers',     value: d.teachers,           icon: 'school',          cls: 'stat-orange', note: 'Staff members' },
    { label: 'Upcoming Events',     value: d.upcomingEvents,     icon: 'event',           cls: 'stat-red',    note: 'Scheduled' }
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

  const dotCls  = { admission: 'dot-admission', contact: 'dot-contact', student: 'dot-student', enquiry: 'dot-enquiry', notice: 'dot-notice' };
  const dotIcon = { admission: 'assignment', contact: 'chat', student: 'child_care', enquiry: 'forum', notice: 'campaign' };

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
    : `<div class="empty-state">
        <span class="material-icons-round empty-icon">inbox</span>
        <p class="empty-title">No recent activity</p>
       </div>`;

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
    : `<div class="empty-state">
        <span class="material-icons-round empty-icon">assignment</span>
        <p class="empty-sub">No admissions yet</p>
       </div>`;

  const qaItems = [
    { label: 'Add Student',       icon: 'child_care',             page: 'students',   newForm: true },
    { label: 'Admissions',        icon: 'assignment_turned_in',   page: 'admissions', newForm: false },
    { label: 'Upload Photo',      icon: 'add_photo_alternate',    page: 'gallery',    newForm: true },
    { label: 'Create Notice',     icon: 'campaign',               page: 'notices',    newForm: true },
    { label: 'Add Event',         icon: 'event',                  page: 'events',     newForm: true }
  ];

  document.getElementById('contentArea').innerHTML = `
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
    <div class="row-3">
      <div class="stat-card stat-teal">
        <div><div class="stat-label">Total Notices</div><div class="stat-value">${d.notices ?? 0}</div></div>
        <div class="stat-icon"><span class="material-icons-round">campaign</span></div>
      </div>
      <div class="stat-card stat-blue">
        <div><div class="stat-label">Unread Messages</div><div class="stat-value">${d.unreadMessages ?? 0}</div></div>
        <div class="stat-icon"><span class="material-icons-round">mark_unread_chat_alt</span></div>
      </div>
      <div class="stat-card stat-purple">
        <div><div class="stat-label">Total Enquiries</div><div class="stat-value">${d.enquiries ?? 0}</div></div>
        <div class="stat-icon"><span class="material-icons-round">forum</span></div>
      </div>
    </div>`;

  // Quick action handlers
  document.querySelectorAll('[data-qa]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.dataset.qa);
      if (btn.dataset.qaNew === 'true') {
        setTimeout(() => document.getElementById('newBtn')?.click(), 300);
      }
    });
  });
}

// ── 10. RESOURCE CONFIGS ──────────────────────────────────────────
const PROGRAMS = ['Play Group', 'Nursery', 'LKG', 'UKG'];

const RESOURCES = {
  students: {
    label: 'Students', endpoint: '/students',
    getTitle: r => r.studentName,
    getSubtitle: r => `${r.parentName} · ${r.phone}`,
    badge: r => ({ text: r.isActive !== false ? 'Active' : 'Inactive', cls: r.isActive !== false ? 'badge-active' : 'badge-inactive' }),
    columns: ['', 'Student', 'Parent', 'Program', 'Status', 'Date', 'Actions'],
    renderCells: r => `
      <td></td>
      <td><div class="td-main">${esc(r.studentName)}</div></td>
      <td>${esc(r.parentName)}</td>
      <td>${esc(r.program)}</td>`,
    fields: [
      { name: 'studentName', label: 'Student Name',  type: 'text',     required: true },
      { name: 'parentName',  label: 'Parent Name',   type: 'text',     required: true },
      { name: 'phone',       label: 'Phone',         type: 'tel',      required: true },
      { name: 'program',     label: 'Program',       type: 'select',   required: true, options: PROGRAMS },
      { name: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
      { name: 'address',     label: 'Address',       type: 'textarea', wide: true },
      { name: 'isActive',    label: 'Active',        type: 'boolean' }
    ]
  },

  admissions: {
    label: 'Admissions', endpoint: '/admissions',
    getTitle: r => r.studentName,
    getSubtitle: r => `${r.parentName} · ${r.phone}`,
    badge: r => ({ text: r.status, cls: `badge-${(r.status || '').toLowerCase()}` }),
    columns: ['Student', 'Parent / Phone', 'Program', 'Status', 'Date', 'Actions'],
    renderCells: r => `
      <td><div class="td-main">${esc(r.studentName)}</div><div class="td-sub">${esc(r.email || '')}</div></td>
      <td><div>${esc(r.parentName)}</div><div class="td-sub">${esc(r.phone)}</div></td>
      <td>${esc(r.program)}</td>`,
    noCreate: true,
    admissionActions: true,
    fields: [
      { name: 'studentName', label: 'Student Name', type: 'text',    required: true },
      { name: 'parentName',  label: 'Parent Name',  type: 'text',    required: true },
      { name: 'phone',       label: 'Phone',        type: 'tel',     required: true },
      { name: 'email',       label: 'Email',        type: 'email' },
      { name: 'age',         label: 'Age',          type: 'text',    required: true },
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
    columns: ['Photo', 'Name', 'Qualification', 'Experience', 'Status', 'Actions'],
    hasImage: true,
    renderCells: r => `
      <td>${r.photoUrl || r.imageUrl ? `<img class="thumb" src="${esc(r.photoUrl || r.imageUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td><div class="td-main">${esc(r.name)}</div></td>
      <td>${esc(r.qualification || '')}</td>
      <td>${esc(r.experience || '')}</td>`,
    fields: [
      { name: 'name',          label: 'Full Name',      type: 'text',     required: true },
      { name: 'qualification', label: 'Qualification',  type: 'text' },
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
      <td><div class="td-main">${esc(r.title)}</div>
          <div class="td-sub" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${esc((r.body || '').slice(0, 80))}
          </div></td>
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
      { name: 'title',        label: 'Title',        type: 'text',     required: true },
      { name: 'subtitle',     label: 'Subtitle',     type: 'textarea', wide: true },
      { name: 'badge',        label: 'Badge Text',   type: 'text' },
      { name: 'ctaText',      label: 'Button Text',  type: 'text' },
      { name: 'ctaLink',      label: 'Button Link',  type: 'text' },
      { name: 'image',        label: 'Slide Image',  type: 'file',     wide: true },
      { name: 'displayOrder', label: 'Order',        type: 'number' },
      { name: 'isActive',     label: 'Active',       type: 'boolean' }
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
      { name: 'parentName',  label: 'Parent Name',  type: 'text',     required: true },
      { name: 'studentName', label: 'Student Name', type: 'text',     required: true },
      { name: 'message',     label: 'Message',      type: 'textarea', required: true, wide: true },
      { name: 'image',       label: 'Photo',        type: 'file',     wide: true },
      { name: 'rating',      label: 'Rating (1–5)', type: 'number' },
      { name: 'displayOrder',label: 'Order',        type: 'number' },
      { name: 'isPublished', label: 'Published',    type: 'boolean' }
    ]
  },

  newsletter: {
    label: 'Newsletter Subscribers', endpoint: '/newsletter',
    getTitle: r => r.email,
    badge: r => ({ text: r.isActive !== false ? 'Subscribed' : 'Unsubscribed', cls: r.isActive !== false ? 'badge-active' : 'badge-inactive' }),
    columns: ['Email', 'Status', 'Subscribed On', 'Actions'],
    noCreate: true,
    renderCells: r => `
      <td><div class="td-main">${esc(r.email)}</div></td>`,
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

// ── 11. RESOURCE PAGE ─────────────────────────────────────────────
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

  if (showNew) {
    document.getElementById('newBtn').addEventListener('click', () => openForm(key, config, null));
  }
  document.getElementById('exportBtn').addEventListener('click', () => exportCSV(key, data));
  document.getElementById('searchBtn').addEventListener('click', () => {
    _search[key] = document.getElementById('searchBox').value.trim();
    navigate(key);
  });
  document.getElementById('searchBox').addEventListener('keydown', e => {
    if (e.key === 'Enter') { _search[key] = e.target.value.trim(); navigate(key); }
  });
  // Row-action click delegation is handled by the single bootAdmin() listener
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
  const dateTd = `<td>${fmtDate(item.createdAt)}</td>`;

  let customCells = '';
  if (config.renderCells) customCells = config.renderCells(item);

  // Badge + date cells (common to most)
  const badgeTd = `<td><span class="badge ${bdg.cls}">${esc(bdg.text)}</span></td>`;

  // Action cells
  let acts = '<td class="td-actions">';
  if (key === 'admissions' && item.status === 'Pending' && canEdit()) {
    acts += `<button class="btn btn-success btn-sm" data-action="approve" data-id="${id}">Approve</button>`;
    acts += `<button class="btn btn-danger btn-sm" data-action="reject" data-id="${id}">Reject</button>`;
  }
  if (key === 'enquiries' && canEdit()) {
    const opts = (config.statusOptions || []).filter(s => s !== item.status);
    if (opts[0]) acts += `<button class="btn btn-secondary btn-sm" data-action="setstatus" data-id="${id}" data-status="${opts[0]}">→ ${esc(opts[0])}</button>`;
  }
  if (key === 'contacts' && item.status === 'New' && canEdit()) {
    acts += `<button class="btn btn-secondary btn-sm" data-action="setstatus" data-id="${id}" data-status="Read">Mark Read</button>`;
  }
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

  return `<tr>${customCells}${badgeTd}${key !== 'slides' && key !== 'testimonials' && key !== 'teachers' && key !== 'gallery' ? dateTd : ''}${acts}</tr>`;
}

// ── 12. FORM ──────────────────────────────────────────────────────
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
      // Remove empty file entries
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

// ── 13. SETTINGS PAGE ─────────────────────────────────────────────
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
              style="width:100px;height:100px;border-radius:50%;object-fit:cover;
                     border:3px solid var(--bd);margin-bottom:18px">
            <div>
              <form id="logoForm">
                <label class="btn btn-secondary" style="display:inline-flex;cursor:pointer;gap:8px">
                  <span class="material-icons-round" style="font-size:18px">upload</span>
                  <span id="logoLabel">Choose Logo File</span>
                  <input type="file" id="logoFile" name="logo" accept="image/*" style="display:none">
                </label>
                <button type="submit" class="btn btn-primary" id="logoSaveBtn" style="display:none;margin-top:10px">
                  Upload Logo
                </button>
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
              <span>Configure the API base URL via <code>js/api-config.js</code> or the <code>vedantam-api-base</code> meta tag in your deployment.</span>
            </div>
          </div>
        </div>
      </div>

    </div>`;

  // School info form
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

  // Social links form
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

  // Logo preview
  document.getElementById('logoFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('logoLabel').textContent = file.name;
    document.getElementById('logoPreview').src = URL.createObjectURL(file);
    document.getElementById('logoSaveBtn').style.display = '';
  });

  // Logo upload
  document.getElementById('logoForm').addEventListener('submit', async e => {
    e.preventDefault();
    const file = document.getElementById('logoFile').files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      await api('/settings/logo', { method: 'PATCH', body: fd });
      document.getElementById('logoMsg').innerHTML = `<div class="alert alert-success"><span class="material-icons-round">check_circle</span>Logo updated successfully!</div>`;
      document.getElementById('logoSaveBtn').style.display = 'none';
      toast('Logo updated!', 'success');
    } catch (err) {
      document.getElementById('logoMsg').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  });
}

// ── 14. PROFILE PAGE ──────────────────────────────────────────────
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

  // Profile photo upload
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
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Profile info form
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

  // Change password form
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

// ── 15. LOGIN PAGE ────────────────────────────────────────────────
function initLogin() {
  // Show/hide password
  const pwInput = document.getElementById('loginPassword');
  const pwIcon  = document.getElementById('pwToggleIcon');
  document.getElementById('pwToggle').addEventListener('click', () => {
    const show = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    pwIcon.textContent = show ? 'visibility_off' : 'visibility';
  });

  // Forgot password
  document.getElementById('forgotBtn').addEventListener('click', () => {
    toast('Please contact your system administrator to reset your password.', 'info');
  });

  // Login submit
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
      const email    = fd.get('email');
      const password = fd.get('password');
      const remember = fd.get('remember') === 'on';

      const { data } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      saveToken(data.token, remember);
      S.admin = data.admin;

      if (data.admin.mustChangePassword) {
        showPage('forceChangePage');
      } else {
        bootAdmin();
      }
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

// ── 16. FORCE CHANGE PAGE ─────────────────────────────────────────
function initForceChange() {
  document.getElementById('forceChangeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl  = document.getElementById('forceChangeError');
    const btnTxt = document.getElementById('fcBtnText');
    const btnSpin= document.getElementById('fcSpinner');
    const btn    = document.getElementById('forceChangeBtn');

    const fd             = new FormData(e.target);
    const currentPassword = fd.get('currentPassword');
    const newPassword     = fd.get('newPassword');
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
      await api('/auth/change-password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) });
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

// ── 17. ADMIN SHELL ───────────────────────────────────────────────
function bootAdmin() {
  showPage('adminShell');
  renderSidebar();

  document.getElementById('menuBtn').addEventListener('click', openMobileSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeMobileSidebar);
  document.getElementById('sidebarBackdrop').addEventListener('click', closeMobileSidebar);

  // Single delegated handler for all resource-row actions — attached once here, never in resourcePage()
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

// ── 18. INIT ──────────────────────────────────────────────────────
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
