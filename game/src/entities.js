// Block activation, item emergence/collection, enemy AI, Koopa shells, and fireballs

import { AREAS, PHYSICS, POWER_STATES, SCORES } from './constants.js';
import {
  aabbOverlap,
  getActiveSolids,
  getEnemyBounds,
  getItemBounds,
  getPlayerBounds,
  hasFloorAtPoint,
  overlapsAnySolid,
} from './physicsHelpers.js';

export function activateBlock(sim, block, fromShellSide = false) {
  if (!block || block.broken) return;
  if (block.used && block.type !== 'brick') return;

  // Reveal hidden block if hit from below
  if (block.type === 'hidden_1up') {
    if (fromShellSide && !block.revealed) return;
    block.revealed = true;
    block.used = true;
    block.bumpTimer = 0.16;
    sim.recordSecret(block.secretId);
    spawnItemFromBlock(sim, block, '1up');
    sim.emit('sfx', { type: 'powerup_appear' });
    checkBlockTopImpact(sim, block);
    return;
  }

  if (block.type === 'question_coin') {
    block.used = true;
    block.bumpTimer = 0.16;
    sim.collectCoin(block.x, block.y + 1.2, true);
    checkBlockTopImpact(sim, block);
    return;
  }

  if (block.type === 'question_power') {
    block.used = true;
    block.bumpTimer = 0.16;
    // Adaptive power block: Small releases Mushroom, Big/Fire releases Flower
    const itemType =
      sim.player.power === POWER_STATES.SMALL ? 'mushroom' : 'flower';
    spawnItemFromBlock(sim, block, itemType);
    sim.emit('sfx', { type: 'powerup_appear' });
    checkBlockTopImpact(sim, block);
    return;
  }

  if (block.type === 'multicoin') {
    block.bumpTimer = 0.16;
    if (block.coinsLeft > 0) {
      block.coinsLeft -= 1;
      sim.collectCoin(block.x, block.y + 1.2, true);
      if (block.coinsLeft <= 0) {
        block.used = true;
      }
    }
    checkBlockTopImpact(sim, block);
    return;
  }

  if (block.type === 'star_brick') {
    block.used = true;
    block.bumpTimer = 0.16;
    sim.recordSecret(block.secretId);
    spawnItemFromBlock(sim, block, 'star');
    sim.emit('sfx', { type: 'powerup_appear' });
    checkBlockTopImpact(sim, block);
    return;
  }

  if (block.type === 'brick') {
    const canBreak =
      fromShellSide || sim.player.power !== POWER_STATES.SMALL;
    checkBlockTopImpact(sim, block);
    if (canBreak) {
      block.broken = true;
      sim.addScore(SCORES.BRICK_BREAK, block.x, block.y + 0.8, false);
      sim.emit('sfx', { type: 'brick_break' });
      sim.emit('brick_debris', { x: block.x, y: block.y + 0.5 });
    } else {
      block.bumpTimer = 0.16;
      sim.emit('sfx', { type: 'bump' });
    }
  }
}

function checkBlockTopImpact(sim, block) {
  const topBox = {
    minX: block.x - 0.55,
    maxX: block.x + 0.55,
    minY: block.y + 0.9,
    maxY: block.y + 1.6,
  };

  for (const enemy of sim.enemies) {
    if (enemy.dead || !enemy.active) continue;
    const eb = getEnemyBounds(enemy);
    if (aabbOverlap(topBox, eb)) {
      defeatEnemyInstant(sim, enemy, SCORES.ORDINARY_KILL);
    }
  }

  for (const item of sim.items) {
    if (item.collected || item.emerging) continue;
    const ib = getItemBounds(item);
    if (aabbOverlap(topBox, ib)) {
      item.vy = Math.max(item.vy, 7.5);
      if (item.x < block.x && item.vx > 0) item.vx = -item.vx;
      else if (item.x >= block.x && item.vx < 0) item.vx = -item.vx;
    }
  }
}

export function spawnItemFromBlock(sim, block, type) {
  const speed =
    type === 'mushroom' || type === '1up'
      ? PHYSICS.MUSHROOM_SPEED
      : type === 'star'
      ? PHYSICS.STAR_SPEED
      : 0;

  sim.items.push({
    id: `item_${sim.nextEntityId++}`,
    type,
    x: block.x,
    y: block.y + 0.15,
    targetY: block.y + 1.02,
    vx: speed,
    vy: 0,
    width: 0.72,
    height: 0.75,
    emerging: true,
    collected: false,
    onGround: false,
  });
}

export function updateItems(sim, dt) {
  if (sim.area !== AREAS.SURFACE) return;

  const pBounds = getPlayerBounds(
    sim.player.x,
    sim.player.y,
    sim.player.width,
    sim.player.height
  );

  for (const item of sim.items) {
    if (item.collected) continue;

    if (item.emerging) {
      item.y += 1.6 * dt;
      if (item.y >= item.targetY) {
        item.y = item.targetY;
        item.emerging = false;
        if (item.type === 'star') {
          item.vy = PHYSICS.STAR_BOUNCE_VY;
        }
      }
      // Cannot move away or be collected before fully emerging
      continue;
    }

    if (item.type !== 'flower') {
      // Horizontal motion
      item.x += item.vx * dt;
      const hBox = getItemBounds(item);
      const solids = getActiveSolids(sim, false);
      for (const s of solids) {
        if (
          hBox.maxY > s.minY + 0.05 &&
          hBox.minY < s.maxY - 0.05 &&
          aabbOverlap(hBox, s)
        ) {
          if (item.vx > 0) {
            item.x = s.minX - item.width * 0.5;
            item.vx = -Math.abs(item.vx);
          } else if (item.vx < 0) {
            item.x = s.maxX + item.width * 0.5;
            item.vx = Math.abs(item.vx);
          }
          break;
        }
      }

      // Vertical motion
      item.vy += PHYSICS.GRAVITY * dt;
      if (item.vy < -PHYSICS.MAX_FALL_SPEED) item.vy = -PHYSICS.MAX_FALL_SPEED;
      item.y += item.vy * dt;
      item.onGround = false;

      const vBox = getItemBounds(item);
      for (const s of solids) {
        if (
          vBox.maxX > s.minX + 0.04 &&
          vBox.minX < s.maxX - 0.04 &&
          aabbOverlap(vBox, s)
        ) {
          if (item.vy <= 0 && vBox.minY <= s.maxY && vBox.maxY > s.maxY) {
            item.y = s.maxY;
            if (item.type === 'star') {
              item.vy = PHYSICS.STAR_BOUNCE_VY;
            } else {
              item.vy = 0;
              item.onGround = true;
            }
          } else if (item.vy > 0 && vBox.maxY >= s.minY && vBox.minY < s.minY) {
            item.y = s.minY - item.height;
            item.vy = -2.0;
          }
        }
      }
    }

    if (item.y < PHYSICS.DEATH_Y - 2) {
      item.collected = true;
      continue;
    }

    // Check collection by Mario
    const iBounds = getItemBounds(item);
    if (!sim.player.dead && aabbOverlap(pBounds, iBounds)) {
      collectItem(sim, item);
    }
  }
}

export function collectItem(sim, item) {
  if (item.collected || item.emerging) return;
  item.collected = true;

  if (item.type === '1up') {
    sim.grantExtraLife(item.x, item.y + 0.8);
    return;
  }

  sim.addScore(SCORES.POWERUP, item.x, item.y + 0.8, true);

  if (item.type === 'star') {
    sim.player.starTimer = PHYSICS.STAR_DURATION;
    sim.emit('sfx', { type: 'powerup' });
    return;
  }

  if (item.type === 'mushroom') {
    if (sim.player.power === POWER_STATES.SMALL) {
      sim.requestPowerTransition(POWER_STATES.BIG);
    } else {
      sim.emit('sfx', { type: 'powerup' });
    }
    return;
  }

  if (item.type === 'flower') {
    // NES edge case: if Mario became Small before collecting the flower, grow to Big first
    if (sim.player.power === POWER_STATES.SMALL) {
      sim.requestPowerTransition(POWER_STATES.BIG);
    } else if (sim.player.power === POWER_STATES.BIG) {
      sim.requestPowerTransition(POWER_STATES.FIRE);
    } else {
      sim.emit('sfx', { type: 'powerup' });
    }
  }
}

export function defeatEnemyInstant(sim, enemy, pointsOrLabel) {
  if (enemy.dead) return;
  enemy.dead = true;
  enemy.state = 'defeated';
  enemy.vy = 8.5;
  enemy.removeTimer = 0.8;
  sim.enemiesDefeated += 1;

  if (pointsOrLabel === '1-UP') {
    sim.grantExtraLife(enemy.x, enemy.y + 0.9);
  } else if (typeof pointsOrLabel === 'number' && pointsOrLabel > 0) {
    sim.addScore(pointsOrLabel, enemy.x, enemy.y + 0.9, true);
  }
  sim.emit('sfx', { type: 'kick' });
}

export function updateEnemies(sim, dt) {
  if (sim.area !== AREAS.SURFACE) return;

  for (const enemy of sim.enemies) {
    if (enemy.removed) continue;

    if (enemy.dead) {
      enemy.removeTimer -= dt;
      if (enemy.state === 'defeated') {
        enemy.vy += PHYSICS.GRAVITY * dt;
        enemy.y += enemy.vy * dt;
      }
      if (enemy.removeTimer <= 0) {
        enemy.removed = true;
      }
      continue;
    }

    if (enemy.kickGraceTimer > 0) {
      enemy.kickGraceTimer = Math.max(0, enemy.kickGraceTimer - dt);
    }

    // Activate when approaching visible area
    if (!enemy.active) {
      if (Math.abs(enemy.x - sim.player.x) <= 22.0) {
        enemy.active = true;
      } else {
        continue;
      }
    }

    // Stationary shell waking logic
    if (enemy.state === 'shell_idle') {
      enemy.shellTimer += dt;
      if (enemy.shellTimer >= PHYSICS.SHELL_WAKE_TIME) {
        // Restore walking body when headroom permits
        const standHeight = 1.15;
        const testBox = {
          minX: enemy.x - enemy.width * 0.5,
          maxX: enemy.x + enemy.width * 0.5,
          minY: enemy.y,
          maxY: enemy.y + standHeight,
        };
        if (!overlapsAnySolid(sim, testBox, 0.02)) {
          enemy.state = 'walk';
          enemy.height = standHeight;
          enemy.shellTimer = 0;
          enemy.shellChain = 0;
          enemy.vx = enemy.dir * PHYSICS.KOOPA_SPEED;
        }
      }
    }

    // Determine horizontal velocity
    if (enemy.state === 'walk') {
      const baseSpeed =
        enemy.type === 'goomba' ? PHYSICS.GOOMBA_SPEED : PHYSICS.KOOPA_SPEED;
      enemy.vx = enemy.dir * baseSpeed;

      // Red Koopa ledge turn check while walking on ground
      if (enemy.type === 'koopa_red' && enemy.onGround) {
        const probeX = enemy.x + enemy.dir * (enemy.width * 0.5 + 0.08);
        if (!hasFloorAtPoint(sim, probeX, enemy.y)) {
          enemy.dir = -enemy.dir;
          enemy.vx = enemy.dir * baseSpeed;
        }
      }
    } else if (enemy.state === 'shell_idle') {
      enemy.vx = 0;
    } else if (enemy.state === 'shell_slide') {
      enemy.vx = enemy.dir * PHYSICS.SHELL_SPEED;
    }

    // Horizontal step and obstacle collisions
    const prevX = enemy.x;
    enemy.x += enemy.vx * dt;
    if (enemy.x < sim.level.leftBoundary + 0.5) {
      enemy.x = sim.level.leftBoundary + 0.5;
      enemy.dir = 1;
      enemy.vx = Math.abs(enemy.vx);
    }

    const eBoxH = getEnemyBounds(enemy);
    const solids = getActiveSolids(sim, false);
    for (const s of solids) {
      if (
        eBoxH.maxY > s.minY + 0.06 &&
        eBoxH.minY < s.maxY - 0.06 &&
        aabbOverlap(eBoxH, s)
      ) {
        if (prevX <= s.minX) {
          enemy.x = s.minX - enemy.width * 0.5 - 0.001;
          enemy.dir = -1;
        } else {
          enemy.x = s.maxX + enemy.width * 0.5 + 0.001;
          enemy.dir = 1;
        }
        enemy.vx = -enemy.vx;

        if (enemy.state === 'shell_slide') {
          if (s.kind === 'block' && s.block && !s.block.broken) {
            activateBlock(sim, s.block, true);
          } else {
            sim.emit('sfx', { type: 'bump' });
          }
        }
        break;
      }
    }

    // Vertical step and floor collisions
    enemy.vy += PHYSICS.GRAVITY * dt;
    if (enemy.vy < -PHYSICS.MAX_FALL_SPEED) enemy.vy = -PHYSICS.MAX_FALL_SPEED;
    enemy.y += enemy.vy * dt;
    enemy.onGround = false;

    const eBoxV = getEnemyBounds(enemy);
    const solidsAfter = getActiveSolids(sim, false);
    for (const s of solidsAfter) {
      if (
        eBoxV.maxX > s.minX + 0.04 &&
        eBoxV.minX < s.maxX - 0.04 &&
        aabbOverlap(eBoxV, s)
      ) {
        if (enemy.vy <= 0 && eBoxV.minY <= s.maxY && eBoxV.maxY > s.maxY) {
          enemy.y = s.maxY;
          enemy.vy = 0;
          enemy.onGround = true;
        }
      }
    }

    if (enemy.y < PHYSICS.DEATH_Y - 2) {
      enemy.dead = true;
      enemy.removed = true;
    }
  }

  // Enemy-to-enemy and sliding-shell-to-enemy interactions
  for (let i = 0; i < sim.enemies.length; i++) {
    const a = sim.enemies[i];
    if (a.dead || a.removed || !a.active) continue;
    for (let j = i + 1; j < sim.enemies.length; j++) {
      const b = sim.enemies[j];
      if (b.dead || b.removed || !b.active) continue;
      const boxA = getEnemyBounds(a);
      const boxB = getEnemyBounds(b);
      if (!aabbOverlap(boxA, boxB)) continue;

      if (a.state === 'shell_slide' && b.state !== 'shell_slide') {
        awardShellKill(sim, a, b);
      } else if (b.state === 'shell_slide' && a.state !== 'shell_slide') {
        awardShellKill(sim, b, a);
      } else if (a.state === 'walk' && b.state === 'walk') {
        if (a.x < b.x) {
          a.dir = -1;
          b.dir = 1;
          const mid = (a.x + b.x) * 0.5;
          a.x = mid - a.width * 0.5 - 0.01;
          b.x = mid + b.width * 0.5 + 0.01;
        } else {
          a.dir = 1;
          b.dir = -1;
          const mid = (a.x + b.x) * 0.5;
          b.x = mid - b.width * 0.5 - 0.01;
          a.x = mid + a.width * 0.5 + 0.01;
        }
      }
    }
  }
}

function awardShellKill(sim, shellEnemy, victim) {
  if (victim.dead) return;
  const idx = Math.min(
    shellEnemy.shellChain,
    SCORES.SHELL_CHAIN.length - 1
  );
  const reward = SCORES.SHELL_CHAIN[idx];
  shellEnemy.shellChain += 1;
  defeatEnemyInstant(sim, victim, reward);
}

export function resolvePlayerEnemyContacts(sim) {
  if (sim.area !== AREAS.SURFACE || sim.player.dead) return;

  const pBox = getPlayerBounds(
    sim.player.x,
    sim.player.y,
    sim.player.width,
    sim.player.height
  );

  for (const enemy of sim.enemies) {
    if (enemy.dead || enemy.removed || !enemy.active) continue;
    const eBox = getEnemyBounds(enemy);
    if (!aabbOverlap(pBox, eBox)) continue;

    // Star Mario defeats any enemy on contact without advancing airborne stomp chain
    if (sim.player.starTimer > 0) {
      defeatEnemyInstant(sim, enemy, SCORES.ORDINARY_KILL);
      continue;
    }

    // Stationary shell can always be kicked safely on contact
    if (enemy.state === 'shell_idle') {
      kickShell(sim, enemy);
      continue;
    }

    // Check if Mario is descending onto the top of the enemy
    const enemyTop = eBox.maxY;
    const isStomp =
      sim.player.vy < 0 &&
      sim.player.prevY >= enemyTop - 0.28 &&
      pBox.minY >= eBox.minY + enemy.height * 0.35;

    if (isStomp) {
      handlePlayerStomp(sim, enemy);
    } else {
      if (enemy.state === 'shell_slide' && enemy.kickGraceTimer > 0) {
        continue;
      }
      sim.damagePlayer();
      break;
    }
  }
}

function handlePlayerStomp(sim, enemy) {
  const idx = Math.min(
    sim.player.stompChain,
    SCORES.STOMP_CHAIN.length - 1
  );
  const reward = SCORES.STOMP_CHAIN[idx];
  sim.player.stompChain += 1;

  sim.player.y = enemy.y + enemy.height + 0.01;
  sim.player.vy = sim.input.jumpDown
    ? PHYSICS.STOMP_BOUNCE_HIGH
    : PHYSICS.STOMP_BOUNCE_LOW;
  sim.player.onGround = false;

  if (enemy.type === 'goomba') {
    enemy.dead = true;
    enemy.state = 'flattened';
    enemy.height = 0.35;
    enemy.vx = 0;
    enemy.removeTimer = 0.45;
    sim.enemiesDefeated += 1;
  } else {
    // Koopa walking or sliding shell -> stationary shell
    enemy.state = 'shell_idle';
    enemy.height = 0.78;
    enemy.vx = 0;
    enemy.shellTimer = 0;
    enemy.shellChain = 0;
  }

  if (reward === '1-UP') {
    sim.grantExtraLife(enemy.x, enemy.y + 0.9);
  } else {
    sim.addScore(reward, enemy.x, enemy.y + 0.9, true);
  }
  sim.emit('sfx', { type: 'stomp' });
}

export function kickShell(sim, enemy) {
  enemy.state = 'shell_slide';
  enemy.height = 0.78;
  enemy.shellTimer = 0;
  enemy.shellChain = 0;
  enemy.dir = sim.player.x <= enemy.x ? 1 : -1;
  enemy.vx = enemy.dir * PHYSICS.SHELL_SPEED;
  enemy.kickGraceTimer = PHYSICS.SHELL_KICK_GRACE;
  // Push shell slightly outside player bounds
  const offset = (sim.player.width + enemy.width) * 0.5 + 0.04;
  const candidateX = sim.player.x + enemy.dir * offset;
  const testBox = {
    minX: candidateX - enemy.width * 0.5,
    maxX: candidateX + enemy.width * 0.5,
    minY: enemy.y,
    maxY: enemy.y + enemy.height,
  };
  if (!overlapsAnySolid(sim, testBox, 0.02)) {
    enemy.x = candidateX;
  }
  sim.addScore(100, enemy.x, enemy.y + 0.8, true);
  sim.emit('sfx', { type: 'kick' });
}

export function trySpawnFireball(sim) {
  if (sim.player.power !== POWER_STATES.FIRE) return false;
  if (sim.player.fireCooldown > 0) return false;
  if (sim.fireballs.length >= PHYSICS.FIREBALL_MAX_ACTIVE) return false;

  const dir = sim.player.facing >= 0 ? 1 : -1;
  const spawnX = sim.player.x + dir * (sim.player.width * 0.5 + 0.22);
  const spawnY = sim.player.y + sim.player.height * 0.58;
  const radius = 0.16;

  const spawnBox = {
    minX: spawnX - radius,
    maxX: spawnX + radius,
    minY: spawnY - radius,
    maxY: spawnY + radius,
  };

  // Reject a spawn embedded in a solid
  if (overlapsAnySolid(sim, spawnBox, 0.0)) {
    return false;
  }

  sim.fireballs.push({
    id: `fb_${sim.nextEntityId++}`,
    x: spawnX,
    y: spawnY,
    vx: dir * PHYSICS.FIREBALL_SPEED,
    vy: -3.5,
    radius,
    life: PHYSICS.FIREBALL_LIFETIME,
  });

  sim.player.fireCooldown = PHYSICS.FIREBALL_COOLDOWN;
  sim.player.throwPoseTimer = 0.16;
  sim.emit('sfx', { type: 'fireball' });
  return true;
}

export function updateFireballs(sim, dt) {
  for (let i = sim.fireballs.length - 1; i >= 0; i--) {
    const fb = sim.fireballs[i];
    fb.life -= dt;
    if (
      fb.life <= 0 ||
      fb.y < PHYSICS.DEATH_Y ||
      Math.abs(fb.x - sim.player.x) > 26
    ) {
      sim.fireballs.splice(i, 1);
      continue;
    }

    // Horizontal motion — wall impact removes fireball
    fb.x += fb.vx * dt;
    const hBox = {
      minX: fb.x - fb.radius,
      maxX: fb.x + fb.radius,
      minY: fb.y - fb.radius,
      maxY: fb.y + fb.radius,
    };
    const solids = getActiveSolids(sim, false);
    let hitWall = false;
    for (const s of solids) {
      if (
        hBox.maxY > s.minY + 0.04 &&
        hBox.minY < s.maxY - 0.04 &&
        aabbOverlap(hBox, s)
      ) {
        hitWall = true;
        break;
      }
    }
    if (hitWall) {
      sim.emit('fireball_pop', { x: fb.x, y: fb.y });
      sim.emit('sfx', { type: 'bump' });
      sim.fireballs.splice(i, 1);
      continue;
    }

    // Vertical motion — floor bounces, ceiling removes fireball
    fb.vy += PHYSICS.FIREBALL_GRAVITY * dt;
    fb.y += fb.vy * dt;
    const vBox = {
      minX: fb.x - fb.radius,
      maxX: fb.x + fb.radius,
      minY: fb.y - fb.radius,
      maxY: fb.y + fb.radius,
    };
    let hitCeiling = false;
    for (const s of solids) {
      if (aabbOverlap(vBox, s)) {
        if (fb.vy <= 0 && vBox.minY <= s.maxY && vBox.maxY > s.maxY) {
          fb.y = s.maxY + fb.radius;
          fb.vy = PHYSICS.FIREBALL_BOUNCE_VY;
        } else if (fb.vy > 0) {
          hitCeiling = true;
          break;
        }
      }
    }
    if (hitCeiling) {
      sim.emit('fireball_pop', { x: fb.x, y: fb.y });
      sim.fireballs.splice(i, 1);
      continue;
    }

    // Enemy hit check (surface)
    if (sim.area === AREAS.SURFACE) {
      let hitEnemy = false;
      const fBox = {
        minX: fb.x - fb.radius,
        maxX: fb.x + fb.radius,
        minY: fb.y - fb.radius,
        maxY: fb.y + fb.radius,
      };
      for (const enemy of sim.enemies) {
        if (enemy.dead || enemy.removed || !enemy.active) continue;
        if (aabbOverlap(fBox, getEnemyBounds(enemy))) {
          defeatEnemyInstant(sim, enemy, SCORES.ORDINARY_KILL);
          sim.emit('fireball_pop', { x: fb.x, y: fb.y });
          hitEnemy = true;
          break;
        }
      }
      if (hitEnemy) {
        sim.fireballs.splice(i, 1);
      }
    }
  }
}
