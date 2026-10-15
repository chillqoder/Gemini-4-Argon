// Primary application bootstrapper and fixed-timestep loop for Low Poly Mario

import { DT, MAX_ACCUMULATOR } from './constants.js';
import { RecordsManager } from './records.js';
import { GameSimulation } from './simulation.js';
import { AudioManager } from './audio.js';
import { GameRenderer } from './renderer.js';
import { InputController } from './input.js';
import { UIManager } from './ui.js';

export function bootLowPolyMario() {
  const container = document.getElementById('canvas-container');
  const touchRoot = document.getElementById('touch-controls');

  const records = new RecordsManager();
  const sim = new GameSimulation(records);
  const audio = new AudioManager();
  const renderer = new GameRenderer(container, sim);

  const handleFullRestart = () => {
    sim.resetRun(false);
    renderer.rebuildRunVisuals();
    ui.clearPopups();
    ui.updateOverlay(true);
    ui.updateHud();
  };

  const input = new InputController(sim, audio, handleFullRestart);
  const ui = new UIManager(sim, audio, renderer, handleFullRestart);

  input.attach(touchRoot);

  sim.onEvent((evt) => {
    switch (evt.type) {
      case 'sfx':
        audio.playSfx(evt.sfx);
        break;
      case 'popup':
        ui.spawnPopup(evt);
        break;
      case 'brick_debris':
        renderer.spawnBrickDebris(evt.x, evt.y);
        break;
      case 'block_coin':
        renderer.spawnBlockCoinBurst(evt.x, evt.y);
        break;
      case 'firework':
        renderer.spawnFireworkBurst(evt.x, evt.y);
        break;
      case 'run_reset':
        renderer.rebuildRunVisuals();
        ui.clearPopups();
        ui.updateOverlay(true);
        break;
      case 'state_change':
        ui.updateOverlay(true);
        break;
      default:
        break;
    }
  });

  window.addEventListener('resize', () => {
    renderer.resize();
  });

  let accumulator = 0;
  let lastTime = performance.now();

  function frame(now) {
    const rawDt = Math.max(0, (now - lastTime) / 1000);
    lastTime = now;
    const clampedDt = Math.min(rawDt, MAX_ACCUMULATOR);
    accumulator += clampedDt;

    while (accumulator >= DT) {
      sim.step(DT);
      accumulator -= DT;
    }

    audio.syncWithSimulation(sim);
    renderer.render(clampedDt);
    ui.updateHud();
    ui.updateOverlay(false);
    ui.updatePopups(clampedDt);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  // Expose deterministic inspection API for automated verification
  window.__GAME__ = {
    sim,
    records,
    audio,
    renderer,
    input,
    ui,
    restart: handleFullRestart,
    stepFrames(count = 1) {
      for (let i = 0; i < count; i++) {
        sim.step(DT);
      }
      renderer.render(DT);
      ui.updateHud();
      ui.updateOverlay(true);
    },
  };

  return window.__GAME__;
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    bootLowPolyMario();
  });
}
