import * as THREE from 'three';

export function createWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uColorDeep: { value: new THREE.Color('#1a3544') },
      uColorShallow: { value: new THREE.Color('#4f7480') },
      uColorHighlight: { value: new THREE.Color('#e6cfa4') }
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vElevation;

      void main() {
        vUv = uv;
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);

        float wave1 = sin(modelPosition.x * 1.4 + uTime * 1.3) * 0.07;
        float wave2 = cos(modelPosition.z * 2.2 + uTime * 1.8) * 0.05;
        float elevation = wave1 + wave2;

        modelPosition.y += elevation;
        vElevation = elevation;

        gl_Position = projectionMatrix * viewMatrix * modelPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uScroll;
      uniform vec3 uColorDeep;
      uniform vec3 uColorShallow;
      uniform vec3 uColorHighlight;

      varying vec2 vUv;
      varying float vElevation;

      float brushRipple(vec2 uv, float time) {
        vec2 p = uv * vec2(14.0, 28.0);
        p.y -= time * 1.5;
        float n = sin(p.x + sin(p.y * 0.8 + time)) * cos(p.y * 1.2 - p.x * 0.5);
        return smoothstep(0.45, 0.85, n);
      }

      void main() {
        float mixStrength = clamp((vElevation + 0.12) * 4.0, 0.0, 1.0);
        vec3 baseWater = mix(uColorDeep, uColorShallow, mixStrength);

        float ripple = brushRipple(vUv + vec2(0.0, uScroll * 2.0), uTime);
        float horizonFade = smoothstep(1.0, 0.25, vUv.y);

        vec3 finalColor = mix(baseWater, uColorHighlight, ripple * 0.22);
        finalColor = mix(uColorShallow, finalColor, horizonFade);

        // น้ำทึบสนิท 100% (alpha = 1.0) ไม่โปร่งใส
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    transparent: false,
    depthWrite: true
  });
}
