// Small helpers
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

const state = { data: null, activeTag: 'All', query: '' };

document.addEventListener('DOMContentLoaded', async () => {
  // Theme + accent restore
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  const savedAccent = localStorage.getItem('accent');
  if (savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);

  // Load data.json
  const res = await fetch('data.json');
  const data = await res.json();
  state.data = data;

  renderAll(data);
  interactions();
  reveal();
  scrollSpy();
  animateOrbs();
});

// Render
function renderAll(d) {
  // Resume
  if (d.basics.resume_url) { $('#resumeBtn').href = d.basics.resume_url; } else { $('#resumeBtn').style.display = 'none'; }

  // Hero
  $('#name').textContent = d.basics.name || 'Your Name';
  $('#footerName').textContent = d.basics.name || 'Your Name';
  document.title = `${d.basics.name || 'Portfolio'} — Portfolio`;
  $('#summary').textContent = d.basics.summary || '';
  if (d.basics.avatar) $('#avatar').src = d.basics.avatar;

  const roles = Array.isArray(d.basics.roles) && d.basics.roles.length
    ? d.basics.roles
    : (d.basics.role ? d.basics.role.split('•').map(s => s.trim()) : ['AI/ML Engineer']);
  typeLoop($('#typed'), roles);

  // Socials
  $('#socials').innerHTML = (d.basics.links || [])
    .map(l => `<a href="${l.url}" target="_blank" rel="noopener"><i class="ti ti-${l.icon || 'link'}"></i> ${l.title}</a>`)
    .join('');

  // Email CTA
  if (d.basics.email) {
    $('#emailText').textContent = d.basics.email;
    $('#emailBtn').href = `mailto:${d.basics.email}`;
  } else { $('#emailBtn').style.display = 'none'; }

  // Quick stats
  $('#quickStats').innerHTML = (d.quick_stats || [])
    .map(s => `<div class="stat"><i class="ti ti-${s.icon || 'sparkles'}"></i>${s.text}</div>`).join('');

  // Experience
  $('#experienceList').innerHTML = (d.experience || []).map(exp => `
    <li class="reveal">
      <h3>${exp.title} — ${exp.company}</h3>
      <div class="meta">${[exp.location, exp.period].filter(Boolean).join(' • ')}</div>
      <ul>${(exp.highlights || []).map(h => `<li>${h}</li>`).join('')}</ul>
      ${exp.tech?.length ? `<div class="tags" style="margin-top:8px;">${exp.tech.map(t => `<span class="badge">${t}</span>`).join('')}</div>` : ''}
    </li>
  `).join('');

  // Projects
  const tags = new Set(['All']);
  (d.projects || []).forEach(p => (p.tags || []).forEach(t => tags.add(t)));
  $('#projectFilters').innerHTML = [...tags].map(t => `<button class="chip ${t==='All'?'active':''}" data-tag="${t}">${t}</button>`).join('');
  renderProjects();

  // Skills
  $('#skillsWrap').innerHTML = (d.skills || []).map(g => `
    <div class="skill-group reveal">
      <h4>${g.group}</h4>
      <div class="badges">${g.items.map(s => `<span class="badge">${s.name || s}</span>`).join('')}</div>
    </div>
  `).join('');

  // Education
  $('#educationList').innerHTML = (d.education || []).map(ed => `
    <div class="simple reveal">
      <h3>${ed.degree}</h3>
      <div class="muted">${ed.institution} • ${ed.period}</div>
      ${ed.meta ? `<div class="muted">${ed.meta}</div>` : ''}
    </div>
  `).join('');

  // Certifications
  $('#certList').innerHTML = (d.certifications || []).map(c => `
    <div class="simple reveal">
      <h3>${c.title}</h3>
      <div class="muted">${c.issuer} • ${c.date}</div>
      ${c.details ? `<div>${c.details}</div>` : ''}
      ${c.link ? `<div style="margin-top:6px;"><a class="btn btn-quiet" href="${c.link}" target="_blank" rel="noopener">View</a></div>` : ''}
    </div>
  `).join('');

  // Contact links
  $('#contactLinks').innerHTML = (d.contact || []).map(c => `
    <a href="${c.href}" target="${c.external ? '_blank' : '_self'}" rel="${c.external ? 'noopener' : ''}">
      <i class="ti ti-${c.icon || 'link'}"></i> ${c.text}
    </a>
  `).join('');

  // Optional Formspree
  const form = $('#contactForm');
  if (d.basics.formspree_id) {
    form.hidden = false;
    form.action = `https://formspree.io/f/${d.basics.formspree_id}`;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      $('#formStatus').textContent = 'Sending...';
      const res = await fetch(form.action, { method:'POST', headers:{'Accept':'application/json'}, body: new FormData(form) });
      $('#formStatus').textContent = res.ok ? 'Sent! I will reply soon.' : 'Something went wrong. Try again.';
      if (res.ok) form.reset();
    });
  }

  // Footer year
  $('#year').textContent = new Date().getFullYear();
}

// Render projects with filters/search + stars
async function renderProjects() {
  const d = state.data;
  const q = state.query.toLowerCase();
  const tag = state.activeTag;
  const projects = (d.projects || []).filter(p => {
    const byTag = tag === 'All' || (p.tags || []).includes(tag);
    const byQuery = !q || [p.title, p.summary, ...(p.tags || [])].join(' ').toLowerCase().includes(q);
    return byTag && byQuery;
  });

  // Build HTML
  $('#projectGrid').innerHTML = projects.map((p, idx) => `
    <article class="card reveal" data-index="${idx}">
      <div class="thumb">${p.thumbnail ? `<img src="${p.thumbnail}" alt="${p.title}">` : `<i class="ti ti-code"></i>`}</div>
      <div class="body">
        <h3 class="title">${p.title}</h3>
        <div class="muted">${p.period || ''}</div>
        <p class="desc">${p.summary || ''}</p>
        ${p.highlights?.length ? `<ul>${p.highlights.slice(0,2).map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
        <div class="tags">${(p.tags || []).map(t => `<span class="badge">${t}</span>`).join('')}</div>
        <div class="actions">
          ${p.repo ? `<a class="btn btn-quiet" href="${p.repo}" target="_blank" rel="noopener"><i class="ti ti-brand-github"></i> Code <span class="stars" data-repo="${p.repo}"></span></a>` : ''}
          ${p.demo ? `<a class="btn btn-quiet" href="${p.demo}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i> Demo</a>` : ''}
          <button class="btn btn-quiet open-modal"><i class="ti ti-eye"></i> Details</button>
        </div>
      </div>
    </article>
  `).join('');

  // Tilt interaction
  $$('.card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const rx = ((y / r.height) - 0.5) * -6;
      const ry = ((x / r.width) - 0.5) * 6;
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => card.style.transform = '');
  });

  // Modal open
  $$('.open-modal').forEach((btn, i) => btn.addEventListener('click', () => openProjectModal(projects[i])));

  // Fetch GitHub stars with caching
  $$('.stars').forEach(async el => {
    const url = el.dataset.repo;
    const m = url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
    if (!m) return;
    const key = `repo:${m[1]}/${m[2]}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const obj = JSON.parse(cached);
      if (Date.now() - obj.time < 6*60*60*1000) return el.innerHTML = `★ ${obj.stars}`;
    }
    try {
      const r = await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}`);
      if (!r.ok) return;
      const j = await r.json();
      el.innerHTML = `★ ${j.stargazers_count ?? 0}`;
      localStorage.setItem(key, JSON.stringify({ stars: j.stargazers_count ?? 0, time: Date.now() }));
    } catch {}
  });

  reveal();
}

// Typed text loop
function typeLoop(el, words){
  let i = 0, j = 0, del = false;
  function tick(){
    const w = words[i % words.length];
    el.textContent = w.slice(0, j);
    if (!del && j < w.length) j++;
    else if (del && j > 0) j--;
    else { del = !del; if (!del) i++; }
    const delay = del ? 45 : 80;
    setTimeout(tick, delay);
  }
  tick();
}

// Interactions
function interactions(){
  // Filters
  $('#projectFilters').addEventListener('click', e => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    $$('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.activeTag = chip.dataset.tag;
    renderProjects();
  });

  // Search
  $('#projectSearch').addEventListener('input', e => {
    state.query = e.target.value || '';
    renderProjects();
  });

  // Theme toggle
  $('#themeToggle').addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  // Accent palette
  $('#palette').addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const c = btn.dataset.accent;
    document.documentElement.style.setProperty('--accent', c);
    localStorage.setItem('accent', c);
  });

  // Copy email on click
  $('#emailBtn')?.addEventListener('click', (e) => {
    const email = state.data?.basics?.email;
    if (!email) return;
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    navigator.clipboard.writeText(email);
    const el = $('#emailText'), old = el.textContent;
    el.textContent = 'Copied!';
    setTimeout(() => el.textContent = old, 1000);
  });

  // Modal close
  $('#modalClose').addEventListener('click', () => $('#projectModal').close());
  $('#projectModal').addEventListener('click', e => { if (e.target.tagName === 'DIALOG') $('#projectModal').close(); });

  // Back to top visibility
  const toTop = $('#toTop');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    $('#progressBar').style.width = `${(y / (document.body.scrollHeight - innerHeight)) * 100}%`;
    toTop.classList.toggle('visible', y > 500);
  });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Year
  $('#year').textContent = new Date().getFullYear();
}

function openProjectModal(p){
  $('#modalTitle').textContent = p.title;
  const images = (p.images || (p.thumbnail ? [p.thumbnail] : []))
    .map(src => `<img src="${src}" alt="${p.title}" style="width:100%;border-radius:12px;margin-bottom:10px">`).join('');
  $('#modalBody').innerHTML = `
    ${images}
    <p class="muted">${p.period || ''}</p>
    <p>${p.summary || ''}</p>
    ${p.highlights?.length ? `<ul>${p.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
    <div class="tags">${(p.tags || []).map(t => `<span class="badge">${t}</span>`).join('')}</div>
    <div class="actions" style="margin-top:10px">
      ${p.repo ? `<a class="btn btn-quiet" href="${p.repo}" target="_blank" rel="noopener"><i class="ti ti-brand-github"></i> Code</a>` : ''}
      ${p.demo ? `<a class="btn btn-quiet" href="${p.demo}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i> Demo</a>` : ''}
      ${p.report ? `<a class="btn btn-quiet" href="${p.report}" target="_blank" rel="noopener"><i class="ti ti-file-text"></i> Report</a>` : ''}
    </div>
  `;
  $('#projectModal').showModal();
}

// Reveal on scroll
function reveal(){
  const io = new IntersectionObserver((entries, obs)=>{
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: .1, rootMargin: '0px 0px -40px' });
  $$('.reveal').forEach(el => io.observe(el));
}

// Scroll spy
function scrollSpy(){
  const sections = ['hero','experience','projects','skills','education','certifications','contact']
    .map(id => ({ id, el: document.getElementById(id) }));
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(ent=>{
      const id = ent.target.id;
      const link = $(`.nav-links a[href="#${id}"]`);
      if (ent.isIntersecting) {
        $$('.nav-links a').forEach(a => a.classList.remove('active'));
        link?.classList.add('active');
      }
    });
  }, { threshold: .5 });
  sections.forEach(s => io.observe(s.el));
}

// Animated hero background (lightweight orbs)
function animateOrbs(){
  const canvas = $('#orbs'); const ctx = canvas.getContext('2d');
  const resize = ()=>{ canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
  const orbs = Array.from({length: 18}, ()=>({
    x: Math.random(), y: Math.random(),
    r: .008 + Math.random()*.02,
    vx: (-.5 + Math.random()) * .0005,
    vy: (-.5 + Math.random()) * .0005,
    hue: 200 + Math.random()*100
  }));
  const draw = ()=>{
    ctx.clearRect(0,0,canvas.width,canvas.height);
    orbs.forEach(o=>{
      o.x += o.vx; o.y += o.vy;
      if (o.x < 0 || o.x > 1) o.vx *= -1;
      if (o.y < 0 || o.y > 1) o.vy *= -1;
      const x = o.x * canvas.width, y = o.y * canvas.height, r = o.r * Math.min(canvas.width,canvas.height);
      const g = ctx.createRadialGradient(x,y,0,x,y,r*2.5);
      g.addColorStop(0, `hsla(${o.hue},90%,60%,.28)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,r*2.5,0,Math.PI*2); ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  resize(); draw();
}
