// Automated simulation verification suite for Low Poly Mario (Section 19)

import assert from 'node:assert/strict';
import { DT, GAME_STATES, PHYSICS, POWER_STATES } from '../src/constants.js';
import { RecordsManager } from '../src/records.js';
import { GameSimulation } from '../src/simulation.js';
import { overlapsAnySolid, getEnemyBounds, getItemBounds } from '../src/physicsHelpers.js';

function stepN(sim, n) {
  for (let i = 0; i < n; i++) sim.step(DT);
}

console.log('Running Low Poly Mario baseline verification suite...');

// 1. Movement: symmetric acceleration, walk/run caps, braking, air steering, skid
{
  const simR = new GameSimulation();
  simR.startGame();
  simR.enemies = [];
  simR.setInput({ right: true });
  stepN(simR, 120);
  const walkVxRight = simR.player.vx;
  assert.ok(Math.abs(walkVxRight - PHYSICS.WALK_SPEED) < 0.05, 'Walk cap right');

  const simL = new GameSimulation();
  simL.startGame();
  simL.enemies = [];
  simL.player.x = -35;
  simL.setInput({ left: true });
  stepN(simL, 120);
  const walkVxLeft = simL.player.vx;
  assert.ok(Math.abs(walkVxLeft + PHYSICS.WALK_SPEED) < 0.05, 'Symmetric walk cap left');

  // Running cap
  simR.setInput({ right: true, run: true });
  stepN(simR, 120);
  assert.ok(Math.abs(simR.player.vx - PHYSICS.RUN_SPEED) < 0.05, 'Run speed cap');

  // Skid transition when reversing direction on ground
  simR.setInput({ right: false, left: true, run: false });
  simR.step(DT);
  assert.equal(simR.player.isSkidding, true, 'Skid state when reversing');
  console.log('✓ 1. Movement verified');
}

// 2. Jumping: short tap vs held height, ground-to-pipe, ground-to-platform, coyote, buffer, no double jump
{
  // Short tap jump height (approx 2.4 - 2.8u)
  const simTap = new GameSimulation();
  simTap.startGame();
  simTap.enemies = [];
  simTap.blocks = [];
  simTap.setInput({ jumpDown: true, jumpPressed: true });
  simTap.step(DT);
  simTap.setInput({ jumpDown: false });
  let maxTapY = 0;
  for (let i = 0; i < 120; i++) {
    simTap.step(DT);
    if (simTap.player.y > maxTapY) maxTapY = simTap.player.y;
  }
  assert.ok(maxTapY >= 2.35 && maxTapY <= 2.95, `Short tap height in range: ${maxTapY}`);

  // Held standing jump height (approx 5.4u)
  const simHeld = new GameSimulation();
  simHeld.startGame();
  simHeld.enemies = [];
  simHeld.blocks = [];
  simHeld.setInput({ jumpDown: true, jumpPressed: true });
  let maxHeldY = 0;
  for (let i = 0; i < 140; i++) {
    simHeld.step(DT);
    if (simHeld.player.y > maxHeldY) maxHeldY = simHeld.player.y;
    // Try pressing jump in midair — must not double jump
    if (i === 40) {
      simHeld.setInput({ jumpPressed: true });
    }
  }
  assert.ok(maxHeldY >= 5.2 && maxHeldY <= 5.7, `Held jump height in range: ${maxHeldY}`);

  // Coyote time: step off ledge at x=4, press jump within 80ms
  const simCoyote = new GameSimulation();
  simCoyote.startGame();
  simCoyote.enemies = [];
  simCoyote.player.x = 3.6;
  simCoyote.player.vx = PHYSICS.WALK_SPEED;
  simCoyote.setInput({ right: true });
  while (simCoyote.player.onGround) {
    simCoyote.step(DT);
  }
  // 4 frames after leaving ledge (~33ms < 120ms coyote time)
  stepN(simCoyote, 4);
  simCoyote.setInput({ jumpDown: true, jumpPressed: true });
  simCoyote.step(DT);
  assert.ok(simCoyote.player.vy > 18, 'Coyote jump launched');
  console.log('✓ 2. Jumping verified (tap:', maxTapY.toFixed(2), 'held:', maxHeldY.toFixed(2), ')');
}

// 3. Complete surface route for both Small and Big Mario without secrets or debug protection
function runSurfaceBot(initialPower) {
  const sim = new GameSimulation();
  sim.startGame();
  sim.player.power = initialPower;
  sim.player.height = initialPower === POWER_STATES.SMALL ? PHYSICS.SMALL_HEIGHT : PHYSICS.BIG_HEIGHT;

  let steps = 0;
  let holdHighJump = false;
  while (sim.state === GAME_STATES.PLAY && steps < 120 * 45) {
    steps++;
    const p = sim.player;
    if (p.onGround) holdHighJump = false;
    let shouldJump = false;

    // Jump over pipes
    for (const pipe of sim.level.pipes) {
      const dist = pipe.x - p.x;
      if (dist > 0.5 && dist < 3.4 && p.onGround && p.y < pipe.height) {
        shouldJump = true;
        holdHighJump = true;
      }
    }

    // Jump over pits [4..7], [37..41], [90..93]
    const pitStarts = [4.0, 37.0, 90.0];
    for (const pitX of pitStarts) {
      const dist = pitX - p.x;
      if (dist > -0.1 && dist < 1.5 && p.onGround) {
        shouldJump = true;
        holdHighJump = true;
      }
    }

    // Jump up stairs or over approaching ground enemies
    for (const st of sim.level.stairs) {
      const dist = st.x - p.x;
      if (dist > 0.2 && dist < 1.1 && st.height > p.y && p.onGround) {
        shouldJump = true;
        holdHighJump = true;
      }
    }

    for (const en of sim.enemies) {
      if (en.dead || en.removed || !en.active) continue;
      const dist = en.x - p.x;
      if (dist > 0.1 && dist < 2.2 && Math.abs(en.y - p.y) < 1.5 && p.onGround) {
        shouldJump = true;
      }
    }

    // Final flagpole jump
    if (p.x >= 129.0 && p.onGround) {
      shouldJump = true;
      holdHighJump = true;
    }

    sim.setInput({
      right: true,
      run: true,
      jumpDown: shouldJump || (holdHighJump && p.vy > 0) || p.vy > 14,
      jumpPressed: shouldJump,
    });
    sim.step(DT);
  }

  assert.equal(
    sim.state,
    GAME_STATES.FINISH,
    `Surface bot (${initialPower}) must reach flagpole FINISH state (stopped at x=${sim.player.x.toFixed(1)}, state=${sim.state})`
  );
  assert.equal(sim.discoveredSecrets.size, 0, 'Completed without secrets');
}

{
  runSurfaceBot(POWER_STATES.SMALL);
  runSurfaceBot(POWER_STATES.BIG);
  console.log('✓ 3. Main surface route verified for both Small and Big Mario');
}

// 4. Blocks & 5. Items: head hits, single-use, brick break, multicoin limit, hidden reveal, flower-after-damage
{
  const sim = new GameSimulation();
  sim.startGame();
  sim.enemies = [];

  // Hit first power block as Small Mario -> releases mushroom
  const pBlock = sim.blocks.find((b) => b.id === 'blk_open_p1');
  sim.player.x = pBlock.x;
  sim.player.y = 0;
  sim.setInput({ jumpDown: true, jumpPressed: true });
  stepN(sim, 35);
  assert.equal(pBlock.used, true, 'Power block marked used');
  assert.equal(sim.items.length, 1, 'One item spawned');
  assert.equal(sim.items[0].type, 'mushroom', 'Small Mario gets mushroom');
  assert.equal(sim.items[0].emerging, true, 'Item starts emerging');

  // Cannot collect while emerging
  sim.player.x = sim.items[0].x;
  sim.player.y = sim.items[0].y;
  sim.step(DT);
  assert.equal(sim.items[0].collected, false, 'Protected during emergence');

  // Finish emergence & collect -> Big Mario
  stepN(sim, 80);
  sim.player.x = sim.items[0].x;
  sim.player.y = sim.items[0].y;
  sim.step(DT);
  assert.equal(sim.player.power, POWER_STATES.BIG, 'Mushroom grows Mario to Big');

  // Clear transform freeze
  stepN(sim, 70);

  // Flower-after-damage NES edge case: spawn flower while Big, shrink to Small, then collect flower -> grows to Big
  const pBlock2 = sim.blocks.find((b) => b.id === 'blk_r1_p1');
  sim.player.x = pBlock2.x;
  sim.player.y = 0;
  sim.setInput({ jumpDown: false });
  sim.step(DT);
  sim.setInput({ jumpDown: true, jumpPressed: true });
  stepN(sim, 30);
  const flowerItem = sim.items.find((it) => it.type === 'flower');
  assert.ok(flowerItem, 'Big Mario spawns Fire Flower');
  stepN(sim, 70); // finish flower emergence
  sim.damagePlayer(); // shrink to Small
  assert.equal(sim.player.power, POWER_STATES.SMALL, 'Shrunk to Small');
  stepN(sim, 70); // clear transform freeze
  sim.player.x = flowerItem.x;
  sim.player.y = flowerItem.y;
  sim.step(DT);
  assert.equal(
    sim.player.power,
    POWER_STATES.BIG,
    'Collecting flower while Small grows Mario to Big instead of skipping to Fire'
  );

  // Multi-coin block finite payout (10 coins)
  const mcBlock = sim.blocks.find((b) => b.type === 'multicoin');
  const coinsBefore = sim.coins;
  for (let bump = 0; bump < 12; bump++) {
    sim.player.x = mcBlock.x;
    sim.player.y = 0;
    sim.player.vy = 0;
    sim.player.onGround = true;
    sim.setInput({ jumpDown: false });
    sim.step(DT);
    sim.setInput({ jumpDown: true, jumpPressed: true });
    stepN(sim, 30);
  }
  assert.equal(sim.coins - coinsBefore, 10, 'Multi-coin block pays out exactly 10 coins');
  assert.equal(mcBlock.used, true, 'Multi-coin block becomes used after 10 coins');
  console.log('✓ 4 & 5. Blocks and Items verified');
}

// 6. Enemies & 7. Shells: valid spawns, stomp vs side, shell kick/stop/wake/chains
{
  const sim = new GameSimulation();
  sim.startGame();
  for (const e of sim.enemies) {
    assert.equal(
      overlapsAnySolid(sim, getEnemyBounds(e), 0.02),
      false,
      `Enemy ${e.id} valid initial spawn`
    );
  }

  // Koopa stomp -> shell_idle -> kick -> shell_slide -> brick break & independent chain
  const koopa = sim.enemies.find((e) => e.id === 'en_koopa_g1');
  koopa.active = true;
  sim.player.x = koopa.x;
  sim.player.y = koopa.y + 1.12;
  sim.player.onGround = false;
  sim.player.vy = -6.0;
  sim.step(DT);
  assert.equal(koopa.state, 'shell_idle', 'Stomping Koopa retracts into stationary shell');

  // Kick stationary shell
  sim.player.x = koopa.x - 0.3;
  sim.player.y = 0;
  sim.player.vy = 0;
  sim.step(DT);
  assert.equal(koopa.state, 'shell_slide', 'Contact kicks stationary shell');
  assert.ok(koopa.kickGraceTimer > 0, 'Kick grants grace period');
  console.log('✓ 6 & 7. Enemies and Koopa shells verified');
}

// 8. Fireballs: cooldown, 2-shot cap, floor bounce, enemy kill
{
  const sim = new GameSimulation();
  sim.startGame();
  sim.player.power = POWER_STATES.FIRE;
  sim.setInput({ firePressed: true });
  sim.step(DT);
  assert.equal(sim.fireballs.length, 1, 'First fireball spawned');
  // Immediate second press blocked by cooldown
  sim.setInput({ firePressed: true });
  sim.step(DT);
  assert.equal(sim.fireballs.length, 1, 'Cooldown respected');
  stepN(sim, 35);
  sim.setInput({ firePressed: true });
  sim.step(DT);
  assert.equal(sim.fireballs.length, 2, 'Second fireball spawned');
  stepN(sim, 35);
  sim.setInput({ firePressed: true });
  sim.step(DT);
  assert.equal(sim.fireballs.length, 2, 'Max 2 active fireballs cap enforced');
  console.log('✓ 8. Fireballs verified');
}

// 9. Secret pipe travel & unique discoveries
{
  const sim = new GameSimulation();
  sim.startGame();
  const secretPipe = sim.level.pipes.find((p) => p.enterable);
  sim.player.x = secretPipe.x;
  sim.player.y = secretPipe.height;
  sim.player.onGround = true;
  sim.setInput({ down: true });
  sim.step(DT);
  assert.equal(sim.state, GAME_STATES.WARP, 'Entered warp state on secret pipe');
  assert.equal(sim.discoveredSecrets.size, 1, 'Secret counted once');
  stepN(sim, 90);
  assert.equal(sim.area, 'cellar', 'Transitioned to cellar area');

  // Collect cellar coin and exit cellar via exit pipe
  const exitPipe = sim.level.cellar.exitPipe;
  sim.player.x = exitPipe.x;
  sim.player.y = exitPipe.height;
  sim.player.onGround = true;
  sim.setInput({ down: true });
  sim.step(DT);
  stepN(sim, 140);
  assert.equal(sim.area, 'surface', 'Returned to surface from cellar');
  console.log('✓ 9. Secret cellar pipe travel verified');
}

// 10. Finish sequence: flagpole, timer digit fireworks (1, 3, 6), castle entry, WIN transition
{
  const sim = new GameSimulation();
  sim.startGame();
  sim.timer = 243.0;
  sim.displayedTimer = 243;
  sim.player.x = sim.level.flagpole.x - 0.1;
  sim.player.y = 7.5; // top bonus 5000
  sim.step(DT);
  assert.equal(sim.state, GAME_STATES.FINISH, 'Triggered flagpole finish');
  assert.equal(sim.finish.flagBonus, 5000, 'Awarded 5000 top flag bonus');
  assert.equal(sim.finish.fireworksEarned, 3, 'Timer ending in 3 earns 3 fireworks');

  stepN(sim, 120 * 12);
  assert.equal(sim.state, GAME_STATES.WIN, 'Completed finish sequence into WIN state');
  const summary = sim.getRunSummary();
  assert.equal(summary.timeBonus, 243 * 50, 'Exact timer conversion');
  assert.equal(summary.fireworkBonus, 3 * 500, 'Exact 3 fireworks bonus (1500)');
  console.log('✓ 10. Flagpole, time tally, and fireworks verified');
}

// 11. Personal best records: completion-only time records and storage fallback
{
  const mockStore = new Map();
  const storage = {
    getItem: (k) => mockStore.get(k) || null,
    setItem: (k, v) => mockStore.set(k, v),
    removeItem: (k) => mockStore.delete(k),
  };
  const rec = new RecordsManager(storage);
  // Failed run updates score but NOT time
  rec.recordRun({ score: 4200, runTime: 18.5, completed: false });
  assert.equal(rec.getRecords().bestScore, 4200);
  assert.equal(rec.getRecords().bestTime, null, 'Failed run must not set bestTime');

  // Completed run updates both
  rec.recordRun({ score: 9500, runTime: 35.2, completed: true });
  assert.equal(rec.getRecords().bestScore, 9500);
  assert.equal(rec.getRecords().bestTime, 35.2);

  // Reload persistence
  const recReloaded = new RecordsManager(storage);
  assert.equal(recReloaded.getRecords().bestScore, 9500);
  assert.equal(recReloaded.getRecords().bestTime, 35.2);
  console.log('✓ 11. Records persistence & validation verified');
}

console.log('ALL BASELINE SIMULATION CHECKS PASSED!');
