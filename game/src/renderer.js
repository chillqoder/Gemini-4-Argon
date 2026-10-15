// Three.js voxel world renderer separated from authoritative simulation

import * as THREE from '../vendor/three.module.min.js';
import { AREAS, PALETTE, PHYSICS } from './constants.js';
import { createVoxelTextures } from './textures.js';
import {
  createCastleMesh,
  createCoinMesh,
  createGoombaMesh,
  createItemMesh,
  createKoopaMesh,
  createMarioRig,
  createPipeMesh,
  updateMarioRig,
} from './models.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

export class GameRenderer {
  constructor(container, sim) {
    this.container = container;
    this.sim = sim;
    this.webglAvailable = true;
    this.timeSec = 0;

    this.textures = createVoxelTextures();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.SKY);

    const width = container.clientWidth || window.innerWidth || 960;
    const height = container.clientHeight || window.innerHeight || 540;
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 180);
    this.cameraX = sim.player.x + 3.0;
    this.cameraY = 5.4;

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(width, height);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.innerHTML = '';
      container.appendChild(this.renderer.domElement);
    } catch (_) {
      this.webglAvailable = false;
      return;
    }

    this._setupLights();
    this._setupMaterials();

    this.surfaceGroup = new THREE.Group();
    this.cellarGroup = new THREE.Group();
    this.dynamicGroup = new THREE.Group();
    this.parallaxHillsFar = new THREE.Group();
    this.parallaxHillsNear = new THREE.Group();
    this.cloudsGroup = new THREE.Group();

    this.scene.add(this.surfaceGroup);
    this.scene.add(this.cellarGroup);
    this.scene.add(this.dynamicGroup);
    this.surfaceGroup.add(this.parallaxHillsFar);
    this.surfaceGroup.add(this.parallaxHillsNear);
    this.surfaceGroup.add(this.cloudsGroup);

    this.marioRig = createMarioRig(this.textures);
    this.scene.add(this.marioRig.root);

    this.blockMeshes = new Map();
    this.surfaceCoinMeshes = new Map();
    this.cellarCoinMeshes = new Map();
    this.enemyMeshes = new Map();
    this.itemMeshes = new Map();
    this.fireballMeshes = new Map();
    this.particles = [];

    this._buildStaticSurface();
    this._buildStaticCellar();
    this.rebuildRunVisuals();
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x709265, 0.85);
    this.scene.add(hemi);

    this.dirLight = new THREE.DirectionalLight(0xfff7e6, 0.95);
    this.dirLight.position.set(16, 26, 18);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 2;
    this.dirLight.shadow.camera.far = 75;
    const d = 22;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);
  }

  _setupMaterials() {
    const grassSideMat = new THREE.MeshLambertMaterial({
      map: this.textures.grassSide,
    });
    const grassTopMat = new THREE.MeshLambertMaterial({
      map: this.textures.grassTop,
    });
    const soilMat = new THREE.MeshLambertMaterial({ map: this.textures.soil });

    this.materials = {
      grassBlock: [
        grassSideMat,
        grassSideMat,
        grassTopMat,
        soilMat,
        grassSideMat,
        grassSideMat,
      ],
      soil: soilMat,
      brick: new THREE.MeshLambertMaterial({ map: this.textures.brick }),
      cellarBrick: new THREE.MeshLambertMaterial({
        map: this.textures.cellarBrick,
      }),
      question: new THREE.MeshLambertMaterial({ map: this.textures.question }),
      used: new THREE.MeshLambertMaterial({ map: this.textures.usedBlock }),
      stair: new THREE.MeshLambertMaterial({ map: this.textures.stairBlock }),
      bark: new THREE.MeshLambertMaterial({ map: this.textures.bark }),
      foliage: new THREE.MeshLambertMaterial({ map: this.textures.foliage }),
      cloud: new THREE.MeshLambertMaterial({
        color: 0xffffff,
        emissive: 0xdceeff,
        emissiveIntensity: 0.6,
      }),
      hillFar: new THREE.MeshLambertMaterial({ color: PALETTE.HILL_FAR }),
      hillNear: new THREE.MeshLambertMaterial({ color: PALETTE.HILL_NEAR }),
      fireball: new THREE.MeshLambertMaterial({ color: 0xff621a }),
    };
  }

  _buildStaticSurface() {
    const lvl = this.sim.level;
    const dummy = new THREE.Object3D();

    // Count top grass tiles and lower soil tiles across ground segments
    let topCount = 0;
    let soilCount = 0;
    for (const seg of lvl.groundSegments) {
      const cols = Math.round(seg.maxX - seg.minX);
      topCount += cols * 2;
      soilCount += cols * 3 * 2;
    }

    const grassInst = new THREE.InstancedMesh(
      UNIT_BOX,
      this.materials.grassBlock,
      topCount
    );
    grassInst.receiveShadow = true;
    const soilInst = new THREE.InstancedMesh(
      UNIT_BOX,
      this.materials.soil,
      soilCount
    );
    soilInst.receiveShadow = true;

    let gIdx = 0;
    let sIdx = 0;
    for (const seg of lvl.groundSegments) {
      for (let x = seg.minX; x < seg.maxX; x += 1) {
        for (const z of [-0.5, 0.5]) {
          dummy.position.set(x + 0.5, -0.5, z);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          grassInst.setMatrixAt(gIdx++, dummy.matrix);

          for (let y = -1.5; y >= -3.5; y -= 1.0) {
            dummy.position.set(x + 0.5, y, z);
            dummy.updateMatrix();
            soilInst.setMatrixAt(sIdx++, dummy.matrix);
          }
        }
      }
    }
    this.surfaceGroup.add(grassInst);
    this.surfaceGroup.add(soilInst);

    // Stairs (instanced 1x1x1 stone blocks)
    let stairCubes = 0;
    for (const st of lvl.stairs) stairCubes += Math.round(st.height);
    const stairInst = new THREE.InstancedMesh(
      UNIT_BOX,
      this.materials.stair,
      stairCubes
    );
    stairInst.castShadow = true;
    stairInst.receiveShadow = true;
    let stIdx = 0;
    for (const st of lvl.stairs) {
      for (let h = 0; h < st.height; h++) {
        dummy.position.set(st.x, st.y + h + 0.5, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        stairInst.setMatrixAt(stIdx++, dummy.matrix);
      }
    }
    this.surfaceGroup.add(stairInst);

    // Pipes
    const goldAccentMat = new THREE.MeshLambertMaterial({ color: 0xfad02c });
    for (const p of lvl.pipes) {
      const pipeGroup = createPipeMesh(p);
      if (p.enterable) {
        // Subtle golden collar below rim to hint at secret entrance
        const ring = new THREE.Mesh(UNIT_BOX, goldAccentMat);
        ring.position.set(p.x, p.y + p.height - 0.52, 0);
        ring.scale.set(p.width * 0.94, 0.1, p.width * 0.94);
        pipeGroup.add(ring);
      }
      this.surfaceGroup.add(pipeGroup);
    }

    // Flagpole & banner
    const fp = lvl.flagpole;
    const poleMat = new THREE.MeshLambertMaterial({ color: 0xe6f2d5 });
    const ballMat = new THREE.MeshLambertMaterial({ color: 0xfad02c });
    const flagMat = new THREE.MeshLambertMaterial({ color: 0x38b842 });
    const poleMesh = new THREE.Mesh(UNIT_BOX, poleMat);
    const poleH = fp.topY - fp.baseY;
    poleMesh.position.set(fp.x, fp.baseY + poleH * 0.5, 0);
    poleMesh.scale.set(0.14, poleH, 0.14);
    this.surfaceGroup.add(poleMesh);

    const finial = new THREE.Mesh(UNIT_BOX, ballMat);
    finial.position.set(fp.x, fp.topY + 0.2, 0);
    finial.scale.set(0.42, 0.42, 0.42);
    this.surfaceGroup.add(finial);

    this.flagBanner = new THREE.Group();
    const bannerMain = new THREE.Mesh(UNIT_BOX, flagMat);
    bannerMain.position.set(-0.65, 0, 0);
    bannerMain.scale.set(1.2, 0.78, 0.12);
    this.flagBanner.add(bannerMain);
    this.flagBanner.position.set(fp.x, fp.flagStartY, 0);
    this.surfaceGroup.add(this.flagBanner);

    // Checkpoint marker post at x = 50
    const cpGroup = new THREE.Group();
    const cpPost = new THREE.Mesh(UNIT_BOX, poleMat);
    cpPost.position.set(lvl.checkpoint.x, 0.9, -0.95);
    cpPost.scale.set(0.12, 1.8, 0.12);
    cpGroup.add(cpPost);
    this.checkpointFlagMat = new THREE.MeshLambertMaterial({ color: 0xd93829 });
    const cpFlag = new THREE.Mesh(UNIT_BOX, this.checkpointFlagMat);
    cpFlag.position.set(lvl.checkpoint.x + 0.35, 1.55, -0.95);
    cpFlag.scale.set(0.6, 0.38, 0.1);
    cpGroup.add(cpFlag);
    this.surfaceGroup.add(cpGroup);

    // Castle
    this.surfaceGroup.add(createCastleMesh(lvl.castle, this.textures.brick));

    this._buildMeadowScenery();
  }

  _buildMeadowScenery() {
    // Distant hills anchored well below horizon and strictly clear of pits [4,7], [37,41], [90,93]
    const farHillPositions = [-52, -24, 18, 56, 78, 108, 138];
    for (const hx of farHillPositions) {
      const hill = new THREE.Group();
      const tiers = [
        [8.4, 4.2],
        [6.0, 5.8],
        [3.6, 7.2],
      ];
      for (const [w, h] of tiers) {
        const m = new THREE.Mesh(UNIT_BOX, this.materials.hillFar);
        m.position.set(hx, h * 0.5 - 3.6, -14.0);
        m.scale.set(w, h, 2.0);
        hill.add(m);
      }
      this.parallaxHillsFar.add(hill);
    }

    const nearHillPositions = [-44, -15, 22, 62, 102];
    for (const hx of nearHillPositions) {
      const hill = new THREE.Group();
      const tiers = [
        [6.0, 3.6],
        [4.2, 4.8],
        [2.2, 5.8],
      ];
      for (const [w, h] of tiers) {
        const m = new THREE.Mesh(UNIT_BOX, this.materials.hillNear);
        m.position.set(hx, h * 0.5 - 2.4, -8.5);
        m.scale.set(w, h, 1.6);
        hill.add(m);
      }
      this.parallaxHillsNear.add(hill);
    }

    // Clean, light voxel clouds with slow drift
    for (let cx = -58; cx <= 155; cx += 15) {
      const cloud = new THREE.Group();
      const cy = 10.2 + ((Math.abs(cx) * 7) % 4) * 0.85;
      const cz = -10.5 - (Math.abs(cx) % 3) * 1.8;
      const b1 = new THREE.Mesh(UNIT_BOX, this.materials.cloud);
      b1.scale.set(3.4, 1.0, 1.1);
      const b2 = new THREE.Mesh(UNIT_BOX, this.materials.cloud);
      b2.position.set(-0.3, 0.6, 0);
      b2.scale.set(2.0, 0.75, 1.0);
      cloud.add(b1, b2);
      cloud.position.set(cx, cy, cz);
      this.cloudsGroup.add(cloud);
    }

    // Voxel trees grounded at z = -1.35 behind the gameplay lane
    const treeX = [-54, -36, -15, 11, 32, 49, 66, 82, 105, 131];
    for (const tx of treeX) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(UNIT_BOX, this.materials.bark);
      trunk.position.set(tx, 0.9, -1.35);
      trunk.scale.set(0.5, 2.5, 0.5);
      const c1 = new THREE.Mesh(UNIT_BOX, this.materials.foliage);
      c1.position.set(tx, 2.5, -1.35);
      c1.scale.set(2.0, 1.25, 1.5);
      const c2 = new THREE.Mesh(UNIT_BOX, this.materials.foliage);
      c2.position.set(tx, 3.45, -1.35);
      c2.scale.set(1.25, 0.95, 1.2);
      tree.add(trunk, c1, c2);
      this.surfaceGroup.add(tree);
    }

    // Grounded bushes and voxel meadow flowers on safe ground islands
    const bushX = [-50, -25, -5, 15, 29, 44, 61, 75, 99, 114];
    for (const bx of bushX) {
      const bush = new THREE.Mesh(UNIT_BOX, this.materials.foliage);
      bush.position.set(bx, 0.25, -1.05);
      bush.scale.set(1.6, 0.9, 0.75);
      this.surfaceGroup.add(bush);
    }

    const flowerColors = [0xff5964, 0xffe74c, 0xffffff];
    const flowerX = [-57, -48, -33, -17, -7, 9, 20, 34, 43, 52, 68, 83, 97, 111, 120];
    flowerX.forEach((fx, idx) => {
      const stem = new THREE.Mesh(UNIT_BOX, this.materials.foliage);
      stem.position.set(fx, 0.12, 0.65);
      stem.scale.set(0.1, 0.26, 0.1);
      const blossom = new THREE.Mesh(
        UNIT_BOX,
        new THREE.MeshLambertMaterial({ color: flowerColors[idx % flowerColors.length] })
      );
      blossom.position.set(fx, 0.28, 0.65);
      blossom.scale.set(0.24, 0.18, 0.24);
      this.surfaceGroup.add(stem, blossom);
    });
  }

  _buildStaticCellar() {
    const cellar = this.sim.level.cellar;
    for (const s of cellar.solids) {
      const w = s.maxX - s.minX;
      const h = s.maxY - s.minY;
      const mat =
        s.id === 'cellar_pipe_body'
          ? new THREE.MeshLambertMaterial({ color: PALETTE.PIPE })
          : this.materials.cellarBrick;
      const mesh = new THREE.Mesh(UNIT_BOX, mat);
      mesh.position.set((s.minX + s.maxX) * 0.5, (s.minY + s.maxY) * 0.5, 0);
      mesh.scale.set(w, h, 2.0);
      mesh.receiveShadow = true;
      this.cellarGroup.add(mesh);
    }

    // Back wall of cellar + side exit pipe rim nozzle
    const backWall = new THREE.Mesh(
      UNIT_BOX,
      new THREE.MeshLambertMaterial({ color: 0x182b42 })
    );
    backWall.position.set(0, 5.5, -1.6);
    backWall.scale.set(28, 14, 0.5);
    this.cellarGroup.add(backWall);

    const exitRim = new THREE.Mesh(
      UNIT_BOX,
      new THREE.MeshLambertMaterial({ color: PALETTE.PIPE_DARK })
    );
    exitRim.position.set(8.05, 1.55, 0);
    exitRim.scale.set(0.35, 1.15, 1.9);
    this.cellarGroup.add(exitRim);
  }

  rebuildRunVisuals() {
    if (!this.webglAvailable) return;

    // Clear previous dynamic meshes
    while (this.dynamicGroup.children.length > 0) {
      this.dynamicGroup.remove(this.dynamicGroup.children[0]);
    }
    this.blockMeshes.clear();
    this.surfaceCoinMeshes.clear();
    this.cellarCoinMeshes.clear();
    this.enemyMeshes.clear();
    this.itemMeshes.clear();
    this.fireballMeshes.clear();
    this.particles = [];

    for (const b of this.sim.blocks) {
      const mat =
        b.type === 'question_coin' || b.type === 'question_power'
          ? this.materials.question
          : this.materials.brick;
      const mesh = new THREE.Mesh(UNIT_BOX, mat);
      mesh.position.set(b.x, b.y + 0.5, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.dynamicGroup.add(mesh);
      this.blockMeshes.set(b.id, mesh);
    }

    for (const c of this.sim.surfaceCoins) {
      const m = createCoinMesh();
      m.position.set(c.x, c.y, 0);
      this.dynamicGroup.add(m);
      this.surfaceCoinMeshes.set(c.id, m);
    }

    for (const c of this.sim.cellarCoins) {
      const m = createCoinMesh();
      m.position.set(c.x, c.y, 0);
      this.dynamicGroup.add(m);
      this.cellarCoinMeshes.set(c.id, m);
    }

    for (const e of this.sim.enemies) {
      const m =
        e.type === 'goomba'
          ? createGoombaMesh()
          : createKoopaMesh(e.type === 'koopa_red');
      m.position.set(e.x, e.y, 0);
      this.dynamicGroup.add(m);
      this.enemyMeshes.set(e.id, m);
    }
  }

  spawnBrickDebris(x, y) {
    if (!this.webglAvailable) return;
    const dirs = [
      [-3.4, 9.5],
      [3.4, 9.5],
      [-2.4, 6.2],
      [2.4, 6.2],
    ];
    for (const [vx, vy] of dirs) {
      const m = new THREE.Mesh(UNIT_BOX, this.materials.brick);
      m.scale.set(0.32, 0.32, 0.32);
      m.position.set(x, y, 0);
      this.dynamicGroup.add(m);
      this.particles.push({
        mesh: m,
        vx,
        vy,
        gravity: -28,
        life: 0.75,
        spin: 8.0,
      });
    }
  }

  spawnBlockCoinBurst(x, y) {
    if (!this.webglAvailable) return;
    const m = createCoinMesh();
    m.position.set(x, y, 0);
    this.dynamicGroup.add(m);
    this.particles.push({
      mesh: m,
      vx: 0,
      vy: 9.0,
      gravity: -28,
      life: 0.45,
      spin: 14.0,
    });
  }

  spawnFireworkBurst(x, y) {
    if (!this.webglAvailable) return;
    const colors = [0xffcf26, 0xff4f38, 0x52e0ff, 0x7eff59];
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const speed = 4.2 + (i % 2) * 1.8;
      const mat = new THREE.MeshLambertMaterial({
        color: colors[i % colors.length],
      });
      const m = new THREE.Mesh(UNIT_BOX, mat);
      m.scale.set(0.28, 0.28, 0.28);
      m.position.set(x, y, 0);
      this.dynamicGroup.add(m);
      this.particles.push({
        mesh: m,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: -6.0,
        life: 0.65,
        spin: 6.0,
      });
    }
  }

  resize() {
    if (!this.webglAvailable) return;
    const width = this.container.clientWidth || window.innerWidth || 960;
    const height = this.container.clientHeight || window.innerHeight || 540;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render(dt) {
    if (!this.webglAvailable) return;
    this.timeSec += dt;

    const isCellar = this.sim.area === AREAS.CELLAR;
    this.surfaceGroup.visible = !isCellar;
    this.cellarGroup.visible = isCellar;
    this.scene.background.setHex(
      isCellar ? PALETTE.CELLAR_SKY : PALETTE.SKY
    );

    // Update Mario rig
    updateMarioRig(this.marioRig, this.sim, this.timeSec);

    // Checkpoint flag turns green when reached
    if (this.checkpointFlagMat) {
      this.checkpointFlagMat.color.setHex(
        this.sim.checkpointReached ? 0x35c949 : 0xd93829
      );
    }

    // Update flagpole banner height
    if (this.flagBanner) {
      const fy = this.sim.finish
        ? this.sim.finish.flagY
        : this.sim.level.flagpole.flagStartY;
      this.flagBanner.position.y = fy;
    }

    // Sync blocks
    for (const b of this.sim.blocks) {
      const mesh = this.blockMeshes.get(b.id);
      if (!mesh) continue;
      if (isCellar || b.broken || (b.type === 'hidden_1up' && !b.revealed)) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const bumpOffset =
        b.bumpTimer > 0
          ? Math.sin((b.bumpTimer / 0.16) * Math.PI) * 0.34
          : 0;
      mesh.position.set(b.x, b.y + 0.5 + bumpOffset, 0);
      if (b.used) {
        mesh.material = this.materials.used;
      } else if (
        b.type === 'question_coin' ||
        b.type === 'question_power'
      ) {
        mesh.material = this.materials.question;
      } else {
        mesh.material = this.materials.brick;
      }
    }

    // Sync coins
    for (const c of this.sim.surfaceCoins) {
      const m = this.surfaceCoinMeshes.get(c.id);
      if (!m) continue;
      m.visible = !isCellar && !c.collected;
      m.rotation.y = this.timeSec * 3.4;
    }
    for (const c of this.sim.cellarCoins) {
      const m = this.cellarCoinMeshes.get(c.id);
      if (!m) continue;
      m.visible = isCellar && !c.collected;
      m.rotation.y = this.timeSec * 3.4;
    }

    // Sync items
    for (const item of this.sim.items) {
      let m = this.itemMeshes.get(item.id);
      if (item.collected) {
        if (m) {
          this.dynamicGroup.remove(m);
          this.itemMeshes.delete(item.id);
        }
        continue;
      }
      if (!m) {
        m = createItemMesh(item.type);
        this.dynamicGroup.add(m);
        this.itemMeshes.set(item.id, m);
      }
      m.visible = !isCellar;
      m.position.set(item.x, item.y, 0);
      if (item.type === 'flower') {
        m.rotation.y = Math.sin(this.timeSec * 4) * 0.25;
      } else if (item.type === 'star') {
        m.rotation.z = this.timeSec * 6.0;
      }
    }

    // Sync enemies
    for (const e of this.sim.enemies) {
      const m = this.enemyMeshes.get(e.id);
      if (!m) continue;
      if (isCellar || e.removed) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      m.position.set(e.x, e.y, 0);

      if (e.type === 'goomba') {
        m.scale.set(1, e.state === 'flattened' ? 0.32 : 1, 1);
        m.rotation.z = e.state === 'defeated' ? Math.PI : 0;
        if (e.state === 'walk' && m.userData.leftFoot) {
          const step = Math.sin(this.timeSec * 10) * 0.08;
          m.userData.leftFoot.position.y = 0.09 + Math.max(0, step);
          m.userData.rightFoot.position.y = 0.09 + Math.max(0, -step);
        }
      } else {
        // Koopa states
        const inShell = e.state === 'shell_idle' || e.state === 'shell_slide';
        m.userData.bodyParts.visible = !inShell && e.state !== 'defeated';
        m.rotation.y = e.dir >= 0 ? 0 : Math.PI;
        m.rotation.z = e.state === 'defeated' ? Math.PI : 0;

        if (e.state === 'shell_slide') {
          m.userData.shellGroup.rotation.y = this.timeSec * 14.0;
        } else if (
          e.state === 'shell_idle' &&
          e.shellTimer >= PHYSICS.SHELL_WARN_TIME
        ) {
          // Waking warning shake
          m.position.x += Math.sin(this.timeSec * 45) * 0.06;
          m.userData.shellGroup.rotation.y = 0;
        } else {
          m.userData.shellGroup.rotation.y = 0;
        }
      }
    }

    // Sync fireballs
    const activeFbIds = new Set();
    for (const fb of this.sim.fireballs) {
      activeFbIds.add(fb.id);
      let m = this.fireballMeshes.get(fb.id);
      if (!m) {
        m = new THREE.Mesh(UNIT_BOX, this.materials.fireball);
        m.scale.set(0.28, 0.28, 0.28);
        this.dynamicGroup.add(m);
        this.fireballMeshes.set(fb.id, m);
      }
      m.position.set(fb.x, fb.y, 0);
      m.rotation.z += dt * 15;
      m.rotation.x += dt * 12;
    }
    for (const [id, m] of this.fireballMeshes.entries()) {
      if (!activeFbIds.has(id)) {
        this.dynamicGroup.remove(m);
        this.fireballMeshes.delete(id);
      }
    }

    // Update transient particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.dynamicGroup.remove(pt.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      pt.vy += pt.gravity * dt;
      pt.mesh.position.x += pt.vx * dt;
      pt.mesh.position.y += pt.vy * dt;
      pt.mesh.rotation.z += pt.spin * dt;
      pt.mesh.rotation.y += pt.spin * dt;
    }

    // Camera & subtle background parallax
    if (isCellar) {
      this.camera.position.set(0, 5.2, 16.5);
      this.camera.lookAt(0, 4.2, 0);
    } else {
      const targetX = Math.max(
        this.sim.level.leftBoundary + 7.5,
        Math.min(this.sim.level.rightBoundary - 7.5, this.sim.player.x + 2.8)
      );
      this.cameraX += (targetX - this.cameraX) * Math.min(1, dt * 8.0);
      this.camera.position.set(this.cameraX, 5.5, 16.8);
      this.camera.lookAt(this.cameraX, 4.3, 0);

      // Subtle parallax and slow cloud drift (hills anchored to safe islands)
      this.parallaxHillsFar.position.x = 0;
      this.parallaxHillsNear.position.x = 0;
      this.cloudsGroup.position.x =
        this.cameraX * 0.16 - ((this.timeSec * 0.45) % 15);

      this.dirLight.position.set(this.cameraX + 12, 24, 16);
      this.dirLight.target.position.set(this.cameraX, 2, 0);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
