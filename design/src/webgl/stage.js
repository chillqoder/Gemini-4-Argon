import * as THREE from 'three';

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uTemperature;
  uniform float uDensity;
  uniform float uEntropy;
  uniform float uChamber;
  uniform float uSpecimenMode;
  uniform float uCrossfader;
  uniform float uShockwave;
  uniform vec2 uPointer;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying float vDisplacement;
  varying float vPattern;

  // 3D Simplex Noise
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vLocalPos = position;
    vec3 pos = position;
    vec3 norm = normalize(normal);

    float tempNorm = uTemperature / 100.0;
    float densNorm = uDensity / 100.0;
    float entNorm = uEntropy / 100.0;

    // Frequency and speed driven by Density and Temperature
    float freq = 1.3 + densNorm * 3.2 + (uSpecimenMode * 0.45);
    float speed = 0.35 + tempNorm * 0.9;

    // Rotational twist driven by Entropy
    float twistAngle = pos.y * (entNorm * 2.2 - 0.5) + sin(uTime * 0.4) * entNorm;
    float c = cos(twistAngle);
    float s = sin(twistAngle);
    pos.xz = mat2(c, -s, s, c) * pos.xz;

    // Chamber-specific geometric morphs
    if (abs(uChamber - 1.0) < 0.4) {
      // Cartridge Vault: faceted crystal / toroidal ribs based on specimen
      float rib = sin(atan(pos.x, pos.z) * (4.0 + uSpecimenMode * 2.0) + pos.y * 6.0 - uTime * 2.0);
      pos += norm * rib * 0.14;
    } else if (abs(uChamber - 2.0) < 0.4) {
      // Incinerator: split hemisphere distortion controlled by crossfader
      float legacyChaos = (1.0 - uCrossfader) * 0.35 * step(0.0, sin(pos.y * 18.0 + uTime * 5.0));
      pos += norm * legacyChaos;
    } else if (abs(uChamber - 3.0) < 0.4) {
      // Taste Engine: axial slice compression
      pos.y *= 1.18;
      float strataStep = floor((pos.y + 1.5) * 3.0) / 3.0;
      pos.xz *= 0.85 + 0.25 * sin(strataStep * 4.0 + uTime);
    }

    // Multi-octave Simplex noise displacement
    float n1 = snoise(pos * freq + vec3(uTime * speed, -uTime * speed * 0.6, uTime * 0.3));
    float n2 = snoise(pos * (freq * 2.3) - vec3(uTime * 0.8)) * 0.45;
    float pointerInfluence = 1.0 - clamp(length(pos.xy - uPointer * 1.3), 0.0, 1.5) / 1.5;

    float disp = (n1 + n2 * entNorm) * (0.18 + tempNorm * 0.32) + pointerInfluence * 0.18 + uShockwave * 0.35 * sin(length(pos) * 16.0 - uTime * 12.0);

    vec3 displacedPos = pos + norm * disp;

    vDisplacement = disp;
    vPattern = n1 * 0.5 + 0.5;
    vNormal = normalize(normalMatrix * (norm + vec3(n2 * 0.5)));

    vec4 worldPosition = modelMatrix * vec4(displacedPos, 1.0);
    vWorldPos = worldPosition.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uTemperature;
  uniform float uDensity;
  uniform float uEntropy;
  uniform float uChamber;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform vec3 uBgColor;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying float vDisplacement;
  varying float vPattern;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 normal = normalize(vNormal);

    // Fresnel rim factor
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.6);

    // Studio key & fill lighting
    vec3 lightDir1 = normalize(vec3(2.5, 3.0, 2.2));
    vec3 lightDir2 = normalize(vec3(-2.5, -1.8, 1.5));
    float diff1 = max(dot(normal, lightDir1), 0.0);
    float diff2 = max(dot(normal, lightDir2), 0.0);

    vec3 halfVec = normalize(lightDir1 + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 48.0);

    // Iridescent thin-film chromatic shift
    float filmPhase = dot(normal, viewDir) * 6.0 + vDisplacement * 14.0 + uTime * 0.6;
    vec3 iridescence = 0.5 + 0.5 * cos(filmPhase + vec3(0.0, 2.1, 4.2));

    // Topographic CAD isoline contours etched into the surface
    float contourFreq = 14.0 + (uDensity / 100.0) * 26.0;
    float isoline = abs(fract(vDisplacement * contourFreq - uTime * 0.25) - 0.5);
    float contourLine = 1.0 - smoothstep(0.02, 0.065, isoline);

    // Equatorial & Meridian blueprint grid lines on the 3D surface
    float latLine = 1.0 - smoothstep(0.015, 0.04, abs(fract(vLocalPos.y * 5.0) - 0.5));
    float lonAngle = atan(vLocalPos.z, vLocalPos.x) / 6.2831853;
    float lonLine = 1.0 - smoothstep(0.015, 0.04, abs(fract(lonAngle * 12.0) - 0.5));
    float cadGrid = max(latLine, lonLine) * 0.28;

    // Base obsidian-titanium metallic body
    vec3 baseMetal = mix(vec3(0.05, 0.05, 0.06), vec3(0.18, 0.19, 0.22), diff1 * 0.8 + diff2 * 0.3);

    // Mix iridescence and primary/secondary studio signals
    vec3 chromeLayer = mix(baseMetal, iridescence * 0.45, (uEntropy / 100.0) * 0.55 + 0.15);
    chromeLayer += uPrimaryColor * fresnel * 1.15;
    chromeLayer += uSecondaryColor * contourLine * 0.85;
    chromeLayer += uPrimaryColor * cadGrid;
    chromeLayer += vec3(1.0, 0.98, 0.94) * spec * 0.95;

    gl_FragColor = vec4(chromeLayer, 1.0);
  }
`;

export class SpatialStage {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0.15, 4.3);

    this.targetCameraPos = new THREE.Vector3(0, 0.15, 4.3);
    this.targetCameraLook = new THREE.Vector3(-0.25, 0, 0);
    this.currentCameraLook = new THREE.Vector3(-0.25, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.pointer = new THREE.Vector2(0, 0);
    this.targetPointer = new THREE.Vector2(0, 0);
    this.startTime = performance.now();

    this.state = {
      temperature: 78,
      density: 84,
      entropy: 42,
      chamber: 0,
      specimenMode: 1,
      crossfader: 0.82,
      shockwave: 0.0
    };

    this.anchorPoints3D = [
      new THREE.Vector3(0.0, 1.15, 0.2),
      new THREE.Vector3(1.05, 0.35, 0.4),
      new THREE.Vector3(-1.05, -0.35, 0.3),
      new THREE.Vector3(0.0, -1.15, 0.2)
    ];

    this.initObjects();
    this.bindEvents();
  }

  initObjects() {
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    // 1. Central Morphing Ferrofluid / Dichroic Sculpture
    const coreGeo = new THREE.IcosahedronGeometry(1.05, 64);
    this.uniforms = {
      uTime: { value: 0 },
      uTemperature: { value: this.state.temperature },
      uDensity: { value: this.state.density },
      uEntropy: { value: this.state.entropy },
      uChamber: { value: 0 },
      uSpecimenMode: { value: 1 },
      uCrossfader: { value: 0.82 },
      uShockwave: { value: 0.0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPrimaryColor: { value: new THREE.Color('#FF2E00') },
      uSecondaryColor: { value: new THREE.Color('#D4FF00') },
      uBgColor: { value: new THREE.Color('#0B0B09') }
    };

    const coreMat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: this.uniforms
    });

    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.rootGroup.add(this.coreMesh);

    // 2. Outer Wireframe Geodesic Cage
    const cageGeo = new THREE.IcosahedronGeometry(1.36, 2);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0xff2e00,
      wireframe: true,
      transparent: true,
      opacity: 0.16
    });
    this.cageMesh = new THREE.Mesh(cageGeo, cageMat);
    this.rootGroup.add(this.cageMesh);

    // 3. Precision Gyroscope & Exploded Strata Rings
    this.strataGroup = new THREE.Group();
    this.rootGroup.add(this.strataGroup);
    this.strataMeshes = [];

    const ringRadii = [1.45, 1.68, 1.52, 1.32];
    const ringColors = [0xff2e00, 0xd4ff00, 0xf2efe7, 0xff2e00];

    for (let i = 0; i < 4; i++) {
      const holder = new THREE.Group();
      const torusGeo = new THREE.TorusGeometry(ringRadii[i], 0.008, 12, 120);
      const torusMat = new THREE.MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: i % 2 === 0 ? 0.55 : 0.35
      });
      const ring = new THREE.Mesh(torusGeo, torusMat);
      ring.rotation.x = Math.PI / 2 + (i - 1.5) * 0.22;
      ring.rotation.y = i * 0.4;
      holder.add(ring);

      // Add a small satellite node on each ring for 3D-to-2D HUD tracking
      const nodeGeo = new THREE.OctahedronGeometry(0.055, 0);
      const nodeMat = new THREE.MeshBasicMaterial({ color: ringColors[i], wireframe: false });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      const angle = i * 1.57 + 0.4;
      node.position.set(Math.cos(angle) * ringRadii[i], 0, Math.sin(angle) * ringRadii[i]);
      ring.add(node);

      holder.userData = {
        baseY: (1.5 - i) * 0.18,
        explodedY: (1.5 - i) * 0.68,
        nodeMesh: node,
        ringMesh: ring,
        speed: (i % 2 === 0 ? 1 : -1) * (0.18 + i * 0.06)
      };

      this.strataGroup.add(holder);
      this.strataMeshes.push(holder);
    }

    // 4. Orbital Particle Field (1,600 particles)
    const particleCount = 1600;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const r = 1.6 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.85;

      positions[i * 3] = r * Math.cos(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi);
      positions[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta);
      scales[i] = Math.random();
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    this.particleMat = new THREE.PointsMaterial({
      color: 0xd4ff00,
      size: 0.024,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(pGeo, this.particleMat);
    this.scene.add(this.particleSystem);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('pointermove', (e) => {
      this.targetPointer.x = (e.clientX / this.width) * 2 - 1;
      this.targetPointer.y = -(e.clientY / this.height) * 2 + 1;
    });
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  setChamber(chamberObj) {
    this.state.chamber = chamberObj.id;
    this.targetCameraPos.set(
      chamberObj.cameraPos.x,
      chamberObj.cameraPos.y,
      chamberObj.cameraPos.z
    );
    this.targetCameraLook.set(
      chamberObj.cameraLook.x,
      chamberObj.cameraLook.y,
      chamberObj.cameraLook.z
    );
    this.triggerShockwave(0.65);
  }

  setParams({ temperature, density, entropy }) {
    if (temperature !== undefined) this.state.temperature = temperature;
    if (density !== undefined) this.state.density = density;
    if (entropy !== undefined) this.state.entropy = entropy;
  }

  setSpecimenMode(modeIndex, hexColor) {
    this.state.specimenMode = modeIndex;
    if (hexColor) {
      this.uniforms.uSecondaryColor.value.set(hexColor);
    }
    this.triggerShockwave(0.8);
  }

  setCrossfader(val) {
    this.state.crossfader = val;
  }

  setPalette(primaryHex, secondaryHex) {
    this.uniforms.uPrimaryColor.value.set(primaryHex);
    this.uniforms.uSecondaryColor.value.set(secondaryHex);
    this.cageMesh.material.color.set(primaryHex);
    this.particleMat.color.set(secondaryHex);
  }

  triggerShockwave(intensity = 1.0) {
    this.state.shockwave = Math.min(1.5, this.state.shockwave + intensity);
  }

  // Computes 2D screen-space coordinates of the 4 3D satellite nodes for live HUD leader lines
  getProjectedNodes() {
    const results = [];
    const tempVec = new THREE.Vector3();

    for (let i = 0; i < this.strataMeshes.length; i++) {
      const nodeMesh = this.strataMeshes[i].userData.nodeMesh;
      nodeMesh.getWorldPosition(tempVec);
      const worldCoords = tempVec.clone();
      tempVec.project(this.camera);

      const x = (tempVec.x * 0.5 + 0.5) * this.width;
      const y = (-(tempVec.y * 0.5) + 0.5) * this.height;

      results.push({
        index: i,
        x,
        y,
        wx: worldCoords.x.toFixed(2),
        wy: worldCoords.y.toFixed(2),
        wz: worldCoords.z.toFixed(2)
      });
    }
    return results;
  }

  update() {
    const elapsed = (performance.now() - this.startTime) * 0.001;
    this.uniforms.uTime.value = elapsed;

    // Smooth pointer interpolation
    this.pointer.lerp(this.targetPointer, 0.08);
    this.uniforms.uPointer.value.copy(this.pointer);

    // Smooth parameter uniforms
    this.uniforms.uTemperature.value += (this.state.temperature - this.uniforms.uTemperature.value) * 0.08;
    this.uniforms.uDensity.value += (this.state.density - this.uniforms.uDensity.value) * 0.08;
    this.uniforms.uEntropy.value += (this.state.entropy - this.uniforms.uEntropy.value) * 0.08;
    this.uniforms.uChamber.value += (this.state.chamber - this.uniforms.uChamber.value) * 0.08;
    this.uniforms.uSpecimenMode.value += (this.state.specimenMode - this.uniforms.uSpecimenMode.value) * 0.08;
    this.uniforms.uCrossfader.value += (this.state.crossfader - this.uniforms.uCrossfader.value) * 0.1;

    // Decay shockwave
    this.state.shockwave *= 0.92;
    this.uniforms.uShockwave.value = this.state.shockwave;

    // Camera orbital spring interpolation + subtle parallax
    const desiredCamX = this.targetCameraPos.x + this.pointer.x * 0.28;
    const desiredCamY = this.targetCameraPos.y + this.pointer.y * 0.22;
    this.camera.position.x += (desiredCamX - this.camera.position.x) * 0.06;
    this.camera.position.y += (desiredCamY - this.camera.position.y) * 0.06;
    this.camera.position.z += (this.targetCameraPos.z - this.camera.position.z) * 0.06;

    this.currentCameraLook.lerp(this.targetCameraLook, 0.07);
    this.camera.lookAt(this.currentCameraLook);

    // Rotate & scale core per chamber
    const isAnatomyChamber = this.state.chamber === 3;
    const targetCoreScale = isAnatomyChamber ? 0.66 : 1.0;
    const currentScale = this.coreMesh.scale.x;
    this.coreMesh.scale.setScalar(currentScale + (targetCoreScale - currentScale) * 0.08);

    const rotSpeed = 0.003 + (this.state.temperature / 100) * 0.006;
    this.coreMesh.rotation.y += rotSpeed;
    this.coreMesh.rotation.x = Math.sin(elapsed * 0.35) * 0.22 + this.pointer.y * 0.25;

    this.cageMesh.rotation.y -= rotSpeed * 0.7;
    this.cageMesh.rotation.z += rotSpeed * 0.4;
    const cageScale = (isAnatomyChamber ? 0.82 : 1.0) + this.state.shockwave * 0.18;
    this.cageMesh.scale.setScalar(cageScale);
    for (let i = 0; i < this.strataMeshes.length; i++) {
      const holder = this.strataMeshes[i];
      const targetY = isAnatomyChamber ? holder.userData.explodedY : holder.userData.baseY;
      holder.position.y += (targetY - holder.position.y) * 0.08;

      const ring = holder.userData.ringMesh;
      ring.rotation.z += holder.userData.speed * 0.015;
      if (isAnatomyChamber) {
        // Flatten rings into horizontal exploded isometric strata in Chamber 03
        ring.rotation.x += (Math.PI / 2 - ring.rotation.x) * 0.08;
        ring.rotation.y += (0 - ring.rotation.y) * 0.08;
      } else {
        const defaultRx = Math.PI / 2 + (i - 1.5) * 0.28 + Math.sin(elapsed * 0.4 + i) * 0.15;
        ring.rotation.x += (defaultRx - ring.rotation.x) * 0.05;
      }
    }

    // Rotate particle field
    this.particleSystem.rotation.y = elapsed * 0.05 + this.pointer.x * 0.15;
    this.particleSystem.rotation.x = this.pointer.y * 0.12;

    this.renderer.render(this.scene, this.camera);
  }
}
