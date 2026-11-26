import * as THREE from 'three';
import { CHAPTERS } from './data/chapters.js';
import { createWaterMaterial } from './graphics/WaterShader.js';
import { getPartTexture } from './graphics/ArtGenerator.js';
import { MiniGameManager } from './games/MiniGameManager.js';
import { createGrounding } from './graphics/grounding.js';
import { sfx } from './audio/AudioManager.js';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

const ART_ASPECT = 2560 / 3000;
const WATER_Y = -0.35;

// ===== เรือหลัก: ปรับได้ตรงนี้ =====
const MAIN_BOAT_SIZE = 1.18;  // ขนาด (ของเดิม 0.78)
const MAIN_BOAT_Y = 0.95;     // ความสูง (มาก = สูงขึ้น)

const SCENE_BASE_Y = WATER_Y + 0.14;
const SKY_BASE_Y = WATER_Y - 0.15;

const FOLIAGE_OFFSET_X = 0.0;
const PROP_SCALE = 5.4;
const DEFAULT_PROP_Y = WATER_Y + 0.58;

class NiratScrollytellingApp {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.frameContainer = this.canvas.parentElement;
    this.currentChapterIndex = 0;
    this.completedChapters = new Set();
    this.scrollProgress = 0;
    this.chapterAssemblyProgress = 0.65;
    this.ch2PropPassStartTime = null;

    this.initScene();
    this.initWorldLayers();
    this.updateGrounding = createGrounding(this);
    this.updateFrameLayout();
    this.buildChapterDOM();
    this.initMiniGame();
    this.bindEvents();
    this.initSceneInteractions();
    this.animate();
  }

  getFrameSize() {
    const rect = this.frameContainer.getBoundingClientRect();
    const width = Math.max(280, Math.round(rect.width));
    const height = Math.max(360, Math.round(rect.height));
    return { width, height };
  }

  getVisibleSizeAtZ(z) {
    const vFovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const dist = Math.abs(this.camera.position.z - z);
    const visH = 2 * dist * Math.tan(vFovRad * 0.5);
    const visW = visH * this.camera.aspect;
    return { visW, visH };
  }

  initScene() {
    const { width, height } = this.getFrameSize();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CHAPTERS[0].skyColor);
    this.scene.fog = new THREE.FogExp2(CHAPTERS[0].skyColor, 0.004);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 1.32, 4.75);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const ambient = new THREE.AmbientLight('#fff8eb', 1.4);
    this.scene.add(ambient);
  }

  makeBottomAnchoredPlane(tex, zPos, renderOrder = 1, anchorY = SCENE_BASE_Y) {
    const geo = new THREE.PlaneGeometry(ART_ASPECT, 1);
    geo.translate(0, 0.5, 0);

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 1,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, anchorY, zPos);
    mesh.renderOrder = renderOrder;
    this.scene.add(mesh);
    return mesh;
  }

  initWorldLayers() {
    const ch0 = CHAPTERS[0];
    const parts = ch0.backdropParts || {};

    // 1) วาดท้องฟ้าอยู่ด้านหลังฉากต่าง ๆ และทอดยาวลงไปทับด้านหลังผิวน้ำ
    this.skyPlane = this.makeBottomAnchoredPlane(
      getPartTexture(ch0.artTheme, 'sky', parts.sky),
      -8.0,
      1,
      SKY_BASE_Y
    );
    this.skyBaseY = SKY_BASE_Y;

    // 2) วาดภาพฉากต่าง ๆ (วัด/เจดีย์/เรือนไทย/ต้นไม้) ด้านหน้าท้องฟ้า
    this.templePlane = this.makeBottomAnchoredPlane(
      getPartTexture(ch0.artTheme, 'temple', parts.temple),
      -5.5,
      2,
      SCENE_BASE_Y
    );
    this.templeBaseY = SCENE_BASE_Y;

    this.foliagePlane = this.makeBottomAnchoredPlane(
      getPartTexture(ch0.artTheme, 'foliage', parts.foliage),
      -3.4,
      3,
      SCENE_BASE_Y - 0.04
    );
    this.foliageBaseX = FOLIAGE_OFFSET_X;
    this.foliageBaseY = SCENE_BASE_Y - 0.04;

    // 3) วาดผิวน้ำด้านหน้าท้องฟ้าและฉากหลัง (ไม่มีตลิ่งคั่น)
    const waterGeo = new THREE.PlaneGeometry(80, 32, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterMaterial = createWaterMaterial();
    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
    this.waterMesh.position.set(0, WATER_Y, -0.5);
    this.waterMesh.renderOrder = 5;
    this.scene.add(this.waterMesh);

    // 4) เรือหลักอยู่บนผิวน้ำ
    const boatTex = getPartTexture('default', 'boat', ch0.boatSpritePath);
    this.boatPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.1, 2.28),
      new THREE.MeshBasicMaterial({
        map: boatTex,
        transparent: true,
        depthWrite: false
      })
    );
    this.boatBaseY = MAIN_BOAT_Y;
    this.boatPlane.position.set(0, this.boatBaseY, 1.2);
    this.boatPlane.renderOrder = 10;
    this.scene.add(this.boatPlane);

    // เรือ prop ประจำบท
    const propAsset = parts.boatProp || ch0.boatPropPath || null;
    const propTex = propAsset
      ? getPartTexture(ch0.artTheme, 'boatProp', propAsset)
      : null;
    this.boatPropPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(PROP_SCALE * ART_ASPECT, PROP_SCALE),
      new THREE.MeshBasicMaterial({
        map: propTex,
        transparent: true,
        opacity: propTex ? 1 : 0,
        depthWrite: false
      })
    );
    this.propBaseY = DEFAULT_PROP_Y;
    this.boatPropPlane.position.set(0, this.propBaseY, 1.4);
    this.boatPropPlane.visible = Boolean(propTex);
    this.boatPropPlane.renderOrder = 100; // หน้าสุด
    this.boatPropPlane.material.depthTest = false;
    this.scene.add(this.boatPropPlane);
  }

  updateFrameLayout() {
    const { width, height } = this.getFrameSize();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);

    const skyVis = this.getVisibleSizeAtZ(-8.0);
    const skyScale = Math.max(9.2, (skyVis.visW * 1.15) / ART_ASPECT);
    this.skyPlane.scale.set(skyScale, skyScale, 1);

    const templeVis = this.getVisibleSizeAtZ(-5.5);
    const templeScale = Math.max(7.2, (templeVis.visW * 1.08) / ART_ASPECT);
    this.templePlane.scale.set(templeScale, templeScale, 1);

    const foliageVis = this.getVisibleSizeAtZ(-3.4);
    const foliageScale = Math.max(5.8, (foliageVis.visW * 1.05) / ART_ASPECT);
    this.foliagePlane.scale.set(foliageScale, foliageScale, 1);

    const boatVis = this.getVisibleSizeAtZ(1.2);
    const boatFactor = (boatVis.visW * MAIN_BOAT_SIZE) / 4.1;
    this.boatPlane.scale.set(boatFactor, boatFactor, 1);

    const propVis = this.getVisibleSizeAtZ(1.4);
    this.propMaxX = propVis.visW * 0.26;
    const propFactor = Math.min(0.82, (propVis.visW * 0.68) / (PROP_SCALE * ART_ASPECT));
    this.propScaleFactor = Math.max(0.25, propFactor);
  }

  buildChapterDOM() {
    const mount = document.getElementById('chapters-mount');
    const dotsContainer = document.getElementById('chapter-dots');

    CHAPTERS.forEach((ch, idx) => {
      const dot = document.createElement('div');
      dot.className = 'chapter-dot' + (idx === 0 ? ' active' : '');
      dot.dataset.index = idx;
      dot.title = ch.title;
      dot.addEventListener('click', () => {
        const targetEl = document.getElementById(`chapter-${ch.id}`);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
      });
      dotsContainer.appendChild(dot);

      const section = document.createElement('section');
      section.className = 'chapter-section';
      section.id = `chapter-${ch.id}`;
      section.dataset.chapterIndex = idx;

      const alignClass = idx % 2 === 1 ? 'align-right' : '';

      section.innerHTML = `
        <article class="poem-card ${alignClass}">
          <span class="chapter-label">${ch.location}</span>
          <h3 class="chapter-title">${ch.title}</h3>
          <div class="poem-verse">${ch.verse}</div>
          <p class="narrative-note">${ch.narrative}</p>
        </article>

        <div class="trigger-game-box" id="game-box-${idx}">
          <div class="game-badge-row">
            <span class="game-type-pill">${ch.minigame.genreLabel}</span>
            <span class="completed-tag">✓ ผ่านบททดสอบแล้ว</span>
          </div>
          <p><strong>${ch.minigame.title}</strong></p>
          <button class="btn-primary open-game-btn" data-index="${idx}">
            เล่นมินิเกมบทที่ ${ch.thaiNum}
          </button>
        </div>
      `;

      mount.appendChild(section);
    });

    document.querySelectorAll('.open-game-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.index);
        this.gameManager.open(CHAPTERS[idx]);
      });
    });
  }

  initMiniGame() {
    this.gameManager = new MiniGameManager({
      onComplete: (chapter) => {
        this.markChapterCompleted(chapter.id - 1);
        this.scrollToNextChapter(chapter.id - 1);
      },
      onSkip: (chapter) => {
        this.scrollToNextChapter(chapter.id - 1);
      }
    });
  }

  markChapterCompleted(index) {
    this.completedChapters.add(index);
    const dot = document.querySelector(`.chapter-dot[data-index="${index}"]`);
    if (dot) dot.classList.add('completed');

    const box = document.getElementById(`game-box-${index}`);
    if (box) box.classList.add('is-done');
  }

  scrollToNextChapter(currentIndex) {
    const nextEl = document.getElementById(`chapter-${currentIndex + 2}`);
    if (nextEl) {
      nextEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      const outro = document.querySelector('.outro-section');
      if (outro) outro.scrollIntoView({ behavior: 'smooth' });
    }
  }

  swapTextureIfNeeded(plane, newTex) {
    if (plane.material.map !== newTex) {
      plane.material.map = newTex;
      plane.material.needsUpdate = true;
    }
  }

  switchChapterVisuals(index) {
    if (this.currentChapterIndex === index) return;
    this.currentChapterIndex = index;
    sfx.setChapter(index);

    const ch = CHAPTERS[index];
    const parts = ch.backdropParts || {};
    this.targetSkyColor = new THREE.Color(ch.skyColor);
    this.targetWaterDeep = new THREE.Color(ch.waterDeep);
    this.targetWaterShallow = new THREE.Color(ch.waterShallow);

    this.swapTextureIfNeeded(this.skyPlane, getPartTexture(ch.artTheme, 'sky', parts.sky));
    this.swapTextureIfNeeded(this.templePlane, getPartTexture(ch.artTheme, 'temple', parts.temple));
    this.swapTextureIfNeeded(this.foliagePlane, getPartTexture(ch.artTheme, 'foliage', parts.foliage));
    this.swapTextureIfNeeded(this.boatPlane, getPartTexture('default', 'boat', ch.boatSpritePath));

    const propAsset = parts.boatProp || ch.boatPropPath || null;
    if (propAsset) {
      this.swapTextureIfNeeded(
        this.boatPropPlane,
        getPartTexture(ch.artTheme, 'boatProp', propAsset)
      );
      this.boatPropPlane.visible = true;
      this.boatPropPlane.material.opacity = 1;
      if (index === 1) {
        this.ch2PropPassStartTime = performance.now() * 0.001;
      }
    } else {
      this.boatPropPlane.visible = false;
      this.boatPropPlane.material.opacity = 0;
    }

    document.getElementById('progress-text').textContent = `บทที่ ${ch.thaiNum} / ๕`;
    document.querySelectorAll('.chapter-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  updateScrollAssembly() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    this.scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;

    const introEl = document.querySelector('.intro-hero');
    if (introEl && window.scrollY < introEl.offsetHeight * 0.55) {
      document.getElementById('progress-text').textContent = 'บทนำ';
    }

    const sections = document.querySelectorAll('.chapter-section');
    let activeIdx = this.currentChapterIndex;
    let bestLocalProgress = 0.65;

    sections.forEach((sec) => {
      const rect = sec.getBoundingClientRect();
      const totalTravel = rect.height + window.innerHeight;
      const traveled = window.innerHeight - rect.top;
      const localP = clamp01(traveled / totalTravel);

      if (rect.top <= window.innerHeight * 0.75 && rect.bottom >= window.innerHeight * 0.15) {
        activeIdx = Number(sec.dataset.chapterIndex);
        bestLocalProgress = Math.max(0.45, localP);
      }
    });

    this.switchChapterVisuals(activeIdx);
    this.chapterAssemblyProgress = bestLocalProgress;
  }

  applyBackdropAssemblyToMeshes(p) {
    const skyP = easeOutCubic(clamp01(p / 0.35 + 0.5));
    this.skyPlane.material.opacity = 1;
    this.skyPlane.position.y = this.skyBaseY + skyP * 0.03;
    this.skyPlane.position.x = (p - 0.5) * 0.06;

    const templeP = easeOutCubic(clamp01((p - 0.25) / 0.42 + 0.5));
    this.templePlane.material.opacity = 1;
    this.templePlane.position.y = this.templeBaseY + templeP * 0.04;
    this.templePlane.position.x = (0.5 - p) * 0.08;

    const foliageP = easeOutCubic(clamp01((p - 0.45) / 0.45 + 0.5));
    this.foliagePlane.material.opacity = 1;
    this.foliagePlane.position.y = this.foliageBaseY + foliageP * 0.03;
    this.foliagePlane.position.x = this.foliageBaseX + (p - 0.5) * 0.1;
  }

  updateBoatProp(elapsed) {
    if (!this.boatPropPlane || !this.boatPropPlane.visible) return;

    const sf = this.propScaleFactor || 0.5;
    const span = this.propMaxX || 1.0;

    if (this.currentChapterIndex === 1) {
      if (this.ch2PropPassStartTime === null) {
        this.ch2PropPassStartTime = elapsed;
      }

      // ===== เรือแม่ค้า: ปรับได้ตรงนี้ =====
      const duration = 7;      // วินาทีต่อหนึ่งรอบ (มาก = ช้า)
      const boatWidth = 0.55;  // ความกว้างเรือเทียบกับกรอบ
      const boatY = -0.50;     // ความสูง (ติดลบมาก = ต่ำลง)

      // ตำแหน่งของตัวเรือภายในไฟล์ ch2-boat-prop.png
      const artWidth = 0.574;
      const artCenterX = 0.479;
      const artCenterY = 0.854;

      const { visW, visH } = this.getVisibleSizeAtZ(1.4);
      const width = visW * boatWidth;
      const planeW = width / artWidth;
      const scale = planeW / (PROP_SCALE * ART_ASPECT);
      const planeH = PROP_SCALE * scale;

      // เริ่มนอกกรอบด้านขวา แล้วออกไปนอกกรอบด้านซ้าย
      const edge = (visW + width) / 2 + 0.1;
      const t = ((elapsed - this.ch2PropPassStartTime) % duration) / duration;
      const centerX = edge - t * edge * 2;
      const centerY = 1.32 + boatY * (visH / 2) + Math.sin(elapsed * 2.5) * 0.02;

      this.boatPropPlane.scale.set(scale, scale, 1);
      this.boatPropPlane.position.x = centerX - (artCenterX - 0.5) * planeW;
      this.boatPropPlane.position.y = centerY + (artCenterY - 0.5) * planeH;
      this.boatPropPlane.rotation.z = 0;
      return;
    }

    this.boatPropPlane.scale.set(sf, sf, 1);
    this.boatPropPlane.position.x = Math.sin(elapsed * 0.65) * (span * 0.35);
    this.boatPropPlane.position.y = DEFAULT_PROP_Y + Math.sin(elapsed * 1.9 + 1.1) * 0.025;
    this.boatPropPlane.rotation.z = Math.sin(elapsed * 1.4 + 0.6) * 0.015;
  }

  // ความโปร่งใสของพิกเซลที่ uv นั้น (0-255) ใช้กันไม่ให้กดโดนส่วนที่ว่างของภาพ
  alphaAt(mesh, uv) {
    const img = mesh.material.map && mesh.material.map.image;
    if (!img || !img.width) return 0;
    let entry = this.alphaCache.get(img);
    if (!entry) {
      const size = 128;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const cx = c.getContext('2d', { willReadFrequently: true });
      try {
        cx.drawImage(img, 0, 0, size, size);
        entry = { size, data: cx.getImageData(0, 0, size, size).data };
      } catch (err) {
        entry = { size, data: null };
      }
      this.alphaCache.set(img, entry);
    }
    if (!entry.data) return 255;
    const x = Math.min(entry.size - 1, Math.max(0, Math.floor(uv.x * entry.size)));
    const y = Math.min(entry.size - 1, Math.max(0, Math.floor((1 - uv.y) * entry.size)));
    return entry.data[(y * entry.size + x) * 4 + 3];
  }

  // แตะเรือ เรือพ่อค้า วัด และพุ่มไม้ในฉาก 3D เพื่อให้เกิดเสียงและแอนิเมชัน
  initSceneInteractions() {
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.alphaCache = new WeakMap();
    this.boatKick = -10;

    const blocked = (t) =>
      t.closest && t.closest('.poem-card, .trigger-game-box, .hero-card, .minigame-modal, .hud-top, button, #sound-ui');

    const pick = (e) => {
      const r = this.frameContainer.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null;
      this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.ndc, this.camera);
      const tests = [
        ['boat', this.boatPlane],
        ['prop', this.boatPropPlane],
        ['foliage', this.foliagePlane],
        ['temple', this.templePlane]
      ];
      for (const [name, mesh] of tests) {
        if (!mesh.visible) continue;
        const hit = this.raycaster.intersectObject(mesh)[0];
        if (hit && this.alphaAt(mesh, hit.uv) > 40) return name;
      }
      return null;
    };

    window.addEventListener('pointerdown', (e) => {
      if (blocked(e.target)) return;
      const hit = pick(e);
      if (!hit) return;
      e.__sceneHit = hit;
      const r = this.frameContainer.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const pan = (px / r.width) * 2 - 1;
      const fx = window.__fx;
      if (hit === 'boat') {
        this.boatKick = performance.now() * 0.001;
        sfx.boat();
        if (fx) fx.ripple(px, py + 24);
      } else if (hit === 'prop') {
        sfx.merchant();
        if (fx) fx.burst(px, py, 8, '255,214,120');
      } else if (hit === 'temple') {
        sfx.bell(pan, [196, 220, 262][this.currentChapterIndex % 3]);
        if (fx) fx.burst(px, py, 12);
      } else if (hit === 'foliage') {
        sfx.leaf(pan);
        if (Math.random() < 0.5) sfx.chirp(pan);
      }
    });

    let pending = false;
    window.addEventListener('pointermove', (e) => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        window.__sceneHover = !blocked(e.target) && !!pick(e);
      });
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.updateFrameLayout();
    });

    this.lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
      sfx.scrollEnergy(Math.abs(window.scrollY - this.lastScrollY) / 40);
      this.lastScrollY = window.scrollY;
      this.updateScrollAssembly();
    });

    this.updateScrollAssembly();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const elapsed = performance.now() * 0.001;

    this.waterMaterial.uniforms.uTime.value = elapsed;
    this.waterMaterial.uniforms.uScroll.value = this.scrollProgress;

    this.applyBackdropAssemblyToMeshes(this.chapterAssemblyProgress);
    this.updateGrounding();

    // แตะเรือแล้วเรือโยกแรงขึ้นชั่วครู่
    const kt = elapsed - this.boatKick;
    const k = Math.max(0, 1 - kt / 1.4);
    this.boatPlane.position.y = this.boatBaseY + Math.sin(elapsed * 2.1) * 0.025 + Math.sin(kt * 14) * 0.06 * k * k;
    this.boatPlane.rotation.z = Math.sin(elapsed * 1.6) * 0.018 + Math.sin(kt * 11) * 0.05 * k * k;

    this.updateBoatProp(elapsed);

    this.camera.position.x = Math.sin(elapsed * 0.7) * 0.03;
    this.camera.position.y = 1.32 + Math.cos(elapsed * 1.4) * 0.015;
    this.camera.rotation.z = Math.sin(elapsed * 0.9) * 0.003;

    if (this.targetSkyColor) {
      this.scene.background.lerp(this.targetSkyColor, 0.04);
      this.scene.fog.color.lerp(this.targetSkyColor, 0.04);
      this.waterMaterial.uniforms.uColorDeep.value.lerp(this.targetWaterDeep, 0.04);
      this.waterMaterial.uniforms.uColorShallow.value.lerp(this.targetWaterShallow, 0.04);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new NiratScrollytellingApp();
});