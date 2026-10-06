import test from 'node:test';
import assert from 'node:assert/strict';
import { RestTimer } from '../src/timer.js';

function environment(fn) {
  const names = ['document', 'window', 'localStorage', 'navigator', 'setInterval', 'clearInterval'];
  const original = names.map(n => [n, Object.getOwnPropertyDescriptor(globalThis, n)]);
  const realNow = Date.now;
  let now = 1000000;
  let nextId = 1;
  const intervals = new Map();
  const data = new Map();
  const document = new EventTarget();
  document.hidden = false;
  const window = new EventTarget();
  const values = { document, window, navigator: {},
    localStorage: { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) },
    setInterval: fn => { const id = nextId++; intervals.set(id, fn); return id; },
    clearInterval: id => intervals.delete(id),
  };
  for (const n of names) Object.defineProperty(globalThis, n, { value: values[n], configurable: true, writable: true });
  Date.now = () => now;
  const env = { data, intervals, advance: ms => { now += ms; },
    hide: () => { document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); },
    show: () => { document.hidden = false; document.dispatchEvent(new Event('visibilitychange')); },
    tick: () => [...intervals.values()].forEach(fn => fn()),
  };
  try { fn(env); } finally {
    Date.now = realNow;
    for (const [n, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, n, descriptor); else delete globalThis[n];
    }
  }
}

test('90 seconds in another app count even with zero interval callbacks', () => environment(e => {
  const timer = new RestTimer({ sessionId: 'session' });
  timer.start(180, 'pullup');
  e.hide();
  assert.equal(e.intervals.size, 0);
  e.advance(90000);
  e.show();
  assert.equal(timer.remaining, 90);
  assert.equal(timer.running, true);
  assert.equal(e.intervals.size, 1);
  timer.dispose();
}));

test('expiry during suspension completes once and cannot restart on +30', () => environment(e => {
  let done = 0;
  const timer = new RestTimer({ sessionId: 'session', onDone: () => done++ });
  timer.start(60, 'pullup');
  e.hide(); e.advance(120000); e.show(); e.show(); e.tick();
  assert.equal(timer.remaining, 0);
  assert.equal(timer.total, 0);
  assert.equal(done, 1);
  assert.equal(e.data.size, 0);
  timer.extend(30);
  assert.equal(timer.total, 0);
  timer.dispose();
}));

test('a new page restores the deadline and owning exercise', () => environment(e => {
  const timer = new RestTimer({ sessionId: 'session' });
  timer.start(180, 'pullup'); timer.dispose(); e.advance(91000);
  const restored = new RestTimer({ sessionId: 'session' });
  assert.equal(restored.remaining, 89);
  assert.equal(restored.ownerId, 'pullup');
  restored.dispose();
}));

test('manual pause survives time away and a reload without losing fractional seconds', () => environment(e => {
  const timer = new RestTimer({ sessionId: 'session' });
  timer.start(60, 'pullup'); e.advance(1250); timer.togglePause(); timer.dispose();
  e.advance(600000);
  const restored = new RestTimer({ sessionId: 'session' });
  assert.equal(restored.running, false);
  assert.equal(restored.remaining, 59);
  restored.extend(30); restored.togglePause(); e.advance(750); e.tick();
  assert.equal(restored.remaining, 88);
  restored.dispose();
}));

test('+30 after missed callbacks uses the true remaining time', () => environment(e => {
  const timer = new RestTimer({ sessionId: 'session' });
  timer.start(120, 'pullup'); e.advance(70000); timer.extend(30);
  assert.equal(timer.remaining, 80);
  timer.dispose();
  const restored = new RestTimer({ sessionId: 'session' });
  assert.equal(restored.remaining, 80);
  restored.dispose();
}));

test('skip clears persistence and a new workout cannot inherit an old timer', () => environment(e => {
  const timer = new RestTimer({ sessionId: 'old' });
  timer.start(120, 'pullup'); timer.skip(); timer.dispose();
  assert.equal(e.data.size, 0);
  const timer2 = new RestTimer({ sessionId: 'old' });
  timer2.start(120, 'pullup'); timer2.dispose();
  const fresh = new RestTimer({ sessionId: 'new' });
  assert.equal(fresh.total, 0);
  assert.equal(e.data.size, 0);
  fresh.dispose();
}));

test('an expired saved timer is discarded without a delayed completion alert', () => environment(e => {
  const timer = new RestTimer({ sessionId: 'session' });
  timer.start(30, 'pullup'); timer.dispose(); e.advance(40000);
  const restored = new RestTimer({ sessionId: 'session', onDone: () => assert.fail('stale alert') });
  assert.equal(restored.total, 0);
  assert.equal(e.data.size, 0);
  restored.dispose();
}));

test('disposed views cannot revive loops or call old UI callbacks', () => environment(e => {
  let ticks = 0;
  const timer = new RestTimer({ sessionId: 'session', onTick: () => ticks++ });
  timer.start(120); timer.dispose();
  const before = ticks;
  e.hide(); e.advance(30000); e.show(); e.tick();
  assert.equal(ticks, before);
  assert.equal(e.intervals.size, 0);
}));

test('blocked storage does not break foreground/background timekeeping', () => environment(e => {
  localStorage.getItem = () => { throw new Error('unavailable'); };
  localStorage.setItem = () => { throw new Error('unavailable'); };
  const timer = new RestTimer({ sessionId: 'session' });
  timer.start(60); e.advance(20000); e.tick();
  assert.equal(timer.remaining, 40);
  timer.dispose();
}));

test('hold timer has independent persistence, survives reload and reports expiry once', () => environment(e => {
  const rest = new RestTimer({sessionId:'session'});
  const hold = new RestTimer({sessionId:'session',storageKey:'hold'});
  rest.start(120,'rest');hold.start(45,'stretch');
  e.hide();e.advance(15000);hold.dispose();
  let result;
  const restored = new RestTimer({sessionId:'session',storageKey:'hold',onDone:r=>result=r});
  assert.equal(restored.remaining,30);assert.equal(rest.remaining,105);
  restored.togglePause();e.advance(10000);assert.equal(restored.remaining,30);
  restored.togglePause();e.advance(30000);e.show();
  assert.deepEqual(result,{ownerId:'stretch',seconds:45,expired:true});
  assert.equal(rest.remaining,65);assert.equal(e.data.has('hold'),false);
  rest.dispose();restored.dispose();
}));
