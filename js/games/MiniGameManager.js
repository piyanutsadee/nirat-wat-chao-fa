import { sfx } from '../audio/AudioManager.js';
import { lotusSprite, padSprite } from '../graphics/lotus.js';

export class MiniGameManager {
  constructor({ onComplete, onSkip }) {
    this.modal = document.getElementById('minigame-modal');
    this.tagEl = document.getElementById('mg-chapter-tag');
    this.titleEl = document.getElementById('mg-title');
    this.instructionEl = document.getElementById('mg-instruction');
    this.stageEl = document.getElementById('mg-stage');
    this.fillEl = document.getElementById('mg-progress-fill');
    this.statusEl = document.getElementById('mg-status-text');
    this.skipBtn = document.getElementById('btn-skip-game');

    this.onComplete = onComplete;
    this.onSkip = onSkip;
    this.activeChapter = null;
    this.cleanupFn = null;
    this.isFinished = false;

    this.skipBtn.addEventListener('click', () => {
      const ch = this.activeChapter;
      this.close();
      if (this.onSkip && ch) this.onSkip(ch);
    });
  }

  open(chapter) {
    this.activeChapter = chapter;
    this.isFinished = false;
    this.tagEl.textContent = `มินิเกมประจำบทที่ ${chapter.thaiNum} • ${chapter.minigame.genreLabel}`;
    this.titleEl.textContent = chapter.minigame.title;
    this.instructionEl.textContent = chapter.minigame.instruction;
    this.updateProgress(0);
    this.stageEl.innerHTML = '';

    this.modal.classList.remove('hidden');
    this.modal.setAttribute('aria-hidden', 'false');
    sfx.open();

    switch (chapter.minigame.type) {
      case 'paddle_rhythm':
        this.runPaddleRhythmGame();
        break;
      case 'lotus_collect':
        this.runLotusCollectGame();
        break;
      case 'wind_steer':
        this.runWindSteerGame();
        break;
      case 'pagoda_rubbing':
        this.runPagodaRubbingGame();
        break;
      case 'verse_weave':
        this.runVerseWeaveGame();
        break;
      default:
        this.runPaddleRhythmGame();
    }
  }

  close() {
    // ยกเลิกตัวจับเวลาปิดเกมที่ค้างอยู่ (กันกดข้ามระหว่างรอแล้วเรียก onComplete ซ้ำ)
    if (this.finishTimer) {
      clearTimeout(this.finishTimer);
      this.finishTimer = null;
    }
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
    this.modal.classList.add('hidden');
    this.modal.setAttribute('aria-hidden', 'true');
  }

  // ปิดเกมและไปบทถัดไป (เรียกได้ทั้งจากตัวจับเวลาและจากปุ่ม "ไปต่อ")
  finish() {
    const ch = this.activeChapter;
    this.close();
    if (this.onComplete && ch) this.onComplete(ch);
  }

  // options.holdMs       = เวลาค้างหน้าจอหลังชนะก่อนปิดเกม (ค่าเริ่มต้น 750ms)
  // options.onFinishStart = ฟังก์ชันที่เรียกทันทีเมื่อชนะ เช่น เผยภาพให้ชัด
  updateProgress(percent, customLabel = null, options = {}) {
    const clamped = Math.min(100, Math.max(0, Math.round(percent)));
    this.fillEl.style.width = `${clamped}%`;
    this.statusEl.textContent = customLabel || `ความคืบหน้า: ${clamped}%`;

    if (clamped >= 100 && !this.isFinished) {
      this.isFinished = true;
      sfx.win();
      if (options.onFinishStart) options.onFinishStart();
      this.finishTimer = setTimeout(() => this.finish(), options.holdMs ?? 750);
    }
  }

  // เกมที่ 1: จับจังหวะฝีพาย (วงกลมสมมาตร 1:1 + วงคลื่นผิวน้ำกระเพื่อม)
  runPaddleRhythmGame() {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.cursor = 'pointer';
    this.stageEl.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const syncCanvasSize = () => {
      const rect = this.stageEl.getBoundingClientRect();
      const w = Math.max(300, Math.round(rect.width));
      const h = Math.max(260, Math.round(rect.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    let { w, h } = syncCanvasSize();
    const onResize = () => {
      ({ w, h } = syncCanvasSize());
    };
    window.addEventListener('resize', onResize);

    let hits = 0;
    const targetHits = 5;
    let pulseRadius = 22;
    let growing = true;
    let feedbackText = 'รอวงกลมสีทองขยายพอดีวงเป้า แล้วแตะผิวน้ำ';
    let feedbackAlpha = 1;
    let animId = null;

    const waterRipples = [];

    const spawnWaterRipples = (x, y, isSuccess) => {
      const ringCount = isSuccess ? 4 : 2;
      for (let i = 0; i < ringCount; i++) {
        waterRipples.push({
          x,
          y,
          radius: 10 + i * 10,
          maxRadius: isSuccess ? 145 + i * 26 : 85 + i * 18,
          speed: isSuccess ? 2.4 - i * 0.2 : 1.7,
          alpha: 0.9 - i * 0.16,
          color: isSuccess ? '234, 194, 112' : '155, 205, 224'
        });
      }
    };

    const targetMin = 56;
    const targetMax = 84;
    const targetMid = (targetMin + targetMax) * 0.5;

    const handleTap = (e) => {
      const rect = canvas.getBoundingClientRect();
      const tapX = e.clientX - rect.left;
      const tapY = e.clientY - rect.top;

      if (pulseRadius >= targetMin - 6 && pulseRadius <= targetMax + 6) {
        hits++;
        feedbackText = `จ้วงพายงดงาม! (${hits}/${targetHits})`;
        feedbackAlpha = 1;
        sfx.paddle();
        sfx.pluck(hits + 1);
        spawnWaterRipples(tapX, tapY, true);
        spawnWaterRipples(w * 0.5, h * 0.46, true);
        this.updateProgress((hits / targetHits) * 100, `จ้วงพายสำเร็จ: ${hits}/${targetHits} ครั้ง`);
        pulseRadius = 22;
      } else {
        feedbackText = 'จังหวะยังไม่พอดี รอวงสีทองเข้าวงเป้า';
        feedbackAlpha = 1;
        sfx.drip();
        spawnWaterRipples(tapX, tapY, false);
      }
    };

    canvas.addEventListener('pointerdown', handleTap);

    let t = 0;
    const render = () => {
      t += 0.03;

      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.46, 20, w * 0.5, h * 0.5, w * 0.65);
      bgGrad.addColorStop(0, '#274d63');
      bgGrad.addColorStop(1, '#162d3b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      for (let row = 0; row < 6; row++) {
        const yBase = 28 + row * 44;
        ctx.strokeStyle = `rgba(176, 214, 226, ${0.07 + (row % 2) * 0.03})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 12) {
          const waveY =
            yBase +
            Math.sin(x * 0.035 + t * 1.4 + row * 1.3) * 3.5 +
            Math.cos(x * 0.02 - t) * 2.0;
          if (x === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }
      ctx.restore();

      const cx = w * 0.5;
      const cy = h * 0.46;

      for (let i = waterRipples.length - 1; i >= 0; i--) {
        const rp = waterRipples[i];
        rp.radius += rp.speed;
        rp.alpha *= 0.965;

        ctx.save();
        ctx.strokeStyle = `rgba(${rp.color}, ${rp.alpha.toFixed(3)})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (rp.radius >= rp.maxRadius || rp.alpha <= 0.02) {
          waterRipples.splice(i, 1);
        }
      }

      ctx.save();
      ctx.fillStyle = 'rgba(214, 168, 86, 0.10)';
      ctx.beginPath();
      ctx.arc(cx, cy, targetMax, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(232, 190, 108, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, targetMid, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(232, 190, 108, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, targetMin, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, targetMax, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (growing) {
        pulseRadius += 1.05;
        if (pulseRadius >= 98) growing = false;
      } else {
        pulseRadius -= 1.05;
        if (pulseRadius <= 22) growing = true;
      }

      const inSweetSpot = pulseRadius >= targetMin - 6 && pulseRadius <= targetMax + 6;

      ctx.save();
      ctx.strokeStyle = inSweetSpot ? '#ffd97d' : '#8ec4d6';
      ctx.lineWidth = inSweetSpot ? 4 : 3;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = inSweetSpot ? '#ffd97d' : 'rgba(249, 244, 232, 0.85)';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = `rgba(249, 244, 232, ${Math.max(0.75, feedbackAlpha)})`;
      ctx.font = '600 15px "Noto Serif Thai", serif';
      ctx.textAlign = 'center';
      ctx.fillText(feedbackText, cx, h - 22);
      feedbackAlpha = Math.max(0.75, feedbackAlpha - 0.01);

      animId = requestAnimationFrame(render);
    };

    render();

    this.cleanupFn = () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('pointerdown', handleTap);
      window.removeEventListener('resize', onResize);
    };
  }

  // เกมที่ 2: เก็บดอกบัวลอยน้ำ
  runLotusCollectGame() {
    this.stageEl.style.background = 'linear-gradient(180deg, #2b5466 0%, #1c3947 100%)';
    let collected = 0;
    const goal = 6;
    const lotusImg = lotusSprite(64); // ดอกบัวแบบเดียวกับในฉากหลัก
    const padImg = padSprite(52);     // จอกแหนตัวหลอก

    const spawnInterval = setInterval(() => {
      if (this.isFinished) return;
      const isLotus = Math.random() > 0.25;
      const item = document.createElement('button');
      item.type = 'button';
      const size = isLotus ? 64 : 52;
      item.innerHTML = `<img src="${isLotus ? lotusImg : padImg}" width="${size}" height="${size}" alt="" draggable="false" style="display:block;pointer-events:none">`;
      item.setAttribute('aria-label', isLotus ? 'ดอกบัว' : 'จอกแหน');
      item.style.position = 'absolute';
      item.style.padding = '0';
      item.style.background = 'transparent';
      item.style.border = 'none';
      item.style.cursor = 'pointer';
      item.style.top = `${20 + Math.random() * 210}px`;
      item.style.left = '-45px';
      item.style.transition = 'transform 0.15s';

      this.stageEl.appendChild(item);

      let posX = -45;
      const speed = 1.6 + Math.random() * 1.4;
      const moveTimer = setInterval(() => {
        posX += speed;
        item.style.left = `${posX}px`;
        if (posX > this.stageEl.clientWidth + 50) {
          clearInterval(moveTimer);
          item.remove();
        }
      }, 16);

      item.addEventListener('pointerdown', () => {
        if (!isLotus) {
          item.style.opacity = '0.35';
          sfx.leaf();
          return;
        }
        clearInterval(moveTimer);
        item.remove();
        collected++;
        sfx.pluck(collected + 1);
        sfx.drip();
        this.updateProgress((collected / goal) * 100, `เก็บดอกบัวได้: ${collected}/${goal} ดอก`);
      });
    }, 850);

    this.cleanupFn = () => {
      clearInterval(spawnInterval);
      this.stageEl.style.background = '';
    };
  }

  // เกมที่ 3: ประคองเรือต้านกระแสลม (เรือมองจากด้านบน มีประทุน คนพาย ตะเกียงหัวเรือ และรอยคลื่นท้ายเรือ)
  runWindSteerGame() {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    this.stageEl.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 520;
    let h = 290;
    // ขนาด canvas ตามกรอบจริง เรือจะได้ไม่ถูกยืดเบี้ยว
    const syncCanvasSize = () => {
      const rect = this.stageEl.getBoundingClientRect();
      w = Math.max(300, Math.round(rect.width));
      h = Math.max(240, Math.round(rect.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    let boatX = w * 0.5;
    let prevX = boatX;
    let tilt = 0;
    let progress = 0;
    let dragging = false;
    let animId = null;
    const wake = []; // ฟองคลื่นท้ายเรือ

    const updatePointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * w;
      boatX = Math.max(50, Math.min(w - 50, relX));
    };
    const onDown = (e) => {
      dragging = true;
      updatePointer(e);
    };
    const onMove = (e) => {
      if (dragging) updatePointer(e);
    };
    const onUp = () => {
      dragging = false;
    };

    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // ---------- วาดเรือ (หัวเรือชี้ขึ้น จุด 0,0 คือกลางลำ) ----------
    const hullPath = (s) => {
      ctx.beginPath();
      ctx.moveTo(0, -64 * s);
      ctx.bezierCurveTo(14 * s, -48 * s, 20 * s, -18 * s, 19 * s, 22 * s);
      ctx.quadraticCurveTo(17 * s, 50 * s, 0, 60 * s);
      ctx.quadraticCurveTo(-17 * s, 50 * s, -19 * s, 22 * s);
      ctx.bezierCurveTo(-20 * s, -18 * s, -14 * s, -48 * s, 0, -64 * s);
      ctx.closePath();
    };

    const drawBoat = (x, y, angle, inChannel, t) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // เงาใต้น้ำ
      ctx.save();
      ctx.translate(5, 7);
      hullPath(1.04);
      ctx.fillStyle = 'rgba(6, 18, 26, 0.35)';
      ctx.fill();
      ctx.restore();

      // ตัวเรือไม้
      hullPath(1);
      const wood = ctx.createLinearGradient(-20, 0, 20, 0);
      wood.addColorStop(0, '#5a3517');
      wood.addColorStop(0.5, '#8d5a2b');
      wood.addColorStop(1, '#5a3517');
      ctx.fillStyle = wood;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2e1a0b';
      ctx.stroke();

      // พื้นเรือด้านใน
      hullPath(0.8);
      ctx.fillStyle = '#b07a43';
      ctx.fill();

      // แนวไม้กระดาน
      ctx.strokeStyle = 'rgba(70, 40, 16, 0.55)';
      ctx.lineWidth = 1;
      for (let py = -36; py <= 40; py += 9) {
        const half = 13 - Math.abs(py) * 0.12;
        ctx.beginPath();
        ctx.moveTo(-half, py);
        ctx.lineTo(half, py);
        ctx.stroke();
      }

      // ประทุน (หลังคาสานโค้ง)
      ctx.fillStyle = '#c9a063';
      ctx.strokeStyle = '#6b4520';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-15, -16, 30, 34, 7);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(107, 69, 32, 0.55)';
      ctx.lineWidth = 1;
      for (let py = -10; py <= 12; py += 5.5) {
        ctx.beginPath();
        ctx.moveTo(-14, py);
        ctx.quadraticCurveTo(0, py - 3, 14, py);
        ctx.stroke();
      }

      // พระนั่งหัวเรือ (จีวรสีกรัก)
      ctx.fillStyle = '#c9782a';
      ctx.beginPath();
      ctx.ellipse(0, -30, 8, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8c39a';
      ctx.beginPath();
      ctx.arc(0, -33, 3.6, 0, Math.PI * 2);
      ctx.fill();

      // คนแจวท้ายเรือ + ไม้พายแกว่งตามจังหวะ
      const stroke = Math.sin(t * 3.2);
      ctx.save();
      ctx.translate(0, 34);
      ctx.rotate(stroke * 0.5);
      ctx.strokeStyle = '#3d2410';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(30, 12);
      ctx.stroke();
      ctx.fillStyle = '#3d2410';
      ctx.beginPath();
      ctx.ellipse(33, 14, 7, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#2f4a5a';
      ctx.beginPath();
      ctx.ellipse(0, 36, 7.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9b48a';
      ctx.beginPath();
      ctx.arc(0, 34, 3.6, 0, Math.PI * 2);
      ctx.fill();

      // ตะเกียงหัวเรือ: สีทองเมื่ออยู่ในร่องน้ำ สีแดงเมื่อหลุดร่อง
      const lampColor = inChannel ? '255, 217, 125' : '224, 122, 95';
      const pulse = 0.75 + Math.sin(t * 6) * 0.25;
      const glow = ctx.createRadialGradient(0, -56, 0, 0, -56, 26);
      glow.addColorStop(0, `rgba(${lampColor}, ${0.85 * pulse})`);
      glow.addColorStop(1, `rgba(${lampColor}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -56, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgb(${lampColor})`;
      ctx.beginPath();
      ctx.arc(0, -56, 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    let time = 0;
    let wasIn = true;
    const loop = () => {
      time += 0.035;
      const windForce = Math.sin(time * 1.4) * 2.4;
      if (!dragging) {
        boatX += windForce;
        boatX = Math.max(40, Math.min(w - 40, boatX));
      }

      // เอียงตามทิศที่เรือกำลังไถล
      const vx = boatX - prevX;
      prevX = boatX;
      tilt += (Math.max(-0.35, Math.min(0.35, vx * 0.06)) - tilt) * 0.15;

      const safeMin = w * 0.34;
      const safeMax = w * 0.66;
      const inChannel = boatX >= safeMin && boatX <= safeMax;
      sfx.setWind(inChannel ? 0.04 : 0.2);
      if (inChannel !== wasIn) {
        wasIn = inChannel;
        if (inChannel) sfx.pluck(4);
        else sfx.wrong();
      }

      if (inChannel) {
        progress += 0.36;
        this.updateProgress(progress, 'ประคองเรืออยู่ในร่องน้ำปลอดภัย');
      }

      // ---------- พื้นน้ำ ----------
      ctx.fillStyle = '#21434f';
      ctx.fillRect(0, 0, w, h);

      // ริมตลิ่งสองฝั่ง + กอหญ้า
      ctx.fillStyle = '#1a3328';
      ctx.fillRect(0, 0, w * 0.07, h);
      ctx.fillRect(w * 0.93, 0, w * 0.07, h);
      ctx.strokeStyle = '#2f5a3c';
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const ry = ((i * 41 + time * 60) % (h + 40)) - 20;
        [w * 0.07, w * 0.93].forEach((bx, side) => {
          const dir = side === 0 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(bx, ry);
          ctx.quadraticCurveTo(bx + dir * 8, ry - 6, bx + dir * 14, ry - 14);
          ctx.stroke();
        });
      }

      // ร่องน้ำสีทอง
      ctx.fillStyle = 'rgba(212, 168, 87, 0.14)';
      ctx.fillRect(safeMin, 0, safeMax - safeMin, h);
      ctx.strokeStyle = 'rgba(212, 168, 87, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -time * 40; // เส้นประไหลลง ให้รู้สึกว่าเรือกำลังแล่นไปข้างหน้า
      ctx.beginPath();
      ctx.moveTo(safeMin, 0);
      ctx.lineTo(safeMin, h);
      ctx.moveTo(safeMax, 0);
      ctx.lineTo(safeMax, h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      // ระลอกน้ำไหลผ่าน
      ctx.strokeStyle = 'rgba(176, 214, 226, 0.10)';
      ctx.lineWidth = 1.2;
      for (let row = 0; row < 7; row++) {
        const yBase = ((row * 48 + time * 55) % (h + 48)) - 24;
        ctx.beginPath();
        for (let x = w * 0.07; x <= w * 0.93; x += 12) {
          const wy = yBase + Math.sin(x * 0.04 + row) * 3;
          if (x === w * 0.07) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }

      // รอยคลื่นท้ายเรือ
      const boatY = h * 0.62;
      if (Math.random() < 0.6) {
        wake.push({ x: boatX + (Math.random() - 0.5) * 16, y: boatY + 58, r: 2 + Math.random() * 2, a: 0.55 });
      }
      for (let i = wake.length - 1; i >= 0; i--) {
        const p = wake[i];
        p.y += 1.6;
        p.r += 0.12;
        p.a *= 0.965;
        ctx.strokeStyle = `rgba(220, 236, 240, ${p.a.toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
        if (p.a < 0.03 || p.y > h + 10) wake.splice(i, 1);
      }
      // คลื่นรูปตัว V ท้ายเรือ
      ctx.strokeStyle = 'rgba(220, 236, 240, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(boatX - 14, boatY + 46);
      ctx.lineTo(boatX - 34, boatY + 96);
      ctx.moveTo(boatX + 14, boatY + 46);
      ctx.lineTo(boatX + 34, boatY + 96);
      ctx.stroke();

      drawBoat(boatX, boatY, tilt, inChannel, time);

      ctx.fillStyle = '#f9f4e8';
      ctx.font = '15px "Noto Serif Thai", serif';
      ctx.textAlign = 'center';
      ctx.fillText('ลากนิ้วหรือเมาส์ประคองหัวเรือให้อยู่ในร่องน้ำสีทอง', w * 0.5, 32);

      animId = requestAnimationFrame(loop);
    };

    loop();

    this.cleanupFn = () => {
      cancelAnimationFrame(animId);
      sfx.setWind(0);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', syncCanvasSize);
    };
  }

  // เกมที่ 4: ปัดฝุ่นใบไม้เผยศิลาจารึกลายแทง
  runPagodaRubbingGame() {
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.style.width = '100%';
    wrap.style.height = '100%';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.background = '#dfd0b2';
    wrap.style.padding = '1.2rem';
    wrap.style.boxSizing = 'border-box';
    wrap.style.textAlign = 'center';

    wrap.innerHTML = `
      <div style="border: 2px solid #9c7232; padding: 1rem 1.4rem; border-radius: 10px; background: #f6efe0;">
        <p style="font-size: 0.85rem; color: #9c7232; font-weight: 700;">ลายแทงยาอายุวัฒนะ (นิราศวัดเจ้าฟ้า)</p>
        <p style="font-size: 1.05rem; margin-top: 0.4rem; color: #1e1b18;">
          “ว่ายากินรูปงามอร่ามเรือง<br/>
          แม้นฟันหักจักงอกผมหงอกหาย”
        </p>
      </div>
    `;

    const scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = 520;
    scratchCanvas.height = 290;
    scratchCanvas.style.position = 'absolute';
    scratchCanvas.style.inset = '0';
    scratchCanvas.style.width = '100%';
    scratchCanvas.style.height = '100%';
    scratchCanvas.style.cursor = 'crosshair';

    wrap.appendChild(scratchCanvas);
    this.stageEl.appendChild(wrap);

    const ctx = scratchCanvas.getContext('2d');
    ctx.fillStyle = '#5c4e3c';
    ctx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);

    ctx.fillStyle = '#3f3528';
    for (let i = 0; i < 65; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * scratchCanvas.width,
        Math.random() * scratchCanvas.height,
        24,
        11,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.fillStyle = '#efe5cf';
    ctx.font = '16px "Noto Serif Thai", serif';
    ctx.textAlign = 'center';
    ctx.fillText('ถูหน้าจอเพื่อปัดฝุ่นและใบไม้ออกจากแผ่นศิลา', scratchCanvas.width * 0.5, 148);

    let isDrawing = false;
    let strokePoints = 0;
    let lastScratch = 0;

    const scratch = (e) => {
      if (!isDrawing) return;
      const rect = scratchCanvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * scratchCanvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * scratchCanvas.height;

      const nowMs = performance.now();
      if (nowMs - lastScratch > 70) {
        sfx.scratch();
        lastScratch = nowMs;
      }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, Math.PI * 2);
      ctx.fill();

      strokePoints++;
      this.updateProgress((strokePoints / 55) * 100, null, {
        holdMs: 6000, // ค้างให้อ่านกลอนในลายแทง 6 วินาที (ปรับตัวเลขนี้ได้)
        onFinishStart: revealStone
      });
    };

    // เมื่อปัดครบ: ใบไม้ที่เหลือจางหายจนเห็นศิลาจารึกเต็มแผ่น แล้วโชว์ปุ่มไปต่อ
    const revealStone = () => {
      isDrawing = false;
      scratchCanvas.style.pointerEvents = 'none';
      scratchCanvas.style.transition = 'opacity 1.2s ease';
      scratchCanvas.style.opacity = '0';

      const stone = wrap.firstElementChild;
      stone.style.transition = 'transform 0.8s ease, box-shadow 0.8s ease';
      stone.style.transform = 'scale(1.06)';
      stone.style.boxShadow = '0 0 28px rgba(212, 168, 87, 0.55)';

      this.statusEl.textContent = 'เผยลายแทงสำเร็จ อ่านกลอนได้เลย';

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.textContent = 'อ่านแล้ว ไปต่อ →';
      nextBtn.style.cssText =
        'position:absolute; bottom:14px; left:50%; transform:translateX(-50%); padding:0.5rem 1.2rem;' +
        'border-radius:999px; border:1px solid #9c7232; background:#9c7232; color:#f6efe0;' +
        'font-size:0.9rem; cursor:pointer; opacity:0; transition:opacity 0.6s ease 1s;';
      nextBtn.addEventListener('click', () => this.finish());
      wrap.appendChild(nextBtn);
      requestAnimationFrame(() => {
        nextBtn.style.opacity = '1';
      });
    };

    const startDraw = (e) => {
      isDrawing = true;
      scratch(e);
    };
    const endDraw = () => {
      isDrawing = false;
    };

    scratchCanvas.addEventListener('pointerdown', startDraw);
    scratchCanvas.addEventListener('pointermove', scratch);
    window.addEventListener('pointerup', endDraw);

    this.cleanupFn = () => {
      scratchCanvas.removeEventListener('pointerdown', startDraw);
      scratchCanvas.removeEventListener('pointermove', scratch);
      window.removeEventListener('pointerup', endDraw);
    };
  }

  // เกมที่ 5: ร้อยเรียงบทกลอนนิราศส่งท้าย (มีแถบเลื่อนดูตัวเลือกกลอนด้านล่างครบทุกวรรค)
  runVerseWeaveGame() {
    const correctLines = [
      'มาเห็นฤทธิ์กฤษณาอานุภาพ',
      'ก็เข็ดหลาบลมพาตำราหาย',
      'ได้กรวดน้ำคว่ำขันจนวันตาย',
      'ให้ภูตพรายไพรโขมดที่โขดดิน'
    ];

    const shuffled = [...correctLines].sort(() => Math.random() - 0.5);
    let currentStep = 0;

    const wrap = document.createElement('div');
    wrap.className = 'verse-puzzle-wrap';

    const slotsHtml = correctLines
      .map(
        (_, idx) =>
          `<div class="verse-slot" id="v-slot-${idx}">วรรคที่ ${idx + 1}: ............................</div>`
      )
      .join('');

    wrap.innerHTML = `
      <div class="verse-slots">${slotsHtml}</div>
      <div id="verse-feedback" style="text-align:center; font-size:0.86rem; color:#8c5a19; margin: 0.45rem 0 0.35rem;">
        เลือกคลิกวรรคที่ 1 เพื่อเริ่มร้อยกลอน (เลื่อนดูตัวเลือกด้านล่างได้)
      </div>
      <div class="verse-bank-scroll">
        <div class="verse-bank" id="verse-bank"></div>
      </div>
    `;

    this.stageEl.appendChild(wrap);
    const bankEl = wrap.querySelector('#verse-bank');
    const feedbackEl = wrap.querySelector('#verse-feedback');

    shuffled.forEach((lineText) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'verse-chip';
      btn.textContent = lineText;

      btn.addEventListener('click', () => {
        if (lineText === correctLines[currentStep]) {
          const slot = wrap.querySelector(`#v-slot-${currentStep}`);
          slot.textContent = `วรรคที่ ${currentStep + 1}: ${lineText}`;
          slot.classList.add('filled');
          sfx.pluck(currentStep + 2);
          btn.remove();
          currentStep++;
          feedbackEl.textContent =
            currentStep < correctLines.length
              ? `ถูกต้อง! เลือกวรรคที่ ${currentStep + 1} ต่อ`
              : 'ร้อยเรียงบทกลอนนิราศครบสมบูรณ์!';
          this.updateProgress((currentStep / correctLines.length) * 100);
        } else {
          sfx.wrong();
          feedbackEl.textContent = 'สัมผัสยังไม่ตรง ลองดูว่าคำท้ายวรรคไหนสัมผัสกับวรรคก่อนหน้า';
        }
      });

      bankEl.appendChild(btn);
    });
  }
}
