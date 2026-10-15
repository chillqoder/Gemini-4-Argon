// Voxel 3D models for Mario, enemies, pickups, pipes, castle, and scenery

import * as THREE from '../vendor/three.module.min.js';
import { PALETTE, POWER_STATES } from './constants.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

function addVoxel(parent, x, y, z, sx, sy, sz, material, castShadow = true) {
  const mesh = new THREE.Mesh(UNIT_BOX, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createMarioRig(textures) {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const hatMat = new THREE.MeshLambertMaterial({ color: PALETTE.MARIO_RED });
  const shirtMat = new THREE.MeshLambertMaterial({ color: PALETTE.MARIO_RED });
  const overallsMat = new THREE.MeshLambertMaterial({ color: PALETTE.MARIO_BLUE });
  const skinMat = new THREE.MeshLambertMaterial({ color: PALETTE.MARIO_SKIN });
  const hairMat = new THREE.MeshLambertMaterial({ color: PALETTE.MARIO_BROWN });
  const shoeMat = new THREE.MeshLambertMaterial({ color: PALETTE.MARIO_BROWN });
  const gloveMat = new THREE.MeshLambertMaterial({ color: PALETTE.MARIO_WHITE });
  const buttonMat = new THREE.MeshLambertMaterial({ color: PALETTE.MARIO_GOLD });
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x18202c });
  const emblemMat = new THREE.MeshLambertMaterial({
    map: textures.marioEmblem,
  });

  // Torso & overalls
  addVoxel(bodyGroup, 0, 0.72, 0, 0.5, 0.48, 0.36, overallsMat);
  addVoxel(bodyGroup, 0, 0.86, 0, 0.52, 0.28, 0.34, shirtMat);
  // Overall straps & front bib
  addVoxel(bodyGroup, -0.14, 0.86, 0.18, 0.1, 0.28, 0.04, overallsMat);
  addVoxel(bodyGroup, 0.14, 0.86, 0.18, 0.1, 0.28, 0.04, overallsMat);
  addVoxel(bodyGroup, 0, 0.72, 0.185, 0.36, 0.24, 0.04, overallsMat);
  // Gold buttons
  addVoxel(bodyGroup, -0.13, 0.74, 0.21, 0.07, 0.07, 0.03, buttonMat, false);
  addVoxel(bodyGroup, 0.13, 0.74, 0.21, 0.07, 0.07, 0.03, buttonMat, false);

  // Head group
  const head = new THREE.Group();
  head.position.set(0, 1.24, 0);
  bodyGroup.add(head);

  // Peach face cube
  addVoxel(head, 0, 0, 0, 0.46, 0.42, 0.42, skinMat);
  // Cap dome + projecting brim + readable M emblem
  addVoxel(head, 0, 0.22, -0.02, 0.5, 0.18, 0.48, hatMat);
  addVoxel(head, 0.08, 0.15, 0.12, 0.44, 0.08, 0.38, hatMat);
  addVoxel(head, 0.02, 0.24, 0.23, 0.18, 0.14, 0.03, emblemMat, false);

  // Projecting nose (visible toward camera & movement direction)
  addVoxel(head, 0.24, -0.01, 0.12, 0.14, 0.12, 0.14, skinMat);
  // Mustache
  addVoxel(head, 0.2, -0.11, 0.12, 0.16, 0.07, 0.28, hairMat);
  // Eyes & eyebrows on the front-facing side so face is always readable
  addVoxel(head, 0.11, 0.06, 0.215, 0.06, 0.1, 0.03, eyeMat, false);
  addVoxel(head, -0.03, 0.06, 0.215, 0.06, 0.1, 0.03, eyeMat, false);
  addVoxel(head, 0.11, 0.13, 0.22, 0.09, 0.04, 0.03, hairMat, false);
  addVoxel(head, -0.03, 0.13, 0.22, 0.09, 0.04, 0.03, hairMat, false);
  // Sideburns & hair back
  addVoxel(head, -0.18, -0.02, 0, 0.14, 0.28, 0.44, hairMat);
  addVoxel(head, -0.06, -0.02, 0.21, 0.08, 0.18, 0.04, hairMat);

  // Shoulder pivots with shirt sleeves and white gloves
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(0, 0.94, 0.24);
  bodyGroup.add(leftArmPivot);
  addVoxel(leftArmPivot, 0, -0.12, 0, 0.16, 0.24, 0.16, shirtMat);
  addVoxel(leftArmPivot, 0, -0.28, 0, 0.18, 0.16, 0.18, gloveMat);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0, 0.94, -0.24);
  bodyGroup.add(rightArmPivot);
  addVoxel(rightArmPivot, 0, -0.12, 0, 0.16, 0.24, 0.16, shirtMat);
  addVoxel(rightArmPivot, 0, -0.28, 0, 0.18, 0.16, 0.18, gloveMat);

  // Hip pivots with separate legs and brown shoes
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(0, 0.48, 0.11);
  bodyGroup.add(leftLegPivot);
  addVoxel(leftLegPivot, 0, -0.18, 0, 0.2, 0.28, 0.16, overallsMat);
  addVoxel(leftLegPivot, 0.04, -0.39, 0, 0.28, 0.16, 0.18, shoeMat);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0, 0.48, -0.11);
  bodyGroup.add(rightLegPivot);
  addVoxel(rightLegPivot, 0, -0.18, 0, 0.2, 0.28, 0.16, overallsMat);
  addVoxel(rightLegPivot, 0.04, -0.39, 0, 0.28, 0.16, 0.18, shoeMat);

  return {
    root,
    bodyGroup,
    head,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    materials: { hatMat, shirtMat, overallsMat },
  };
}

export function updateMarioRig(rig, sim, timeSec) {
  const p = sim.player;
  rig.root.visible = p.visible;

  // Hurt invulnerability blinking
  if (p.hurtInvulnTimer > 0 && p.transformTimer <= 0) {
    rig.root.visible = Math.floor(timeSec * 20) % 2 === 0;
  }

  rig.root.position.set(p.x, p.y, 0);

  // Keep Mario's face turned slightly toward the camera in both directions
  const targetYaw = p.facing >= 0 ? 0.32 : Math.PI - 0.32;
  rig.bodyGroup.rotation.y = targetYaw;

  // Power state outfit colors + Star rainbow pulse
  if (p.starTimer > 0) {
    const hue = (timeSec * 3.5) % 1;
    rig.materials.hatMat.color.setHSL(hue, 0.85, 0.55);
    rig.materials.shirtMat.color.setHSL((hue + 0.33) % 1, 0.85, 0.55);
    rig.materials.overallsMat.color.setHSL((hue + 0.66) % 1, 0.85, 0.5);
  } else if (p.power === POWER_STATES.FIRE) {
    rig.materials.hatMat.color.setHex(PALETTE.MARIO_WHITE);
    rig.materials.shirtMat.color.setHex(PALETTE.MARIO_WHITE);
    rig.materials.overallsMat.color.setHex(PALETTE.MARIO_RED);
  } else {
    rig.materials.hatMat.color.setHex(PALETTE.MARIO_RED);
    rig.materials.shirtMat.color.setHex(PALETTE.MARIO_RED);
    rig.materials.overallsMat.color.setHex(PALETTE.MARIO_BLUE);
  }

  // Scale for Small (1.6u) vs Big/Fire (2.5u) and transformation pulse
  const baseScaleY = p.power === POWER_STATES.SMALL ? 1.0 : 1.52;
  const baseScaleXZ = p.power === POWER_STATES.SMALL ? 1.0 : 1.18;
  let scaleY = baseScaleY;
  if (p.ducking) {
    scaleY *= 0.62;
  }
  if (p.transformTimer > 0) {
    const pulse = Math.sin(timeSec * 38) * 0.22;
    scaleY = Math.max(0.8, scaleY + pulse);
  }
  rig.bodyGroup.scale.set(baseScaleXZ, scaleY, baseScaleXZ);

  // Limb animations
  rig.bodyGroup.rotation.z = 0;
  if (p.dead) {
    rig.leftArmPivot.rotation.z = 2.4;
    rig.rightArmPivot.rotation.z = -2.4;
    rig.leftLegPivot.rotation.z = 0.6;
    rig.rightLegPivot.rotation.z = -0.6;
    return;
  }

  if (sim.state === 'finish' && sim.finish && sim.finish.phase === 'slide') {
    // Flag slide pose
    rig.leftArmPivot.rotation.z = 1.1;
    rig.rightArmPivot.rotation.z = 1.1;
    rig.leftLegPivot.rotation.z = 0.35;
    rig.rightLegPivot.rotation.z = -0.2;
    return;
  }

  if (!p.onGround) {
    // Distinct airborne jump pose
    rig.leftArmPivot.rotation.z = 2.3;
    rig.rightArmPivot.rotation.z = -0.6;
    rig.leftLegPivot.rotation.z = 0.55;
    rig.rightLegPivot.rotation.z = -0.65;
  } else if (p.isSkidding) {
    // Skid pose leaning back
    rig.bodyGroup.rotation.z = -0.22;
    rig.leftArmPivot.rotation.z = -0.9;
    rig.rightArmPivot.rotation.z = 0.9;
    rig.leftLegPivot.rotation.z = 0.5;
    rig.rightLegPivot.rotation.z = -0.4;
  } else if (Math.abs(p.vx) > 0.25) {
    const swing = Math.sin(p.animWalkPhase * 2.5) * 0.85;
    rig.leftArmPivot.rotation.z = -swing;
    rig.rightArmPivot.rotation.z = swing;
    rig.leftLegPivot.rotation.z = swing;
    rig.rightLegPivot.rotation.z = -swing;
  } else {
    // Subtle idle breathing
    const idle = Math.sin(timeSec * 3.2) * 0.06;
    rig.leftArmPivot.rotation.z = idle;
    rig.rightArmPivot.rotation.z = -idle;
    rig.leftLegPivot.rotation.z = 0;
    rig.rightLegPivot.rotation.z = 0;
  }

  if (p.throwPoseTimer > 0) {
    rig.leftArmPivot.rotation.z = 1.55;
  }
}

export function createGoombaMesh() {
  const group = new THREE.Group();
  const capMat = new THREE.MeshLambertMaterial({ color: PALETTE.GOOMBA_BODY });
  const stemMat = new THREE.MeshLambertMaterial({ color: PALETTE.GOOMBA_STEM });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x22160f });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  // Stem & mushroom cap
  addVoxel(group, 0, 0.24, 0, 0.42, 0.26, 0.38, stemMat);
  addVoxel(group, 0, 0.56, 0, 0.76, 0.46, 0.68, capMat);
  addVoxel(group, 0, 0.82, 0, 0.52, 0.14, 0.48, capMat);

  // Eyes & bushy eyebrows facing camera (+z)
  addVoxel(group, -0.14, 0.56, 0.35, 0.1, 0.18, 0.03, whiteMat, false);
  addVoxel(group, 0.14, 0.56, 0.35, 0.1, 0.18, 0.03, whiteMat, false);
  addVoxel(group, -0.12, 0.55, 0.365, 0.05, 0.1, 0.02, darkMat, false);
  addVoxel(group, 0.12, 0.55, 0.365, 0.05, 0.1, 0.02, darkMat, false);
  addVoxel(group, 0, 0.67, 0.36, 0.48, 0.06, 0.03, darkMat, false);

  // Feet
  const leftFoot = addVoxel(group, -0.16, 0.09, 0.05, 0.22, 0.18, 0.26, darkMat);
  const rightFoot = addVoxel(group, 0.16, 0.09, -0.05, 0.22, 0.18, 0.26, darkMat);
  group.userData = { leftFoot, rightFoot };
  return group;
}

export function createKoopaMesh(isRed = false) {
  const group = new THREE.Group();
  const shellColor = isRed ? PALETTE.KOOPA_RED : PALETTE.KOOPA_GREEN;
  const shellMat = new THREE.MeshLambertMaterial({ color: shellColor });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0xfaf3d7 });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xfad02c });
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  // Shell
  const shellGroup = new THREE.Group();
  group.add(shellGroup);
  addVoxel(shellGroup, 0, 0.48, 0, 0.68, 0.52, 0.58, shellMat);
  addVoxel(shellGroup, 0, 0.26, 0, 0.72, 0.12, 0.62, rimMat);

  // Limbs & head (hidden when retracted in shell)
  const bodyParts = new THREE.Group();
  group.add(bodyParts);
  const headGroup = new THREE.Group();
  headGroup.position.set(0.32, 0.84, 0);
  bodyParts.add(headGroup);
  addVoxel(headGroup, 0, 0, 0, 0.32, 0.32, 0.3, skinMat);
  addVoxel(headGroup, 0.14, -0.04, 0, 0.16, 0.16, 0.24, skinMat);
  addVoxel(headGroup, 0.08, 0.06, 0.155, 0.06, 0.09, 0.03, eyeMat, false);

  const leftLeg = addVoxel(bodyParts, -0.14, 0.14, 0.12, 0.18, 0.28, 0.16, skinMat);
  const rightLeg = addVoxel(bodyParts, 0.14, 0.14, -0.12, 0.18, 0.28, 0.16, skinMat);

  group.userData = { shellGroup, bodyParts, leftLeg, rightLeg };
  return group;
}

export function createItemMesh(type) {
  const group = new THREE.Group();
  if (type === 'mushroom' || type === '1up') {
    const capColor = type === '1up' ? 0x2fb644 : 0xe62e25;
    const capMat = new THREE.MeshLambertMaterial({ color: capColor });
    const spotMat = new THREE.MeshLambertMaterial({ color: 0xfaf7f0 });
    const stemMat = new THREE.MeshLambertMaterial({ color: 0xf7dca6 });
    addVoxel(group, 0, 0.18, 0, 0.42, 0.32, 0.42, stemMat);
    addVoxel(group, 0, 0.5, 0, 0.7, 0.42, 0.7, capMat);
    addVoxel(group, 0, 0.52, 0.36, 0.22, 0.22, 0.04, spotMat, false);
    addVoxel(group, -0.22, 0.52, 0, 0.04, 0.22, 0.22, spotMat, false);
    addVoxel(group, 0.22, 0.52, 0, 0.04, 0.22, 0.22, spotMat, false);
  } else if (type === 'flower') {
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x38b23f });
    const outerMat = new THREE.MeshLambertMaterial({ color: 0xf2481d });
    const innerMat = new THREE.MeshLambertMaterial({ color: 0xfad02c });
    const centerMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    addVoxel(group, 0, 0.22, 0, 0.14, 0.44, 0.14, stemMat);
    addVoxel(group, 0, 0.54, 0, 0.58, 0.42, 0.24, outerMat);
    addVoxel(group, 0, 0.54, 0.04, 0.38, 0.26, 0.24, innerMat);
    addVoxel(group, 0, 0.54, 0.08, 0.18, 0.14, 0.24, centerMat);
  } else if (type === 'star') {
    const starMat = new THREE.MeshLambertMaterial({ color: 0xffdd33 });
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    addVoxel(group, 0, 0.4, 0, 0.46, 0.46, 0.24, starMat);
    addVoxel(group, 0, 0.68, 0, 0.2, 0.2, 0.22, starMat);
    addVoxel(group, -0.3, 0.42, 0, 0.2, 0.18, 0.22, starMat);
    addVoxel(group, 0.3, 0.42, 0, 0.2, 0.18, 0.22, starMat);
    addVoxel(group, -0.08, 0.42, 0.13, 0.05, 0.12, 0.02, eyeMat, false);
    addVoxel(group, 0.08, 0.42, 0.13, 0.05, 0.12, 0.02, eyeMat, false);
  }
  return group;
}

export function createCoinMesh() {
  const group = new THREE.Group();
  const goldMat = new THREE.MeshLambertMaterial({ color: 0xffcf26 });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0xd9920f });
  addVoxel(group, 0, 0, 0, 0.44, 0.58, 0.14, goldMat, false);
  addVoxel(group, 0, 0, 0, 0.12, 0.34, 0.17, rimMat, false);
  return group;
}

export function createPipeMesh(pipe) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: PALETTE.PIPE });
  const rimMat = new THREE.MeshLambertMaterial({ color: PALETTE.PIPE_DARK });
  const darkHoleMat = new THREE.MeshLambertMaterial({ color: 0x0d2612 });

  const rimH = 0.45;
  const shaftH = Math.max(0.2, pipe.height - rimH);
  addVoxel(
    group,
    pipe.x,
    pipe.y + shaftH * 0.5,
    0,
    pipe.width * 0.88,
    shaftH,
    pipe.width * 0.88,
    bodyMat
  );
  addVoxel(
    group,
    pipe.x,
    pipe.y + pipe.height - rimH * 0.5,
    0,
    pipe.width,
    rimH,
    pipe.width,
    rimMat
  );
  addVoxel(
    group,
    pipe.x,
    pipe.y + pipe.height + 0.01,
    0,
    pipe.width * 0.68,
    0.04,
    pipe.width * 0.68,
    darkHoleMat,
    false
  );
  return group;
}

export function createCastleMesh(castle, brickTex) {
  const group = new THREE.Group();
  const brickMat = new THREE.MeshLambertMaterial({ map: brickTex });
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x141010 });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0xe6c8a8 });

  // Main keep
  addVoxel(group, castle.x, 2.2, -0.8, 4.6, 4.4, 3.6, brickMat);
  // Upper tower
  addVoxel(group, castle.x, 5.4, -0.9, 2.8, 2.2, 2.6, brickMat);
  // Battlements
  for (let dx = -2.0; dx <= 2.0; dx += 1.0) {
    addVoxel(group, castle.x + dx, 4.7, 0.7, 0.6, 0.6, 0.6, trimMat);
  }
  for (let dx = -1.0; dx <= 1.0; dx += 1.0) {
    addVoxel(group, castle.x + dx, 6.8, 0.1, 0.55, 0.55, 0.55, trimMat);
  }
  // Dark arched doorway at doorX
  addVoxel(group, castle.doorX, 1.1, 0.85, 1.3, 2.2, 0.4, doorMat, false);
  return group;
}
