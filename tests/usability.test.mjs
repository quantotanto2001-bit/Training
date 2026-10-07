import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAN } from '../src/plan.js';
import { resolveExercise, buildSessionPlan, replanRemaining, remainingSeconds, restSeconds, plannedSets } from '../src/training.js';
import { loadSpec, validateSet, historicalLoads, effectiveValue } from '../src/measurements.js';
import { progressionFor, setDefaults, adaptationFor, comparePerformance } from '../src/progression.js';
import { startClock, pauseClock, resumeClock, finishClock, activeMilliseconds, timingProfile } from '../src/sessionClock.js';
import { formatLoggedSet } from '../src/setForms.js';

test('loaded sets require the correct kg convention; genuine bodyweight is allowed', () => {
  const bench = resolveExercise('do-bench'), pullup = resolveExercise('mo-pullup'), stepup = resolveExercise('do-pistol','stepup');
  assert.equal(loadSpec(bench).kind, 'per-dumbbell');
  for (const weightKg of [null,0,-5,NaN]) assert.ok(validateSet(bench,{weightKg,reps:8}));
  assert.equal(validateSet(bench,{weightKg:10,reps:8}),null);
  assert.equal(validateSet(pullup,{weightKg:null,reps:5}),null);
  assert.equal(validateSet(stepup,{weightKg:0,repsLeft:7,repsRight:7}),null);
  assert.ok(validateSet(stepup,{weightKg:5,repsLeft:7}));
  assert.equal(loadSpec(resolveExercise('do-bench','bench-guided')).kind,'total');
  assert.equal(loadSpec(resolveExercise('do-ringrow','cable-row')).kind,'machine');
});

test('old dumbbell weights need explicit confirmation and are never silently converted', () => {
  const ex = resolveExercise('do-bench'); ex.sets=3;
  const legacy={plannedSets:3,status:'completed',sets:Array.from({length:3},()=>({weightKg:20,reps:10}))};
  const unknown=historicalLoads(ex,[legacy])[0];
  assert.equal(progressionFor(ex,unknown,1).status,'confirm-load');
  assert.equal(setDefaults(ex,[],unknown).weightKg,null);
  assert.equal(progressionFor(ex,historicalLoads(ex,[legacy],'per-dumbbell')[0],1).suggestedWeight,21);
  assert.equal(legacy.sets[0].weightConvention,undefined);
  assert.match(formatLoggedSet(ex,legacy.sets[0]),/frühere Angabe/);
  const tagged={...legacy,sets:legacy.sets.map(s=>({...s,weightConvention:'total'}))};
  assert.equal(historicalLoads(ex,[tagged],'per-dumbbell')[0].loadCompatible,false);
  assert.match(formatLoggedSet(ex,tagged.sets[0]),/kg gesamt/);
});

test('both sides must reach the upper target; old aggregate side logs remain visible', () => {
  const ex=resolveExercise('mo-splitsquat'); ex.sets=2;
  const row={plannedSets:2,status:'completed',sets:[{weightKg:5,repsLeft:10,repsRight:9},{weightKg:5,repsLeft:10,repsRight:10}]};
  assert.equal(effectiveValue(ex,row.sets[0]),9);
  assert.equal(progressionFor(ex,row,1).status,'keep');
  row.sets[0].repsRight=10; assert.equal(progressionFor(ex,row,1).suggestedWeight,6);
  const old={...row,sets:[{weightKg:5,reps:10},{weightKg:5,reps:10}]};
  assert.equal(progressionFor(ex,old,1).status,'keep');
  assert.match(formatLoggedSet(ex,old.sets[0]),/gemeinsam erfasst/);
});

test('two comparable misses suggest one lighter increment; short workouts do not count as misses', () => {
  const ex=resolveExercise('do-bench'); ex.sets=3;
  const row=reps=>({status:'completed',plannedSets:3,loadCompatible:true,sets:Array.from({length:3},()=>({weightKg:10,weightConvention:'per-dumbbell',reps}))});
  assert.equal(adaptationFor(ex,[row(5),row(5)],1).suggestedWeight,9);
  assert.equal(progressionFor(ex,row(5),1,[row(5),row(5)]).status,'adjust');
  const short={...row(5),status:'partial',sets:[row(5).sets[0]]};
  assert.equal(adaptationFor(ex,[short,short],1),null);
  assert.equal(adaptationFor(ex,[row(7),row(7),row(7)],1).status,'plateau');
  assert.equal(adaptationFor(ex,[row(8),row(7),row(7)],1),null);
});

test('progress recognizes a higher load at lower but in-range reps and avoids incompatible comparisons', () => {
  const ex=resolveExercise('do-bench');
  const row=(weight,reps)=>({sets:Array.from({length:3},()=>({weightKg:weight,weightConvention:'per-dumbbell',reps}))});
  assert.equal(comparePerformance(ex,row(11,6),row(10,10)).kind,'load');
  assert.equal(comparePerformance(ex,row(11,5),row(10,10)),null);
  assert.equal(comparePerformance(ex,{...row(11,6),loadCompatible:false},row(10,10)),null);
  const same=row(10,8);same.sets[0].reps=9;
  assert.equal(comparePerformance(ex,same,row(10,8)).delta,1);
});

test('explicit workout pauses survive reload and are excluded from active duration', () => {
  let session={};startClock(session,1000);pauseClock(session,61000);pauseClock(session,62000);
  session=JSON.parse(JSON.stringify(session));
  assert.equal(activeMilliseconds(session,900000),60000);
  resumeClock(session,900000);assert.equal(activeMilliseconds(session,960000),120000);
  finishClock(session,990000);assert.equal(session.activeDurationSec,150);
  assert.equal(activeMilliseconds(session,2000000),150000);
});

test('time replanning keeps saved sets, variants and input drafts and never expands completed work', () => {
  const day=PLAN[0], session={planSnapshot:buildSessionPlan(day,90),entries:{}};
  startClock(session,0);
  const first=session.planSnapshot.exercises.find(e=>e.id==='mo-pullup');
  const sets=Array.from({length:plannedSets(first)},(_,slotIndex)=>({weightKg:5,reps:7,slotIndex}));
  session.entries[first.id]={sets,plannedSets:plannedSets(first)};
  const split=session.planSnapshot.exercises.find(e=>e.id==='mo-splitsquat');
  session.entries[split.id]={sets:[],drafts:{2:{weightKg:5,repsLeft:8,repsRight:7}}};
  const small=replanRemaining(session,day,45,1200000);
  assert.equal(small.exercises.find(e=>e.id===first.id).sets,first.sets);
  assert.ok(small.exercises.find(e=>e.id===split.id).sets>=3);
  assert.deepEqual(session.entries[split.id].drafts[2],{weightKg:5,repsLeft:8,repsRight:7});
  session.planSnapshot=small;
  const large=replanRemaining(session,day,90,1200000);
  assert.equal(large.exercises.find(e=>e.id===first.id).sets,first.sets);
  assert.ok(remainingSeconds({...session,planSnapshot:large},day,1200000)>0);
  assert.ok(small.warning || small.remainingMinutes<=25);
});

test('planning uses the middle of the rest range and calibration excludes pauses/backfills/partial units', () => {
  const ex=resolveExercise('mo-pullup');assert.equal(restSeconds(ex),210);
  const log={status:'completed',clock:{partialMeasurement:false},activeDurationSec:4800,planSnapshot:{fullBody:true,estimatedMinutes:60,timingFactor:1}};
  assert.equal(timingProfile([log,log],true).factor,1);
  assert.equal(timingProfile([log,log,log],true).factor,4/3);
  assert.equal(timingProfile([log,log,{...log,dateBackfilled:true}],true).factor,1);
  assert.equal(timingProfile([log,log,{...log,status:'partial'}],true).factor,1);
  assert.equal(timingProfile([log,log,log],false).factor,1);
});
