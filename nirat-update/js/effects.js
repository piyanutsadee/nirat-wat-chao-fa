// เอฟเฟกต์เสริม: แสงตามเวลา, ธรรมชาติในกรอบ, หิ่งห้อย, ฉากข้างแบบไทย
import { CHAPTERS } from './data/chapters.js';
import { sfx } from './audio/AudioManager.js';

// ===== ปรับได้ตรงนี้ =====
const FIREFLY_COUNT = 28;   // จำนวนหิ่งห้อย
const FIREFLY_GOAL = 12;    // จับครบกี่ตัว
const WATER_TOP = 0.63;     // ขอบบนของผิวน้ำ (0 = บนสุด, 1 = ล่างสุด)

// เวลาของแต่ละบท: tint = สีที่คูณทับฉาก, page = สีพื้นนอกกรอบ
const TIMES = [
  { name: 'ยามสายัณห์', tint: '#ffe6dc', page: ['#6b4046', '#2a1a22'] },
  { name: 'ยามสาย',     tint: '#fffdf4', page: ['#4d5a45', '#1d241d'] },
  { name: 'ยามบ่าย',     tint: '#ffedc4', page: ['#6e5128', '#291d10'] },
  { name: 'ยามเย็น',     tint: '#ffc093', page: ['#753a2c', '#271322'] },
  { name: 'ยามค่ำคืน',   tint: '#b3bcf0', page: ['#1b2550', '#070a1a'] }
];
const PLACES = ['วัดพระเชตุพน', 'บางกอกน้อย', 'สามโคก', 'วัดเจ้าฟ้าอากาศ', 'ล่องกลับพระนคร'];

const rand = (a, b) => a + Math.random() * (b - a);
const el = (tag, cls, parent) => {
  const node = document.createElement(tag);
  node.className = cls;
  parent.appendChild(node);
  return node;
};

const style = document.createElement('style');
style.textContent = `
body { transition: background-color 1.5s; }
.fx-sky-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0; transition: opacity 1.4s; }
.fx-sky-bg.on { opacity: 1; }
.fx-tint { position: absolute; inset: 0; mix-blend-mode: multiply; pointer-events: none; transition: background-color 1.6s; }
.fx-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.fx-counter { position: absolute; top: 66px; left: 50%; transform: translateX(-50%); white-space: nowrap;
  padding: 3px 14px; border-radius: 999px; background: rgba(12,16,40,.78); border: 1px solid #d6a656;
  color: #ffeaa6; font-size: .82rem; z-index: 7; opacity: 0; transition: opacity .6s; }
.fx-counter.on { opacity: 1; }

.side-decor { display: none; }
.fx-side { position: absolute; top: 0; bottom: 0; width: calc(50vw - 320px); display: flex;
  flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #f5e3bb; }
.fx-side.left { left: 8px; } .fx-side.right { right: 8px; }
.fx-arch { width: min(330px, 92%); text-align: center; position: relative; z-index: 2; }
.fx-arch svg { display: block; width: 100%; margin-bottom: -2px; }
.fx-box { border: 2px solid #d6a656; outline: 1px solid rgba(214,166,86,.55); outline-offset: 5px;
  background: rgba(18,10,8,.55); padding: 16px 14px 20px; box-shadow: 0 0 34px rgba(214,166,86,.2); }
.fx-box h4 { font-size: 1.25rem; color: #f2c96d; font-weight: 700; }
.fx-box small { display: block; opacity: .8; letter-spacing: .08em; }
.fx-verse { white-space: pre-line; font-size: .98rem; line-height: 2.1; margin-top: 10px; transition: opacity .5s; }
.fx-route { list-style: none; text-align: left; margin: 14px auto 0; width: fit-content; }
.fx-route li { position: relative; padding: 0 0 20px 30px; opacity: .55; transition: opacity .5s; }
.fx-route li::before { content: ''; position: absolute; left: 4px; top: 9px; width: 11px; height: 11px;
  transform: rotate(45deg); border: 1.5px solid #f2c96d; background: #1a100c; z-index: 1; }
.fx-route li::after { content: ''; position: absolute; left: 10px; top: 18px; bottom: -8px;
  border-left: 2px dotted #d6a656; }
.fx-route li:last-child { padding-bottom: 0; } .fx-route li:last-child::after { display: none; }
.fx-route li.past { opacity: .85; } .fx-route li.past::before { background: #d6a656; }
.fx-route li.now { opacity: 1; color: #ffe29a; font-weight: 700; }
.fx-route li.now::before { background: #ffe29a; box-shadow: 0 0 14px 4px rgba(255,214,110,.8); }
.fx-scene { position: absolute; bottom: 0; left: 0; width: 100%; height: 34vh; }
@media (max-width: 1100px) { .fx-side { display: none; } }
.fx-side .chedi, .fx-side .palm, .fx-arch svg, .fx-box h4, .fx-route li { pointer-events: auto; cursor: pointer; }
.fx-route li:hover { opacity: 1; color: #ffe29a; }
.fx-glow { animation: fxGlow 1.3s ease-out; }
@keyframes fxGlow { 0% { filter: none; } 25% { filter: drop-shadow(0 0 12px #ffd37a) brightness(2.2); } 100% { filter: none; } }
.palm-sway { animation: fxSway .9s ease-in-out; transform-box: fill-box; transform-origin: 50% 100%; }
@keyframes fxSway { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(4deg); } 60% { transform: rotate(-3deg); } }
@media (prefers-reduced-motion: reduce) { .fx-glow, .palm-sway { animation: none; } }
.hud-top { padding-bottom: 1.2rem; background: linear-gradient(to bottom, rgba(243,235,217,.99) 0%, rgba(243,235,217,.97) 80%, rgba(243,235,217,0) 100%); }
`;
document.head.appendChild(style);

// ---------- ฉากข้างนอกกรอบ ----------
const gable = `
<svg viewBox="0 0 320 120" fill="none" stroke="#e0b25c" stroke-linejoin="round" stroke-linecap="round">
  <path d="M160 6 L166 30 L300 112 H20 L154 30 Z" fill="rgba(122,30,24,.75)" stroke-width="3"/>
  <path d="M160 36 L262 102 H58 Z" stroke-width="1.5"/>
  <path d="M20 112 C2 108 2 90 16 82 C14 96 22 100 36 102 M300 112 C318 108 318 90 304 82 C306 96 298 100 284 102" stroke-width="3"/>
  <path d="M160 54 C146 70 142 82 160 96 C178 82 174 70 160 54 Z M146 96 C120 94 118 76 132 70 C130 84 140 84 148 88 M174 96 C200 94 202 76 188 70 C190 84 180 84 172 88" stroke-width="2" fill="rgba(224,178,92,.3)"/>
</svg>`;

// เงาเจดีย์ ต้นตาล และสายน้ำ ด้านล่างของสองฝั่ง
function landscape(flip) {
  const palm = (x, h) => {
    const y = 250 - h;
    let leaves = '';
    for (let a = 0; a < 11; a++) {
      const r = (a / 11) * Math.PI * 2;
      leaves += `M${x} ${y} Q${x + Math.cos(r) * 22} ${y + Math.sin(r) * 22 - 8} ${x + Math.cos(r) * 40} ${y + Math.sin(r) * 34} `;
    }
    return `<g class="palm"><path d="M${x - 3} 250 L${x - 1} ${y} h3 L${x + 4} 250 Z"/><path d="${leaves}" stroke="currentColor" stroke-width="4" fill="none"/></g>`;
  };
  const chedi = (x, s) => `<path class="chedi" transform="translate(${x} 250) scale(${s})"
    d="M-60 0 V-14 H-48 V-26 H-36 V-38 H-28 C-26 -70 -14 -80 -10 -86 V-98 H-6 L-1 -160 H1 L6 -98 H10 V-86 C14 -80 26 -70 28 -38 H36 V-26 H48 V-14 H60 V0 Z"/>`;
  let waves = '';
  for (let row = 0; row < 3; row++) {
    for (let x = -20; x < 620; x += 44) {
      waves += `M${x + row * 22} ${262 + row * 13} q11 -10 22 0 t22 0 `;
    }
  }
  return `<svg class="fx-scene" viewBox="0 0 600 300" preserveAspectRatio="xMidYMax slice"
    style="color:#0d0806;${flip ? 'transform:scaleX(-1)' : ''}">
    <g fill="currentColor" opacity=".85">${chedi(150, 1)}${chedi(255, .65)}${chedi(70, .5)}
    ${palm(350, 150)}${palm(392, 115)}${palm(525, 175)}<path d="M0 252 Q150 238 300 250 T600 246 V300 H0 Z"/></g>
    <path d="${waves}" stroke="#d6a656" stroke-width="1.4" fill="none" opacity=".4"/></svg>`;
}

const backdrop = document.querySelector('.outer-backdrop');
let verseEl, placeEl, timeEl, routeItems = [];

if (backdrop) {
  const left = el('div', 'fx-side left', backdrop);
  left.innerHTML = `${landscape(false)}<div class="fx-arch">${gable}<div class="fx-box">
    <h4>นิราศวัดเจ้าฟ้า</h4><small></small><div class="fx-verse"></div></div></div>`;
  verseEl = left.querySelector('.fx-verse');
  placeEl = left.querySelector('small');

  const right = el('div', 'fx-side right', backdrop);
  right.innerHTML = `${landscape(true)}<div class="fx-arch">${gable}<div class="fx-box">
    <h4>เส้นทางล่องเรือ</h4><small></small>
    <ul class="fx-route">${PLACES.map((p) => `<li>${p}</li>`).join('')}</ul></div></div>`;
  timeEl = right.querySelector('small');
  routeItems = [...right.querySelectorAll('li')];
}

// ---------- ฉากข้างนอกกรอบ: กดแล้วมีเสียง ----------
function flash(node, cls) {
  node.classList.remove(cls);
  void node.getBoundingClientRect();
  node.classList.add(cls);
}
function bindSideDecor() {
  const pan = (n) => (n.closest('.fx-side').classList.contains('left') ? -0.6 : 0.6);
  const bells = [196, 262, 330];
  backdrop.querySelectorAll('.chedi').forEach((c, i) => {
    c.addEventListener('pointerdown', () => { sfx.bell(pan(c), bells[i % 3]); flash(c, 'fx-glow'); });
  });
  backdrop.querySelectorAll('.palm').forEach((g) => {
    g.addEventListener('pointerdown', () => { sfx.leaf(pan(g)); flash(g, 'palm-sway'); });
  });
  backdrop.querySelectorAll('.fx-arch svg').forEach((g) => {
    g.addEventListener('pointerdown', () => { sfx.gong(); flash(g, 'fx-glow'); });
  });
  backdrop.querySelectorAll('.fx-box h4').forEach((h) => {
    h.addEventListener('pointerdown', () => [0, 2, 4, 7].forEach((n, k) => sfx.pluck(n + 1, pan(h), k * 0.08)));
  });
  routeItems.forEach((li, i) => {
    li.addEventListener('pointerdown', () => {
      const target = document.getElementById(`chapter-${i + 1}`);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      sfx.pluck(i + 2);
    });
  });
}
if (backdrop) bindSideDecor();

// พื้นหลังหน้าเว็บ เปลี่ยนสีตามเวลา
const skies = TIMES.map((t) => {
  const layer = el('div', 'fx-sky-bg', document.body);
  layer.style.background = `radial-gradient(circle at 50% 30%, ${t.page[0]}, ${t.page[1]} 80%)`;
  return layer;
});

// ---------- เอฟเฟกต์ในกรอบ ----------
const frame = document.querySelector('.stage-frame-inner');
const tint = el('div', 'fx-tint', frame);
const canvas = el('canvas', 'fx-canvas', frame);
const counter = el('div', 'fx-counter', frame);
const ctx = canvas.getContext('2d');

let W = 0, H = 0, chapter = -1, caught = 0, doneUntil = 0;
const mouse = { x: -999, y: -999, down: false };
const ripples = [];
const sparks = [];
const targets = [];          // สิ่งที่กดได้ในเฟรมนี้ (วาดแล้วลงทะเบียนไว้)
const clickQueue = [];
const mouseVel = { x: 0, y: 0 };
let lastMoveT = 0, lastWingT = 0, blockedAtPointer = false;

function burst(x, y, n = 10, c = '255,230,120') {
  for (let i = 0; i < n; i++) {
    sparks.push({ x, y, vx: rand(-80, 80), vy: rand(-90, 40), life: 1, c });
  }
}
function nearest(px, py) {
  let best = null, bestD = Infinity;
  for (const tg of targets) {
    const d = Math.hypot(tg.x - px, tg.y - py);
    if (d < tg.r && d < bestD) { best = tg; bestD = d; }
  }
  return best;
}
function activate(tg) {
  const pan = Math.max(-1, Math.min(1, (tg.x / W) * 2 - 1));
  const ref = tg.ref;
  switch (tg.type) {
    case 'lotus':
      ref.target = ref.target > 0.5 ? 0 : 1;
      if (ref.target) { sfx.lotusOpen(pan); burst(tg.x, tg.y - 6, 12, '255,170,200'); }
      else sfx.lotusClose(pan);
      ripples.push({ x: tg.x, y: tg.y + 20, life: 1 });
      break;
    case 'bird':
      ref.kick = 260;
      sfx.chirp(pan);
      break;
    case 'butterfly':
      ref.vx += rand(-220, 220); ref.vy -= 280; ref.fear = 1;
      sfx.wing(pan); sfx.sparkle(2, pan);
      burst(tg.x, tg.y, 8, '255,200,120');
      break;
    case 'petal':
      ref.x = Math.random(); ref.y = 0;
      burst(tg.x, tg.y, 8, '255,220,200');
      sfx.leaf(pan);
      break;
    case 'star':
      ref.flash = 1;
      sfx.star(pan, Math.floor(rand(0, 7)));
      break;
  }
}
function background(c) {
  const pan = Math.max(-1, Math.min(1, (c.x / W) * 2 - 1));
  if (c.y > H * WATER_TOP) {
    ripples.push({ x: c.x, y: c.y, life: 1 });
    ripples.push({ x: c.x, y: c.y, life: 0.7 });
    sfx.drip(pan);
  } else {
    burst(c.x, c.y, 6);
    sfx.sparkle(Math.floor(rand(0, 6)), pan);
  }
}
function resolveInteractions() {
  const hover = !blockedAtPointer && (!!nearest(mouse.x, mouse.y) || window.__sceneHover);
  document.body.style.cursor = hover ? 'pointer' : '';
  while (clickQueue.length) {
    const c = clickQueue.shift();
    const tg = nearest(c.x, c.y);
    if (tg) { c.e.__fxHit = true; activate(tg); continue; }
    if (c.e.__sceneHit) continue;      // เรือ/วัด/ต้นไม้ใน WebGL จัดการเอง
    background(c);
  }
}

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  W = frame.clientWidth;
  H = frame.clientHeight;
  canvas.width = W * ratio;
  canvas.height = H * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const many = (n, make) => Array.from({ length: n }, make);
const drifters = many(26, () => ({ x: Math.random(), y: Math.random(), s: rand(0.6, 1.4), p: rand(0, 7) }));
const glints = many(46, () => ({ x: Math.random(), y: rand(0.8, 0.98), p: rand(0, 7), s: rand(4, 14) }));
const stars = many(60, () => ({ x: Math.random(), y: rand(0.07, 0.4), p: rand(0, 7), s: rand(0.5, 1.7) }));
const lotuses = [
  { x: 0.08, y: 0.83, s: 0.8 }, { x: 0.90, y: 0.82, s: 0.65 }, { x: 0.22, y: 0.91, s: 1.2 },
  { x: 0.78, y: 0.89, s: 1.05 }, { x: 0.55, y: 0.96, s: 0.9 }, { x: 0.94, y: 0.97, s: 1.1 }
];
lotuses.forEach((l) => { l.open = 1; l.target = 1; });
const newFly = () => ({ x: rand(0.05, 0.95) * W, y: rand(0.2, 0.9) * H, vx: 0, vy: 0, p: rand(0, 7) });
let flies = many(FIREFLY_COUNT, newFly);

function glow(x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color},${alpha})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function oval(x, y, rx, ry, angle, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  ctx.fill();
}

function lotus(l, t, night, dt) {
  l.open += (l.target - l.open) * Math.min(1, dt * 4);
  const o = l.open;
  const x = l.x * W + Math.sin(t * 0.4 + l.x * 9) * 9;
  const y = l.y * H + Math.sin(t * 1.3 + l.y * 20) * 2.5;
  const s = l.s;
  oval(x - 17 * s, y + 4 * s, 22 * s, 7 * s, 0, '#4f7a4a');
  oval(x + 19 * s, y + 7 * s, 18 * s, 6 * s, 0, '#628c52');
  if (night) glow(x, y - 8 * s, 38 * s, '255,185,90', 0.55 * o);
  [-1.1, 1.1, -0.6, 0.6, 0].forEach((a) => {
    const aa = a * (0.12 + 0.88 * o);                 // หุบ = กลีบตั้งชิดกัน
    oval(x + Math.sin(aa) * 11 * s, y - Math.cos(aa) * 9 * s - (1 - o) * 3 * s,
      5 * s * (1 - 0.3 * (1 - o)), 13 * s * (0.82 + 0.18 * o), aa,
      Math.abs(a) > 0.9 ? '#d9749a' : a === 0 ? '#fbd0dc' : '#ee9db8');
  });
  if (night && o > 0.5) oval(x, y - 20 * s, 2.4 * s, 5 * s, 0, '#ffe9a0');
  targets.push({ x, y: y - 8 * s, r: 34 * s, type: 'lotus', ref: l });
}

const birdList = Array.from({ length: 6 }, () => ({ kick: 0, extra: 0 }));
function birds(t, color, dt) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  const span = W + 220;
  birdList.forEach((b, i) => {
    b.extra += b.kick * dt;
    b.kick *= Math.pow(0.4, dt);
    const x = ((((t * 22 + i * 27 + b.extra) % span) + span) % span) - 110;
    const y = H * 0.14 + (i % 3) * 17 + Math.sin(t + i) * 5 - Math.min(36, b.kick * 0.14);
    const wing = Math.sin(t * (6 + b.kick * 0.06) + i * 1.7) * 5 * (1 + Math.min(1.2, b.kick / 150));
    ctx.beginPath();
    ctx.moveTo(x - 8, y - wing);
    ctx.quadraticCurveTo(x - 3, y - 3, x, y);
    ctx.quadraticCurveTo(x + 3, y - 3, x + 8, y - wing);
    ctx.stroke();
    targets.push({ x, y, r: 26, type: 'bird', ref: b });
  });
}

// กลีบดอกไม้/ใบไม้ปลิว
function falling(dt, t, colors, windX, fallY, count) {
  drifters.slice(0, count).forEach((d, i) => {
    d.x = (d.x + (windX + Math.sin(t + d.p) * 0.015) * dt + 1) % 1;
    d.y = (d.y + fallY * d.s * dt) % 1;
    oval(d.x * W, d.y * H, 6 * d.s, 3 * d.s, t * d.s + d.p, colors[i % colors.length]);
    targets.push({ x: d.x * W, y: d.y * H, r: 16, type: 'petal', ref: d });
  });
}

const flyers = [['#f6a83c', 0.18, 0.5], ['#fff2a8', 0.74, 0.44], ['#f08fb0', 0.52, 0.55]]
  .map(([c, bx, by], i) => ({ c, bx, by, i, x: null, y: 0, vx: 0, vy: 0, fear: 0 }));
function butterflies(t, dt) {
  const swipe = Math.hypot(mouseVel.x, mouseVel.y);
  flyers.forEach((b) => {
    const hx = b.bx * W + Math.sin(t * 0.7 + b.i * 2) * 55;
    const hy = b.by * H + Math.sin(t * 1.4 + b.i) * 28;
    if (b.x === null) { b.x = hx; b.y = hy; }
    const dx = b.x - mouse.x, dy = b.y - mouse.y;
    const d = Math.hypot(dx, dy) || 1;
    b.vx += (hx - b.x) * 2.2 * dt;
    b.vy += (hy - b.y) * 2.2 * dt;
    if (d < 120 && (swipe > 160 || mouse.down)) {        // ปัดหรือกดใกล้ๆ → ตกใจบินหนี
      const push = (1 - d / 120) * (400 + swipe) * dt * 10;
      b.vx += (dx / d) * push;
      b.vy += (dy / d) * push;
      const now = performance.now();
      if (b.fear < 0.3 && now - lastWingT > 140) { sfx.wing((b.x / W) * 2 - 1); lastWingT = now; }
      b.fear = 1;
    }
    const damp = Math.pow(0.35, dt);
    b.vx *= damp; b.vy *= damp;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 420) { b.vx *= 420 / sp; b.vy *= 420 / sp; }
    b.x = Math.max(10, Math.min(W - 10, b.x + b.vx * dt));
    b.y = Math.max(60, Math.min(H - 10, b.y + b.vy * dt));
    b.fear = Math.max(0, b.fear - dt * 0.8);
    const open = Math.abs(Math.sin(t * (9 + b.fear * 14) + b.i)) * 0.8 + 0.2;
    oval(b.x - 6 * open, b.y, 7 * open, 9, -0.5, b.c);
    oval(b.x + 6 * open, b.y, 7 * open, 9, 0.5, b.c);
    oval(b.x, b.y, 1.5, 7, 0, '#4a3020');
    targets.push({ x: b.x, y: b.y, r: 28, type: 'butterfly', ref: b });
  });
}

function fireflies(dt, t) {
  const now = performance.now();
  if (doneUntil && now > doneUntil) {
    doneUntil = 0;
    caught = 0;
    flies = many(FIREFLY_COUNT, newFly);
  }
  flies = flies.filter((f) => {
    const dx = mouse.x - f.x;
    const dy = mouse.y - f.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 130 && dist > 1) {   // บินเข้าหาเมาส์
      const pull = mouse.down ? 520 : 240;
      f.vx += (dx / dist) * pull * dt;
      f.vy += (dy / dist) * pull * dt;
    }
    f.vx = (f.vx + Math.sin(t * 1.7 + f.p * 3) * 60 * dt) * 0.97;
    f.vy = (f.vy + Math.cos(t * 1.3 + f.p * 5) * 60 * dt) * 0.97;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.x < 10 || f.x > W - 10) f.vx *= -1;
    if (f.y < 60 || f.y > H - 10) f.vy *= -1;
    f.x = Math.max(10, Math.min(W - 10, f.x));
    f.y = Math.max(60, Math.min(H - 10, f.y));

    if (mouse.down && dist < 40 && !doneUntil) {   // จับได้
      caught++;
      sfx.sparkle(caught % 8, (f.x / W) * 2 - 1);
      for (let i = 0; i < 12; i++) {
        sparks.push({ x: f.x, y: f.y, vx: rand(-80, 80), vy: rand(-80, 80), life: 1 });
      }
      if (caught >= FIREFLY_GOAL) { doneUntil = now + 4000; sfx.win(); }
      return false;
    }
    const a = 0.55 + Math.sin(t * 3 + f.p * 7) * 0.4;
    glow(f.x, f.y, 17, '220,255,110', a);
    oval(f.x, f.y, 2.4, 2.4, 0, '#fffbd0');
    return true;
  });
  counter.textContent = doneUntil
    ? '✨ จับครบแล้ว จิตสงบเย็นดั่งแสงธรรม ✨'
    : `กดค้างแล้วลากเพื่อจับหิ่งห้อย ${caught}/${FIREFLY_GOAL}`;
}

function draw(dt, t) {
  ctx.clearRect(0, 0, W, H);
  targets.length = 0;
  mouseVel.x *= Math.pow(0.001, dt);
  mouseVel.y *= Math.pow(0.001, dt);
  const night = chapter === 4;

  // หมอกเหนือผิวน้ำ
  const mist = ['255,225,225', '255,255,240', '255,232,180', '255,170,130', '140,160,255'][chapter];
  for (let i = 0; i < 6; i++) {
    const x = ((i * 0.23 * W + t * (7 + i)) % (W + 300)) - 150;
    ctx.save();
    ctx.translate(x, H * (WATER_TOP + (i % 2) * 0.015));
    ctx.scale(1, 0.22);
    glow(0, 0, 150, mist, night ? 0.2 : 0.38);
    ctx.restore();
  }

  // ประกายน้ำ
  const shine = ['255,214,200', '255,255,255', '255,232,160', '255,170,90', '170,200,255'][chapter];
  glints.forEach((g) => {
    const a = Math.max(0, Math.sin(t * 1.8 + g.p)) * 0.55;
    ctx.fillStyle = `rgba(${shine},${a})`;
    ctx.fillRect(g.x * W + Math.sin(t * 0.5 + g.p) * 12, g.y * H, g.s, 1.4);
  });

  // ลำแสง
  if (!night) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(chapter === 3 ? W : 0, 0);
    if (chapter === 3) ctx.scale(-1, 1);
    for (let i = 0; i < 4; i++) {
      const g = ctx.createLinearGradient(0, 0, W * 0.7, H * 0.6);
      g.addColorStop(0, `rgba(255,214,140,${0.13 + Math.sin(t * 0.6 + i) * 0.05})`);
      g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-20, -20);
      ctx.lineTo(W * (0.35 + i * 0.22), H * 0.65);
      ctx.lineTo(W * (0.45 + i * 0.22), H * 0.65);
      ctx.fill();
    }
    ctx.restore();
  }

  lotuses.forEach((l) => lotus(l, t, night, dt));

  if (chapter === 0) { birds(t, '#6d4a4a', dt); falling(dt, t, ['#f4a9bc', '#ffd9e0'], 0.02, 0.05, 20); }
  if (chapter === 1) { butterflies(t, dt); falling(dt, t, ['#fff1a0', '#b9d86a'], 0.015, 0.04, 14); }
  if (chapter === 2) { birds(t, '#5a4020', dt); butterflies(t, dt); falling(dt, t, ['#c7a23c', '#8fae45', '#d98e32'], 0.11, 0.05, 26); }
  if (chapter === 3) {
    birds(t, '#3c1c24', dt);
    falling(dt, t, ['#e8902f', '#c4532a'], 0.03, 0.055, 14);
    drifters.forEach((d) => glow(d.x * W + Math.sin(t * 0.5 + d.p) * 20,
      (1 - ((t * 0.025 * d.s + d.y) % 1)) * H, 5 * d.s, '255,214,90', 0.85));
  }
  if (night) {
    stars.forEach((s) => {
      const sx = s.x * W, sy = s.y * H * 0.6;
      if (s.flash > 0) { glow(sx, sy, 26, '255,240,180', s.flash * 0.9); s.flash -= dt * 1.4; }
      oval(sx, sy, s.s, s.s, 0, `rgba(255,255,235,${0.3 + Math.abs(Math.sin(t + s.p)) * 0.7})`);
      targets.push({ x: sx, y: sy, r: 13, type: 'star', ref: s });
    });
    fireflies(dt, t);
  }

  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.life -= dt * 0.8;
    if (r.life <= 0) { ripples.splice(i, 1); continue; }
    ctx.strokeStyle = `rgba(235,245,255,${r.life * 0.7})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, (1 - r.life) * 65, (1 - r.life) * 20, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt * 1.4;
    if (s.life <= 0) { sparks.splice(i, 1); continue; }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    glow(s.x, s.y, 7, s.c || '255,230,120', s.life);
  }
  resolveInteractions();
}

// ---------- เมาส์ / นิ้ว ----------
const blocked = (target) =>
  target.closest && target.closest('.poem-card, .trigger-game-box, .hero-card, .minigame-modal, .hud-top, button');
let lastRipple = 0;

function move(clientX, clientY) {
  const r = frame.getBoundingClientRect();
  const nx = clientX - r.left, ny = clientY - r.top;
  const now = performance.now();
  const dtm = (now - lastMoveT) / 1000;
  if (dtm > 0 && dtm < 0.15) {
    mouseVel.x = (nx - mouse.x) / dtm;
    mouseVel.y = (ny - mouse.y) / dtm;
  }
  lastMoveT = now;
  mouse.x = nx;
  mouse.y = ny;
  if (mouse.y > H * WATER_TOP && mouse.y < H && mouse.x > 0 && mouse.x < W && now - lastRipple > 140) {
    ripples.push({ x: mouse.x, y: mouse.y, life: 1 });
    lastRipple = now;
  }
}
window.addEventListener('pointermove', (e) => {
  blockedAtPointer = !!blocked(e.target);
  move(e.clientX, e.clientY);
});
window.addEventListener('pointerdown', (e) => {
  if (blocked(e.target)) return;
  move(e.clientX, e.clientY);
  mouse.down = true;
  if (mouse.x >= 0 && mouse.x <= W && mouse.y >= 0 && mouse.y <= H) {
    clickQueue.push({ x: mouse.x, y: mouse.y, e });
  }
  if (chapter === 4 && e.pointerType === 'mouse') e.preventDefault(); // กันตัวหนังสือถูกคลุมตอนลาก
});
const release = () => { mouse.down = false; };
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);
window.addEventListener('touchmove', (e) => {
  move(e.touches[0].clientX, e.touches[0].clientY);
  if (!blocked(e.target)) mouse.down = true;
}, { passive: true });
window.addEventListener('touchend', () => { release(); mouse.x = mouse.y = -999; });

// ---------- เปลี่ยนบท ----------
function setChapter(index) {
  chapter = index;
  sfx.setChapter(index);
  const time = TIMES[index];
  const ch = CHAPTERS[index];
  tint.style.backgroundColor = time.tint;
  skies.forEach((s, i) => s.classList.toggle('on', i === index));
  counter.classList.toggle('on', index === 4);
  if (verseEl) {
    verseEl.textContent = ch.verse;
    placeEl.textContent = ch.location;
    timeEl.textContent = time.name;
    routeItems.forEach((li, i) => {
      li.className = i === index ? 'now' : i < index ? 'past' : '';
    });
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const dots = [...document.querySelectorAll('.chapter-dot')];
  const index = Math.max(0, dots.findIndex((d) => d.classList.contains('active')));
  if (index !== chapter) setChapter(index);
  if (frame.clientWidth !== W || frame.clientHeight !== H) resize();
  draw(dt, now / 1000);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ให้ main.js เรียกใช้เอฟเฟกต์ 2D (เช่น คลื่นใต้เรือ) ได้
window.__fx = { ripple: (x, y) => ripples.push({ x, y, life: 1 }), burst };
