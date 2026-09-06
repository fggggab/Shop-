/**
 * State container for one designer instance: holds the current configuration,
 * persists it to localStorage (autosave), and provides linear undo/redo.
 *
 * The state shape is intentionally flat and JSON-serializable so it can be
 * dropped straight into localStorage and into the cart line item properties.
 */

import { debounce, uid } from './jd-utils.js';

export const STORAGE_VERSION = 1;

export function createInitialState() {
  return {
    version: STORAGE_VERSION,
    step: 0,
    jewelryType: null,
    material: null,
    beads: [], // [{ id, qty }]
    charm: null,
    size: null,
    engraving: { enabled: false, text: '' },
    bundleId: uid(),
  };
}

export class JdStore {
  /**
   * @param {string} storageKey unique per designer instance (e.g. per product/section)
   * @param {(state: object) => void} onChange called after every mutation
   */
  constructor(storageKey, onChange) {
    this.storageKey = storageKey;
    this.onChange = onChange;
    this.past = [];
    this.future = [];
    this.state = this._load() || createInitialState();
    this._persist = debounce(() => this._save(), 300);
  }

  getState() {
    return this.state;
  }

  /**
   * Apply a partial update. Pushes the previous state onto the undo stack
   * unless `silent` is set (used for high-frequency, non-committal changes
   * like live text input, where every keystroke shouldn't be undoable).
   */
  update(patch, { silent = false } = {}) {
    if (!silent) {
      this.past.push(this._snapshot());
      this.future = [];
    }
    this.state = { ...this.state, ...patch };
    this._emit();
  }

  toggleBead(beadId, delta) {
    const beads = this.state.beads.map((b) => ({ ...b }));
    const existing = beads.find((b) => b.id === beadId);
    if (existing) {
      existing.qty = Math.max(0, existing.qty + delta);
      if (existing.qty === 0) {
        const idx = beads.indexOf(existing);
        beads.splice(idx, 1);
      }
    } else if (delta > 0) {
      beads.push({ id: beadId, qty: delta });
    }
    this.update({ beads });
  }

  canUndo() {
    return this.past.length > 0;
  }

  canRedo() {
    return this.future.length > 0;
  }

  undo() {
    if (!this.canUndo()) return;
    this.future.push(this._snapshot());
    this.state = this.past.pop();
    this._emit();
  }

  redo() {
    if (!this.canRedo()) return;
    this.past.push(this._snapshot());
    this.state = this.future.pop();
    this._emit();
  }

  reset() {
    this.past = [];
    this.future = [];
    this.state = createInitialState();
    this._emit();
  }

  _snapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }

  _emit() {
    this._persist();
    if (typeof this.onChange === 'function') this.onChange(this.state);
  }

  _save() {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (err) {
      /* Storage may be unavailable (private mode, quota) — autosave is a
         convenience, so we fail silently and keep the in-memory state. */
    }
  }

  _load() {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.version !== STORAGE_VERSION) return null;
      return parsed;
    } catch (err) {
      return null;
    }
  }
}
