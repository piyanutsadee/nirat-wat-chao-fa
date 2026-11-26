// ดอกบัวและใบบัววาดด้วย Canvas 2D (ใช้ร่วมกันทั้งฉากหลักใน effects.js และมินิเกม)
// drawLotus(ctx, x, y, scale, open, night)  x,y = กลางใบบัว / open 0 = ตูม, 1 = บาน
const TAU = Math.PI * 2;

// สีกลีบแต่ละชั้น: [โคนกลีบ, กลางกลีบ, ปลายกลีบ, เส้นขอบ]
const BACK = ['#f8c9d6', '#ef8fae', '#d9466f', 'rgba(170,40,80,0.55)'];
const MID = ['#fcd9e3', '#f4a3bd', '#e45c84', 'rgba(185,50,90,0.5)'];
const FRONT = ['#fff0f4', '#f9b9cc', '#ec6f95', 'rgba(195,60,100,0.45)'];

function petalPath(ctx, len, wid) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(wid, -len * 0.22, wid * 0.85, -len * 0.74, 0, -len);
  ctx.bezierCurveTo(-wid * 0.85, -len * 0.74, -wid, -len * 0.22, 0, 0);
  ctx.closePath();
}

function petal(ctx, angle, len, wid, colors) {
  ctx.save();
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, 0, 0, -len);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.55, colors[1]);
  g.addColorStop(1, colors[2]);
  petalPath(ctx, len, wid);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = colors[3];
  ctx.stroke();
  // เส้นกลางกลีบ
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -len * 0.12);
  ctx.quadraticCurveTo(wid * 0.1, -len * 0.5, 0, -len * 0.86);
  ctx.stroke();
  ctx.restore();
}

// ใบบัวกลมมีรอยเว้า + เส้นใบ
export function drawLilyPad(ctx, x, y, rx, ry, notch = 1.1) {
  const gap = 0.22;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.ellipse(x, y, rx, ry, 0, notch + gap, notch - gap + TAU);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y - ry, x, y + ry);
  g.addColorStop(0, '#6fae55');
  g.addColorStop(1, '#2f6b30');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(160, 215, 120, 0.8)';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(30, 75, 30, 0.45)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 12; i++) {
    const a = notch + gap + 0.15 + (i / 12) * (TAU - gap * 2 - 0.3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * rx * 0.92, y + Math.sin(a) * ry * 0.92);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawLotus(ctx, x, y, s = 1, open = 1, night = false) {
  // ใบบัวใหญ่ + ใบเล็กข้างๆ
  drawLilyPad(ctx, x + 30 * s, y + 5 * s, 16 * s, 5 * s, 2.7);
  drawLilyPad(ctx, x, y, 40 * s, 12 * s, 1.1);

  if (night) {
    const glow = ctx.createRadialGradient(x, y - 16 * s, 0, x, y - 16 * s, 46 * s);
    glow.addColorStop(0, `rgba(255,190,110,${0.5 * open})`);
    glow.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 46 * s, y - 62 * s, 92 * s, 92 * s);
  }

  const k = 0.16 + 0.84 * open; // บานเต็ม = กลีบกาง, ตูม = กลีบหุบชิดกัน
  ctx.save();
  ctx.translate(x, y - 2 * s);
  ctx.scale(s, s * 0.88);

  [-1.3, -0.78, -0.26, 0.26, 0.78, 1.3].forEach((a) => petal(ctx, a * k, 31, 10, BACK));

  // เกสรสีเหลือง
  if (open > 0.25) {
    ctx.globalAlpha = Math.min(1, (open - 0.25) * 2);
    for (let i = -6; i <= 6; i++) {
      const sx = i * 2.2;
      const sy = -21 - (6 - Math.abs(i)) * 0.8;
      ctx.fillStyle = i % 2 ? '#ffcf3f' : '#fff3a6';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 1.8, 5, i * 0.14, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  [-1.0, -0.5, 0.5, 1.0].forEach((a) => petal(ctx, a * k, 27, 10.5, MID));
  [-1.7, 1.7].forEach((a) => petal(ctx, a * k, 25, 11, MID));
  [-0.26, 0.26].forEach((a) => petal(ctx, a * k, 20, 11.5, FRONT));

  ctx.restore();
}

// สร้างรูปดอกบัวเป็น data URL สำหรับใช้ใน <img> (เช่น มินิเกมเก็บดอกบัว)
export function lotusSprite(px = 64) {
  const c = document.createElement('canvas');
  const dpr = 2;
  c.width = c.height = px * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  drawLotus(ctx, px * 0.47, px * 0.74, px / 92, 1, false);
  return c.toDataURL();
}

// จอกแหน/ใบบัวเล็กๆ (ตัวหลอกในมินิเกม)
export function padSprite(px = 52) {
  const c = document.createElement('canvas');
  const dpr = 2;
  c.width = c.height = px * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  drawLilyPad(ctx, px * 0.38, px * 0.6, px * 0.3, px * 0.13, 0.6);
  drawLilyPad(ctx, px * 0.66, px * 0.45, px * 0.22, px * 0.1, 2.4);
  drawLilyPad(ctx, px * 0.6, px * 0.74, px * 0.18, px * 0.08, 4);
  return c.toDataURL();
}
