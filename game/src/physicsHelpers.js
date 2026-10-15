// Collision and AABB helper functions for authoritative simulation

import { AREAS, PHYSICS, POWER_STATES } from './constants.js';

export function aabbOverlap(a, b) {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY
  );
}

export function getPlayerHeight(power, ducking) {
  if (ducking && power !== POWER_STATES.SMALL) {
    return PHYSICS.DUCK_HEIGHT;
  }
  return power === POWER_STATES.SMALL ? PHYSICS.SMALL_HEIGHT : PHYSICS.BIG_HEIGHT;
}

export function getPlayerBounds(x, y, width, height) {
  const halfW = width * 0.5;
  return {
    minX: x - halfW,
    maxX: x + halfW,
    minY: y,
    maxY: y + height,
  };
}

export function getBlockBounds(block) {
  return {
    minX: block.x - 0.5,
    maxX: block.x + 0.5,
    minY: block.y,
    maxY: block.y + 1.0,
    isBlock: true,
    block,
  };
}

export function getEnemyBounds(enemy) {
  const halfW = enemy.width * 0.5;
  return {
    minX: enemy.x - halfW,
    maxX: enemy.x + halfW,
    minY: enemy.y,
    maxY: enemy.y + enemy.height,
  };
}

export function getItemBounds(item) {
  const halfW = item.width * 0.5;
  return {
    minX: item.x - halfW,
    maxX: item.x + halfW,
    minY: item.y,
    maxY: item.y + item.height,
  };
}

/**
 * Collects all solid AABBs in the active area.
 * Unrevealed hidden blocks and broken bricks are excluded so they never act as walls or floors.
 */
export function getActiveSolids(sim, includeHiddenBlocks = false) {
  const solids = [];

  if (sim.area === AREAS.CELLAR) {
    for (const s of sim.level.cellar.solids) {
      solids.push({
        id: s.id,
        minX: s.minX,
        maxX: s.maxX,
        minY: s.minY,
        maxY: s.maxY,
        kind: 'cellar_solid',
      });
    }
    return solids;
  }

  for (const g of sim.level.groundSegments) {
    solids.push({
      id: g.id,
      minX: g.minX,
      maxX: g.maxX,
      minY: g.minY,
      maxY: g.maxY,
      kind: 'ground',
    });
  }

  for (const p of sim.level.pipes) {
    const halfW = p.width * 0.5;
    solids.push({
      id: p.id,
      minX: p.x - halfW,
      maxX: p.x + halfW,
      minY: p.y,
      maxY: p.y + p.height,
      kind: 'pipe',
      pipe: p,
    });
  }

  for (const s of sim.level.stairs) {
    const halfW = s.width * 0.5;
    solids.push({
      id: s.id,
      minX: s.x - halfW,
      maxX: s.x + halfW,
      minY: s.y,
      maxY: s.y + s.height,
      kind: 'stair',
    });
  }

  for (const b of sim.blocks) {
    if (b.broken) continue;
    if (b.type === 'hidden_1up' && !b.revealed && !includeHiddenBlocks) continue;
    solids.push({
      id: b.id,
      minX: b.x - 0.5,
      maxX: b.x + 0.5,
      minY: b.y,
      maxY: b.y + 1.0,
      kind: 'block',
      block: b,
    });
  }

  return solids;
}

/**
 * Checks whether a given AABB overlaps any active solid.
 */
export function overlapsAnySolid(sim, box, epsilon = 0.001) {
  const shrunk = {
    minX: box.minX + epsilon,
    maxX: box.maxX - epsilon,
    minY: box.minY + epsilon,
    maxY: box.maxY - epsilon,
  };
  const solids = getActiveSolids(sim, false);
  for (const s of solids) {
    if (aabbOverlap(shrunk, s)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if there is solid floor directly beneath the given (x, y) point.
 * Used by Red Koopas to turn around at ledges.
 */
export function hasFloorAtPoint(sim, x, y) {
  const probe = {
    minX: x - 0.05,
    maxX: x + 0.05,
    minY: y - 0.15,
    maxY: y + 0.05,
  };
  const solids = getActiveSolids(sim, false);
  for (const s of solids) {
    if (aabbOverlap(probe, s)) {
      return true;
    }
  }
  return false;
}
