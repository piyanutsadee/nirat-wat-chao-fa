// เสียงทั้งหมดสร้างสดด้วย Web Audio API ไม่ต้องมีไฟล์เสียง
// ใช้งาน: import { sfx } from './audio/AudioManager.js'; แล้วเรียก sfx.pluck(3) ฯลฯ
const STORE = 'nirat-audio-v1';
const PENTA = [0, 2, 4, 7, 9];
const note = (base, i) => base * Math.pow(2, (PENTA[i % 5] + 12 * Math.floor(i / 5)) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ระดับเสียงบรรยากาศ + โน้ตตั้งต้นของแต่ละบท (gap = ช่วงห่างของเสียงระนาด วินาที)
const PROFILES = [
  { water: 0.45, wind: 0.12, birds: 0.35, crickets: 0.15, frogs: 0,    root: 293.66, gap: [2.2, 4.2] },
  { water: 0.5,  wind: 0.1,  birds: 0.55, crickets: 0,    frogs: 0,    root: 329.63, gap: [2.0, 3.8] },
  { water: 0.5,  wind: 0.3,  birds: 0.3,  crickets: 0.1,  frogs: 0.25, root: 293.66, gap: [2.4, 4.4] },
  { water: 0.4,  wind: 0.28, birds: 0.25, crickets: 0.3,  frogs: 0.1,  root: 261.63, gap: [2.8, 4.8] },
  { water: 0.3,  wind: 0.25, birds: 0,    crickets: 0.85, frogs: 0.35, root: 220,    gap: [3.5, 6.0] }
];

class AudioManager {
  constructor() {
    this.ctx = null;
    this.started = false;
    this.enabled = true;
    this.volume = 0.7;
    this.chapter = 0;
    this.energy = 0;
    try {
      const s = JSON.parse(localStorage.getItem(STORE) || '{}');
      if (typeof s.enabled === 'boolean') this.enabled = s.enabled;
      if (typeof s.volume === 'number') this.volume = clamp(s.volume, 0, 1);
    } catch (_) { /* ไม่มี localStorage ก็ใช้ค่าเริ่มต้น */ }

    this.buildUI();

    // เบราว์เซอร์ห้ามเล่นเสียงก่อนผู้ใช้กด/แตะ จึงปลดล็อกตอนมี gesture แรก
    ['pointerdown', 'keydown', 'touchend'].forEach((n) =>
      window.addEventListener(n, () => this.start(), { passive: true })
    );
    // เสียงคลิกปุ่มทั่วไป (ปุ่มในมินิเกมมีเสียงของตัวเอง)
    document.addEventListener('pointerdown', (e) => {
      const t = e.target;
      if (!t.closest) return;
      if (t.closest('.mg-stage') || t.closest('#sound-ui')) return;
      if (t.closest('button, .chapter-dot')) this.click();
    });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (this.enabled) this.ctx.resume();
    });
  }

  // ---------- เริ่มระบบ ----------
  start() {
    if (this.started) {
      if (this.enabled && this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.sfxBus = c.createGain();
    this.ambBus = c.createGain();
    this.musicBus = c.createGain();
    this.ambBus.gain.value = 0.55;
    this.musicBus.gain.value = 0.35;
    [this.sfxBus, this.ambBus, this.musicBus].forEach((b) => b.connect(this.master));

    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.buildAmbience();
    this.started = true;
    this.applyVolume(true);
    if (c.state === 'suspended') c.resume();
    this.setHint(false);
    this.timer = setInterval(() => this.update(), 120);
    this.scheduleMusic();
  }

  live() {
    return this.started && this.enabled && this.ctx.state === 'running' && !document.hidden;
  }

  applyVolume(now) {
    if (!this.started) return;
    const v = this.enabled ? Math.pow(this.volume, 1.6) : 0;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, now ? 0.01 : 0.08);
  }

  setEnabled(on) {
    this.enabled = on;
    this.start();
    this.applyVolume();
    if (this.started && on && this.ctx.state === 'suspended') this.ctx.resume();
    this.save();
    this.refreshUI();
  }

  save() {
    try { localStorage.setItem(STORE, JSON.stringify({ enabled: this.enabled, volume: this.volume })); } catch (_) {}
  }

  // ---------- อุปกรณ์สร้างเสียง ----------
  node(pan, bus) {
    const out = bus || this.sfxBus;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      p.connect(out);
      return p;
    }
    return out;
  }

  tone({ f, to, type = 'sine', a = 0.004, d = 0.3, v = 0.2, pan = 0, delay = 0, bus }) {
    if (!this.live()) return;
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g);
    g.connect(this.node(pan, bus));
    o.start(t);
    o.stop(t + a + d + 0.05);
  }

  noise({ type = 'lowpass', f = 1000, to, q = 1, a = 0.005, d = 0.3, v = 0.2, pan = 0, delay = 0, bus }) {
    if (!this.live()) return;
    const c = this.ctx;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + a + d);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    s.connect(fl);
    fl.connect(g);
    g.connect(this.node(pan, bus));
    s.start(t, Math.random() * 1.4);
    s.stop(t + a + d + 0.05);
  }

  loopNoise(type, freq, q) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.value = 0;
    src.connect(f);
    f.connect(g);
    src.start();
    return { g, f };
  }

  // ---------- บรรยากาศ: น้ำ ลม + ตัวกำหนดเวลาเสียงนก จิ้งหรีด กบ ----------
  buildAmbience() {
    const c = this.ctx;
    this.water = this.loopNoise('lowpass', 650, 0.7);
    this.hiss = this.loopNoise('bandpass', 2600, 0.8);
    this.wind = this.loopNoise('bandpass', 420, 0.9);
    this.gameWind = this.loopNoise('bandpass', 900, 1.2);
    this.water.g.connect(this.ambBus);
    this.hiss.g.connect(this.ambBus);
    this.wind.g.connect(this.ambBus);
    this.gameWind.g.connect(this.sfxBus);
    const sway = (target, freq, depth) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = freq;
      g.gain.value = depth;
      o.connect(g);
      g.connect(target);
      o.start();
    };
    sway(this.water.f.frequency, 0.18, 140);
    sway(this.wind.f.frequency, 0.07, 170);
  }

  update() {
    if (!this.started) return;
    const p = PROFILES[this.chapter];
    const t = this.ctx.currentTime;
    this.energy *= 0.93;
    this.water.g.gain.setTargetAtTime(p.water * (0.3 + this.energy * 0.6), t, 0.4);
    this.hiss.g.gain.setTargetAtTime(p.water * (0.05 + this.energy * 0.14), t, 0.4);
    this.wind.g.gain.setTargetAtTime(p.wind * 0.3, t, 0.8);
    if (!this.live()) return;
    const pan = rand(-0.8, 0.8);
    if (Math.random() < p.birds * 0.05) this.chirp(pan, true);
    if (Math.random() < p.crickets * 0.08) this.cricket(pan);
    if (Math.random() < p.frogs * 0.03) this.frog(pan);
  }

  scheduleMusic() {
    const p = PROFILES[this.chapter];
    if (this.live()) {
      let idx = Math.floor(rand(0, 6));
      const n = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        idx = clamp(idx + Math.floor(rand(-2, 3)), 0, 9);
        this.ranad(note(p.root, idx), k * 0.34);
      }
    }
    this.musicTimer = setTimeout(() => this.scheduleMusic(), rand(p.gap[0], p.gap[1]) * 1000);
  }

  ranad(f, delay = 0) {
    this.tone({ f, type: 'triangle', a: 0.003, d: 0.9, v: 0.2, delay, bus: this.musicBus });
    this.tone({ f: f * 2.01, type: 'sine', a: 0.002, d: 0.3, v: 0.07, delay, bus: this.musicBus });
  }

  setChapter(i) {
    const changed = i !== this.chapter;
    this.chapter = i;
    if (changed && this.live()) this.bell(0, 196);
  }

  scrollEnergy(v) {
    this.energy = Math.min(1, this.energy + v * 0.15);
  }

  setWind(level) {
    if (!this.live()) return;
    this.gameWind.g.gain.setTargetAtTime(level, this.ctx.currentTime, 0.1);
  }

  // ---------- เสียงประกอบต่างๆ ----------
  click() { this.tone({ f: 880, to: 520, type: 'triangle', d: 0.05, v: 0.07 }); }

  pluck(i = 0, pan = 0, delay = 0) {
    const f = note(392, i);
    this.tone({ f, type: 'triangle', d: 0.55, v: 0.13, pan, delay });
    this.tone({ f: f * 2, type: 'sine', d: 0.25, v: 0.04, pan, delay });
  }

  open() { [0, 2, 4].forEach((n, k) => this.pluck(n + 1, 0, k * 0.07)); }

  splash(pan = 0, size = 1) {
    this.noise({ f: 2200, to: 300, a: 0.01, d: 0.35 * size, v: 0.2 * size, pan });
    this.tone({ f: 180, to: 60, d: 0.2, v: 0.13 * size, pan });
  }

  drip(pan = 0) {
    this.tone({ f: 1300, to: 500, d: 0.14, v: 0.11, pan });
    this.tone({ f: 2600, to: 1000, d: 0.1, v: 0.035, pan, delay: 0.03 });
  }

  paddle() {
    this.noise({ f: 1100, to: 180, a: 0.03, d: 0.55, v: 0.24 });
    this.tone({ f: 120, to: 55, d: 0.3, v: 0.2 });
    this.drip(0.2);
  }

  wing(pan = 0) {
    for (let k = 0; k < 4; k++) {
      this.noise({ type: 'bandpass', f: 2200, q: 2, d: 0.035, v: 0.05, pan, delay: k * 0.04 });
    }
  }

  chirp(pan = 0, ambient = false) {
    const f = rand(2200, 3000);
    const bus = ambient ? this.ambBus : undefined;
    const v = ambient ? 0.09 : 0.07;
    this.tone({ f, to: f * 1.35, a: 0.005, d: 0.08, v, pan, bus });
    this.tone({ f: f * 1.25, to: f * 0.9, a: 0.005, d: 0.1, v: v * 0.85, pan, delay: 0.11, bus });
    if (ambient && Math.random() < 0.5) {
      this.tone({ f: f * 1.1, to: f * 1.5, a: 0.005, d: 0.07, v: v * 0.8, pan, delay: 0.26, bus });
    }
  }

  bell(pan = 0, f = 196) {
    [[1, 1], [2.76, 0.5], [5.4, 0.28], [8.93, 0.15]].forEach(([r, amp], k) => {
      this.tone({ f: f * r, d: 2.8 / (1 + k * 0.6), v: 0.09 * amp, a: 0.006, pan });
    });
  }

  gong() {
    this.bell(0, 98);
    this.noise({ f: 600, to: 150, a: 0.01, d: 1.2, v: 0.08 });
  }

  woodblock() {
    this.tone({ f: 1000, to: 880, type: 'triangle', d: 0.07, v: 0.14 });
    this.tone({ f: 1000, to: 880, type: 'triangle', d: 0.07, v: 0.12, delay: 0.15 });
  }

  merchant() {
    this.woodblock();
    this.sparkle(1);
    this.tone({ f: 1000, to: 880, type: 'triangle', d: 0.07, v: 0.1, delay: 0.32 });
  }

  boat() {
    this.noise({ f: 500, to: 200, a: 0.02, d: 0.35, v: 0.18 });
    this.tone({ f: 95, to: 70, type: 'sawtooth', d: 0.3, v: 0.04, delay: 0.05 });
    this.splash(0, 0.5);
  }

  sparkle(i = 0, pan = 0) {
    const f = note(1046, i);
    this.tone({ f, d: 0.35, v: 0.08, pan });
    this.tone({ f: f * 1.5, d: 0.25, v: 0.04, pan, delay: 0.06 });
  }

  star(pan = 0, i = 0) { this.sparkle(i + 3, pan); }

  leaf(pan = 0) {
    this.noise({ type: 'highpass', f: 3500, d: 0.1, v: 0.06, pan });
    this.noise({ type: 'highpass', f: 4200, d: 0.08, v: 0.05, pan, delay: 0.07 });
  }

  lotusOpen(pan = 0) {
    [0, 2, 4, 7].forEach((n, k) => this.pluck(n + 2, pan, k * 0.07));
    this.drip(pan);
  }

  lotusClose(pan = 0) {
    [4, 2, 0].forEach((n, k) => this.pluck(n, pan, k * 0.08));
    this.noise({ f: 700, to: 250, d: 0.25, v: 0.06, pan });
  }

  win() {
    [2, 3, 4, 5, 6, 7].forEach((n, k) => this.pluck(n, 0, k * 0.09));
    setTimeout(() => this.bell(0, 392), 520);
  }

  wrong() { this.tone({ f: 220, to: 140, type: 'triangle', d: 0.22, v: 0.12 }); }

  scratch() { this.noise({ type: 'bandpass', f: 2400, q: 0.9, d: 0.07, v: 0.06 }); }

  cricket(pan = 0) {
    if (!this.live()) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    const am = c.createGain();
    const lfo = c.createOscillator();
    const lg = c.createGain();
    const env = c.createGain();
    const dur = rand(0.5, 1.2);
    o.frequency.value = rand(4100, 4700);
    lfo.type = 'square';
    lfo.frequency.value = rand(26, 34);
    am.gain.value = 0.5;
    lg.gain.value = 0.5;
    lfo.connect(lg);
    lg.connect(am.gain);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
    env.gain.setValueAtTime(0.06, t + dur - 0.1);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(am);
    am.connect(env);
    env.connect(this.node(pan, this.ambBus));
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  }

  frog(pan = 0) {
    const n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      this.tone({ f: 170, to: 115, type: 'sawtooth', d: 0.09, v: 0.035, pan, delay: k * 0.14, bus: this.ambBus });
    }
  }

  // ---------- ปุ่มควบคุมเสียง ----------
  buildUI() {
    const css = document.createElement('style');
    css.textContent = `
#sound-ui{position:fixed;right:14px;bottom:14px;z-index:60;display:flex;align-items:center;gap:8px;padding:5px 12px 5px 5px;border-radius:999px;background:rgba(24,19,14,.86);border:1px solid #d6a656;color:#f5e3bb;font:600 .8rem 'Noto Serif Thai',serif;box-shadow:0 6px 20px rgba(0,0,0,.4)}
#sound-btn{width:36px;height:36px;border-radius:50%;border:0;background:#b58338;color:#fff8e8;font-size:1.1rem;line-height:1;cursor:pointer}
#sound-btn:hover,#sound-btn:focus-visible{background:#d6a656;outline:2px solid #fff3cf;outline-offset:2px}
#sound-vol{width:80px;accent-color:#d6a656}
#sound-hint{white-space:nowrap;animation:sndPulse 1.8s ease-in-out infinite}
#sound-hint.gone,#sound-ui.off #sound-vol{display:none}
@keyframes sndPulse{50%{opacity:.45}}
@media (prefers-reduced-motion:reduce){#sound-hint{animation:none}}
@media (max-width:560px){#sound-vol{display:none}#sound-hint{font-size:.72rem}}`;
    document.head.appendChild(css);

    const box = document.createElement('div');
    box.id = 'sound-ui';
    box.innerHTML = `<button id="sound-btn" type="button" aria-label="เปิดหรือปิดเสียง"></button>
<span id="sound-hint">แตะที่ใดก็ได้เพื่อเปิดเสียงประกอบ</span>
<input id="sound-vol" type="range" min="0" max="100" aria-label="ระดับเสียง">`;
    document.body.appendChild(box);
    this.box = box;
    this.btn = box.querySelector('#sound-btn');
    this.hint = box.querySelector('#sound-hint');
    this.slider = box.querySelector('#sound-vol');
    this.slider.value = Math.round(this.volume * 100);

    // จำไว้ว่าก่อนกดปุ่ม เสียงเริ่มทำงานแล้วหรือยัง (กดปุ่มครั้งแรกต้องไม่ถูกนับเป็นการปิด)
    this.btn.addEventListener('pointerdown', () => { this.wasStarted = this.started; }, true);
    this.btn.addEventListener('click', () => {
      if (!this.wasStarted && this.enabled) { this.refreshUI(); return; }
      this.setEnabled(!this.enabled);
      if (this.enabled) this.click();
    });
    this.slider.addEventListener('input', () => {
      this.volume = this.slider.value / 100;
      this.start();
      this.applyVolume();
      this.save();
    });
    this.refreshUI();
  }

  setHint(show) {
    if (this.hint) this.hint.classList.toggle('gone', !show);
  }

  refreshUI() {
    if (!this.btn) return;
    this.btn.textContent = this.enabled ? '🔊' : '🔇';
    this.btn.setAttribute('aria-pressed', String(this.enabled));
    this.box.classList.toggle('off', !this.enabled);
    if (!this.enabled) this.setHint(false);
  }
}

export const sfx = new AudioManager();
