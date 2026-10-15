// English HUD, overlays, personal bests panel, and floating score popups

import * as THREE from '../vendor/three.module.min.js';
import { AREAS, GAME_STATES, POWER_STATES } from './constants.js';

export class UIManager {
  constructor(sim, audio, renderer, onRestart) {
    this.sim = sim;
    this.audio = audio;
    this.renderer = renderer;
    this.onRestart = onRestart;

    this.els = {
      score: document.getElementById('hud-score'),
      coins: document.getElementById('hud-coins'),
      world: document.getElementById('hud-world'),
      time: document.getElementById('hud-time'),
      lives: document.getElementById('hud-lives'),
      power: document.getElementById('hud-power'),
      secrets: document.getElementById('hud-secrets'),
      starPill: document.getElementById('hud-star-pill'),
      starTime: document.getElementById('hud-star-time'),
      progressFill: document.getElementById('hud-progress-fill'),
      btnPause: document.getElementById('btn-pause'),
      btnMute: document.getElementById('btn-mute'),
      btnRestart: document.getElementById('btn-restart'),
      overlayContainer: document.getElementById('overlay-container'),
      overlayTitle: document.getElementById('overlay-title'),
      overlaySubtitle: document.getElementById('overlay-subtitle'),
      overlayStats: document.getElementById('overlay-stats'),
      overlayPrimaryBtn: document.getElementById('overlay-primary-btn'),
      overlaySecondaryBtn: document.getElementById('overlay-secondary-btn'),
      popupsLayer: document.getElementById('popups-layer'),
    };

    this.popups = [];
    this.lastOverlayState = null;

    this._bindButtons();
    this.updateOverlay(true);
  }

  _bindButtons() {
    if (this.els.btnPause) {
      this.els.btnPause.addEventListener('click', () => {
        this.audio.unlock();
        this.sim.togglePause();
        this.updateOverlay(true);
      });
    }
    if (this.els.btnMute) {
      this.els.btnMute.addEventListener('click', () => {
        this.audio.unlock();
        this.audio.toggleMute();
        this.updateHud();
      });
    }
    if (this.els.btnRestart) {
      this.els.btnRestart.addEventListener('click', () => {
        this.audio.unlock();
        if (this.onRestart) this.onRestart();
      });
    }
    if (this.els.overlayPrimaryBtn) {
      this.els.overlayPrimaryBtn.addEventListener('click', () => {
        this.audio.unlock();
        this.sim.startGame();
        this.updateOverlay(true);
      });
    }
    if (this.els.overlaySecondaryBtn) {
      this.els.overlaySecondaryBtn.addEventListener('click', () => {
        this.audio.unlock();
        if (this.onRestart) this.onRestart();
      });
    }
  }

  spawnPopup({ text, x, y, kind = 'score' }) {
    if (!this.els.popupsLayer) return;
    const el = document.createElement('div');
    el.className = `floating-popup popup-${kind}`;
    el.textContent = text;
    this.els.popupsLayer.appendChild(el);
    this.popups.push({
      el,
      worldX: x,
      worldY: y,
      offsetY: 0,
      life: 0.9,
    });
  }

  clearPopups() {
    for (const p of this.popups) {
      if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
    }
    this.popups = [];
  }

  updateHud() {
    const s = this.sim;
    if (this.els.score) {
      this.els.score.textContent = String(s.score).padStart(6, '0');
    }
    if (this.els.coins) {
      this.els.coins.textContent = String(s.coins).padStart(2, '0');
    }
    if (this.els.world) {
      this.els.world.textContent =
        s.area === AREAS.CELLAR ? '1-1B' : '1-1';
    }
    if (this.els.time) {
      this.els.time.textContent = String(s.displayedTimer).padStart(3, '0');
      this.els.time.classList.toggle('low-time', s.displayedTimer <= 100);
    }
    if (this.els.lives) {
      this.els.lives.textContent = String(Math.max(0, s.lives));
    }
    if (this.els.power) {
      const label =
        s.player.power === POWER_STATES.FIRE
          ? 'Fire'
          : s.player.power === POWER_STATES.BIG
          ? 'Big'
          : 'Small';
      this.els.power.textContent = label;
    }
    if (this.els.secrets) {
      this.els.secrets.textContent = `${s.discoveredSecrets.size}/${s.level.totalSecrets}`;
    }

    if (this.els.starPill && this.els.starTime) {
      if (s.player.starTimer > 0) {
        this.els.starPill.hidden = false;
        this.els.starTime.textContent = `${s.player.starTimer.toFixed(1)}s`;
      } else {
        this.els.starPill.hidden = true;
      }
    }

    if (this.els.progressFill) {
      const startX = s.level.playerStart.x;
      const goalX = s.level.flagpole.x;
      const rawPct = ((s.player.x - startX) / (goalX - startX)) * 100;
      const pct = Math.max(0, Math.min(100, rawPct));
      this.els.progressFill.style.width = `${pct.toFixed(1)}%`;
    }

    if (this.els.btnPause) {
      this.els.btnPause.textContent =
        s.state === GAME_STATES.PAUSED ? 'Resume' : 'Pause';
    }
    if (this.els.btnMute) {
      this.els.btnMute.textContent = this.audio.muted ? 'Unmute' : 'Mute';
      this.els.btnMute.setAttribute(
        'aria-pressed',
        this.audio.muted ? 'true' : 'false'
      );
    }
  }

  updateOverlay(force = false) {
    const state = this.sim.state;
    if (!force && state === this.lastOverlayState) return;
    this.lastOverlayState = state;

    const container = this.els.overlayContainer;
    if (!container) return;

    if (
      state === GAME_STATES.PLAY ||
      state === GAME_STATES.WARP ||
      state === GAME_STATES.DYING ||
      state === GAME_STATES.FINISH
    ) {
      container.hidden = true;
      return;
    }

    container.hidden = false;
    const rec = this.sim.records
      ? this.sim.records.getRecords()
      : { bestScore: 0, bestTime: null };
    const bestTimeStr =
      rec.bestTime !== null ? `${rec.bestTime.toFixed(2)}s` : '--';

    if (state === GAME_STATES.TITLE) {
      this.els.overlayTitle.textContent = 'Low Poly Mario';
      this.els.overlaySubtitle.textContent =
        'Reach the World 1-1 flagpole! Stomp enemies, power up, and discover 3 hidden secrets.';
      this.els.overlayPrimaryBtn.textContent = 'Play';
      this.els.overlaySecondaryBtn.hidden = true;
      this.els.overlayStats.innerHTML = `
        <div class="records-banner">
          <span>Best Score: <strong>${rec.bestScore}</strong></span>
          <span>Best Time: <strong>${bestTimeStr}</strong></span>
        </div>
        <div class="controls-card">
          <div><strong>A / D</strong> or <strong>Arrows</strong>: Walk</div>
          <div><strong>Space / W / Up</strong>: Jump (Hold for higher jump)</div>
          <div><strong>Shift / X</strong>: Run &amp; Fireball</div>
          <div><strong>Down / S</strong>: Duck / Enter Secret Pipe</div>
          <div><strong>P / Esc</strong>: Pause &bull; <strong>R</strong>: Restart</div>
        </div>
      `;
    } else if (state === GAME_STATES.PAUSED) {
      this.els.overlayTitle.textContent = 'Paused';
      this.els.overlaySubtitle.textContent = 'Take a breather.';
      this.els.overlayPrimaryBtn.textContent = 'Resume';
      this.els.overlaySecondaryBtn.hidden = false;
      this.els.overlaySecondaryBtn.textContent = 'Restart Run';
      this.els.overlayStats.innerHTML = `
        <div class="records-banner">
          <span>Current Score: <strong>${this.sim.score}</strong></span>
          <span>Secrets: <strong>${this.sim.discoveredSecrets.size} / ${this.sim.level.totalSecrets}</strong></span>
        </div>
      `;
    } else if (state === GAME_STATES.GAMEOVER) {
      const summary = this.sim.getRunSummary();
      this.els.overlayTitle.textContent = 'Game Over';
      this.els.overlaySubtitle.textContent =
        'You ran out of lives, but your discoveries await another try!';
      this.els.overlayPrimaryBtn.textContent = 'Try Again';
      this.els.overlaySecondaryBtn.hidden = true;
      this.els.overlayStats.innerHTML = `
        ${summary.isNewBestScore ? '<div class="new-best-badge">NEW BEST</div>' : ''}
        <div class="stats-grid">
          <div><span>Final Score</span><strong>${summary.score}</strong></div>
          <div><span>Coins Collected</span><strong>${summary.coins}</strong></div>
          <div><span>Secrets Found</span><strong>${summary.secretsFound} / ${summary.totalSecrets}</strong></div>
          <div><span>Enemies Defeated</span><strong>${summary.enemiesDefeated}</strong></div>
          <div><span>Best Score</span><strong>${summary.bestScore}</strong></div>
          <div><span>Best Time</span><strong>${summary.bestTime !== null ? `${summary.bestTime.toFixed(2)}s` : '--'}</strong></div>
        </div>
      `;
    } else if (state === GAME_STATES.WIN) {
      const summary = this.sim.getRunSummary();
      this.els.overlayTitle.textContent = 'Course Clear!';
      this.els.overlaySubtitle.textContent =
        'Congratulations! You cleared World 1-1!';
      this.els.overlayPrimaryBtn.textContent = 'Play Again';
      this.els.overlaySecondaryBtn.hidden = true;
      this.els.overlayStats.innerHTML = `
        ${summary.isNewBest ? '<div class="new-best-badge">NEW BEST</div>' : ''}
        <div class="stats-grid">
          <div><span>Final Score</span><strong>${summary.score}</strong></div>
          <div><span>Run Time</span><strong>${summary.runTime.toFixed(2)}s</strong></div>
          <div><span>Coins Collected</span><strong>${summary.coins}</strong></div>
          <div><span>Secrets Found</span><strong>${summary.secretsFound} / ${summary.totalSecrets}</strong></div>
          <div><span>Enemies Defeated</span><strong>${summary.enemiesDefeated}</strong></div>
          <div><span>Flag Bonus</span><strong>+${summary.flagBonus}</strong></div>
          <div><span>Time Bonus</span><strong>+${summary.timeBonus}</strong></div>
          <div><span>Firework Bonus</span><strong>+${summary.fireworkBonus}</strong></div>
          <div><span>Best Score</span><strong>${summary.bestScore}</strong></div>
          <div><span>Best Time</span><strong>${summary.bestTime !== null ? `${summary.bestTime.toFixed(2)}s` : '--'}</strong></div>
        </div>
      `;
    }
  }

  updatePopups(dt) {
    if (!this.renderer || !this.renderer.webglAvailable) return;
    const width =
      this.renderer.container.clientWidth || window.innerWidth || 960;
    const height =
      this.renderer.container.clientHeight || window.innerHeight || 540;
    const proj = new THREE.Vector3();

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      p.offsetY += dt * 1.4;
      if (p.life <= 0) {
        if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
        this.popups.splice(i, 1);
        continue;
      }
      proj.set(p.worldX, p.worldY + p.offsetY, 0);
      proj.project(this.renderer.camera);
      const sx = (proj.x * 0.5 + 0.5) * width;
      const sy = (-proj.y * 0.5 + 0.5) * height;
      p.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
      p.el.style.opacity = Math.min(1, p.life * 2).toFixed(2);
    }
  }
}
