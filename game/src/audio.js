// Procedural Web Audio chiptune synthesizer and sound effects manager

import { AREAS, GAME_STATES } from './constants.js';

const MEADOW_MELODY = [
  [659.25, 0.14], [659.25, 0.14], [0, 0.14], [659.25, 0.14],
  [0, 0.14], [523.25, 0.14], [659.25, 0.28], [783.99, 0.28],
  [0, 0.28], [392.0, 0.28], [0, 0.28],
  [523.25, 0.21], [392.0, 0.21], [329.63, 0.21],
  [440.0, 0.18], [493.88, 0.18], [466.16, 0.14], [440.0, 0.24],
  [392.0, 0.18], [659.25, 0.18], [783.99, 0.18], [880.0, 0.24],
  [698.46, 0.16], [783.99, 0.16], [659.25, 0.2], [523.25, 0.16],
  [587.33, 0.16], [493.88, 0.24],
];

const CELLAR_MELODY = [
  [261.63, 0.16], [523.25, 0.16], [220.0, 0.16], [440.0, 0.16],
  [233.08, 0.16], [466.16, 0.16], [0, 0.32],
  [196.0, 0.16], [392.0, 0.16], [164.81, 0.16], [329.63, 0.16],
  [174.61, 0.16], [349.23, 0.16], [0, 0.32],
];

const STAR_MELODY = [
  [523.25, 0.11], [523.25, 0.11], [523.25, 0.11], [587.33, 0.11],
  [659.25, 0.22], [523.25, 0.22],
  [493.88, 0.11], [493.88, 0.11], [493.88, 0.11], [523.25, 0.11],
  [587.33, 0.22], [493.88, 0.22],
];

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    this.muted = false;
    this.unlocked = false;
    this.pageHidden = false;
    this.currentTheme = null;
    this.hurry = false;
    this.musicPlaying = false;

    this.noteIndex = 0;
    this.nextNoteTime = 0;
    this.activeNodes = new Set();
    this.lastTallySfxTime = 0;
  }

  unlock() {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended' && !this.pageHidden) {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }
    try {
      const AudioCtx =
        typeof window !== 'undefined' &&
        (window.AudioContext || window.webkitAudioContext);
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.gain.value = 0.16;
      this.sfxGain.gain.value = 0.24;
      this.masterGain.gain.value = this.muted ? 0 : 1;

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.unlocked = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.muted ? 0 : 1,
        this.ctx.currentTime
      );
    }
    if (this.muted) {
      this.stopActiveNodes();
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  setPageHidden(hidden) {
    this.pageHidden = Boolean(hidden);
    if (!this.ctx) return;
    if (this.pageHidden) {
      this.stopActiveNodes();
      if (this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else if (this.unlocked) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.nextNoteTime = this.ctx.currentTime + 0.05;
    }
  }

  stopActiveNodes() {
    for (const node of this.activeNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch (_) {}
    }
    this.activeNodes.clear();
  }

  syncWithSimulation(sim) {
    if (!this.unlocked || !this.ctx || this.pageHidden) return;

    this.hurry = sim.hurryTriggered;

    const shouldPlayMusic =
      sim.state === GAME_STATES.PLAY || sim.state === GAME_STATES.WARP;

    if (!shouldPlayMusic) {
      this.musicPlaying = false;
      return;
    }

    let desiredTheme = 'meadow';
    if (sim.player.starTimer > 0) {
      desiredTheme = 'star';
    } else if (sim.area === AREAS.CELLAR) {
      desiredTheme = 'cellar';
    }

    if (desiredTheme !== this.currentTheme || !this.musicPlaying) {
      this.currentTheme = desiredTheme;
      this.musicPlaying = true;
      this.noteIndex = 0;
      this.nextNoteTime = this.ctx.currentTime + 0.04;
    }

    this._scheduleMusicLookahead();
  }

  _scheduleMusicLookahead() {
    if (!this.ctx || !this.musicPlaying || this.muted || this.pageHidden) return;

    const now = this.ctx.currentTime;
    // Prevent backlog after delayed frame or resumed tab
    if (this.nextNoteTime < now - 0.08 || this.nextNoteTime > now + 0.5) {
      this.nextNoteTime = now + 0.03;
    }

    const sequence =
      this.currentTheme === 'star'
        ? STAR_MELODY
        : this.currentTheme === 'cellar'
        ? CELLAR_MELODY
        : MEADOW_MELODY;

    const tempoScale = this.hurry ? 0.74 : 1.0;

    while (this.nextNoteTime < now + 0.14) {
      const [freq, baseDur] = sequence[this.noteIndex % sequence.length];
      const dur = baseDur * tempoScale;
      if (freq > 0) {
        this._playTone({
          freq,
          startTime: this.nextNoteTime,
          duration: dur * 0.82,
          type: this.currentTheme === 'cellar' ? 'triangle' : 'square',
          gain: 0.22,
          dest: this.musicGain,
        });
      }
      this.nextNoteTime += dur;
      this.noteIndex = (this.noteIndex + 1) % sequence.length;
    }
  }

  _playTone({
    freq,
    endFreq = null,
    startTime = null,
    duration = 0.1,
    type = 'square',
    gain = 0.25,
    dest = null,
  }) {
    if (!this.ctx || !this.unlocked || this.muted || this.pageHidden) return;
    const t0 = startTime !== null ? startTime : this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        t0 + duration
      );
    }

    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(env);
    env.connect(dest || this.sfxGain);

    this.activeNodes.add(osc);
    osc.onended = () => {
      this.activeNodes.delete(osc);
      try {
        osc.disconnect();
        env.disconnect();
      } catch (_) {}
    };

    osc.start(t0);
    osc.stop(t0 + duration + 0.01);
  }

  playSfx(type) {
    if (!this.ctx || !this.unlocked || this.muted || this.pageHidden) return;
    const now = this.ctx.currentTime;

    switch (type) {
      case 'jump':
        this._playTone({
          freq: 260,
          endFreq: 620,
          duration: 0.16,
          type: 'square',
          gain: 0.26,
        });
        break;
      case 'coin':
        this._playTone({
          freq: 987.77,
          startTime: now,
          duration: 0.07,
          type: 'square',
          gain: 0.26,
        });
        this._playTone({
          freq: 1318.51,
          startTime: now + 0.07,
          duration: 0.22,
          type: 'square',
          gain: 0.26,
        });
        break;
      case 'stomp':
        this._playTone({
          freq: 420,
          endFreq: 160,
          duration: 0.11,
          type: 'triangle',
          gain: 0.35,
        });
        break;
      case 'kick':
        this._playTone({
          freq: 520,
          endFreq: 180,
          duration: 0.12,
          type: 'square',
          gain: 0.28,
        });
        break;
      case 'bump':
        this._playTone({
          freq: 190,
          endFreq: 95,
          duration: 0.09,
          type: 'triangle',
          gain: 0.34,
        });
        break;
      case 'brick_break':
        this._playTone({
          freq: 240,
          endFreq: 75,
          duration: 0.15,
          type: 'sawtooth',
          gain: 0.3,
        });
        break;
      case 'powerup_appear':
        [330, 392, 494, 587].forEach((f, idx) => {
          this._playTone({
            freq: f,
            startTime: now + idx * 0.05,
            duration: 0.06,
            type: 'triangle',
            gain: 0.25,
          });
        });
        break;
      case 'powerup':
        [330, 392, 659, 523, 587, 784].forEach((f, idx) => {
          this._playTone({
            freq: f,
            startTime: now + idx * 0.055,
            duration: 0.07,
            type: 'square',
            gain: 0.24,
          });
        });
        break;
      case 'powerdown':
        [659, 523, 392, 261].forEach((f, idx) => {
          this._playTone({
            freq: f,
            startTime: now + idx * 0.06,
            duration: 0.07,
            type: 'sawtooth',
            gain: 0.24,
          });
        });
        break;
      case '1up':
        [330, 392, 659, 523, 587, 784].forEach((f, idx) => {
          this._playTone({
            freq: f * 1.25,
            startTime: now + idx * 0.06,
            duration: 0.08,
            type: 'triangle',
            gain: 0.3,
          });
        });
        break;
      case 'fireball':
        this._playTone({
          freq: 760,
          endFreq: 280,
          duration: 0.08,
          type: 'square',
          gain: 0.22,
        });
        break;
      case 'pipe':
        [440, 330, 220].forEach((f, idx) => {
          this._playTone({
            freq: f,
            startTime: now + idx * 0.07,
            duration: 0.07,
            type: 'square',
            gain: 0.26,
          });
        });
        break;
      case 'checkpoint':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
          this._playTone({
            freq: f,
            startTime: now + idx * 0.055,
            duration: 0.08,
            type: 'triangle',
            gain: 0.28,
          });
        });
        break;
      case 'hurry':
        [493.88, 659.25, 659.25, 783.99].forEach((f, idx) => {
          this._playTone({
            freq: f,
            startTime: now + idx * 0.08,
            duration: 0.08,
            type: 'square',
            gain: 0.3,
          });
        });
        break;
      case 'die':
        this.musicPlaying = false;
        [587.33, 554.37, 523.25, 493.88, 392.0, 329.63, 261.63].forEach(
          (f, idx) => {
            this._playTone({
              freq: f,
              startTime: now + idx * 0.09,
              duration: 0.1,
              type: 'square',
              gain: 0.28,
            });
          }
        );
        break;
      case 'flagpole':
        this.musicPlaying = false;
        this._playTone({
          freq: 330,
          endFreq: 880,
          duration: 0.45,
          type: 'triangle',
          gain: 0.28,
        });
        break;
      case 'course_clear':
        [392.0, 523.25, 659.25, 783.99, 659.25, 1046.5].forEach((f, idx) => {
          this._playTone({
            freq: f,
            startTime: now + idx * 0.1,
            duration: idx === 5 ? 0.32 : 0.1,
            type: 'square',
            gain: 0.28,
          });
        });
        break;
      case 'tally':
        if (now - this.lastTallySfxTime >= 0.045) {
          this.lastTallySfxTime = now;
          this._playTone({
            freq: 880,
            duration: 0.035,
            type: 'square',
            gain: 0.16,
          });
        }
        break;
      case 'firework':
        this._playTone({
          freq: 520,
          endFreq: 95,
          duration: 0.26,
          type: 'sawtooth',
          gain: 0.32,
        });
        break;
      default:
        break;
    }
  }
}
