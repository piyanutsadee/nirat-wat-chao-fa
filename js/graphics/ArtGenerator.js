import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

/**
 * โหลดภาพวาดมือแยกชิ้นจากไฟล์ PNG โดยตรง (รักษาสีน้ำและรายละเอียดของเรือ/วัด/ภูเขาไว้ครบถ้วน)
 * หรือสร้าง Procedural Fallback หากไม่ได้ระบุไฟล์
 */
export function getPartTexture(theme, partName, customPath = null) {
  const cacheKey = customPath ? `file:${customPath}` : `proc:${theme}:${partName}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  if (customPath) {
    const tex = textureLoader.load(
      customPath,
      (loadedTex) => {
        loadedTex.needsUpdate = true;
      },
      undefined,
      () => {
        console.warn(`โหลดภาพไม่สำเร็จ: ${customPath}`);
      }
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(cacheKey, tex);
    return tex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (partName) {
    case 'boat':
      drawBoatIllustration(ctx, canvas.width, canvas.height);
      break;
    case 'sky':
      drawSkyAndSunPart(ctx, canvas.width, canvas.height, theme);
      break;
    case 'farHills':
      drawFarHillsPart(ctx, canvas.width, canvas.height, theme);
      break;
    case 'temple':
      drawTemplePart(ctx, canvas.width, canvas.height, theme);
      break;
    case 'foliage':
      drawFoliagePart(ctx, canvas.width, canvas.height, theme);
      break;
    default:
      drawFarHillsPart(ctx, canvas.width, canvas.height, theme);
  }

  applyBrushGrain(ctx, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, texture);
  return texture;
}

function drawBoatIllustration(ctx, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.62;

  ctx.save();
  ctx.fillStyle = 'rgba(24, 38, 46, 0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 28, 170, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3b281c';
  ctx.strokeStyle = '#1a120b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 185, cy - 18);
  ctx.quadraticCurveTo(cx - 120, cy + 34, cx, cy + 32);
  ctx.quadraticCurveTo(cx + 125, cy + 34, cx + 195, cy - 26);
  ctx.quadraticCurveTo(cx + 90, cy + 8, cx, cy + 8);
  ctx.quadraticCurveTo(cx - 95, cy + 8, cx - 185, cy - 18);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#c99744';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 170, cy - 10);
  ctx.quadraticCurveTo(cx, cy + 16, cx + 180, cy - 16);
  ctx.stroke();

  ctx.fillStyle = '#c2a678';
  ctx.strokeStyle = '#4a3822';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 65, cy + 4);
  ctx.quadraticCurveTo(cx - 55, cy - 42, cx - 10, cy - 44);
  ctx.lineTo(cx + 55, cy - 44);
  ctx.quadraticCurveTo(cx + 75, cy - 22, cx + 70, cy + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#b86b28';
  ctx.beginPath();
  ctx.arc(cx + 10, cy - 24, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 10, cy - 4, 18, 16, 0, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = '#2d2620';
  ctx.beginPath();
  ctx.arc(cx - 115, cy - 26, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 122, cy - 16, 14, 24);

  ctx.strokeStyle = '#5c3c24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 110, cy - 12);
  ctx.lineTo(cx - 142, cy + 48);
  ctx.stroke();

  ctx.restore();
}

function drawSkyAndSunPart(ctx, w, h, theme) {
  ctx.save();
  const isNight = theme === 'return_journey';
  const sunX = isNight ? w * 0.72 : w * 0.25;
  const sunY = h * 0.34;

  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 110);
  if (isNight) {
    glow.addColorStop(0, 'rgba(245, 236, 198, 0.85)');
    glow.addColorStop(1, 'rgba(245, 236, 198, 0.0)');
  } else {
    glow.addColorStop(0, 'rgba(224, 174, 86, 0.65)');
    glow.addColorStop(1, 'rgba(224, 174, 86, 0.0)');
  }
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isNight ? '#f7eed2' : '#d6a449';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(145, 132, 112, 0.22)';
  ctx.beginPath();
  ctx.ellipse(w * 0.55, h * 0.28, 120, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFarHillsPart(ctx, w, h, theme) {
  ctx.save();
  const baseY = h * 0.82;
  const grad = ctx.createLinearGradient(0, baseY - 150, 0, baseY);
  grad.addColorStop(0, theme === 'return_journey' ? 'rgba(54, 72, 86, 0.55)' : 'rgba(125, 142, 144, 0.45)');
  grad.addColorStop(1, 'rgba(243, 235, 217, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (let x = 0; x <= w; x += 32) {
    const y = baseY - 68 - Math.sin(x * 0.008 + theme.length) * 34 - Math.cos(x * 0.017) * 18;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTemplePart(ctx, w, h, theme) {
  ctx.save();
  const baseY = h * 0.8;
  const pagodaX = theme === 'wat_chao_fa' ? w * 0.52 : w * 0.68;
  const scale = theme === 'wat_chao_fa' ? 1.42 : 0.96;

  if (theme === 'bangkok_noi' || theme === 'sam_khok') {
    ctx.fillStyle = '#8e6e47';
    ctx.strokeStyle = '#3d2d1a';
    ctx.lineWidth = 2;
    ctx.fillRect(w * 0.24, baseY - 36, 82, 30);
    ctx.strokeRect(w * 0.24, baseY - 36, 82, 30);
    ctx.beginPath();
    ctx.moveTo(w * 0.24 - 10, baseY - 36);
    ctx.lineTo(w * 0.24 + 41, baseY - 64);
    ctx.lineTo(w * 0.24 + 92, baseY - 36);
    ctx.closePath();
    ctx.fillStyle = '#5c4228';
    ctx.fill();
  }

  ctx.save();
  ctx.translate(pagodaX, baseY);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#d8c39e';
  ctx.strokeStyle = '#6e5636';
  ctx.lineWidth = 2.5;
  ctx.fillRect(-55, -25, 110, 25);
  ctx.strokeRect(-55, -25, 110, 25);

  ctx.fillRect(-40, -50, 80, 25);
  ctx.strokeRect(-40, -50, 80, 25);

  ctx.beginPath();
  ctx.arc(0, -50, 32, Math.PI, 0);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#c4933f';
  ctx.beginPath();
  ctx.moveTo(-12, -80);
  ctx.lineTo(0, -165);
  ctx.lineTo(12, -80);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

function drawFoliagePart(ctx, w, h, theme) {
  ctx.save();
  const baseY = h * 0.84;
  ctx.fillStyle = theme === 'return_journey' ? 'rgba(28, 42, 50, 0.88)' : 'rgba(52, 74, 60, 0.82)';

  for (let i = 0; i < 18; i++) {
    const x = i * 62;
    const r = 34 + Math.sin(i * 1.9 + theme.length) * 16;
    ctx.beginPath();
    ctx.arc(x, baseY, r, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();
}

function applyBrushGrain(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(92, 74, 52, 0.04)';
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillRect(x, y, Math.random() * 6, 1.5);
  }
  ctx.restore();
}
