import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAN, TYPES, allExercises } from '../src/plan.js';
import { buildSessionPlan, timeOptions, alternativesFor, resolveExercise, plannedSets, historyKey, sessionExercises } from '../src/training.js';
import { progressionFor, setDefaults } from '../src/progression.js';
import { weeklySummary } from '../src/views/progress-v4.js';
import { motionFor } from '../src/motion.js';
import { statSync } from 'node:fs';

test('all durations retain the complete core, honest time estimates and power-first ordering', () => {
  for (const focus of ['allround','splits','skills']) for (const day of PLAN) {
    let core;
    for (const minutes of timeOptions(day)) {
      const p = buildSessionPlan(day, minutes, {focus});
      const ids = p.exercises.filter(e => e.core).map(e => e.slotId).sort();
      core ? assert.deepEqual(ids, core) : core = ids;
      assert.ok(p.estimatedMinutes <= minutes || p.warning, `${day.id} ${minutes}`);
      assert.equal(new Set(p.exercises.map(e => e.id)).size,p.exercises.length);
      assert.ok(p.exercises.every(e => plannedSets(e) >= 1));
      if(day.isFullBody){const rank=e=>e.type===TYPES.POWER?0:e.type===TYPES.SKILL?1:e.type===TYPES.STRENGTH?2:3;const ranks=p.exercises.map(rank);assert.deepEqual(ranks,[...ranks].sort());}
    }
  }
});

test('the shortest cycle includes all main movement tasks, calf and shoulder rotation', () => {
  const groups=new Set(PLAN.flatMap(d=>buildSessionPlan(d,timeOptions(d)[0]).exercises.map(e=>e.group)));
  for(const group of ['verticalPull','row','chestPush','shoulderPush','knee','hinge','kneeFlexion','calf','rotation','core','cardio','power','neck']) assert.ok(groups.has(group),group);
});

test('replacements retain task and have separate identities; mixed legacy entries remain separate',()=>{
  for(const ex of allExercises())for(const choice of alternativesFor(ex.id)){
    const base=resolveExercise(ex.id), alt=resolveExercise(ex.id,choice.key);
    assert.equal(alt.group,base.group);assert.equal(alt.slotId,ex.id);assert.notEqual(alt.id,base.id);assert.ok(alt.alternativeNote);
  }
  assert.notEqual(resolveExercise('mo-rdl').id,'mo-rdl');
  assert.notEqual(resolveExercise('do-bench').id,'do-bench');
  assert.notEqual(historyKey('mo-pullup',{substituteName:'Rudern'}),'mo-pullup');
  assert.equal(historyKey('slot',{exercise:{id:'own'}}),'own');
});

test('saved plan snapshots survive plan changes and old sessions retain original exercises',()=>{
  const old={dayId:'mo'};assert.deepEqual(sessionExercises(old),PLAN[0].blocks.flatMap(b=>b.exercises));
  const saved={dayId:'mo',planSnapshot:{exercises:[{id:'custom',sets:7}]}};assert.deepEqual(sessionExercises(saved),saved.planSnapshot.exercises);
});

const ex={id:'test',type:TYPES.STRENGTH,sets:3,reps:{min:6,max:10}};
const last=()=>({sets:Array.from({length:3},()=>({reps:10,weightKg:20,rir:null})),plannedSets:3,status:'completed',rirReliable:true});
test('strength suggestions require full comparable sets and respect explicit effort and quality',()=>{
  assert.equal(progressionFor(ex,last(),1).suggestedWeight,21);
  for(const change of [l=>l.sets.pop(),l=>l.sets[0].reps=8,l=>l.sets[0].weightKg=15,l=>l.feedback='limit',l=>l.quality='loss',l=>l.sets[0].technikverlust=true,l=>l.sets[0].rir='0']){const l=last();change(l);assert.equal(progressionFor(ex,l).status,'keep');}
  assert.equal(progressionFor({...ex,sets:4},last()).status,'keep');
  const legacy=last();legacy.rirReliable=false;legacy.sets[0].rir='0';assert.equal(progressionFor(ex,legacy).status,'increase');
});
test('power, neck, skill and cardio cannot inherit strength load progression',()=>{
  assert.equal(progressionFor({...ex,type:TYPES.POWER},last()).status,'quality');
  assert.equal(progressionFor({...ex,tracking:'neck'},last()).status,'hold');
  assert.equal(progressionFor({...ex,type:TYPES.SKILL},last()).status,'skill');
  assert.equal(progressionFor({...ex,type:TYPES.CARDIO},last()).status,'cardio');
});
test('prefill copies load only, without fabricating reps or RIR',()=>{
  const defaults=setDefaults(ex,[],last());assert.equal(defaults.weightKg,20);assert.equal(defaults.reps,undefined);assert.equal(defaults.rir,undefined);
  assert.equal(setDefaults(ex,[{weightKg:22}],last()).weightKg,22);
});
test('weekly totals use actual work, exclude skips, warmups and future dates',()=>{
  const row=(date,status,sets)=>({finishedAt:date,status,entries:{x:{exercise:ex,sets}}});
  const stats=weeklySummary([row('2026-09-28T12:00:00','partial',[{reps:5},{reps:5,isWarmup:true}]),row('2026-09-29T12:00:00','skipped',[{reps:5}]),row('2026-10-02T12:00:00','completed',[{reps:5}])],new Date('2026-09-30T12:00:00'));
  assert.equal(stats.count,1);assert.equal(stats.partial,1);assert.equal(stats.strengthSets,1);
});

test('a completed exercise in a shortened workout can progress, but an unknown weight step is not invented',()=>{
  const l=last();l.status='partial';assert.equal(progressionFor(ex,l,0.5).suggestedWeight,20.5);
  assert.equal(progressionFor(ex,l).status,'increase');assert.equal(progressionFor(ex,l).suggestedWeight,undefined);
  delete l.plannedSets;assert.equal(progressionFor(ex,l).status,'keep');
});

test('three sets of seven at five kg trigger progression only at the upper rep target',()=>{
 const e={...ex,reps:{min:4,max:7}},l={...last(),sets:Array.from({length:3},()=>({weightKg:5,reps:7}))};
 assert.equal(progressionFor(e,l,0.5).suggestedWeight,5.5);
 assert.equal(progressionFor({...e,reps:{min:6,max:10}},l,0.5).status,'keep');
 assert.equal(progressionFor({...e,sets:4},l,0.5).status,'keep');
});

test('motion guides exist locally and are restricted to the demonstrated variants',()=>{
 for(const id of ['mo-rdl~db','mo-gobletsquat','do-bench~db','mo-dip~bench-db','sa-ringpushup~bench-db','mo-calf']){
  const m=motionFor({id});assert.ok(m,id);
  for(const name of ['1.png','2.png','3.png',m.file]) assert.ok(statSync(new URL(`../assets/motion/${m.directory}/${name}`,import.meta.url)).size > 1000,`${id}: ${name}`);
 }
 for(const id of ['mo-rdl','mo-rdl~rdl-guided','do-bench~bench-guided','do-bench~ring-pushup','do-ringrow','mo-dip','sa-ringpushup']) assert.equal(motionFor({id}),null,id);
});
