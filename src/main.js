import * as THREE from 'three';

// Three.js scene: procedural painterly landscape + shader water + 2.5D layers.
const host = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1b343c');
const camera = new THREE.PerspectiveCamera(42, innerWidth/innerHeight, .1, 100);
camera.position.set(0, 2.7, 9.5);
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); renderer.outputColorSpace=THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xd4d9c9,2.1));
const moonLight=new THREE.DirectionalLight(0xf0d8a9,2.3); moonLight.position.set(-4,7,5); scene.add(moonLight);

// Draw a softly textured landscape into a canvas texture. Replace this with painted PNG layers later.
function paintedLayer(kind, colors){
  const c=document.createElement('canvas'); c.width=1024;c.height=512;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);x.fillStyle=g;x.fillRect(0,0,1024,512);
  // Loose brush-like hill silhouettes
  for(let band=0;band<4;band++){
    x.beginPath();x.moveTo(0,300+band*35);
    for(let px=0;px<=1024;px+=32){const py=300+band*35+Math.sin(px*.012+band*2)*45+Math.sin(px*.037+band)*18;x.lineTo(px,py)}
    x.lineTo(1024,512);x.lineTo(0,512);x.closePath();x.fillStyle=colors[2+band%2];x.globalAlpha=.52+band*.08;x.fill();x.globalAlpha=1;
  }
  // Fine brush strokes
  x.globalAlpha=.15;x.strokeStyle='#f3e7cf';x.lineWidth=2;
  for(let i=0;i<180;i++){let px=Math.random()*1024,py=150+Math.random()*340;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+12,py-3,px+28,py+1);x.stroke()}x.globalAlpha=1;
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
const layers=[
 {z:-5, y:1.2, scale:[15,7], tex:paintedLayer('far',['#a4b9b1','#718f8a','#607d7c','#6d8982'])},
 {z:-2.5,y:.3,scale:[13,5.7],tex:paintedLayer('mid',['#6f9992','#426d70','#365c61','#426d68'])},
 {z:-.2,y:-.5,scale:[12,4.5],tex:paintedLayer('near',['#426d70','#294d56','#203f48','#294d50'])}
];
for(const l of layers){const m=new THREE.Mesh(new THREE.PlaneGeometry(...l.scale),new THREE.MeshBasicMaterial({map:l.tex,transparent:false}));m.position.set(0,l.y,l.z);scene.add(m);l.mesh=m;}

// Water custom shader: ripples, soft highlights, subtle painterly noise.
const waterGeo=new THREE.PlaneGeometry(22,8,1,1);
const waterMat=new THREE.ShaderMaterial({transparent:false,uniforms:{uTime:{value:0},uColor:{value:new THREE.Color('#315e68')},uLight:{value:new THREE.Color('#a9c6b6')}},vertexShader:`varying vec2 vUv; uniform float uTime; void main(){vUv=uv; vec3 p=position; p.z += sin(p.x*1.5+uTime*1.3)*.045 + sin(p.x*3.7-uTime*1.7)*.018; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform vec3 uLight; void main(){float wave=sin(vUv.x*34.+uTime*1.7+sin(vUv.y*12.))*0.5+0.5;float wave2=sin(vUv.x*70.-uTime*2.2+vUv.y*8.)*.5+.5;float glint=smoothstep(.72,.98,wave)*.16+smoothstep(.8,1.,wave2)*.06;float shade=.86+sin(vUv.y*8.+uTime*.5)*.08;vec3 col=mix(uColor,uLight,glint);col*=shade;gl_FragColor=vec4(col,1.);}`});
const water=new THREE.Mesh(waterGeo,waterMat);water.rotation.x=-Math.PI/2;water.position.set(0,-1.75,1.4);scene.add(water);

// Simple stylized boat assembled from meshes; replace meshes with a hand-painted transparent PNG if desired.
const boat=new THREE.Group();boat.position.set(0,-1.05,2.2);scene.add(boat);
const wood=new THREE.MeshStandardMaterial({color:'#684d35',roughness:1});const trim=new THREE.MeshStandardMaterial({color:'#b99862',roughness:.9});
const hullShape=new THREE.Shape();hullShape.moveTo(-1.5,.12);hullShape.quadraticCurveTo(-.8,-.35,1.2,-.12);hullShape.lineTo(1.65,.18);hullShape.quadraticCurveTo(.1,.38,-1.5,.12);
const hull=new THREE.Mesh(new THREE.ShapeGeometry(hullShape),wood);hull.position.z=.1;boat.add(hull);
const plank=new THREE.Mesh(new THREE.BoxGeometry(2.1,.07,.12),trim);plank.position.set(0,.19,.13);boat.add(plank);
const passenger=new THREE.Mesh(new THREE.SphereGeometry(.18,16,12),new THREE.MeshStandardMaterial({color:'#c4a17a'}));passenger.scale.set(.8,1.2,.7);passenger.position.set(-.15,.42,.2);boat.add(passenger);
const canopy=new THREE.Mesh(new THREE.ConeGeometry(.52,.38,4),new THREE.MeshStandardMaterial({color:'#9a8061',roughness:1}));canopy.rotation.y=Math.PI/4;canopy.position.set(-.15,.76,.15);boat.add(canopy);

let scroll=0, targetScroll=0;
addEventListener('scroll',()=>{targetScroll=scrollY/(document.documentElement.scrollHeight-innerHeight||1);},{passive:true});
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();scroll+=(targetScroll-scroll)*.04;waterMat.uniforms.uTime.value=t;
 camera.position.x=Math.sin(t*.22)*.12+scroll*.3;camera.position.y=2.7+Math.sin(t*.45)*.035;camera.lookAt(0,.15,0);
 layers.forEach((l,i)=>{l.mesh.position.x=-scroll*(i+1)*.55;});boat.position.x=Math.sin(t*.45)*.12+scroll*.2;boat.rotation.z=Math.sin(t*.65)*.025;boat.position.y=-1.05+Math.sin(t*1.2)*.025;
 renderer.render(scene,camera);
}animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

// Story progress
const steps=[...document.querySelectorAll('.story-step')];const progressBar=document.querySelector('#progress-bar'),progressLabel=document.querySelector('#progress-label');
const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){const n=Number(e.target.dataset.step||0);const pct=Math.round(n/(steps.length-1)*100);progressBar.style.width=pct+'%';progressLabel.textContent='การเดินทาง '+pct+'%';}})},{threshold:.45});steps.forEach(s=>observer.observe(s));

// Non-punitive mini-games: each completed/skip game advances the journey counter.
let finished=new Set();const cards=[...document.querySelectorAll('.game-card')];
function finish(card){if(finished.has(card))return;finished.add(card);card.classList.add('finished');card.querySelector('.game-status').textContent='สำเร็จแล้ว · เดินทางต่อได้เลย ✦';card.querySelectorAll('button').forEach(b=>b.disabled=true);card.querySelector('.skip-game').textContent='บทนี้เสร็จแล้ว ✓';updateGameProgress();}
function updateGameProgress(){const done=finished.size;progressLabel.textContent=`เกม ${done}/${cards.length} · ${Math.round(done/cards.length*100)}%`;progressBar.style.width=(done/cards.length*100)+'%';}
cards.forEach(card=>{
 const game=card.dataset.game;const status=card.querySelector('.game-status');
 if(game==='lotus'||game==='ritual'){const items=[...card.querySelectorAll('.game-item')];items.forEach((b,i)=>b.addEventListener('click',()=>{if(b.classList.contains('done'))return;b.classList.add('done');b.textContent=game==='lotus'?'❀':'✦';const count=items.filter(x=>x.classList.contains('done')).length;status.textContent=(game==='lotus'?'เก็บแล้ว ':'จุดแล้ว ')+count+' / 3';if(count===3)finish(card);}));}
 if(game==='landmark'||game==='route'){const opts=[...card.querySelectorAll('.choice-list button')];opts.forEach(b=>b.addEventListener('click',()=>{opts.forEach(x=>x.classList.remove('selected'));b.classList.add('selected');status.textContent=b.dataset.correct==='true'?'ใช่เลย! เส้นทางเปิดแล้ว ✦':'ลองเลือกอีกครั้งได้ ไม่มีหักคะแนน';if(b.dataset.correct==='true')finish(card);}));}
 card.querySelector('.skip-game').addEventListener('click',()=>{status.textContent='ข้ามเกมแล้ว · ล่องเรือต่อได้เลย';finish(card);});
});

// Ambient sound button: intentionally starts only after user interaction.
let audioCtx=null,osc=null,gain=null;const soundButton=document.querySelector('#sound-toggle');soundButton.addEventListener('click',()=>{if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();osc=audioCtx.createOscillator();gain=audioCtx.createGain();osc.type='sine';osc.frequency.value=110;gain.gain.value=.012;osc.connect(gain).connect(audioCtx.destination);osc.start();soundButton.textContent='♫ เสียงเปิด';soundButton.setAttribute('aria-pressed','true');}else if(audioCtx.state==='running'){audioCtx.suspend();soundButton.textContent='♫ เสียงปิด';soundButton.setAttribute('aria-pressed','false');}else{audioCtx.resume();soundButton.textContent='♫ เสียงเปิด';soundButton.setAttribute('aria-pressed','true');}});
