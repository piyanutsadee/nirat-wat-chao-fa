import { sfx } from '../audio/AudioManager.js';

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
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
    this.modal.classList.add('hidden');
    this.modal.setAttribute('aria-hidden', 'true');
  }

  updateProgress(percent, customLabel = null) {
    const clamped = Math.min(100, Math.max(0, Math.round(percent)));
    this.fillEl.style.width = `${clamped}%`;
    this.statusEl.textContent = customLabel || `ความคืบหน้า: ${clamped}%`;

    if (clamped >= 100 && !this.isFinished) {
      this.isFinished = true;
      sfx.win();
      setTimeout(() => {
        const ch = this.activeChapter;
        this.close();
        if (this.onComplete && ch) this.onComplete(ch);
      }, 750);
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

    const spawnInterval = setInterval(() => {
      if (this.isFinished) return;
      const isLotus = Math.random() > 0.25;
      const item = document.createElement('button');
      item.type = 'button';
      item.textContent = isLotus ? '🪷' : '🌿';
      item.style.position = 'absolute';
      item.style.fontSize = isLotus ? '2.1rem' : '1.7rem';
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

  // เกมที่ 3: ประคองเรือต้านกระแสลม
  runWindSteerGame() {
    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 290;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.stageEl.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let boatX = canvas.width * 0.5;
    let progress = 0;
    let dragging = false;
    let animId = null;

    const updatePointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      boatX = Math.max(50, Math.min(canvas.width - 50, relX));
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

    let time = 0;
    let wasIn = true;
    const loop = () => {
      time += 0.035;
      const windForce = Math.sin(time * 1.4) * 2.4;
      if (!dragging) {
        boatX += windForce;
        boatX = Math.max(40, Math.min(canvas.width - 40, boatX));
      }

      const safeMin = canvas.width * 0.34;
      const safeMax = canvas.width * 0.66;
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

      ctx.fillStyle = '#244657';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(212, 168, 87, 0.16)';
      ctx.fillRect(safeMin, 0, safeMax - safeMin, canvas.height);

      ctx.strokeStyle = '#d4a857';
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(safeMin, 4, safeMax - safeMin, canvas.height - 8);
      ctx.setLineDash([]);

      ctx.fillStyle = inChannel ? '#f5d076' : '#e07a5f';
      ctx.beginPath();
      ctx.moveTo(boatX, canvas.height * 0.45);
      ctx.lineTo(boatX - 24, canvas.height * 0.68);
      ctx.lineTo(boatX + 24, canvas.height * 0.68);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f9f4e8';
      ctx.font = '15px "Noto Serif Thai", serif';
      ctx.textAlign = 'center';
      ctx.fillText('ลากนิ้วหรือเมาส์ประคองหัวเรือให้อยู่ในร่องน้ำสีทอง', canvas.width * 0.5, 32);

      animId = requestAnimationFrame(loop);
    };

    loop();

    this.cleanupFn = () => {
      cancelAnimationFrame(animId);
      sfx.setWind(0);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
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
      this.updateProgress((strokePoints / 55) * 100);
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
