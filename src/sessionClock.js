// Wall-clock deadlines survive suspension/reload. Only an explicit workout pause
// stops the active clock; set rests and switching phone apps remain training time.
export function startClock(session, now = Date.now(), legacy = false) {
  session.clock ||= { version: 1, accumulatedMs: 0, runningSince: now, paused: false, partialMeasurement: legacy };
  return session.clock;
}
export function activeMilliseconds(session, now = Date.now()) {
  const c = session.clock;
  if (!c) return 0;
  return Math.max(0, c.accumulatedMs || 0) + (!c.paused && Number.isFinite(c.runningSince) ? Math.max(0, now - c.runningSince) : 0);
}
export function pauseClock(session, now = Date.now()) {
  const c = startClock(session, now, true);
  c.accumulatedMs = activeMilliseconds(session, now); c.runningSince = null; c.paused = true;
}
export function resumeClock(session, now = Date.now()) {
  const c = startClock(session, now);
  if (c.paused) { c.runningSince = now; c.paused = false; }
}
export function finishClock(session, now = Date.now()) {
  if (!session.clock) return;
  pauseClock(session, now);
  session.activeDurationSec = Math.round(session.clock.accumulatedMs / 1000);
}

export function timingProfile(logs, fullBody) {
  const ratios = logs.filter(log => log.status === 'completed' && log.clock && !log.clock.partialMeasurement && !log.backfilled && !log.dateBackfilled && Number.isFinite(log.activeDurationSec) && log.activeDurationSec > 0 && log.planSnapshot?.estimatedMinutes > 0 && !!log.planSnapshot.fullBody === !!fullBody)
    .slice(0, 6).map(log => log.activeDurationSec / (log.planSnapshot.estimatedMinutes / (log.planSnapshot.timingFactor || 1) * 60))
    .filter(r => r >= 0.5 && r <= 2);
  if (ratios.length < 3) return { factor: 1, samples: ratios.length };
  ratios.sort((a,b) => a-b);
  const mid = Math.floor(ratios.length / 2), median = ratios.length % 2 ? ratios[mid] : (ratios[mid-1] + ratios[mid]) / 2;
  // Never cut the prescribed rests based on a fast logged workout.
  return { factor: Math.min(1.5, Math.max(1, median)), samples: ratios.length };
}

export function timingSettings(settings, logs) {
  return { ...settings, timingFactor: null, timingFactors: { strength: timingProfile(logs, true).factor, other: timingProfile(logs, false).factor } };
}
