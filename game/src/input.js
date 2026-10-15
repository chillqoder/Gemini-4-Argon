// Keyboard and multi-touch input controller

export class InputController {
  constructor(sim, audio, onRestart) {
    this.sim = sim;
    this.audio = audio;
    this.onRestart = onRestart;

    this.keysDown = new Set();
    this.touchActions = new Set();
    this.pointerToAction = new Map();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
  }

  attach(touchRoot = null) {
    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('visibilitychange', this._onVisibility);

    if (touchRoot) {
      this._bindTouchControls(touchRoot);
    }
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('visibilitychange', this._onVisibility);
  }

  releaseAll() {
    this.keysDown.clear();
    this.touchActions.clear();
    this.pointerToAction.clear();
    this.sim.clearInput();
    this._updateTouchButtonHighlights();
  }

  _onBlur() {
    this.releaseAll();
  }

  _onVisibility() {
    if (document.hidden) {
      this.releaseAll();
      this.audio.setPageHidden(true);
      if (this.sim.state === 'play') {
        this.sim.togglePause();
      }
    } else {
      this.audio.setPageHidden(false);
    }
  }

  _onKeyDown(e) {
    const code = e.code;
    const handledCodes = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Space',
      'KeyA',
      'KeyD',
      'KeyW',
      'KeyS',
      'KeyX',
      'ShiftLeft',
      'ShiftRight',
      'KeyP',
      'Escape',
      'KeyR',
      'KeyM',
      'Enter',
    ];

    if (handledCodes.includes(code)) {
      e.preventDefault();
    }

    this.audio.unlock();

    // Ignore key-repeat events for fresh press actions
    const isFreshPress = !this.keysDown.has(code) && !e.repeat;
    this.keysDown.add(code);

    if (isFreshPress) {
      if (code === 'KeyP' || code === 'Escape') {
        this.sim.togglePause();
        this.releaseAll();
        return;
      }
      if (code === 'KeyR') {
        this.releaseAll();
        if (this.onRestart) this.onRestart();
        return;
      }
      if (code === 'KeyM') {
        this.audio.toggleMute();
        return;
      }
      if (code === 'Enter') {
        if (
          this.sim.state === 'title' ||
          this.sim.state === 'gameover' ||
          this.sim.state === 'win' ||
          this.sim.state === 'paused'
        ) {
          this.sim.startGame();
          return;
        }
      }
      // Space, W, or Up ALWAYS means jump
      if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
        this.sim.setInput({ jumpPressed: true });
      }
      if (code === 'KeyX' || code === 'ShiftLeft' || code === 'ShiftRight') {
        this.sim.setInput({ firePressed: true });
      }
    }

    this._syncHeldState();
  }

  _onKeyUp(e) {
    this.keysDown.delete(e.code);
    this._syncHeldState();
  }

  _bindTouchControls(touchRoot) {
    this.touchButtons = Array.from(
      touchRoot.querySelectorAll('[data-touch-action]')
    );

    const releasePointer = (e) => {
      const action = this.pointerToAction.get(e.pointerId);
      if (action) {
        this.pointerToAction.delete(e.pointerId);
        this._recomputeTouchActions();
      }
    };

    for (const btn of this.touchButtons) {
      const action = btn.getAttribute('data-touch-action');
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.audio.unlock();
        try {
          btn.setPointerCapture(e.pointerId);
        } catch (_) {}
        this.pointerToAction.set(e.pointerId, action);
        if (action === 'jump') {
          this.sim.setInput({ jumpPressed: true });
        } else if (action === 'run') {
          this.sim.setInput({ firePressed: true });
        }
        this._recomputeTouchActions();
      });

      btn.addEventListener('pointerup', releasePointer);
      btn.addEventListener('pointercancel', releasePointer);
      btn.addEventListener('lostpointercapture', releasePointer);
    }
  }

  _recomputeTouchActions() {
    this.touchActions.clear();
    for (const act of this.pointerToAction.values()) {
      this.touchActions.add(act);
    }
    this._updateTouchButtonHighlights();
    this._syncHeldState();
  }

  _updateTouchButtonHighlights() {
    if (!this.touchButtons) return;
    for (const btn of this.touchButtons) {
      const act = btn.getAttribute('data-touch-action');
      btn.classList.toggle('active', this.touchActions.has(act));
    }
  }

  _syncHeldState() {
    const left =
      this.keysDown.has('ArrowLeft') ||
      this.keysDown.has('KeyA') ||
      this.touchActions.has('left');
    const right =
      this.keysDown.has('ArrowRight') ||
      this.keysDown.has('KeyD') ||
      this.touchActions.has('right');
    const down =
      this.keysDown.has('ArrowDown') ||
      this.keysDown.has('KeyS') ||
      this.touchActions.has('down');
    const jumpDown =
      this.keysDown.has('Space') ||
      this.keysDown.has('KeyW') ||
      this.keysDown.has('ArrowUp') ||
      this.touchActions.has('jump');
    const run =
      this.keysDown.has('ShiftLeft') ||
      this.keysDown.has('ShiftRight') ||
      this.keysDown.has('KeyX') ||
      this.touchActions.has('run');

    this.sim.setInput({ left, right, down, jumpDown, run });
  }
}
