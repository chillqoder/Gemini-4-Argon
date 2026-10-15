// Deterministic procedural 16x16 pixel-art textures with nearest-neighbor filtering

import * as THREE from '../vendor/three.module.min.js';

function makeCanvasTexture(drawFn) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  drawFn(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createVoxelTextures() {
  const grassSide = makeCanvasTexture((ctx) => {
    // Warm soil base
    ctx.fillStyle = '#B56539';
    ctx.fillRect(0, 0, 16, 16);
    // Terracotta mineral flecks
    ctx.fillStyle = '#8E4A26';
    const flecks = [
      [2, 7], [6, 9], [11, 6], [14, 11], [4, 13], [9, 14], [13, 8],
    ];
    for (const [x, y] of flecks) ctx.fillRect(x, y, 2, 2);
    // Fresh green grass top
    ctx.fillStyle = '#4EB946';
    ctx.fillRect(0, 0, 16, 4);
    ctx.fillStyle = '#3B9635';
    const blades = [1, 3, 4, 7, 10, 11, 14];
    for (const x of blades) ctx.fillRect(x, 4, 1, 2);
  });

  const grassTop = makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#4EB946';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#5FD056';
    ctx.fillRect(2, 2, 2, 2);
    ctx.fillRect(10, 5, 2, 2);
    ctx.fillRect(5, 11, 2, 2);
    ctx.fillStyle = '#3B9635';
    ctx.fillRect(7, 3, 2, 2);
    ctx.fillRect(12, 12, 2, 2);
  });

  const soil = makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#B56539';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#8E4A26';
    const flecks = [
      [1, 2], [7, 4], [12, 3], [3, 9], [9, 8], [13, 12], [5, 14],
    ];
    for (const [x, y] of flecks) ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = '#C97A4E';
    ctx.fillRect(4, 5, 2, 1);
    ctx.fillRect(11, 10, 2, 1);
  });

  const brick = makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#E6C8A8'; // Readable mortar
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#C85A32';
    // 4 brick rows
    const rows = [
      { y: 1, h: 3, offset: 0 },
      { y: 5, h: 3, offset: 4 },
      { y: 9, h: 3, offset: 0 },
      { y: 13, h: 2, offset: 4 },
    ];
    for (const r of rows) {
      for (let x = -4; x < 16; x += 8) {
        const bx = x + r.offset;
        const startX = Math.max(0, bx);
        const endX = Math.min(16, bx + 7);
        if (endX > startX) {
          ctx.fillRect(startX, r.y, endX - startX, r.h);
        }
      }
    }
  });

  const cellarBrick = makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#6EA1C8';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#2F5478';
    const rows = [
      { y: 1, h: 3, offset: 0 },
      { y: 5, h: 3, offset: 4 },
      { y: 9, h: 3, offset: 0 },
      { y: 13, h: 2, offset: 4 },
    ];
    for (const r of rows) {
      for (let x = -4; x < 16; x += 8) {
        const bx = x + r.offset;
        const startX = Math.max(0, bx);
        const endX = Math.min(16, bx + 7);
        if (endX > startX) {
          ctx.fillRect(startX, r.y, endX - startX, r.h);
        }
      }
    }
  });

  const question = makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#F5B926';
    ctx.fillRect(0, 0, 16, 16);
    // Border & rivets
    ctx.fillStyle = '#C98312';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);
    ctx.fillStyle = '#7A4908';
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(13, 2, 1, 1);
    ctx.fillRect(2, 13, 1, 1);
    ctx.fillRect(13, 13, 1, 1);
    // Question mark shadow + highlight
    ctx.fillStyle = '#FFF6D9';
    ctx.fillRect(5, 3, 6, 2);
    ctx.fillRect(5, 5, 2, 2);
    ctx.fillRect(9, 5, 2, 3);
    ctx.fillRect(7, 7, 3, 2);
    ctx.fillRect(7, 9, 2, 2);
    ctx.fillRect(7, 12, 2, 2);
  });

  const usedBlock = makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#8C735B';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#634F3D';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(13, 2, 1, 1);
    ctx.fillRect(2, 13, 1, 1);
    ctx.fillRect(13, 13, 1, 1);
  });

  const stairBlock = makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#C98753';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#F2BC8D';
    ctx.fillRect(1, 1, 14, 2);
    ctx.fillRect(1, 1, 2, 14);
    ctx.fillStyle = '#824D27';
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillRect(14, 0, 2, 16);
  });

  const bark = makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#7A4B2A';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#5E371C';
    for (let x = 2; x < 16; x += 4) {
      ctx.fillRect(x, 0, 1, 16);
    }
  });

  const foliage = makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#47B243';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#62CC5A';
    ctx.fillRect(2, 2, 4, 3);
    ctx.fillRect(9, 6, 4, 3);
    ctx.fillStyle = '#338C30';
    ctx.fillRect(5, 10, 5, 3);
  });

  const marioEmblem = makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#FAF7F0';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#E02828';
    // Readable M
    ctx.fillRect(3, 4, 2, 8);
    ctx.fillRect(11, 4, 2, 8);
    ctx.fillRect(5, 5, 2, 3);
    ctx.fillRect(9, 5, 2, 3);
    ctx.fillRect(7, 7, 2, 3);
  });

  return {
    grassSide,
    grassTop,
    soil,
    brick,
    cellarBrick,
    question,
    usedBlock,
    stairBlock,
    bark,
    foliage,
    marioEmblem,
  };
}
