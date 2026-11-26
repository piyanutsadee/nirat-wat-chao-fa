import * as THREE from 'three';

// ===== ปรับตำแหน่งได้ตรงนี้ (0 = กลางกรอบ, ค่าติดลบมาก = ต่ำลง) =====
const GROUND_LINE = -0.22;   // ระดับที่ฐานวัด/บ้าน/ต้นไม้ยืน
const BANK_TOP = -0.17;      // ขอบบนของพุ่มหญ้า
const BANK_BOTTOM = -0.28;   // ขอบล่างของเงาในน้ำ
const CAMERA_Y = 1.32;       // ต้องตรงกับ camera.position.y ใน main.js
const BANK_Z = -3.3;

// ปรับรายบท: ค่าบวก = ยกขึ้น, ค่าลบ = เลื่อนลง (ลำดับคือ บท ๑ ถึง ๕)
const SKY_OFFSET = [0, 0, -0.22, -0.21, -0.86];   // เลเยอร์ sky
const TEMPLE_OFFSET = [0, 0.13, 0, 0, 0];     // เลเยอร์ temple

const padCache = new WeakMap();

// หาว่าใต้รูปมีพื้นที่โปร่งใสกี่ส่วน (0-1)
function bottomPadding(tex) {
  const img = tex && tex.image;
  if (!img || !img.width || img.complete === false) return null;
  const hit = padCache.get(img);
  if (hit && hit.version === tex.version) return hit.pad;

  let pad = 0;
  try {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    for (let y = size - 1; y >= 0; y--) {
      let solid = 0;
      for (let x = 0; x < size; x++) {
        if (data[(y * size + x) * 4 + 3] > 60) solid++;
      }
      if (solid > size * 0.02) {
        pad = (size - 1 - y) / size;
        break;
      }
    }
  } catch (err) {
    console.warn('อ่านพื้นที่โปร่งใสของรูปไม่ได้', err);
  }
  padCache.set(img, { version: tex.version, pad });
  return pad;
}

// วาดตลิ่งหญ้าสีน้ำ พร้อมเงาด้านล่าง
function makeBankTexture() {
  const w = 1024;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  const shadow = ctx.createLinearGradient(0, 78, 0, h);
  shadow.addColorStop(0, 'rgba(25,45,35,0.75)');
  shadow.addColorStop(1, 'rgba(25,45,35,0)');
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 78, w, h - 78);

  const soil = ctx.createLinearGradient(0, 40, 0, 94);
  soil.addColorStop(0, '#8fa35a');
  soil.addColorStop(0.65, '#66773f');
  soil.addColorStop(1, '#554a30');
  ctx.fillStyle = soil;
  ctx.beginPath();
  ctx.moveTo(0, 40);
  for (let x = 0; x <= w; x += 32) {
    ctx.lineTo(x, 40 + Math.sin(x * 0.037) * 5);
  }
  for (let x = w; x >= 0; x -= 32) {
    ctx.lineTo(x, 88 + Math.sin(x * 0.021) * 5);
  }
  ctx.closePath();
  ctx.fill();

  const colors = ['#6f8a42', '#89a352', '#a8ba68', '#587238'];
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * w;
    const y = 30 + Math.random() * 32;
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.ellipse(x, y, 4 + Math.random() * 11, 3 + Math.random() * 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGrounding(app) {
  const bank = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: makeBankTexture(),
      transparent: true,
      depthWrite: false,
      fog: false
    })
  );
  bank.renderOrder = 6; // หน้าฉากและน้ำ แต่อยู่หลังเรือ
  app.scene.add(bank);

  const day = new THREE.Color('#ffffff');
  const night = new THREE.Color('#2c2c3a');

  // ครึ่งความสูงของภาพที่กล้องเห็น ณ ระยะ z
  const halfHeight = (z) =>
    Math.tan(THREE.MathUtils.degToRad(app.camera.fov) / 2) *
    (app.camera.position.z - z);

  function stand(plane, offset = 0) {
    const pad = bottomPadding(plane.material.map);
    if (pad === null) return; // รูปยังโหลดไม่เสร็จ
    plane.position.y =
      CAMERA_Y + (GROUND_LINE + offset) * halfHeight(plane.position.z) - pad * plane.scale.y;
  }

  return function updateGrounding() {
    const chapter = app.currentChapterIndex;
    // main.js ตั้งตำแหน่ง sky ใหม่ทุกเฟรม จึงบวกค่าเพิ่มได้เลย
    app.skyPlane.position.y +=
      SKY_OFFSET[chapter] * halfHeight(app.skyPlane.position.z);
    stand(app.templePlane, TEMPLE_OFFSET[chapter]);
    stand(app.foliagePlane);

    const half = halfHeight(BANK_Z);
    const height = (BANK_TOP - BANK_BOTTOM) * half;
    bank.scale.set(half * 2 * app.camera.aspect * 1.15, height, 1);
    bank.position.set(0, CAMERA_Y + BANK_TOP * half - height / 2, BANK_Z);
    bank.material.color.lerp(app.currentChapterIndex === 4 ? night : day, 0.04);
  };
}
