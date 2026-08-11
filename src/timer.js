// Pausentimer: startet automatisch nach einem geloggten Satz.
// Kann verlaengert, pausiert und uebersprungen werden.

export class RestTimer {
  constructor({ onTick, onDone }) {
    this.onTick = onTick;
    this.onDone = onDone;
    this.remaining = 0;
    this.total = 0;
    this.running = false;
    this._intervalId = null;
  }

  start(seconds) {
    this.total = seconds;
    this.remaining = seconds;
    this.running = true;
    this._tickLoop();
  }

  _tickLoop() {
    clearInterval(this._intervalId);
    this._intervalId = setInterval(() => {
      if (!this.running) return;
      this.remaining -= 1;
      if (this.remaining <= 0) {
        this.remaining = 0;
        this.onTick && this.onTick(this);
        this.stop();
        this.onDone && this.onDone();
        this._vibrate();
        return;
      }
      this.onTick && this.onTick(this);
    }, 1000);
  }

  _vibrate() {
    if (navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200]); } catch (e) { /* ignore */ }
    }
  }

  extend(seconds) {
    this.remaining += seconds;
    this.total = Math.max(this.total, this.remaining);
    this.onTick && this.onTick(this);
  }

  togglePause() {
    this.running = !this.running;
    this.onTick && this.onTick(this);
  }

  skip() {
    this.remaining = 0;
    this.stop();
    this.onTick && this.onTick(this);
    this.onDone && this.onDone();
  }

  stop() {
    this.running = false;
    clearInterval(this._intervalId);
    this._intervalId = null;
  }
}
