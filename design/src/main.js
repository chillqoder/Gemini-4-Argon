import {
  CHAMBERS,
  VIBE_PRESETS,
  SPECIMENS,
  LEGACY_RITUALS,
  STACK_STRATA,
  MANIFESTO_LAWS
} from './data/content.js';
import { synth } from './audio/synth.js';
import { SpatialStage } from './webgl/stage.js';
import { PatchBayEngine } from './physics/patchbay.js';

const GLYPHS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ//ΔΩΣ#%&*+=';

function scrambleText(el, finalStr, duration = 360) {
  if (!el) return;
  const start = performance.now();
  const len = finalStr.length;

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const revealCount = Math.floor(t * len);
    let out = '';
    for (let i = 0; i < len; i++) {
      if (i < revealCount || finalStr[i] === ' ') {
        out += finalStr[i];
      } else {
        out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }
    el.textContent = out;
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = finalStr;
    }
  }
  requestAnimationFrame(tick);
}

class KomaFoundryApp {
  constructor() {
    this.activeChamberIdx = 0;
    this.isTransitioning = false;
    this.lastWheelTime = 0;
    this.hoursSaved = 0;
    this.velocityMult = 14.2;

    this.canvas = document.getElementById('webgl-stage');
    this.stage = new SpatialStage(this.canvas);

    this.leaderSvg = document.getElementById('hud-leader-svg');
    this.patchSvg = document.getElementById('patchbay-cables-svg');

    this.initChamber00();
    this.initChamber01();
    this.initChamber02();
    this.initChamber03();
    this.initChamber04();
    this.initChamber05();

    this.initNavigation();
    this.initRotaryKnobs();
    this.initPolarityAndAudio();
    this.initCursorReticle();

    this.patchBay = new PatchBayEngine(this.patchSvg, (signature) => {
      this.onPatchBayMutated(signature);
    });

    document.getElementById('randomize-patch-btn')?.addEventListener('click', () => {
      this.patchBay.randomizePatch();
    });

    this.animate();
  }

  /* -------------------------------------------------------------------
     NAVIGATION & MECHANICAL APERTURE SHUTTER
     ------------------------------------------------------------------- */
  initNavigation() {
    const turretBtns = document.querySelectorAll('[data-chamber-target]');
    turretBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetIdx = Number(btn.dataset.chamberTarget);
        this.switchChamber(targetIdx);
      });
    });

    document.querySelectorAll('[data-goto-chamber]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetIdx = Number(btn.dataset.gotoChamber);
        this.switchChamber(targetIdx);
      });
    });

    document.getElementById('brand-home-trigger')?.addEventListener('click', () => {
      this.switchChamber(0);
    });

    document.getElementById('prev-chamber-btn')?.addEventListener('click', () => {
      const prev = (this.activeChamberIdx - 1 + CHAMBERS.length) % CHAMBERS.length;
      this.switchChamber(prev);
    });

    document.getElementById('next-chamber-btn')?.addEventListener('click', () => {
      const next = (this.activeChamberIdx + 1) % CHAMBERS.length;
      this.switchChamber(next);
    });

    // Wheel orbital chamber switching (when not scrolling inside a textarea)
    window.addEventListener(
      'wheel',
      (e) => {
        if (window.innerWidth <= 1100) return;
        const tag = e.target?.tagName;
        if (tag === 'TEXTAREA' || tag === 'INPUT') return;

        const now = performance.now();
        if (now - this.lastWheelTime < 820) return;
        if (Math.abs(e.deltaY) < 26) return;

        this.lastWheelTime = now;
        if (e.deltaY > 0) {
          this.switchChamber((this.activeChamberIdx + 1) % CHAMBERS.length);
        } else {
          this.switchChamber((this.activeChamberIdx - 1 + CHAMBERS.length) % CHAMBERS.length);
        }
      },
      { passive: true }
    );

    // Keyboard [1-6] and Arrow Up/Down
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;

      if (e.key >= '1' && e.key <= '6') {
        this.switchChamber(Number(e.key) - 1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        this.switchChamber((this.activeChamberIdx + 1) % CHAMBERS.length);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        this.switchChamber((this.activeChamberIdx - 1 + CHAMBERS.length) % CHAMBERS.length);
      }
    });
  }

  switchChamber(targetIdx) {
    if (targetIdx === this.activeChamberIdx || this.isTransitioning) return;
    if (targetIdx < 0 || targetIdx >= CHAMBERS.length) return;

    this.isTransitioning = true;
    const targetChamber = CHAMBERS[targetIdx];
    synth.playChamberShift(targetIdx);

    const shutter = document.getElementById('aperture-shutter');
    const readout = document.getElementById('shutter-readout');
    if (readout) {
      readout.textContent = `SLEWING ORBITAL CAMERA // ${targetChamber.code} ${targetChamber.slug}`;
    }
    shutter?.classList.add('is-firing');

    // Rotate compass needle
    const deg = targetIdx * 60;
    const rotor = document.getElementById('compass-rotor');
    const degLabel = document.getElementById('compass-deg');
    if (rotor) rotor.style.transform = `rotate(${deg}deg)`;
    if (degLabel) degLabel.textContent = `${String(deg).padStart(3, '0')}°`;

    // Update 3D stage camera & formation
    this.stage.setChamber(targetChamber);

    setTimeout(() => {
      // Swap active chamber DOM
      document.querySelectorAll('.chamber').forEach((el, idx) => {
        el.classList.toggle('is-active', idx === targetIdx);
      });

      document.querySelectorAll('.turret-step').forEach((btn, idx) => {
        btn.classList.toggle('is-active', idx === targetIdx);
      });

      scrambleText(
        document.getElementById('hud-chamber-code'),
        `${targetChamber.code} // ${targetChamber.slug}`,
        320
      );
      scrambleText(
        document.getElementById('hud-chamber-coord'),
        targetChamber.coord,
        360
      );

      this.activeChamberIdx = targetIdx;
    }, 170);

    setTimeout(() => {
      shutter?.classList.remove('is-firing');
      this.isTransitioning = false;
    }, 360);
  }

  /* -------------------------------------------------------------------
     CHAMBER 00: LIVE VIBE-TO-REALITY TRANSDUCER
     ------------------------------------------------------------------- */
  initChamber00() {
    const presetContainer = document.getElementById('vibe-preset-buttons');
    const promptInput = document.getElementById('vibe-prompt-input');
    const compileBtn = document.getElementById('compile-vibe-btn');

    if (presetContainer) {
      presetContainer.innerHTML = VIBE_PRESETS.map(
        (p, idx) =>
          `<button type="button" class="preset-pill-btn ${idx === 0 ? 'is-active' : ''}" data-preset-id="${p.id}">${p.label}</button>`
      ).join('');

      presetContainer.querySelectorAll('.preset-pill-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          presetContainer.querySelectorAll('.preset-pill-btn').forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          const preset = VIBE_PRESETS.find((p) => p.id === btn.dataset.presetId);
          if (preset && promptInput) {
            promptInput.value = preset.prompt;
            this.applyVibePreset(preset);
          }
        });
      });
    }

    compileBtn?.addEventListener('click', () => {
      const rawText = promptInput?.value.trim() || ' High-craft autonomous spatial instrument';
      this.compileCustomPrompt(rawText);
    });

    // Initialize with first preset
    this.applyVibePreset(VIBE_PRESETS[0], false);
  }

  applyVibePreset(preset, playSound = true) {
    if (playSound) synth.playPatchPlug(2);

    this.setKnobValue('temperature', preset.temp);
    this.setKnobValue('density', preset.density);
    this.setKnobValue('entropy', preset.entropy);
    this.stage.triggerShockwave(0.9);

    const tokenWrap = document.getElementById('compiler-tokens');
    if (tokenWrap) {
      tokenWrap.innerHTML = preset.tokens
        .map((t) => `<span class="ast-token">${t}</span>`)
        .join('');
    }

    const out = preset.compilerOutput;
    scrambleText(document.getElementById('comp-archetype'), out.archetype, 300);
    scrambleText(document.getElementById('comp-time'), out.timeToShip, 280);
    document.getElementById('comp-shader').textContent = out.shaderProfile;
    document.getElementById('comp-interaction').textContent = out.interactionModel;

    scrambleText(document.getElementById('micro-title'), out.previewTitle, 320);
    document.getElementById('micro-metric').textContent = out.previewMetric;
    document.getElementById('micro-status').textContent = out.previewStatus;
  }

  compileCustomPrompt(rawText) {
    synth.playPatchPlug(4);

    // Deterministically hash text into parameters & tokens
    const words = rawText
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const pickedWords = words.slice(0, 4);
    while (pickedWords.length < 4) {
      pickedWords.push(['SYNTH', 'KINETIC', 'VORTEX', 'ZERO_UI'][pickedWords.length]);
    }

    const tokens = pickedWords.map((w, i) => `${w.slice(0, 10)}_${['GLSL', '90HZ', 'LOCK', 'CORE'][i % 4]}`);

    let hash = 0;
    for (let i = 0; i < rawText.length; i++) {
      hash = (hash * 31 + rawText.charCodeAt(i)) % 1000;
    }

    const temp = 45 + (hash % 52);
    const density = 50 + ((hash * 7) % 48);
    const entropy = 30 + ((hash * 13) % 68);
    const hours = 48 + (hash % 44);

    this.setKnobValue('temperature', temp);
    this.setKnobValue('density', density);
    this.setKnobValue('entropy', entropy);
    this.stage.triggerShockwave(1.1);

    const tokenWrap = document.getElementById('compiler-tokens');
    if (tokenWrap) {
      tokenWrap.innerHTML = tokens.map((t) => `<span class="ast-token">${t}</span>`).join('');
    }

    scrambleText(
      document.getElementById('comp-archetype'),
      `BESPOKE ${pickedWords[0]} ENGINE`,
      320
    );
    scrambleText(document.getElementById('comp-time'), `${hours} HOURS`, 280);
    document.getElementById('comp-shader').textContent =
      `Custom ${pickedWords[1]} Raymarcher + Chromatic Dispersion`;
    document.getElementById('comp-interaction').textContent =
      `Direct ${pickedWords[2]} tactile field with sub-14ms WebAudio transients`;

    scrambleText(
      document.getElementById('micro-title'),
      `${pickedWords[0]} // ARTIFACT v1.0`,
      320
    );
    document.getElementById('micro-metric').textContent =
      `LATENCY: 0.${(hash % 8) + 1}ms // ENTROPY: ${(entropy / 100).toFixed(2)}Δ`;
    document.getElementById('micro-status').textContent = 'REALITY COMPILED';
  }

  /* -------------------------------------------------------------------
     CHAMBER 01: SPECIMEN VAULT (ROM CARTRIDGE RACK)
     ------------------------------------------------------------------- */
  initChamber01() {
    const listEl = document.getElementById('cartridge-list');
    if (!listEl) return;

    listEl.innerHTML = SPECIMENS.map(
      (spec, idx) => `
      <button type="button" class="rom-cartridge ${idx === 0 ? 'is-mounted' : ''}" data-spec-id="${spec.id}" role="option" aria-selected="${idx === 0}">
        <span class="rom-slot-id">${spec.slot}</span>
        <span>
          <strong class="rom-name">${spec.title}</strong>
          <small class="rom-cat">${spec.category}</small>
        </span>
        <span class="rom-hrs">${spec.hoursToBuild}</span>
      </button>
    `
    ).join('');

    listEl.querySelectorAll('.rom-cartridge').forEach((btn) => {
      btn.addEventListener('click', () => {
        listEl.querySelectorAll('.rom-cartridge').forEach((b) => {
          b.classList.remove('is-mounted');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-mounted');
        btn.setAttribute('aria-selected', 'true');

        const spec = SPECIMENS.find((s) => s.id === btn.dataset.specId);
        if (spec) {
          this.mountSpecimen(spec, true);
        }
      });
    });

    this.mountSpecimen(SPECIMENS[0], false);
  }

  mountSpecimen(spec, playAudio = true) {
    if (playAudio) synth.playPatchPlug(spec.geometryMode);

    this.stage.setSpecimenMode(spec.geometryMode, spec.color);

    scrambleText(document.getElementById('spec-slot-tag'), `MOUNTED // ${spec.slot}`, 260);
    document.getElementById('spec-hours-badge').textContent = `BUILT IN ${spec.hoursToBuild}`;
    document.getElementById('spec-category').textContent = spec.category;
    scrambleText(document.getElementById('spec-title'), spec.title, 280);
    document.getElementById('spec-taste').textContent = spec.tasteScore;
    document.getElementById('spec-prompt').textContent = spec.initialPrompt;
    document.getElementById('spec-arch').textContent = spec.architecture;
    document.getElementById('spec-impact').textContent = spec.impact;
    document.getElementById('spec-lines').textContent = `${spec.handwrittenLines} LINES`;
    document.getElementById('spec-iterations').textContent = `${spec.vibeIterations} PASSES`;

    const gridEl = document.getElementById('spec-metrics-grid');
    if (gridEl) {
      gridEl.innerHTML = spec.metrics
        .map(
          (m) => `
        <div class="spec-m-cell">
          <span class="spec-m-k">${m.k}</span>
          <strong class="spec-m-v">${m.v}</strong>
        </div>
      `
        )
        .join('');
    }
  }

  /* -------------------------------------------------------------------
     CHAMBER 02: DEATH OF THE SEMICOLON (INCINERATOR)
     ------------------------------------------------------------------- */
  initChamber02() {
    const crossfader = document.getElementById('reality-crossfader');
    const gridEl = document.getElementById('ritual-grid');
    const restoreBtn = document.getElementById('restore-rituals-btn');

    crossfader?.addEventListener('input', (e) => {
      const val = Number(e.target.value) / 100;
      this.stage.setCrossfader(val);
      this.velocityMult = (1.0 + val * 16.5).toFixed(1);
      document.getElementById('velocity-mult-val').textContent = `${this.velocityMult}x`;
      synth.playDetent(320 + val * 620, 0.02);
    });

    const renderRituals = () => {
      this.hoursSaved = 0;
      document.getElementById('hours-saved-val').textContent = '0 HRS';
      if (!gridEl) return;

      gridEl.innerHTML = LEGACY_RITUALS.map(
        (r) => `
        <button type="button" class="ritual-card" data-ritual-id="${r.id}" data-waste="${ parseInt(r.waste, 10) }">
          <div class="ritual-top">
            <span>LEGACY RITUAL</span>
            <span class="ritual-waste">${r.waste}</span>
          </div>
          <strong class="ritual-name">${r.name}</strong>
          <p class="ritual-desc">${r.desc}</p>
        </button>
      `
      ).join('');

      gridEl.querySelectorAll('.ritual-card').forEach((card) => {
        card.addEventListener('click', () => {
          if (card.classList.contains('is-vaporized')) return;
          card.classList.add('is-vaporized');
          const wasteHrs = Number(card.dataset.waste) || 150;
          this.hoursSaved += wasteHrs;
          this.velocityMult = (Number(this.velocityMult) + 2.4).toFixed(1);

          scrambleText(
            document.getElementById('hours-saved-val'),
            `${this.hoursSaved} HRS`,
            260
          );
          document.getElementById('velocity-mult-val').textContent = `${this.velocityMult}x`;

          synth.playIncinerate();
          this.stage.triggerShockwave(1.25);
        });
      });
    };

    restoreBtn?.addEventListener('click', () => {
      synth.playDetent(580, 0.04);
      renderRituals();
    });

    renderRituals();
  }

  /* -------------------------------------------------------------------
     CHAMBER 03: THE TASTE ENGINE (EXPLODED 4-STRATUM ANATOMY)
     ------------------------------------------------------------------- */
  initChamber03() {
    const matrixEl = document.getElementById('strata-cards-matrix');
    if (!matrixEl) return;

    matrixEl.innerHTML = STACK_STRATA.map(
      (s, idx) => `
      <article class="stratum-plate" id="stratum-plate-${idx}" data-stratum-idx="${idx}">
        <div class="stratum-meta">
          <span>${s.index} // ${s.role}</span>
          <span>${s.coords}</span>
        </div>
        <h3 class="stratum-title">${s.title}</h3>
        <p class="stratum-summary">${s.summary}</p>
        <div class="stratum-specs">
          ${s.specs.map((sp) => `<span class="stratum-spec-tag">${sp}</span>`).join('')}
        </div>
      </article>
    `
    ).join('');

    matrixEl.querySelectorAll('.stratum-plate').forEach((plate, idx) => {
      plate.addEventListener('mouseenter', () => {
        synth.playDetent(520 + idx * 110, 0.025);
        this.stage.triggerShockwave(0.45);
      });
    });
  }

  /* -------------------------------------------------------------------
     CHAMBER 04: SEVEN LAWS OF FEELING (KINETIC TYPOGRAPHY MATRIX)
     ------------------------------------------------------------------- */
  initChamber04() {
    const wallEl = document.getElementById('laws-kinetic-wall');
    if (!wallEl) return;

    wallEl.innerHTML = MANIFESTO_LAWS.map(
      (law, idx) => `
      <div class="law-beam" data-law-idx="${idx}">
        <span class="law-num">${law.num}</span>
        <h3 class="law-headline">${law.headline}</h3>
        <p class="law-body">${law.body}</p>
      </div>
    `
    ).join('');

    wallEl.querySelectorAll('.law-beam').forEach((beam, idx) => {
      beam.addEventListener('pointermove', (e) => {
        const rect = beam.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width - 0.5;
        const skew = (relX * 10).toFixed(2);
        const shift = (relX * 14).toFixed(1);
        beam.style.transform = `translateX(${shift}px) skewX(${skew}deg)`;
      });
      beam.addEventListener('pointerenter', () => {
        synth.playDetent(440 + idx * 75, 0.02);
        this.stage.triggerShockwave(0.35);
      });
      beam.addEventListener('pointerleave', () => {
        beam.style.transform = 'translateX(0) skewX(0deg)';
      });
    });
  }

  /* -------------------------------------------------------------------
     CHAMBER 05: COMMISSION A FEVER DREAM (SWITCHBOARD & THERMAL RECEIPT)
     ------------------------------------------------------------------- */
  initChamber05() {
    const distortionBtns = document.querySelectorAll('#cfg-distortion .dip-switch');
    const moduleBtns = document.querySelectorAll('#cfg-modules .mod-toggle');
    const vibeInput = document.getElementById('cfg-vibe-text');
    const stampBtn = document.getElementById('transmit-stamp-btn');
    const receiptEl = document.getElementById('thermal-receipt');
    const confirmEl = document.getElementById('stamp-confirmation');

    const updateReceipt = () => {
      const activeDist = document.querySelector('#cfg-distortion .dip-switch.is-on');
      const distName = activeDist?.dataset.val || 'CATEGORY KILLER';
      const baseHours = Number(activeDist?.dataset.hours || 72);
      const baseRate = Number(activeDist?.dataset.rate || 32000);

      const activeMods = Array.from(document.querySelectorAll('#cfg-modules .mod-toggle.is-on')).map(
        (b) => b.dataset.mod
      );

      const totalRate = baseRate + Math.max(0, activeMods.length - 3) * 4500;

      document.getElementById('r-distortion').textContent = distName;
      document.getElementById('r-hours').textContent = `${baseHours} HOURS (${baseHours / 24} DAYS)`;
      document.getElementById('r-price').textContent = `$${totalRate.toLocaleString()} USD`;

      const listEl = document.getElementById('r-modules-list');
      if (listEl) {
        listEl.innerHTML = activeMods.map((m) => `<li>✓ ${m}</li>`).join('');
      }

      if (vibeInput) {
        document.getElementById('r-vibe-preview').textContent = `"${vibeInput.value}"`;
      }

      const randomHash =
        '0x' +
        Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase() +
        '..' +
        Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase();
      document.getElementById('receipt-hash').textContent = `HASH: ${randomHash}`;
      confirmEl?.classList.remove('is-visible');
      receiptEl?.classList.remove('is-stamped');
    };

    distortionBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        distortionBtns.forEach((b) => b.classList.remove('is-on'));
        btn.classList.add('is-on');
        synth.playPatchPlug(1);
        this.stage.triggerShockwave(0.6);
        updateReceipt();
      });
    });

    moduleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('is-on');
        synth.playDetent(720, 0.03);
        updateReceipt();
      });
    });

    vibeInput?.addEventListener('input', () => updateReceipt());

    stampBtn?.addEventListener('click', () => {
      synth.playPatchPlug(5);
      this.stage.triggerShockwave(1.4);
      receiptEl?.classList.add('is-stamped');
      confirmEl?.classList.add('is-visible');
      scrambleText(confirmEl, 'SIGNAL LOCKED // SLOT #K99-804 RESERVED', 380);
    });

    updateReceipt();
  }

  /* -------------------------------------------------------------------
     ROTARY SHADER KNOBS & POLARITY BUS
     ------------------------------------------------------------------- */
  initRotaryKnobs() {
    const knobs = document.querySelectorAll('.knob-unit');
    knobs.forEach((knob) => {
      const param = knob.dataset.knob;
      let startY = 0;
      let startVal = Number(knob.dataset.val || 50);

      const onMove = (e) => {
        const deltaY = startY - e.clientY;
        const nextVal = Math.max(0, Math.min(100, Math.round(startVal + deltaY * 0.65)));
        this.setKnobValue(param, nextVal);
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      knob.addEventListener('pointerdown', (e) => {
        startY = e.clientY;
        startVal = Number(knob.dataset.val || 50);
        synth.playDetent(600, 0.02);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });

      // Also allow single click to increment by +15 (wrapping) for effortless testing
      knob.addEventListener('dblclick', () => {
        const nextVal = (Number(knob.dataset.val || 50) + 22) % 100;
        this.setKnobValue(param, nextVal);
      });

      // Initialize visual rotation
      this.setKnobValue(param, startVal, false);
    });
  }

  setKnobValue(param, val, playTick = true) {
    const knob = document.querySelector(`.knob-unit[data-knob="${param}"]`);
    if (!knob) return;
    knob.dataset.val = val;
    knob.setAttribute('aria-valuenow', String(val));

    const ind = document.getElementById(`knob-ind-${param}`);
    const valEl = document.getElementById(`knob-val-${param}`);

    const deg = -135 + (val / 100) * 270;
    if (ind) ind.style.transform = `rotate(${deg}deg)`;
    if (valEl) valEl.textContent = String(val).padStart(3, '0');

    this.stage.setParams({ [param]: val });
    if (playTick && val % 6 === 0) {
      synth.playDetent(360 + val * 5, 0.015);
    }
  }

  initPolarityAndAudio() {
    const polarityMap = {
      oxide: { primary: '#FF2E00', secondary: '#D4FF00' },
      cobalt: { primary: '#266BFF', secondary: '#00FFAA' },
      infrared: { primary: '#FF1E56', secondary: '#FFAC00' },
      risograph: { primary: '#FF3B00', secondary: '#0038FF' }
    };

    document.querySelectorAll('[data-polarity-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.polarityBtn;
        document.documentElement.setAttribute('data-polarity', mode);
        document.querySelectorAll('[data-polarity-btn]').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const colors = polarityMap[mode] || polarityMap.oxide;
        this.stage.setPalette(colors.primary, colors.secondary);
        this.stage.triggerShockwave(0.75);
        synth.playPatchPlug(3);
      });
    });

    const audioBtn = document.getElementById('audio-toggle-btn');
    const audioLabel = document.getElementById('audio-toggle-label');
    audioBtn?.addEventListener('click', () => {
      const armed = synth.toggleAudio();
      audioBtn.classList.toggle('is-armed', armed);
      if (audioLabel) {
        audioLabel.textContent = armed ? 'DSP AUDIO: ARMED' : 'DSP AUDIO: MUTED';
      }
    });
  }

  onPatchBayMutated(signature) {
    // Use patch cable connections to modulate the 3D shader & knobs
    const sum = signature.reduce((acc, c, idx) => acc + (c.out + 1) * (c.in + 2) * (idx + 1), 0);
    const newTemp = 35 + ((sum * 11) % 62);
    const newDens = 40 + ((sum * 17) % 58);
    const newEntr = 25 + ((sum * 23) % 72);

    this.setKnobValue('temperature', newTemp, false);
    this.setKnobValue('density', newDens, false);
    this.setKnobValue('entropy', newEntr, false);
    this.stage.triggerShockwave(0.95);
  }

  initCursorReticle() {
    const reticle = document.getElementById('cursor-reticle');
    const coords = document.getElementById('cursor-coords');

    window.addEventListener('pointermove', (e) => {
      if (reticle) {
        reticle.style.transform = `translate3d(${e.clientX + 10}px, ${e.clientY + 10}px, 0)`;
      }
      if (coords) {
        coords.textContent = `X:${String(Math.round(e.clientX)).padStart(4, '0')} Y:${String(Math.round(e.clientY)).padStart(4, '0')}`;
      }
    });
  }

  /* -------------------------------------------------------------------
     LIVE 3D-TO-2D LEADER LINE PROJECTION & MAIN ANIMATION LOOP
     ------------------------------------------------------------------- */
  updateLeaderLines() {
    const nodes = this.stage.getProjectedNodes();
    if (!this.leaderSvg) return;

    const readout = document.getElementById('node-telemetry-readout');
    if (readout && nodes.length >= 2) {
      readout.textContent = `3D NODES: [N0: ${nodes[0].wx}, ${nodes[0].wy}] [N1: ${nodes[1].wx}, ${nodes[1].wy}]`;
    }

    let svgMarkup = '';
    const isAnatomy = this.activeChamberIdx === 3;

    nodes.forEach((n, i) => {
      // Draw target reticle at projected 3D vertex
      svgMarkup += `
        <circle class="leader-node-circle" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="7" />
        <circle class="leader-node-dot" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="2.2" />
        <text class="leader-coord-text" x="${(n.x + 11).toFixed(1)}" y="${(n.y + 3).toFixed(1)}">N0${i} [${n.wx},${n.wy}]</text>
      `;

      // In Chamber 03 (The Taste Engine), draw physical CAD leader lines from the 3D strata nodes to the 4 Stratum Plates!
      if (isAnatomy) {
        const plateEl = document.getElementById(`stratum-plate-${i}`);
        if (plateEl) {
          const rect = plateEl.getBoundingClientRect();
          const anchorX = i % 2 === 0 ? rect.right : rect.left;
          const anchorY = rect.top + rect.height * 0.5;
          const elbowX = (n.x + anchorX) * 0.5;

          svgMarkup += `
            <polyline class="leader-polyline" points="${n.x.toFixed(1)},${n.y.toFixed(1)} ${elbowX.toFixed(1)},${n.y.toFixed(1)} ${anchorX.toFixed(1)},${anchorY.toFixed(1)}" />
            <circle class="leader-node-dot" cx="${anchorX.toFixed(1)}" cy="${anchorY.toFixed(1)}" r="3.5" />
          `;
        }
      }
    });

    this.leaderSvg.innerHTML = svgMarkup;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.stage.update();
    this.patchBay.update();
    this.updateLeaderLines();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new KomaFoundryApp();
});
