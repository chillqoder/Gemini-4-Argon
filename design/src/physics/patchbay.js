import { synth } from '../audio/synth.js';

class RopeCable {
  constructor(startX, startY, endX, endY, color, outIndex, inIndex) {
    this.numPoints = 14;
    this.points = [];
    this.color = color;
    this.outIndex = outIndex;
    this.inIndex = inIndex;
    this.dragging = false;

    for (let i = 0; i < this.numPoints; i++) {
      const t = i / (this.numPoints - 1);
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t + Math.sin(t * Math.PI) * 38;
      this.points.push({ x, y, oldX: x, oldY: y });
    }
  }

  setEndpoints(startX, startY, endX, endY) {
    this.points[0].x = startX;
    this.points[0].y = startY;
    if (!this.dragging) {
      this.points[this.numPoints - 1].x = endX;
      this.points[this.numPoints - 1].y = endY;
    }
  }

  update(pointerX, pointerY, pointerVx, pointerVy) {
    const gravity = 0.55;
    const damping = 0.96;

    for (let i = 1; i < this.numPoints - 1; i++) {
      const p = this.points[i];
      const vx = (p.x - p.oldX) * damping;
      const vy = (p.y - p.oldY) * damping;
      p.oldX = p.x;
      p.oldY = p.y;
      p.x += vx;
      p.y += vy + gravity;

      // Subtle cursor wind interaction when cursor brushes across hanging cables
      const dx = p.x - pointerX;
      const dy = p.y - pointerY;
      const distSq = dx * dx + dy * dy;
      if (distSq < 2800) {
        p.x += pointerVx * 0.22;
        p.y += pointerVy * 0.22;
      }
    }

    // Distance constraint relaxation
    const totalDist = Math.hypot(
      this.points[this.numPoints - 1].x - this.points[0].x,
      this.points[this.numPoints - 1].y - this.points[0].y
    );
    const segmentLen = Math.max(10, (totalDist * 1.18) / (this.numPoints - 1));

    for (let iter = 0; iter < 5; iter++) {
      for (let i = 0; i < this.numPoints - 1; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const diff = (segmentLen - dist) / dist;

        const offsetX = dx * diff * 0.5;
        const offsetY = dy * diff * 0.5;

        if (i !== 0) {
          p1.x -= offsetX;
          p1.y -= offsetY;
        }
        if (i + 1 !== this.numPoints - 1 || this.dragging) {
          if (i + 1 !== this.numPoints - 1) {
            p2.x += offsetX;
            p2.y += offsetY;
          }
        }
      }
    }
  }

  getPathData() {
    if (this.points.length < 2) return '';
    let d = `M ${this.points[0].x.toFixed(1)} ${this.points[0].y.toFixed(1)}`;
    for (let i = 1; i < this.points.length - 1; i++) {
      const xc = (this.points[i].x + this.points[i + 1].x) * 0.5;
      const yc = (this.points[i].y + this.points[i + 1].y) * 0.5;
      d += ` Q ${this.points[i].x.toFixed(1)} ${this.points[i].y.toFixed(1)}, ${xc.toFixed(1)} ${yc.toFixed(1)}`;
    }
    const last = this.points[this.points.length - 1];
    d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
    return d;
  }
}

export class PatchBayEngine {
  constructor(svgEl, onPatchChange) {
    this.svg = svgEl;
    this.onPatchChange = onPatchChange;
    this.cables = [];
    this.outJacks = [];
    this.inJacks = [];
    this.activeCable = null;

    this.pointer = { x: 0, y: 0, vx: 0, vy: 0 };

    this.colors = ['#FF2E00', '#D4FF00', '#00F0FF'];
    this.init();
  }

  init() {
    this.refreshJackElements();

    // Create 3 initial patched cables with catenary physics
    const initialPairs = [
      { out: 0, in: 1, color: '#FF2E00' },
      { out: 1, in: 0, color: '#D4FF00' },
      { out: 2, in: 2, color: '#00F0FF' }
    ];

    initialPairs.forEach((pair) => {
      const outPos = this.getJackCenter(this.outJacks[pair.out]);
      const inPos = this.getJackCenter(this.inJacks[pair.in]);
      const cable = new RopeCable(outPos.x, outPos.y, inPos.x, inPos.y, pair.color, pair.out, pair.in);
      this.cables.push(cable);
    });

    this.createSvgElements();
    this.bindEvents();
    this.updateJackStates();
  }

  refreshJackElements() {
    this.outJacks = Array.from(document.querySelectorAll('[data-jack-type="out"]'));
    this.inJacks = Array.from(document.querySelectorAll('[data-jack-type="in"]'));
  }

  getJackCenter(el) {
    if (!el) return { x: 200, y: 200 };
    const ringEl = el.querySelector('.jack-ring') || el;
    const rect = ringEl.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5
    };
  }

  createSvgElements() {
    this.svg.innerHTML = '';
    this.cableDom = this.cables.map((cable, idx) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      const shadowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      shadowPath.setAttribute('class', 'patch-cable-shadow');

      const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      mainPath.setAttribute('class', 'patch-cable-main');
      mainPath.setAttribute('stroke', cable.color);

      const pulsePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pulsePath.setAttribute('class', 'patch-cable-pulse');

      const plugEnd = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      plugEnd.setAttribute('r', '5.5');
      plugEnd.setAttribute('fill', cable.color);
      plugEnd.setAttribute('stroke', '#0B0B09');
      plugEnd.setAttribute('stroke-width', '1.8');
      plugEnd.setAttribute('class', 'patch-plug-handle');
      plugEnd.dataset.cableIdx = idx;

      g.appendChild(shadowPath);
      g.appendChild(mainPath);
      g.appendChild(pulsePath);
      g.appendChild(plugEnd);
      this.svg.appendChild(g);

      return { g, shadowPath, mainPath, pulsePath, plugEnd };
    });
  }

  bindEvents() {
    window.addEventListener('pointermove', (e) => {
      this.pointer.vx = e.clientX - this.pointer.x;
      this.pointer.vy = e.clientY - this.pointer.y;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;

      if (this.activeCable) {
        const lastPt = this.activeCable.points[this.activeCable.numPoints - 1];
        lastPt.x = e.clientX;
        lastPt.y = e.clientY;
        lastPt.oldX = e.clientX;
        lastPt.oldY = e.clientY;
      }
    });

    // Allow dragging plug handles or clicking input jacks directly
    this.svg.addEventListener('pointerdown', (e) => {
      const target = e.target;
      if (target && target.dataset && target.dataset.cableIdx !== undefined) {
        const idx = Number(target.dataset.cableIdx);
        this.activeCable = this.cables[idx];
        this.activeCable.dragging = true;
        synth.playDetent(520, 0.03);
        e.stopPropagation();
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.activeCable) return;
      const cable = this.activeCable;
      cable.dragging = false;
      this.activeCable = null;

      // Find nearest input jack within 55px
      let bestIdx = cable.inIndex;
      let bestDist = 60;
      this.inJacks.forEach((jackEl, idx) => {
        const center = this.getJackCenter(jackEl);
        const d = Math.hypot(center.x - e.clientX, center.y - e.clientY);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });

      cable.inIndex = bestIdx;
      synth.playPatchPlug(bestIdx + cable.outIndex);
      this.updateJackStates();
      if (this.onPatchChange) {
        this.onPatchChange(this.getPatchSignature());
      }
    });

    // Clicking any input socket cycles the nearest cable to it for effortless one-click patching
    this.inJacks.forEach((jackEl, inIdx) => {
      jackEl.addEventListener('click', () => {
        const cable = this.cables[inIdx % this.cables.length];
        cable.inIndex = inIdx;
        cable.outIndex = (cable.outIndex + 1) % this.outJacks.length;
        // Give rope a physics impulse
        cable.points.forEach((pt, i) => {
          if (i > 0 && i < cable.numPoints - 1) {
            pt.y -= 28;
          }
        });
        synth.playPatchPlug(inIdx + cable.outIndex);
        this.updateJackStates();
        if (this.onPatchChange) {
          this.onPatchChange(this.getPatchSignature());
        }
      });
    });

    this.outJacks.forEach((jackEl, outIdx) => {
      jackEl.addEventListener('click', () => {
        const cable = this.cables[outIdx % this.cables.length];
        cable.outIndex = outIdx;
        cable.inIndex = (cable.inIndex + 1) % this.inJacks.length;
        cable.points.forEach((pt, i) => {
          if (i > 0 && i < cable.numPoints - 1) {
            pt.y -= 28;
          }
        });
        synth.playPatchPlug(outIdx + cable.inIndex);
        this.updateJackStates();
        if (this.onPatchChange) {
          this.onPatchChange(this.getPatchSignature());
        }
      });
    });
  }

  randomizePatch() {
    const usedOut = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const usedIn = [0, 1, 2, 3].sort(() => Math.random() - 0.5);

    this.cables.forEach((cable, idx) => {
      cable.outIndex = usedOut[idx % this.outJacks.length];
      cable.inIndex = usedIn[idx % this.inJacks.length];
      // Add upward whip impulse
      cable.points.forEach((pt, i) => {
        if (i > 0 && i < cable.numPoints - 1) {
          pt.y -= 35 + Math.random() * 20;
          pt.x += (Math.random() - 0.5) * 30;
        }
      });
    });

    synth.playPatchPlug(Math.floor(Math.random() * 6));
    this.updateJackStates();
    if (this.onPatchChange) {
      this.onPatchChange(this.getPatchSignature());
    }
  }

  updateJackStates() {
    this.outJacks.forEach((el, idx) => {
      const active = this.cables.some((c) => c.outIndex === idx);
      el.classList.toggle('is-patched', active);
    });
    this.inJacks.forEach((el, idx) => {
      const active = this.cables.some((c) => c.inIndex === idx);
      el.classList.toggle('is-patched', active);
    });
  }

  getPatchSignature() {
    return this.cables.map((c) => ({
      out: c.outIndex,
      in: c.inIndex,
      color: c.color
    }));
  }

  update() {
    if (!this.outJacks.length || !this.inJacks.length) return;

    this.cables.forEach((cable, idx) => {
      const outEl = this.outJacks[cable.outIndex];
      const inEl = this.inJacks[cable.inIndex];
      const start = this.getJackCenter(outEl);
      const end = this.getJackCenter(inEl);

      cable.setEndpoints(start.x, start.y, end.x, end.y);
      cable.update(this.pointer.x, this.pointer.y, this.pointer.vx, this.pointer.vy);

      const d = cable.getPathData();
      const dom = this.cableDom[idx];
      if (dom) {
        dom.shadowPath.setAttribute('d', d);
        dom.mainPath.setAttribute('d', d);
        dom.pulsePath.setAttribute('d', d);
        const endPt = cable.points[cable.numPoints - 1];
        dom.plugEnd.setAttribute('cx', endPt.x.toFixed(1));
        dom.plugEnd.setAttribute('cy', endPt.y.toFixed(1));
      }
    });

    this.pointer.vx *= 0.8;
    this.pointer.vy *= 0.8;
  }
}
