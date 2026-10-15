// Authoritative deterministic simulation for Low Poly Mario

import {
  AREAS,
  DT,
  GAME_STATES,
  PHYSICS,
  POWER_STATES,
  SCORES,
} from './constants.js';
import { createLevelData } from './levelData.js';
import {
  aabbOverlap,
  getActiveSolids,
  getPlayerBounds,
  getPlayerHeight,
  overlapsAnySolid,
} from './physicsHelpers.js';
import {
  activateBlock,
  resolvePlayerEnemyContacts,
  trySpawnFireball,
  updateEnemies,
  updateFireballs,
  updateItems,
} from './entities.js';

export class GameSimulation {
  constructor(recordsManager = null) {
    this.records = recordsManager;
    this.listeners = [];
    this.nextEntityId = 1;
    this.resetRun(true);
  }

  onEvent(listener) {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  emit(type, payload = {}) {
    const evt = { ...payload, type };
    if (payload && payload.type) {
      evt.sfx = payload.type;
    }
    for (const fn of this.listeners) {
      fn(evt);
    }
  }

  clearInput() {
    this.input = {
      left: false,
      right: false,
      down: false,
      run: false,
      jumpDown: false,
      jumpPressed: false,
      firePressed: false,
    };
  }

  setInput(nextInput) {
    if (typeof nextInput.left === 'boolean') this.input.left = nextInput.left;
    if (typeof nextInput.right === 'boolean') this.input.right = nextInput.right;
    if (typeof nextInput.down === 'boolean') this.input.down = nextInput.down;
    if (typeof nextInput.run === 'boolean') this.input.run = nextInput.run;
    if (typeof nextInput.jumpDown === 'boolean') {
      if (nextInput.jumpDown && !this.input.jumpDown) {
        this.input.jumpPressed = true;
      }
      this.input.jumpDown = nextInput.jumpDown;
    }
    if (nextInput.jumpPressed) this.input.jumpPressed = true;
    if (nextInput.firePressed) this.input.firePressed = true;
  }

  resetRun(toTitle = false) {
    this.level = createLevelData();
    this.state = toTitle ? GAME_STATES.TITLE : GAME_STATES.PLAY;
    this.area = AREAS.SURFACE;

    this.score = 0;
    this.coins = 0;
    this.lives = PHYSICS.INITIAL_LIVES;
    this.timer = PHYSICS.INITIAL_TIMER;
    this.displayedTimer = PHYSICS.INITIAL_TIMER;
    this.hurryTriggered = false;
    this.runTime = 0;

    this.checkpointReached = false;
    this.discoveredSecrets = new Set();
    this.enemiesDefeated = 0;
    this.nextEntityId = 1;

    this.blocks = this.level.blocks.map((b) => ({
      ...b,
      used: false,
      broken: false,
      bumpTimer: 0,
      revealed: b.type === 'hidden_1up' ? Boolean(b.revealed) : true,
    }));

    this.surfaceCoins = this.level.surfaceCoins.map((c) => ({
      ...c,
      collected: false,
    }));

    this.cellarCoins = this.level.cellar.coins.map((c) => ({
      ...c,
      collected: false,
    }));

    this.items = [];
    this.fireballs = [];
    this._spawnInitialEnemies();
    this._initPlayer(this.level.playerStart.x, this.level.playerStart.y);
    this.clearInput();

    this.warp = null;
    this.finish = null;
    this.lastRecordSummary = null;
    this.emit('run_reset', { state: this.state });
  }

  _spawnInitialEnemies() {
    this.enemies = this.level.enemies.map((e) => ({
      ...e,
      vx: 0,
      vy: 0,
      width: 0.78,
      height: e.type === 'goomba' ? 0.82 : 1.15,
      state: 'walk',
      active: false,
      dead: false,
      removed: false,
      onGround: false,
      shellTimer: 0,
      shellChain: 0,
      kickGraceTimer: 0,
      removeTimer: 0,
    }));
  }

  _initPlayer(x, y, preservePower = false) {
    const power = preservePower ? this.player.power : POWER_STATES.SMALL;
    const height = getPlayerHeight(power, false);
    this.player = {
      x,
      y,
      prevX: x,
      prevY: y,
      vx: 0,
      vy: 0,
      facing: 1,
      power,
      pendingPower: null,
      ducking: false,
      width: PHYSICS.PLAYER_WIDTH,
      height,
      onGround: true,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      isSkidding: false,
      stompChain: 0,
      starTimer: 0,
      hurtInvulnTimer: 0,
      transformTimer: 0,
      fireCooldown: 0,
      throwPoseTimer: 0,
      dead: false,
      deathTimer: 0,
      visible: true,
      animWalkPhase: 0,
    };
  }

  startGame() {
    if (this.state === GAME_STATES.TITLE) {
      this.resetRun(false);
      this.state = GAME_STATES.PLAY;
      this.emit('state_change', { state: this.state });
    } else if (
      this.state === GAME_STATES.GAMEOVER ||
      this.state === GAME_STATES.WIN
    ) {
      this.resetRun(false);
      this.emit('state_change', { state: this.state });
    } else if (this.state === GAME_STATES.PAUSED) {
      this.togglePause();
    }
  }

  togglePause() {
    if (this.state === GAME_STATES.PLAY) {
      this.state = GAME_STATES.PAUSED;
      this.clearInput();
      this.emit('state_change', { state: this.state });
    } else if (this.state === GAME_STATES.PAUSED) {
      this.state = GAME_STATES.PLAY;
      this.clearInput();
      this.emit('state_change', { state: this.state });
    }
  }

  addScore(points, x = null, y = null, popup = false) {
    if (points <= 0) return;
    this.score += points;
    if (popup && x !== null && y !== null) {
      this.emit('popup', { text: `${points}`, x, y, kind: 'score' });
    }
  }

  collectCoin(x, y, fromBlock = false) {
    this.coins += 1;
    this.addScore(SCORES.COIN, x, y, true);
    this.emit('sfx', { type: 'coin' });
    if (fromBlock) {
      this.emit('block_coin', { x, y });
    }
    if (this.coins % 100 === 0) {
      this.grantExtraLife(x, y + 0.5);
    }
  }

  grantExtraLife(x, y) {
    this.lives += 1;
    this.emit('popup', { text: '1-UP', x, y, kind: '1up' });
    this.emit('sfx', { type: '1up' });
  }

  recordSecret(secretId) {
    if (!secretId || this.discoveredSecrets.has(secretId)) return false;
    this.discoveredSecrets.add(secretId);
    this.emit('popup', {
      text: 'SECRET!',
      x: this.player.x,
      y: this.player.y + this.player.height + 0.6,
      kind: 'secret',
    });
    return true;
  }

  requestPowerTransition(targetPower) {
    if (this.player.power === targetPower && !this.player.pendingPower) return;
    this.player.transformTimer = PHYSICS.TRANSFORM_FREEZE_DURATION;
    this.emit('sfx', { type: 'powerup' });

    if (targetPower === POWER_STATES.FIRE) {
      this.player.power = POWER_STATES.FIRE;
      this.player.pendingPower = null;
      this.player.height = getPlayerHeight(
        this.player.power,
        this.player.ducking
      );
      return;
    }

    // Check if growing to BIG is immediately safe under ceilings
    const testBox = getPlayerBounds(
      this.player.x,
      this.player.y,
      this.player.width,
      PHYSICS.BIG_HEIGHT
    );
    if (!overlapsAnySolid(this, testBox, 0.02)) {
      this.player.power = POWER_STATES.BIG;
      this.player.pendingPower = null;
      this.player.height = getPlayerHeight(
        this.player.power,
        this.player.ducking
      );
    } else {
      // Deferred growth until ceiling clearance is safe
      this.player.pendingPower = POWER_STATES.BIG;
    }
  }

  damagePlayer() {
    if (
      this.player.dead ||
      this.player.starTimer > 0 ||
      this.player.hurtInvulnTimer > 0 ||
      this.player.transformTimer > 0
    ) {
      return;
    }

    if (this.player.power !== POWER_STATES.SMALL || this.player.pendingPower) {
      this.player.power = POWER_STATES.SMALL;
      this.player.pendingPower = null;
      this.player.ducking = false;
      this.player.height = PHYSICS.SMALL_HEIGHT;
      this.player.hurtInvulnTimer = PHYSICS.HURT_INVULN_DURATION;
      this.player.transformTimer = PHYSICS.TRANSFORM_FREEZE_DURATION;
      this.emit('sfx', { type: 'powerdown' });
    } else {
      this.killPlayer('damage');
    }
  }

  killPlayer(reason = 'damage') {
    if (this.player.dead || this.state === GAME_STATES.DYING) return;
    this.player.dead = true;
    this.player.vx = 0;
    this.player.vy = reason === 'pit' ? 11.0 : 14.5;
    this.player.deathTimer = 1.65;
    this.player.stompChain = 0;
    this.player.starTimer = 0;
    this.lives -= 1;
    this.state = GAME_STATES.DYING;
    this.clearInput();
    this.emit('sfx', { type: 'die' });
    this.emit('state_change', { state: this.state, reason });
  }

  step(dt = DT) {
    if (
      this.state === GAME_STATES.TITLE ||
      this.state === GAME_STATES.PAUSED ||
      this.state === GAME_STATES.GAMEOVER ||
      this.state === GAME_STATES.WIN
    ) {
      this.input.jumpPressed = false;
      this.input.firePressed = false;
      return;
    }

    if (this.state === GAME_STATES.DYING) {
      this._stepDying(dt);
      this.input.jumpPressed = false;
      this.input.firePressed = false;
      return;
    }

    if (this.state === GAME_STATES.WARP) {
      this._stepWarp(dt);
      this.input.jumpPressed = false;
      this.input.firePressed = false;
      return;
    }

    if (this.state === GAME_STATES.FINISH) {
      this._stepFinish(dt);
      this.input.jumpPressed = false;
      this.input.firePressed = false;
      return;
    }

    // Active gameplay state (PLAY)
    this.runTime += dt;

    // Update block cosmetic bump timers
    for (const b of this.blocks) {
      if (b.bumpTimer > 0) {
        b.bumpTimer = Math.max(0, b.bumpTimer - dt);
      }
    }

    // Update transformation freeze timer
    if (this.player.transformTimer > 0) {
      this.player.transformTimer = Math.max(0, this.player.transformTimer - dt);
      this.input.jumpPressed = false;
      this.input.firePressed = false;
      return;
    }

    // Countdown timer
    this.timer = Math.max(0, this.timer - dt);
    this.displayedTimer = Math.ceil(this.timer);

    if (
      !this.hurryTriggered &&
      this.displayedTimer <= PHYSICS.HURRY_THRESHOLD &&
      this.displayedTimer > 0
    ) {
      this.hurryTriggered = true;
      this.emit('sfx', { type: 'hurry' });
    }

    if (this.timer <= 0) {
      this.displayedTimer = 0;
      this.killPlayer('timeout');
      return;
    }

    // Timers on player
    if (this.player.hurtInvulnTimer > 0) {
      this.player.hurtInvulnTimer = Math.max(
        0,
        this.player.hurtInvulnTimer - dt
      );
    }
    if (this.player.starTimer > 0) {
      const prevStar = this.player.starTimer;
      this.player.starTimer = Math.max(0, this.player.starTimer - dt);
      if (prevStar > 0 && this.player.starTimer === 0) {
        this.emit('star_end');
      }
    }
    if (this.player.fireCooldown > 0) {
      this.player.fireCooldown = Math.max(0, this.player.fireCooldown - dt);
    }
    if (this.player.throwPoseTimer > 0) {
      this.player.throwPoseTimer = Math.max(
        0,
        this.player.throwPoseTimer - dt
      );
    }

    // Deferred growth check under low ceiling
    if (this.player.pendingPower === POWER_STATES.BIG) {
      const testBox = getPlayerBounds(
        this.player.x,
        this.player.y,
        this.player.width,
        PHYSICS.BIG_HEIGHT
      );
      if (!overlapsAnySolid(this, testBox, 0.02)) {
        this.player.power = POWER_STATES.BIG;
        this.player.pendingPower = null;
        this.player.height = getPlayerHeight(
          this.player.power,
          this.player.ducking
        );
      }
    }

    this._stepPlayerMovement(dt);

    // Check secret pipe entry or cellar exit
    if (this._checkPipeTravel()) {
      this.input.jumpPressed = false;
      this.input.firePressed = false;
      return;
    }

    // Fireball firing (fresh press or held run/fire with cooldown)
    if (
      this.player.power === POWER_STATES.FIRE &&
      !this.player.ducking &&
      (this.input.firePressed || this.input.run)
    ) {
      trySpawnFireball(this);
    }

    updateItems(this, dt);
    updateFireballs(this, dt);
    updateEnemies(this, dt);
    resolvePlayerEnemyContacts(this);
    this._collectWorldCoins();

    // Checkpoint activation on surface
    if (
      this.area === AREAS.SURFACE &&
      !this.checkpointReached &&
      this.player.x >= this.level.checkpoint.x
    ) {
      this.checkpointReached = true;
      this.emit('popup', {
        text: 'CHECKPOINT',
        x: this.level.checkpoint.x,
        y: 2.5,
        kind: 'checkpoint',
      });
      this.emit('sfx', { type: 'checkpoint' });
    }

    // Flagpole check on surface
    if (this.area === AREAS.SURFACE && !this.player.dead) {
      this._checkFlagpoleContact();
    }

    this.input.jumpPressed = false;
    this.input.firePressed = false;
  }

  _stepPlayerMovement(dt) {
    const p = this.player;
    p.prevX = p.x;
    p.prevY = p.y;

    // Ducking logic (Big/Fire Mario)
    if (p.power !== POWER_STATES.SMALL) {
      if (this.input.down && p.onGround) {
        p.ducking = true;
      } else if (p.ducking && !this.input.down) {
        const standBox = getPlayerBounds(
          p.x,
          p.y,
          p.width,
          PHYSICS.BIG_HEIGHT
        );
        if (!overlapsAnySolid(this, standBox, 0.02)) {
          p.ducking = false;
        }
      }
    } else {
      p.ducking = false;
    }
    p.height = getPlayerHeight(p.power, p.ducking);

    // Horizontal acceleration and braking
    const moveDir =
      (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const maxSpeed = this.input.run ? PHYSICS.RUN_SPEED : PHYSICS.WALK_SPEED;
    p.isSkidding = false;

    if (p.onGround && p.ducking) {
      // Brake to rest while ducking on ground
      if (Math.abs(p.vx) <= PHYSICS.GROUND_BRAKE * dt) {
        p.vx = 0;
      } else {
        p.vx -= Math.sign(p.vx) * PHYSICS.GROUND_BRAKE * dt;
      }
    } else if (moveDir !== 0) {
      p.facing = moveDir;
      if (p.onGround) {
        if (p.vx !== 0 && Math.sign(p.vx) !== moveDir) {
          p.isSkidding = Math.abs(p.vx) > 1.8;
          p.vx += moveDir * (PHYSICS.GROUND_BRAKE + PHYSICS.GROUND_ACCEL * 0.4) * dt;
        } else {
          if (Math.abs(p.vx) < maxSpeed) {
            p.vx += moveDir * PHYSICS.GROUND_ACCEL * dt;
            if (Math.abs(p.vx) > maxSpeed) p.vx = moveDir * maxSpeed;
          } else if (Math.abs(p.vx) > maxSpeed) {
            const decel = Math.min(
              Math.abs(p.vx) - maxSpeed,
              PHYSICS.GROUND_FRICTION * dt
            );
            p.vx -= Math.sign(p.vx) * decel;
          }
        }
      } else {
        // Air control
        p.vx += moveDir * PHYSICS.AIR_ACCEL * dt;
        if (Math.abs(p.vx) > maxSpeed) {
          p.vx = moveDir * maxSpeed;
        }
      }
    } else {
      // No horizontal input
      const brake = p.onGround ? PHYSICS.GROUND_FRICTION : PHYSICS.AIR_BRAKE;
      if (Math.abs(p.vx) <= brake * dt) {
        p.vx = 0;
      } else {
        p.vx -= Math.sign(p.vx) * brake * dt;
      }
    }

    // Coyote time & jump buffer
    if (p.onGround) {
      p.coyoteTimer = PHYSICS.COYOTE_TIME;
    } else {
      p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
    }

    if (this.input.jumpPressed) {
      p.jumpBufferTimer = PHYSICS.JUMP_BUFFER;
    } else {
      p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
    }

    if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
      const speedRatio = Math.max(
        0,
        (Math.abs(p.vx) - PHYSICS.WALK_SPEED) /
          (PHYSICS.RUN_SPEED - PHYSICS.WALK_SPEED)
      );
      p.vy = PHYSICS.JUMP_SPEED + speedRatio * PHYSICS.RUN_JUMP_BOOST;
      p.onGround = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      this.emit('sfx', { type: 'jump' });
    }

    // Horizontal step + collision resolution
    p.x += p.vx * dt;
    if (this.area === AREAS.SURFACE && p.x < this.level.leftBoundary) {
      p.x = this.level.leftBoundary;
      if (p.vx < 0) p.vx = 0;
    }

    const hBox = getPlayerBounds(p.x, p.y, p.width, p.height);
    const solidsH = getActiveSolids(this, false);
    for (const s of solidsH) {
      if (
        hBox.maxY > s.minY + 0.05 &&
        hBox.minY < s.maxY - 0.05 &&
        aabbOverlap(hBox, s)
      ) {
        if (p.prevX <= s.minX) {
          p.x = s.minX - p.width * 0.5;
          if (p.vx > 0) p.vx = 0;
        } else if (p.prevX >= s.maxX) {
          p.x = s.maxX + p.width * 0.5;
          if (p.vx < 0) p.vx = 0;
        } else if (p.vx >= 0) {
          p.x = s.minX - p.width * 0.5;
          p.vx = 0;
        } else {
          p.x = s.maxX + p.width * 0.5;
          p.vx = 0;
        }
      }
    }

    // Vertical step + variable jump gravity
    const grav =
      p.vy > 0 && !this.input.jumpDown
        ? PHYSICS.JUMP_CUT_GRAVITY
        : PHYSICS.GRAVITY;
    p.vy += grav * dt;
    if (p.vy < -PHYSICS.MAX_FALL_SPEED) {
      p.vy = -PHYSICS.MAX_FALL_SPEED;
    }

    p.y += p.vy * dt;
    p.onGround = false;

    const vBox = getPlayerBounds(p.x, p.y, p.width, p.height);
    const solidsV = getActiveSolids(this, p.vy > 0);
    const headCandidateBlocks = [];

    for (const s of solidsV) {
      if (
        vBox.maxX <= s.minX + 0.04 ||
        vBox.minX >= s.maxX - 0.04 ||
        !aabbOverlap(vBox, s)
      ) {
        continue;
      }

      if (p.vy <= 0 && p.prevY >= s.maxY - 0.16) {
        if (s.kind === 'block' && s.block.type === 'hidden_1up' && !s.block.revealed) {
          continue;
        }
        p.y = s.maxY;
        p.vy = 0;
        p.onGround = true;
        p.stompChain = 0;
      } else if (
        p.vy > 0 &&
        p.prevY + p.height <= s.minY + 0.25
      ) {
        p.y = s.minY - p.height;
        p.vy = 0;
        if (s.kind === 'block' && s.block) {
          headCandidateBlocks.push(s.block);
        } else {
          this.emit('sfx', { type: 'bump' });
        }
      }
    }

    // Activate at most one closest block on a single upward head impact
    if (headCandidateBlocks.length > 0) {
      headCandidateBlocks.sort(
        (a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x)
      );
      activateBlock(this, headCandidateBlocks[0], false);
    }

    // Walk animation phase
    if (p.onGround && Math.abs(p.vx) > 0.2) {
      p.animWalkPhase += Math.abs(p.vx) * dt * 2.4;
    }

    // Pit death check
    if (p.y < PHYSICS.DEATH_Y) {
      this.killPlayer('pit');
    }
  }

  _collectWorldCoins() {
    const pBox = getPlayerBounds(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height
    );
    const list =
      this.area === AREAS.CELLAR ? this.cellarCoins : this.surfaceCoins;

    for (const c of list) {
      if (c.collected) continue;
      const cBox = {
        minX: c.x - 0.36,
        maxX: c.x + 0.36,
        minY: c.y - 0.36,
        maxY: c.y + 0.36,
      };
      if (aabbOverlap(pBox, cBox)) {
        c.collected = true;
        this.collectCoin(c.x, c.y, false);
      }
    }
  }

  _checkPipeTravel() {
    const p = this.player;
    if (!p.onGround) return false;

    if (this.area === AREAS.SURFACE) {
      if (!this.input.down) return false;
      for (const pipe of this.level.pipes) {
        if (!pipe.enterable) continue;
        const onTop = Math.abs(p.y - pipe.height) < 0.08;
        const centered = Math.abs(p.x - pipe.x) <= 0.42;
        if (onTop && centered) {
          this.recordSecret(pipe.secretId);
          this.fireballs = [];
          this.clearInput();
          this.state = GAME_STATES.WARP;
          this.warp = {
            direction: 'to_cellar',
            phase: 'enter',
            timer: 0.55,
            startX: pipe.x,
            startY: pipe.height,
          };
          p.x = pipe.x;
          p.vx = 0;
          p.vy = 0;
          this.emit('sfx', { type: 'pipe' });
          this.emit('state_change', { state: this.state });
          return true;
        }
      }
    } else if (this.area === AREAS.CELLAR) {
      const ep = this.level.cellar.exitPipe;
      const onTopEnter =
        this.input.down &&
        Math.abs(p.y - ep.height) < 0.12 &&
        Math.abs(p.x - ep.x) <= 0.55;
      const sideEnter =
        this.input.right &&
        p.y >= 0.9 &&
        p.y <= 1.2 &&
        p.x >= 7.5 &&
        p.x <= 8.25;

      if (onTopEnter || sideEnter) {
        this.fireballs = [];
        this.clearInput();
        const surfaceExit = this.level.pipes.find((pi) => pi.isExitPipe);
        this.state = GAME_STATES.WARP;
        this.warp = {
          direction: 'to_surface',
          phase: 'enter',
          timer: 0.45,
          exitX: surfaceExit ? surfaceExit.x : 46,
          exitY: surfaceExit ? surfaceExit.height : 2.0,
        };
        p.vx = 0;
        p.vy = 0;
        this.emit('sfx', { type: 'pipe' });
        this.emit('state_change', { state: this.state });
        return true;
      }
    }
    return false;
  }

  _stepWarp(dt) {
    if (!this.warp) {
      this.state = GAME_STATES.PLAY;
      return;
    }
    this.warp.timer -= dt;

    if (this.warp.direction === 'to_cellar') {
      this.player.y -= 2.2 * dt;
      if (this.warp.timer <= 0) {
        this.area = AREAS.CELLAR;
        this.player.x = this.level.cellar.spawnX;
        this.player.y = this.level.cellar.spawnY;
        this.player.prevX = this.player.x;
        this.player.prevY = this.player.y;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.ducking = false;
        this.player.height = getPlayerHeight(this.player.power, false);
        this.warp = null;
        this.state = GAME_STATES.PLAY;
        this.emit('area_change', { area: this.area });
        this.emit('state_change', { state: this.state });
      }
    } else {
      if (this.warp.phase === 'enter') {
        this.player.y -= 1.8 * dt;
        if (this.warp.timer <= 0) {
          this.area = AREAS.SURFACE;
          this.warp.phase = 'emerge';
          this.warp.timer = 0.5;
          this.player.x = this.warp.exitX;
          this.player.y = this.warp.exitY - 1.5;
          this.emit('area_change', { area: this.area });
          this.emit('sfx', { type: 'pipe' });
        }
      } else {
        this.player.y += 3.0 * dt;
        if (this.warp.timer <= 0 || this.player.y >= this.warp.exitY) {
          this.player.x = this.warp.exitX;
          this.player.y = this.warp.exitY;
          this.player.prevX = this.player.x;
          this.player.prevY = this.player.y;
          this.player.vx = 0;
          this.player.vy = 0;
          this.player.onGround = true;
          this.player.ducking = false;
          this.player.height = getPlayerHeight(this.player.power, false);
          this.player.hurtInvulnTimer = Math.max(
            this.player.hurtInvulnTimer,
            PHYSICS.WARP_INVULN_DURATION
          );
          this.warp = null;
          this.state = GAME_STATES.PLAY;
          this.emit('state_change', { state: this.state });
        }
      }
    }
  }

  _stepDying(dt) {
    this.player.vy += PHYSICS.GRAVITY * 0.85 * dt;
    this.player.y += this.player.vy * dt;
    this.player.deathTimer -= dt;

    if (this.player.deathTimer <= 0) {
      if (this.lives <= 0) {
        this.state = GAME_STATES.GAMEOVER;
        if (this.records) {
          this.lastRecordSummary = this.records.recordRun({
            score: this.score,
            runTime: this.runTime,
            completed: false,
          });
        }
        this.emit('state_change', { state: this.state });
      } else {
        this._respawnAfterDeath();
      }
    }
  }

  _respawnAfterDeath() {
    this.area = AREAS.SURFACE;
    const spawnX = this.checkpointReached
      ? this.level.checkpoint.respawnX
      : this.level.playerStart.x;
    const spawnY = this.checkpointReached
      ? this.level.checkpoint.respawnY
      : this.level.playerStart.y;

    this._initPlayer(spawnX, spawnY, false);
    this.player.hurtInvulnTimer = PHYSICS.RESPAWN_INVULN_DURATION;
    this.timer = PHYSICS.INITIAL_TIMER;
    this.displayedTimer = PHYSICS.INITIAL_TIMER;
    this.hurryTriggered = false;
    this.fireballs = [];

    // Ensure no enemy stands dangerously close to the respawn point
    for (const e of this.enemies) {
      if (!e.dead && Math.abs(e.x - spawnX) < 5.5) {
        e.x = spawnX + 9.0;
        e.dir = -1;
        e.state = 'walk';
      }
    }

    this.state = GAME_STATES.PLAY;
    this.clearInput();
    this.emit('area_change', { area: this.area });
    this.emit('state_change', { state: this.state });
  }

  _checkFlagpoleContact() {
    const fp = this.level.flagpole;
    const p = this.player;
    if (p.y <= PHYSICS.DEATH_Y || p.y < 0) return;

    const halfW = p.width * 0.5;
    if (p.x + halfW >= fp.x - 0.18 && p.x - halfW <= fp.x + 0.35) {
      const contactFeetY = Math.max(0, p.y);
      let flagBonus = 100;
      if (contactFeetY > 7.0) flagBonus = 5000;
      else if (contactFeetY > 5.0) flagBonus = 2000;
      else if (contactFeetY > 3.0) flagBonus = 800;
      else if (contactFeetY > 1.0) flagBonus = 400;

      const capturedTimer = this.displayedTimer;
      const lastDigit = capturedTimer % 10;
      const fireworksEarned =
        lastDigit === 1 || lastDigit === 3 || lastDigit === 6 ? lastDigit : 0;

      // Clamp Mario onto the flagpole for a controlled slide
      p.x = fp.x - 0.22;
      p.y = Math.min(Math.max(p.y, fp.baseY), fp.topY - p.height * 0.5);
      p.vx = 0;
      p.vy = 0;
      p.facing = 1;
      p.starTimer = 0;
      this.fireballs = [];
      this.clearInput();

      this.addScore(flagBonus, fp.x, p.y + 1.0, true);

      this.finish = {
        phase: 'slide',
        capturedTimer,
        tallyRemaining: capturedTimer,
        tallyAccum: 0,
        flagY: fp.flagStartY,
        flagBonus,
        timeBonus: 0,
        fireworksEarned,
        fireworksRemaining: fireworksEarned,
        fireworkBonus: 0,
        phaseTimer: 0,
      };

      this.state = GAME_STATES.FINISH;
      this.emit('sfx', { type: 'flagpole' });
      this.emit('state_change', { state: this.state });
    }
  }

  _stepFinish(dt) {
    const f = this.finish;
    if (!f) return;
    const fp = this.level.flagpole;

    if (f.phase === 'slide') {
      const slideSpeed = 6.2;
      this.player.y = Math.max(fp.baseY, this.player.y - slideSpeed * dt);
      f.flagY = Math.max(fp.flagEndY, f.flagY - slideSpeed * dt);

      if (this.player.y <= fp.baseY + 0.01 && f.flagY <= fp.flagEndY + 0.01) {
        f.phase = 'walk_to_castle';
        this.player.y = 0;
        this.player.onGround = true;
        this.emit('sfx', { type: 'course_clear' });
      }
      return;
    }

    if (f.phase === 'walk_to_castle') {
      const walkSpeed = 4.2;
      this.player.vx = walkSpeed;
      this.player.x += walkSpeed * dt;
      this.player.animWalkPhase += walkSpeed * dt * 2.5;

      if (this.player.x >= this.level.castle.doorX) {
        this.player.x = this.level.castle.doorX;
        this.player.vx = 0;
        this.player.visible = false;
        f.phase = 'tally';
        f.tallyAccum = 0;
      }
      return;
    }

    if (f.phase === 'tally') {
      if (f.tallyRemaining <= 0) {
        this.displayedTimer = 0;
        f.phase = f.fireworksRemaining > 0 ? 'fireworks' : 'done_wait';
        f.phaseTimer = f.fireworksRemaining > 0 ? 0.35 : 0.45;
        return;
      }

      // Convert remaining timer units rapidly (approx 60 units/sec)
      f.tallyAccum += dt * 60;
      const units = Math.min(f.tallyRemaining, Math.floor(f.tallyAccum));
      if (units > 0) {
        f.tallyAccum -= units;
        f.tallyRemaining -= units;
        this.displayedTimer = f.tallyRemaining;
        const pts = units * SCORES.TIMER_UNIT;
        f.timeBonus += pts;
        this.score += pts;
        this.emit('sfx', { type: 'tally' });
      }
      return;
    }

    if (f.phase === 'fireworks') {
      f.phaseTimer -= dt;
      if (f.phaseTimer <= 0) {
        if (f.fireworksRemaining > 0) {
          f.fireworksRemaining -= 1;
          f.fireworkBonus += SCORES.FIREWORK;
          this.addScore(
            SCORES.FIREWORK,
            this.level.castle.x + (f.fireworksRemaining - 1) * 1.6,
            8.2,
            true
          );
          this.emit('firework', {
            x: this.level.castle.x + ((f.fireworksEarned - f.fireworksRemaining) - 1.5) * 1.8,
            y: 8.5 + (f.fireworksRemaining % 2) * 1.2,
          });
          this.emit('sfx', { type: 'firework' });
          f.phaseTimer = 0.55;
        } else {
          f.phase = 'done_wait';
          f.phaseTimer = 0.5;
        }
      }
      return;
    }

    if (f.phase === 'done_wait') {
      f.phaseTimer -= dt;
      if (f.phaseTimer <= 0) {
        this.state = GAME_STATES.WIN;
        if (this.records) {
          this.lastRecordSummary = this.records.recordRun({
            score: this.score,
            runTime: this.runTime,
            completed: true,
          });
        }
        this.emit('state_change', { state: this.state, summary: this.getRunSummary() });
      }
    }
  }

  getRunSummary() {
    const f = this.finish || {
      flagBonus: 0,
      timeBonus: 0,
      fireworkBonus: 0,
      fireworksEarned: 0,
    };
    const rec = this.records
      ? this.records.getRecords()
      : { bestScore: this.score, bestTime: this.runTime };
    return {
      score: this.score,
      runTime: Number(this.runTime.toFixed(2)),
      coins: this.coins,
      secretsFound: this.discoveredSecrets.size,
      totalSecrets: this.level.totalSecrets,
      enemiesDefeated: this.enemiesDefeated,
      flagBonus: f.flagBonus,
      timeBonus: f.timeBonus,
      fireworkBonus: f.fireworkBonus,
      fireworksEarned: f.fireworksEarned,
      bestScore: rec.bestScore,
      bestTime: rec.bestTime,
      isNewBest: this.lastRecordSummary ? this.lastRecordSummary.isNewBest : false,
      isNewBestScore: this.lastRecordSummary
        ? this.lastRecordSummary.isNewBestScore
        : false,
      isNewBestTime: this.lastRecordSummary
        ? this.lastRecordSummary.isNewBestTime
        : false,
    };
  }
}
