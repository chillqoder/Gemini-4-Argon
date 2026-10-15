// Versioned, validated personal best storage with in-memory fallback

const STORAGE_KEY = 'low_poly_mario_records_v1';
const SCHEMA_VERSION = 1;

export class RecordsManager {
  constructor(storage = null) {
    this.storage = storage !== null ? storage : this._getDefaultStorage();
    this.memoryRecords = {
      version: SCHEMA_VERSION,
      bestScore: 0,
      bestTime: null, // seconds (lower is better), only set on completed runs
    };
    this.load();
  }

  _getDefaultStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch (_) {
      // Storage inaccessible
    }
    return null;
  }

  _validate(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.version !== SCHEMA_VERSION) return null;

    const bestScore =
      typeof data.bestScore === 'number' &&
      Number.isFinite(data.bestScore) &&
      data.bestScore >= 0
        ? Math.floor(data.bestScore)
        : 0;

    const bestTime =
      typeof data.bestTime === 'number' &&
      Number.isFinite(data.bestTime) &&
      data.bestTime > 0 &&
      data.bestTime < 36000
        ? Number(data.bestTime.toFixed(2))
        : null;

    return {
      version: SCHEMA_VERSION,
      bestScore,
      bestTime,
    };
  }

  load() {
    if (!this.storage) {
      return { ...this.memoryRecords };
    }
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return { ...this.memoryRecords };
      const parsed = JSON.parse(raw);
      const valid = this._validate(parsed);
      if (valid) {
        this.memoryRecords = valid;
      }
    } catch (_) {
      // Corrupt JSON or blocked storage read: keep valid memoryRecords
    }
    return { ...this.memoryRecords };
  }

  save() {
    if (!this.storage) return false;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.memoryRecords));
      return true;
    } catch (_) {
      // Quota exceeded or blocked write: retain in-memory records
      return false;
    }
  }

  getRecords() {
    return { ...this.memoryRecords };
  }

  /**
   * Record a run outcome.
   * @param {object} params
   * @param {number} params.score - Final score of the run
   * @param {number} params.runTime - Active run duration in seconds
   * @param {boolean} params.completed - True ONLY when the course was cleared
   * @returns {{ bestScore: number, bestTime: number|null, isNewBestScore: boolean, isNewBestTime: boolean, isNewBest: boolean }}
   */
  recordRun({ score = 0, runTime = 0, completed = false }) {
    const cleanScore =
      typeof score === 'number' && Number.isFinite(score) && score > 0
        ? Math.floor(score)
        : 0;
    const cleanTime =
      typeof runTime === 'number' && Number.isFinite(runTime) && runTime > 0
        ? Number(runTime.toFixed(2))
        : null;

    let isNewBestScore = false;
    let isNewBestTime = false;

    if (cleanScore > this.memoryRecords.bestScore) {
      this.memoryRecords.bestScore = cleanScore;
      isNewBestScore = true;
    }

    if (completed && cleanTime !== null) {
      if (
        this.memoryRecords.bestTime === null ||
        cleanTime < this.memoryRecords.bestTime
      ) {
        this.memoryRecords.bestTime = cleanTime;
        isNewBestTime = true;
      }
    }

    if (isNewBestScore || isNewBestTime) {
      this.save();
    }

    return {
      bestScore: this.memoryRecords.bestScore,
      bestTime: this.memoryRecords.bestTime,
      isNewBestScore,
      isNewBestTime,
      isNewBest: isNewBestScore || isNewBestTime,
    };
  }

  resetRecords() {
    this.memoryRecords = {
      version: SCHEMA_VERSION,
      bestScore: 0,
      bestTime: null,
    };
    try {
      if (this.storage) {
        this.storage.removeItem(STORAGE_KEY);
      }
    } catch (_) {
      // Ignore storage errors
    }
  }
}
