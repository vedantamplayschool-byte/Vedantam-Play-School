'use strict';
const navbar=document.getElementById('navbar');const backToTop=document.getElementById('backToTop');const hamburger=document.getElementById('hamburger');const navLinks=document.getElementById('navLinks');
const API_CONFIG=window.VedantamAPIConfig||{baseUrl:'http://localhost:5000/api/v1',endpoints:{}};const API_BASE=API_CONFIG.baseUrl.replace(/\/$/,'');const EP=API_CONFIG.endpoints;
function onScroll(){navbar?.classList.toggle('scrolled',scrollY>20);backToTop?.classList.toggle('visible',scrollY>420);let current='';document.querySelectorAll('main section[id]').forEach(s=>{if(scrollY>=s.offsetTop-130)current=s.id});document.querySelectorAll('.nav-links a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+current))}addEventListener('scroll',onScroll,{passive:true});onScroll();
hamburger?.addEventListener('click',()=>{const open=hamburger.classList.toggle('open');navLinks.classList.toggle('open',open);hamburger.setAttribute('aria-expanded',String(open))});navLinks?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{hamburger?.classList.remove('open');navLinks.classList.remove('open');hamburger?.setAttribute('aria-expanded','false')}));
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');if(!id||id==='#')return;const t=document.querySelector(id);if(t){e.preventDefault();scrollTo({top:t.getBoundingClientRect().top+scrollY-82,behavior:'smooth'})}}));
const reveal=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('revealed');reveal.unobserve(en.target)}}),{threshold:.12,rootMargin:'0px 0px -40px'});document.querySelectorAll('.reveal').forEach(el=>reveal.observe(el));
document.addEventListener('mousemove',e=>{const card=document.querySelector('.parallax-card');if(!card||innerWidth<900)return;const r=card.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)/r.width;const y=(e.clientY-r.top-r.height/2)/r.height;card.style.transform=`rotateY(${x*8}deg) rotateX(${-y*8}deg) translateY(-8px)`});document.querySelector('.parallax-card')?.addEventListener('mouseleave',e=>e.currentTarget.style.transform='');
const escapeHtml=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function api(path,options={}){const res=await fetch(`${API_BASE}${path}`,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const json=await res.json().catch(()=>({success:false,message:'Unexpected server response'}));if(!res.ok||json.success===false)throw new Error(json.message||'Request failed');return json}
function empty(el,msg){if(el)el.innerHTML=`<div class="empty-state">${escapeHtml(msg)}</div>`}
async function loadDynamic(){const map=[[`${EP.gallery||'/gallery'}?limit=6&sort=displayOrder,-createdAt`,'galleryGrid',items=>items.map(i=>`<article class="dynamic-card reveal"><img src="${escapeHtml(i.imageUrl||'logo.png')}" alt="${escapeHtml(i.title)}" loading="lazy" decoding="async"><span class="tag">${escapeHtml(i.category)}</span><h3>${escapeHtml(i.title)}</h3><p>${escapeHtml(i.description||'Vedantam Play School campus moment.')}</p></article>`).join('')],[`${EP.testimonials||'/testimonials'}?limit=6&sort=displayOrder,-createdAt`,'testimonialGrid',items=>items.map(i=>`<article class="dynamic-card reveal"><span class="tag">${'★'.repeat(i.rating||5)}</span><h3>${escapeHtml(i.parentName)}</h3><p>"${escapeHtml(i.message)}"</p><p>${escapeHtml(i.studentName||'Parent')}</p></article>`).join('')],[`${EP.notices||'/notices'}?limit=5&sort=-publishDate`,'noticeList',items=>items.map(i=>`<article class="list-card reveal"><time>${new Date(i.publishDate||i.createdAt).toLocaleDateString()}</time><h3>${escapeHtml(i.title)}</h3><p>${escapeHtml(i.body)}</p></article>`).join('')],[`${EP.events||'/events'}?limit=5&sort=eventDate`,'eventList',items=>items.map(i=>`<article class="list-card reveal"><time>${new Date(i.eventDate).toLocaleDateString()}</time><h3>${escapeHtml(i.title)}</h3><p>${escapeHtml(i.description)}</p></article>`).join('')]];await Promise.all(map.map(async([path,id,render])=>{const el=document.getElementById(id);if(!el)return;try{const {data}=await api(path);if(data?.length)el.innerHTML=render(data);else empty(el,'Updates will appear here soon.')}catch{empty(el,'Live content is currently unavailable. Please check back soon.')}}));document.querySelectorAll('.reveal:not(.revealed)').forEach(el=>reveal.observe(el))}loadDynamic();
function setFormMessage(form,msg,type='success'){let box=form.querySelector('.form-message');if(!box){box=document.createElement('div');box.className='form-message';form.prepend(box)}box.className=`form-message ${type}`;box.textContent=msg;return box}

/* ── Enquiry Form — posts to /enquiries so admin can track in Enquiries tab ── */
const form=document.getElementById('admissionForm');const success=document.getElementById('formSuccess');form?.addEventListener('submit',async e=>{e.preventDefault();let valid=true;form.querySelectorAll('[required]').forEach(f=>{const ok=f.checkValidity()&&f.value.trim();f.classList.toggle('field-error',!ok);if(!ok)valid=false});if(!valid){form.animate([{transform:'translateX(0)'},{transform:'translateX(-8px)'},{transform:'translateX(8px)'},{transform:'translateX(0)'}],{duration:360});return}const button=form.querySelector('button[type="submit"]');button.disabled=true;try{const raw=Object.fromEntries(new FormData(form).entries());/* Map form field names to Enquiry model fields */const data={name:raw.name,parentName:raw.parentName,phone:raw.phone,age:raw.age,program:raw.program,message:raw.message||''};await api(EP.enquiries||'/enquiries',{method:'POST',body:JSON.stringify(data)});success.hidden=false;success.textContent='🎉 Thank you! Your enquiry has been submitted. We will contact you soon.';success.scrollIntoView({behavior:'smooth',block:'center'});form.reset()}catch(err){setFormMessage(form,err.message,'error')}finally{button.disabled=false}});form?.querySelectorAll('input,select,textarea').forEach(f=>f.addEventListener('input',()=>f.classList.remove('field-error')));

document.querySelectorAll('.btn,.learn,.contact-pills a').forEach(btn=>btn.addEventListener('click',e=>{const rip=document.createElement('span');const r=btn.getBoundingClientRect();const s=Math.max(r.width,r.height);rip.style.cssText=`position:absolute;width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px;border-radius:50%;background:rgba(255,255,255,.35);transform:scale(0);animation:ripple .6s linear;pointer-events:none`;btn.appendChild(rip);rip.onanimationend=()=>rip.remove()}));const st=document.createElement('style');st.textContent='@keyframes ripple{to{transform:scale(3);opacity:0}}';document.head.appendChild(st);backToTop?.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));

/* ── Hidden admin entry ────────────────────────────────────────────
   Admin Portal is intentionally not listed anywhere on the public
   site, and /admin.html itself always 404s (blocked server-side in
   backend/src/app.js). The real access boundary is server-side: the
   admin page is only ever served at the secret ADMIN_SECRET_PATH URL.
   These two gestures are just a convenient, unlisted way for staff to
   reach that URL — the path itself is fetched on demand from the
   server (never hardcoded here) so it isn't sitting in this file's
   source for anyone to read. Note this is obscurity, not security: on
   a shared/public device someone could still discover the path by
   watching network requests while performing the gesture. */
(function(){
  async function goToAdmin(){
    try{
      const r=await fetch('/api/v1/admin-entry');
      const d=await r.json();
      if(d && d.path) location.href='/'+d.path;
    }catch(e){ /* silent: no visible trace on failure */ }
  }

  // Mobile / any device: 7 taps on the homescreen logo within 4s.
  const logo=document.getElementById('brandLogo');
  if(logo){
    let taps=0,timer=null;
    logo.addEventListener('click',e=>{
      taps++;
      clearTimeout(timer);
      timer=setTimeout(()=>{taps=0},4000);
      if(taps>=7){
        e.preventDefault();
        taps=0;clearTimeout(timer);
        goToAdmin();
      }
    });
  }

  // Desktop: Ctrl + Alt + A.
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey && e.altKey && e.code==='KeyA'){
      e.preventDefault();
      goToAdmin();
    }
  });
})();
