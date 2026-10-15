class TactileSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.userInteracted = false;

    const unlock = () => {
      this.userInteracted = true;
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  init() {
    if (!this.userInteracted) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleAudio() {
    this.init();
    this.enabled = !this.enabled;
    if (!this.enabled && this.droneGain && this.ctx) {
      this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    } else if (this.enabled) {
      this.playDetent(880, 0.04);
    }
    return this.enabled;
  }

  // Mechanical relay / rotary detent click
  playDetent(freq = 640, duration = 0.025) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.4, now);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // Patch cable plug-in low-end thud + harmonic ping
  playPatchPlug(harmonicIndex = 1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const notes = [220, 277.18, 329.63, 440, 554.37, 659.25];
    const baseFreq = notes[harmonicIndex % notes.length];

    // Sub thud
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.09);
    subGain.gain.setValueAtTime(0.18, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + 0.11);

    // Buchla FM ping
    const carrier = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const mainGain = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(baseFreq, now);

    mod.type = 'sawtooth';
    mod.frequency.setValueAtTime(baseFreq * 2.5, now);

    modGain.gain.setValueAtTime(baseFreq * 1.8, now);
    modGain.gain.exponentialRampToValueAtTime(1, now + 0.22);

    mainGain.gain.setValueAtTime(0.09, now);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(mainGain);
    mainGain.connect(this.ctx.destination);

    mod.start(now);
    carrier.start(now);
    mod.stop(now + 0.3);
    carrier.stop(now + 0.3);
  }

  // Chamber transition aperture sweep
  playChamberShift(chamberIdx = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const roots = [110, 130.81, 146.83, 164.81, 196.0, 220.0];
    const root = roots[chamberIdx % roots.length];

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(root, now);
    osc2.frequency.setValueAtTime(root * 1.5, now);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(6.0, now);
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
    filter.frequency.exponentialRampToValueAtTime(260, now + 0.38);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.42);
    osc2.stop(now + 0.42);
  }

  // Incinerator vaporize sound
  playIncinerate() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.24);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }
}

export const synth = new TactileSynth();
