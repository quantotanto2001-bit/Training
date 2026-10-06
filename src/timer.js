// Eine absolute Endzeit zählt auch dann weiter, wenn iOS JavaScript anhält.
// Das Intervall aktualisiert nur die Anzeige. Jede Bedienaktion wird sofort
// gespeichert, nicht erst beim Schliessen der App.
const STORAGE_KEY = 'universal-athlete-rest-timer';

export class RestTimer {
  constructor({ onTick, onDone, sessionId, storageKey = STORAGE_KEY } = {}) {
    Object.assign(this, { onTick, onDone, sessionId, storageKey, total: 0, running: false,
      ownerId: null, endAt: null, _remainingMs: 0, _intervalId: null,
      _lastRemaining: null });
    this._onVisibility = () => {
      if (document.hidden) this._clearLoop();
      else this._resumeDisplay();
    };
    this._onPageShow = () => this._resumeDisplay();
    this._restore();
    document.addEventListener('visibilitychange', this._onVisibility);
    window.addEventListener('pageshow', this._onPageShow);
    this._tickLoop();
  }

  get remaining() {
    const ms = this.running ? this.endAt - Date.now() : this._remainingMs;
    return Math.max(0, Math.ceil(ms / 1000));
  }

  start(seconds, ownerId = null) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.total = seconds;
    this._remainingMs = seconds * 1000;
    this.endAt = Date.now() + this._remainingMs;
    this.ownerId = ownerId;
    this.running = true;
    this._persist();
    this._tickLoop();
    this._notify();
  }

  _tickLoop() {
    this._clearLoop();
    if (this.running && !document.hidden) {
      this._intervalId = setInterval(() => this._sync(), 250);
    }
  }

  _clearLoop() {
    clearInterval(this._intervalId);
    this._intervalId = null;
  }

  _sync() {
    if (this.running && this.remaining === 0) {
      this._finish(true);
      return;
    }
    if (this._lastRemaining !== this.remaining) this._notify();
  }

  _resumeDisplay() {
    this._sync();
    this._tickLoop();
  }

  _notify() {
    this._lastRemaining = this.remaining;
    this.onTick && this.onTick(this);
  }

  _persist() {
    if (!this.sessionId) return;
    try {
      if (this.total <= 0) localStorage.removeItem(this.storageKey);
      else localStorage.setItem(this.storageKey, JSON.stringify({
        version: 1, sessionId: this.sessionId, ownerId: this.ownerId,
        total: this.total, running: this.running,
        endAt: this.endAt, remainingMs: this._remainingMs,
      }));
    } catch (e) { /* Auch bei gesperrtem Speicher bleibt der Timer bedienbar. */ }
  }

  _restore() {
    if (!this.sessionId) return;
    try {
      const state = JSON.parse(localStorage.getItem(this.storageKey));
      if (!state) return;
      const valid = state.version === 1 && state.sessionId === this.sessionId
        && Number.isFinite(state.total) && state.total > 0
        && typeof state.running === 'boolean'
        && (state.running
          ? Number.isFinite(state.endAt) && state.endAt > Date.now()
          : Number.isFinite(state.remainingMs) && state.remainingMs > 0);
      if (!valid) { localStorage.removeItem(this.storageKey); return; }
      this.total = state.total;
      this.ownerId = typeof state.ownerId === 'string' ? state.ownerId : null;
      this.running = state.running;
      this.endAt = state.running ? state.endAt : null;
      this._remainingMs = state.running ? state.endAt - Date.now() : state.remainingMs;
    } catch (e) { /* Beschädigte oder nicht verfügbare Speicherung ignorieren. */ }
  }

  extend(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this._sync();
    if (this.total <= 0) return;
    if (this.running) this.endAt += seconds * 1000;
    else this._remainingMs += seconds * 1000;
    this.total = Math.max(this.total, this.remaining);
    this._persist();
    this._notify();
  }

  togglePause() {
    this._sync();
    if (this.total <= 0) return;
    if (this.running) {
      this._remainingMs = Math.max(0, this.endAt - Date.now());
      this.endAt = null;
      this.running = false;
    } else {
      this.endAt = Date.now() + this._remainingMs;
      this.running = true;
    }
    this._persist();
    this._tickLoop();
    this._notify();
  }

  _finish(vibrate = false) {
    const result = { ownerId: this.ownerId, seconds: this.total, expired: vibrate };
    this.running = false;
    this.total = 0;
    this._remainingMs = 0;
    this.endAt = null;
    this.ownerId = null;
    this._clearLoop();
    this._persist();
    this._notify();
    this.onDone && this.onDone(result);
    if (vibrate && !document.hidden && navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200]); } catch (e) { /* optional */ }
    }
  }

  skip() { this._finish(); }

  stop() { if (this.running) this.togglePause(); }

  // Beim Seitenwechsel nur die Anzeige abbauen, die Endzeit bleibt erhalten.
  dispose() {
    this._clearLoop();
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener('pageshow', this._onPageShow);
    this.onTick = null;
    this.onDone = null;
  }
}
