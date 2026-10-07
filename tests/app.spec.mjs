import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
test.beforeEach(async({page})=>{page.on('pageerror',e=>console.log('APP ERROR:',e.message));});
test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus)console.log('FAILED SCREEN:',await page.locator('body').innerText());});

async function open(page) {
  await page.goto('/');
  await expect(page.getByRole('heading', {name:'Hallo, Jona'})).toBeVisible();
}
async function start(page) {
  await page.getByRole('button',{name:'Training ansehen & starten'}).click();
  await page.getByRole('button',{name:/^Training beginnen/}).click();
  await expect(page.getByLabel('Satz 1 Wiederholungen',{exact:true})).toBeVisible();
}

test('mobile navigation, autosaved drafts, undo, reload and partial finish preserve actual sets', async ({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);
  await expect(page.locator('.bottom-nav a')).toHaveCount(3);
  await page.getByRole('button',{name:'45 Min',exact:true}).click();
  await expect(page.getByRole('button',{name:'45 Min',exact:true})).toHaveAttribute('aria-pressed','true');
  await start(page);
  await page.getByLabel('Satz 1 Gewicht',{exact:true}).fill('10');
  await page.getByLabel('Satz 1 Wiederholungen',{exact:true}).fill('8');
  await page.reload();
  await expect(page.getByLabel('Satz 1 Gewicht',{exact:true})).toHaveValue('10');
  await expect(page.getByLabel('Satz 1 Wiederholungen',{exact:true})).toHaveValue('8');
  await page.getByRole('button',{name:'Satz 1 speichern',exact:true}).evaluate(button=>{button.click();button.click();});
  await expect(page.getByRole('button',{name:'Satz 1 wieder öffnen',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Satz 1 wieder öffnen',exact:true}).click();
  await expect(page.getByLabel('Satz 1 Wiederholungen',{exact:true})).toHaveValue('8');
  await page.getByRole('button',{name:'Satz 1 speichern',exact:true}).click();
  await page.getByRole('button',{name:'‹ Übersicht',exact:true}).click();
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Beenden / verkürzt speichern',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Hallo, Jona'})).toBeVisible();
  const data=await page.evaluate(async()=>{const db=await import('/src/db.js');return db.exportAllData();});
  expect(data.sessionLogs).toHaveLength(1);expect(data.sessionLogs[0].status).toBe('partial');
  expect(data.sessionLogs[0].entries['mo-pullup'].sets).toHaveLength(1);
  expect(data.sessionLogs[0].entries['mo-pullup'].sets[0].rir).toBeNull();
  expect(data.programState.currentDayOrder).toBe(1);expect(data.activeSession).toBeNull();
  await page.getByRole('link',{name:'Fortschritt',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Fortschritt',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('previous load is prefilled; increase is optional; different setup has its own history',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{
    const db=await import('/src/db.js'),{PLAN}=await import('/src/plan.js'),{buildSessionPlan}=await import('/src/training.js');
    const ex=buildSessionPlan(PLAN[0],45).exercises[0];
    await db.saveSettings({strengthMinutes:45});
    await db.setExerciseNote(ex.id,{increment:1});
    await db.saveSessionLog({id:'old',dayId:'mo',planVersion:'4.0',status:'completed',startedAt:'2026-01-01T12:00:00Z',finishedAt:'2026-01-01T13:00:00Z',entries:{[ex.id]:{exercise:ex,plannedSets:ex.sets,sets:Array.from({length:ex.sets},()=>({weightKg:10,reps:ex.reps.max,rir:null}))}}});
  });
  await page.reload();await start(page);
  await expect(page.getByLabel('Satz 1 Gewicht',{exact:true})).toHaveValue('10');
  await expect(page.getByLabel('Satz 1 Wiederholungen',{exact:true})).toHaveValue('');
  await expect(page.getByRole('region',{name:'Vorschlag für heute',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'11 kg übernehmen',exact:true}).click();
  await expect(page.getByLabel('Satz 1 Gewicht',{exact:true})).toHaveValue('11');
  await page.getByText('Aufbau und Notizen',{exact:true}).click();
  await page.getByLabel('Vergleichbarer Aufbau',{exact:true}).fill('mit anderem Band');
  await page.getByLabel('Vergleichbarer Aufbau',{exact:true}).press('Tab');
  await expect(page.getByLabel('Satz 1 Gewicht',{exact:true})).toHaveValue('');
  await expect(page.getByText('Zuletzt',{exact:true})).toHaveCount(0);
});

test('matched alternatives change exercise identity without inheriting a different load',async({page})=>{
  await open(page);await start(page);
  await page.getByRole('button',{name:/^Nächste Übung/}).click();
  await page.getByText('Passende Ersatzübung',{exact:true}).click();
  await page.getByRole('button',{name:'Kurzhantel-Bankdrücken',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Kurzhantel-Bankdrücken',exact:true})).toBeVisible();
  const active=await page.evaluate(async()=>(await import('/src/db.js')).getActiveSession());
  expect(active.planSnapshot.exercises[1].id).toBe('mo-dip~bench-db');
  expect(active.planSnapshot.exercises[1].group).toBe('chestPush');
  await expect(page.getByLabel('Satz 1 Gewicht',{exact:true})).toHaveValue('');
});

test('old active workout, notes, replacements and backup merge remain usable',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{
    const db=await import('/src/db.js'),{PLAN}=await import('/src/plan.js');
    const oldIndex=PLAN[0].blocks.flatMap(b=>b.exercises).findIndex(e=>e.id==='mo-pullup');
    await db.setProgramState({currentDayOrder:0,currentCycle:3});
    await db.setActiveSession({dayId:'mo',startedAt:'2026-01-01T12:00:00Z',currentIndex:oldIndex,entries:{'mo-pullup':{sets:[{weightKg:5,reps:6}]}}});
    await db.setExerciseNote('mo-pullup',{note:'Griff merken',nextTimeIntent:'ruhiger'});
    await db.importAllData({programState:{currentDayOrder:4,currentCycle:9},sessionLogs:[{id:'legacy',dayId:'mo',status:'completed',finishedAt:'2025-12-01T12:00:00Z',entries:{'mo-pullup':{substituteName:'Andere Übung',sets:[{weightKg:100,reps:8}]}}}]});
  });
  await page.goto('/#/workout');
  await expect(page.getByRole('button',{name:'Satz 1 wieder öffnen',exact:true})).toBeVisible();
  const data=await page.evaluate(async()=>{const db=await import('/src/db.js');return {backup:await db.exportAllData(),base:await db.getLastPerformance('mo-pullup')};});
  expect(data.backup.programState.currentCycle).toBe(3);expect(data.backup.programState.currentDayOrder).toBe(0);
  expect(data.backup.exerciseNotes[0].note).toBe('Griff merken');expect(data.base).toBeNull();
  await page.getByRole('button',{name:'‹ Übersicht',exact:true}).click();
  const count=await page.evaluate(async()=>(await import('/src/plan.js')).PLAN[0].blocks.flatMap(b=>b.exercises).length);
  await expect(page.locator('.workout-exercise-row')).toHaveCount(count);
});

test('finish is atomic and idempotent, and malformed import leaves original data intact',async({page})=>{
  await open(page);
  const result=await page.evaluate(async()=>{
    const db=await import('/src/db.js'),state=await import('/src/state.js');
    const active={sessionId:'same-session',dayId:'mo',startedAt:'2026-01-01T12:00:00Z',entries:{x:{sets:[{reps:8}]}}};
    await db.setActiveSession(active);
    await Promise.all([state.completeCurrentDay(active,'partial'),state.completeCurrentDay(active,'partial')]);
    const before=await db.exportAllData();let rejected=false;
    try{await db.importAllData({sessionLogs:[{id:'bad',dayId:'mo',entries:{x:{sets:null}}}]});}catch{rejected=true;}
    return{before,after:await db.exportAllData(),rejected};
  });
  expect(result.before.sessionLogs).toHaveLength(1);expect(result.before.activeSession).toBeNull();expect(result.before.programState.currentDayOrder).toBe(1);
  expect(result.rejected).toBe(true);expect(result.after.sessionLogs).toEqual(result.before.sessionLogs);
});

test('thumbnail opens RDL without starting a workout, plays, pauses and returns focus',async({page},info)=>{
  await open(page);await page.getByRole('button',{name:'Training ansehen & starten'}).click();
  const thumbnail=page.getByRole('button',{name:'Animation öffnen: RDL mit Kurzhanteln',exact:true});
  await thumbnail.click();
  const dialog=page.getByRole('dialog',{name:'RDL mit Kurzhanteln',exact:true});
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(async()=>(await import('/src/db.js')).getActiveSession())).toBeNull();
  await expect(dialog.getByRole('button',{name:'Pausieren',exact:true})).toHaveAttribute('aria-pressed','true');
  const img=page.locator('.motion-image');await expect(img).toBeVisible();
  await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  await dialog.getByRole('button',{name:'Pausieren',exact:true}).click();
  // The animated frame can advance on a slow runner. Reopen under reduced
  // motion to make phase navigation deterministic and verify that preference.
  await page.getByRole('button',{name:'Übungsansicht schließen',exact:true}).click();
  await expect(thumbnail).toBeFocused();
  await page.emulateMedia({reducedMotion:'reduce'});await thumbnail.click();
  await expect(dialog.getByRole('button',{name:'Abspielen',exact:true})).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'Nächste Phase',exact:true}).click();
  await expect(page.locator('.motion-caption')).toHaveText('Hüfte zurück');
  await page.getByRole('button',{name:'Nächste Phase',exact:true}).click();
  await expect(img).toHaveAttribute('src',/rdl-v2\/3\.png$/);
  await page.getByRole('button',{name:'Abspielen',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pausieren',exact:true}).last()).toHaveAttribute('aria-pressed','true');
  await expect(img).not.toHaveAttribute('src',/\/3\.png$/,{timeout:4000});
  await page.locator('.motion-controls').getByRole('button',{name:'Pausieren',exact:true}).click();
  await expect(page.locator('.motion-controls').getByRole('button',{name:'Abspielen'})).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/previews/uebung-popup-${info.project.name}.png`});
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(thumbnail).toBeFocused();
  await page.getByRole('button',{name:/^RDL mit Kurzhanteln/}).click();
  await page.getByLabel('Satz 1 Gewicht',{exact:true}).fill('12');
  await page.getByLabel('Satz 1 Wiederholungen',{exact:true}).fill('8');
  await page.getByRole('button',{name:'Animation öffnen: RDL mit Kurzhanteln',exact:true}).click();
  await page.getByRole('button',{name:'Übungsansicht schließen',exact:true}).click();
  await expect(page.getByLabel('Satz 1 Gewicht',{exact:true})).toHaveValue('12');
  await expect(page.getByLabel('Satz 1 Wiederholungen',{exact:true})).toHaveValue('8');
});

test('all plan rows and equipment variants have playable animations',async({page},info)=>{
  await open(page);await page.getByRole('link',{name:'Plan ansehen',exact:true}).click();
  const counts=await page.evaluate(async()=>{
    const {PLAN}=await import('/src/plan.js'),{buildSessionPlan,defaultMinutes}=await import('/src/training.js');
    return PLAN.reduce((sum,day)=>{const p=buildSessionPlan(day,defaultMinutes(day));return sum+p.exercises.length+p.optional.length;},0);
  });
  await expect(page.locator('.plan-exercise-media-row .exercise-thumbnail.has-motion')).toHaveCount(counts);
  const day=page.locator('.plan-day').filter({has:page.locator('.plan-day-title').filter({hasText:'Full Body B'})});
  await day.locator(':scope > summary').click();
  await day.getByRole('button',{name:'Animation öffnen: Kurzhantel-Bankdrücken',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Kurzhantel-Bankdrücken',exact:true});
  await expect(dialog).toBeVisible();
  await expect.poll(()=>dialog.locator('.motion-image').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  await page.screenshot({path:`test-results/previews/bankdruecken-${info.project.name}.png`});
  await expect(dialog.getByRole('button',{name:'Technikvideo öffnen',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Übungsansicht schließen',exact:true}).click();
  await day.getByRole('button',{name:'Animation öffnen: Step-up mit Kurzhanteln',exact:true}).click();
  await expect.poll(()=>page.getByRole('dialog').locator('.motion-image').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  await page.getByRole('button',{name:'Übungsansicht schließen',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/#/workout');
  await expect(page.getByRole('heading',{name:'Full Body A',exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('.workout-exercise-row .exercise-thumbnail img').evaluateAll(images=>images.length>0&&images.every(el=>el.complete&&el.naturalWidth>0))).toBe(true);
  await page.locator('.workout-exercise-row .exercise-thumbnail img').evaluateAll(async images=>{await Promise.all(images.map(img=>img.decode()));await new Promise(requestAnimationFrame);});
  await page.screenshot({path:`test-results/previews/uebung-vorschauliste-${info.project.name}.png`});
});

test('four neck directions are individually controllable with reduced motion',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await open(page);await page.getByRole('button',{name:'Training ansehen & starten'}).click();
  await page.getByText('Weitere Übungen bei Bedarf',{exact:true}).click();
  const thumbnail=page.locator('.exercise-thumbnail[data-exercise-id="mo-neck"]');
  await thumbnail.click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('button',{name:'Abspielen',exact:true})).toBeVisible();
  for(const direction of ['Stirn','Hinterkopf','Rechte Seite','Linke Seite']){
    await expect(dialog.locator('.motion-caption')).toContainText(direction);
    await expect.poll(()=>dialog.locator('.motion-image').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
    if(direction==='Linke Seite')await page.screenshot({path:`test-results/previews/nacken-${info.project.name}.png`});
    await dialog.getByRole('button',{name:'Nächste Phase',exact:true}).click();
  }
  await expect(dialog.locator('.motion-caption')).toContainText('Stirn');
  await dialog.getByRole('button',{name:'Übungsansicht schließen',exact:true}).click();
  await expect(thumbnail).toBeFocused();
});

test.describe('offline installation',()=>{
  test.use({serviceWorkers:'allow'});
  test('cached app shell and every animation remain available offline',async({page})=>{
    test.setTimeout(90000);
    // WebKit's emulated offline flag rejects even literal worker responses:
    // https://github.com/microsoft/playwright/issues/42775
    // Stop this test's own origin instead, and require a real worker response.
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.gif':'image/gif'};
    const server=createServer(async(req,res)=>{
      const name=new URL(req.url,'http://localhost').pathname;
      const file=join(process.cwd(),name==='/'?'index.html':name);
      try{const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin=`http://127.0.0.1:${server.address().port}`;
    try{
      await page.goto(origin);
      await expect(page.getByRole('heading',{name:'Hallo, Jona'})).toBeVisible();
      await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller),{timeout:30000}).toBe(true);
      await page.reload();
      await expect(page.getByRole('heading',{name:'Hallo, Jona'})).toBeVisible();
      server.closeAllConnections();
      await new Promise(resolve=>server.close(resolve));
      await page.evaluate(async()=>{
        const {PLAN}=await import('/src/plan.js');
        const {GENERATED_MOTIONS}=await import('/src/motionCatalog.js');
        for(const m of Object.values(GENERATED_MOTIONS)){
          for(const file of [...m.labels.map((_,i)=>`${i+1}.png`),m.file]){
            const r=await fetch(`assets/motion/${m.directory}/${file}`);
            if(!r.ok || (await r.blob()).size<1000)throw new Error(`${m.directory}/${file}`);
          }
        }
      });
      const response=await page.reload();
      expect(response.fromServiceWorker()).toBe(true);
      await expect(page.getByRole('heading',{name:'Hallo, Jona'})).toBeVisible();
      await page.getByRole('button',{name:'Training ansehen & starten'}).click();
      await page.getByRole('button',{name:'Animation öffnen: RDL mit Kurzhanteln',exact:true}).click();
      await expect.poll(()=>page.locator('.motion-image').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
      await page.getByRole('button',{name:'Nächste Phase',exact:true}).click();
      await expect.poll(()=>page.locator('.motion-image').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
    }finally{server.closeAllConnections();server.close();}
  });
});

test('three completed target sets produce a next-session recommendation without effort questions',async({page},info)=>{
  await open(page);
  await page.getByRole('button',{name:'45 Min',exact:true}).click();
  await start(page);
  await expect(page.getByText('Technik und RIR · optional',{exact:true})).toHaveCount(1);
  await page.evaluate(async()=>{const db=await import('/src/db.js');const active=await db.getActiveSession();active.planSnapshot.exercises[0].sets=3;active.entries['mo-pullup'] ||= {sets:[],drafts:{}};active.entries['mo-pullup'].plannedSets=3;await db.setActiveSession(active);});
  await page.reload();
  await page.getByLabel('Satz 1 Gewicht',{exact:true}).fill('5');
  for(let i=1;i<=3;i++){
    await page.getByLabel(`Satz ${i} Wiederholungen`,{exact:true}).fill('7');
    await page.getByRole('button',{name:`Satz ${i} speichern`,exact:true}).click();
  }
  await expect(page.getByText('Nächstes Mal: Gewicht erhöhen',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Passend',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Am Limit',exact:true})).toHaveCount(0);
  await page.locator('.set-table').evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:`test-results/previews/satzanzeige-${info.project.name}.png`});
});

test('hold timer uses prescribed seconds, survives reload and never fabricates a set',async({page},info)=>{
  await page.clock.install();await open(page);
  await page.evaluate(async()=>{
    const {setActiveSession}=await import('/src/db.js');
    const {resolveExercise,PLAN_VERSION}=await import('/src/training.js');
    await setActiveSession({sessionId:'hold-test',timerSessionId:'hold-test',dayId:'di',dayName:'Mobility',planVersion:PLAN_VERSION,startedAt:new Date().toISOString(),currentIndex:0,entries:{},planSnapshot:{exercises:[resolveExercise('di-hipflexor')],optional:[]}});
  });
  await page.goto('/#/workout');
  const card=page.getByRole('region',{name:'Halte-Timer',exact:true});
  await card.getByRole('button',{name:'30 s starten',exact:true}).click();
  await expect(card.getByRole('timer')).toHaveText('0:30');
  await card.getByRole('button',{name:'45 s starten',exact:true}).click();
  await expect(card.getByRole('timer')).toHaveText('0:45');
  await expect.poll(()=>page.locator('.exercise-thumbnail img').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  await page.screenshot({path:`test-results/previews/halte-timer-laufend-${info.project.name}.png`});
  await page.clock.runFor(2000);
  await expect(card.getByRole('timer')).toHaveText('0:43');
  await card.getByRole('button',{name:'Timer anhalten',exact:true}).click();
  await page.clock.runFor(10000);
  await expect(card.getByRole('timer')).toHaveText('0:43');
  await page.reload();
  await expect(card.getByRole('timer')).toHaveText('0:43');
  await card.getByRole('button',{name:'Timer fortsetzen',exact:true}).click();
  await page.clock.runFor(43000);
  await expect(card.getByRole('status')).toContainText('45 Sekunden abgelaufen');
  await expect(page.getByLabel('Satz 1 Haltezeit links',{exact:true})).toHaveValue('');
  await page.reload();
  await expect(card.getByRole('status')).toContainText('45 Sekunden abgelaufen');
  expect(await page.evaluate(async()=>((await (await import('/src/db.js')).getActiveSession()).entries['di-hipflexor']?.sets || []).length)).toBe(0);
  await page.screenshot({path:`test-results/previews/halte-timer-${info.project.name}.png`});
  await card.getByRole('button',{name:'30 s starten',exact:true}).click();
  await page.getByLabel('Satz 1 Haltezeit links',{exact:true}).fill('30');
  await page.getByLabel('Satz 1 Haltezeit rechts',{exact:true}).fill('30');
  await page.getByRole('button',{name:'Satz 1 speichern',exact:true}).click();
  await expect(card.getByRole('timer')).toBeHidden();
  await expect(page.getByText('Satzpause',{exact:true})).toBeVisible();
});

test('loaded exercises require kg and save an explicit convention with clear buttons',async({page},info)=>{
  await open(page);
  await page.evaluate(async()=>{
    const db=await import('/src/db.js'),{resolveExercise,PLAN_VERSION}=await import('/src/training.js');
    const ex=resolveExercise('do-bench');ex.sets=3;ex.targetSets=3;ex.core=true;
    await db.setActiveSession({sessionId:'weight-check',dayId:'do',planVersion:PLAN_VERSION,startedAt:new Date().toISOString(),entries:{},planSnapshot:{budgetMinutes:60,exercises:[ex],optional:[]}});
  });
  await page.goto('/#/workout');
  await expect(page.getByText('Gewicht je Hantel (kg)',{exact:true})).toBeVisible();
  await page.getByLabel('Satz 1 Wiederholungen',{exact:true}).fill('8');
  await page.getByRole('button',{name:'Satz 1 speichern',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Bitte das Gewicht');
  await page.getByLabel('Satz 1 Gewicht',{exact:true}).fill('10');
  await page.getByRole('button',{name:'Satz 1 speichern',exact:true}).click();
  await expect(page.getByRole('button',{name:'Satz 1 wieder öffnen',exact:true})).toHaveText('✓ Ändern');
  const set=await page.evaluate(async()=>(await (await import('/src/db.js')).getActiveSession()).entries['do-bench~db'].sets[0]);
  expect(set.weightKg).toBe(10);expect(set.weightConvention).toBe('per-dumbbell');
  await expect(page.getByRole('region',{name:'Vorschlag für heute',exact:true})).toBeVisible();
  await expect(page.getByLabel('Verfügbarer Gewichtsschritt (kg/Hantel)',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/previews/gewicht-eingabe-${info.project.name}.png`});
});

test('unilateral reps survive reload and changing the remaining budget preserves drafts',async({page},info)=>{
  await open(page);
  await page.getByRole('button',{name:'90 Min',exact:true}).click();await start(page);
  await page.getByRole('button',{name:'‹ Übersicht',exact:true}).click();
  await page.getByRole('button',{name:/^Deep Bulgarian Split Squat KH/}).click();
  await expect(page.getByLabel('Satz 1 Wiederholungen links',{exact:true})).toBeVisible();
  await page.getByLabel('Satz 1 Gewicht',{exact:true}).fill('5');
  await page.getByLabel('Satz 1 Wiederholungen links',{exact:true}).fill('10');
  await page.getByRole('button',{name:'Satz 1 speichern',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('links und rechts');
  await page.getByLabel('Satz 1 Wiederholungen rechts',{exact:true}).fill('9');
  await page.getByRole('button',{name:'Satz 1 speichern',exact:true}).click();
  await page.getByLabel('Satz 3 Wiederholungen links',{exact:true}).fill('8');
  await page.getByLabel('Satz 3 Wiederholungen rechts',{exact:true}).fill('7');
  await page.getByText('Zeitbudget ändern',{exact:true}).click();
  await page.getByRole('button',{name:'45 Min',exact:true}).click();
  await expect(page.getByLabel('Satz 3 Wiederholungen links',{exact:true})).toHaveValue('8');
  await page.reload();
  await expect(page.getByLabel('Satz 1 Wiederholungen links',{exact:true})).toHaveValue('10');
  await expect(page.getByLabel('Satz 1 Wiederholungen rechts',{exact:true})).toHaveValue('9');
  await expect(page.getByLabel('Satz 3 Wiederholungen rechts',{exact:true})).toHaveValue('7');
  const active=await page.evaluate(async()=>(await import('/src/db.js')).getActiveSession());
  expect(active.planSnapshot.budgetMinutes).toBe(45);expect(active.entries['mo-splitsquat'].sets).toHaveLength(1);
  expect(active.entries['mo-splitsquat'].sets[0].repsRight).toBe(9);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.set-table').evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:`test-results/previews/links-rechts-${info.project.name}.png`});
});

test('an explicit workout pause excludes time at home and remains paused after reload',async({page})=>{
  await page.clock.install();await open(page);await start(page);
  await page.clock.runFor(60000);
  await page.getByRole('button',{name:'Pausieren',exact:true}).click();
  await expect(page.getByText('TRAINING PAUSIERT',{exact:true})).toBeVisible();
  await page.clock.runFor(900000);await page.reload();
  await expect(page.getByText('TRAINING PAUSIERT',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:/^Training fortsetzen/}).click();
  await expect(page.getByRole('button',{name:/^Training fortsetzen/})).toBeVisible();
  await page.getByRole('button',{name:/^Training fortsetzen/}).click();
  await page.clock.runFor(60000);
  const elapsed=await page.evaluate(async()=>{const a=await(await import('/src/db.js')).getActiveSession();return(await import('/src/sessionClock.js')).activeMilliseconds(a);});
  expect(elapsed).toBeGreaterThanOrEqual(120000);expect(elapsed).toBeLessThan(130000);
  await page.getByLabel('Satz 1 Wiederholungen',{exact:true}).fill('5');
  await page.getByRole('button',{name:'Satz 1 speichern',exact:true}).click();
  await page.getByRole('button',{name:'‹ Übersicht',exact:true}).click();
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Beenden / verkürzt speichern',exact:true}).click();
  const log=await page.evaluate(async()=>(await (await import('/src/db.js')).getAllSessionLogs())[0]);
  expect(log.activeDurationSec).toBeGreaterThanOrEqual(120);expect(log.activeDurationSec).toBeLessThan(130);
  await page.goto(`/#/history/${log.id}`);await expect(page.getByText(/Min aktiv.*ohne Trainingsunterbrechungen/)).toBeVisible();
});

test('history-driven adjustment is visible and an accepted reduction only changes today',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{
    const db=await import('/src/db.js'),{resolveExercise,PLAN_VERSION}=await import('/src/training.js');
    const ex=resolveExercise('do-bench');ex.sets=3;ex.core=true;
    await db.setExerciseNote(ex.id,{increment:1});
    for(let i=0;i<2;i++)await db.saveSessionLog({id:'miss-'+i,dayId:'do',planVersion:PLAN_VERSION,status:'completed',startedAt:`2026-01-0${i+1}T12:00:00Z`,finishedAt:`2026-01-0${i+1}T13:00:00Z`,entries:{[ex.id]:{exercise:ex,plannedSets:3,sets:Array.from({length:3},()=>({weightKg:10,weightConvention:'per-dumbbell',reps:5}))}}});
    await db.setActiveSession({sessionId:'adjustment',dayId:'do',planVersion:PLAN_VERSION,startedAt:new Date().toISOString(),entries:{},planSnapshot:{budgetMinutes:60,exercises:[ex],optional:[]}});
  });
  await page.goto('/#/workout');
  await expect(page.getByRole('region',{name:'Vorschlag für heute',exact:true})).toContainText('In zwei vergleichbaren Einheiten');
  await page.getByRole('button',{name:'9 kg übernehmen',exact:true}).click();
  await expect(page.getByLabel('Satz 1 Gewicht',{exact:true})).toHaveValue('9');
  const logs=await page.evaluate(async()=>(await import('/src/db.js')).getAllSessionLogs());
  expect(logs[0].entries['do-bench~db'].sets[0].weightKg).toBe(10);
});

test('ambiguous old dumbbell kg require confirmation before prefill and recommendations',async({page})=>{
 await open(page);
 await page.evaluate(async()=>{
  const db=await import('/src/db.js'),{resolveExercise,PLAN_VERSION}=await import('/src/training.js');
  const ex=resolveExercise('do-bench');ex.sets=3;ex.core=true;
  await db.setExerciseNote(ex.id,{increment:1});
  await db.saveSessionLog({id:'ambiguous-db',dayId:'do',planVersion:'4.0',status:'completed',startedAt:'2026-01-01T12:00:00Z',finishedAt:'2026-01-01T13:00:00Z',entries:{[ex.id]:{exercise:ex,plannedSets:3,sets:Array.from({length:3},()=>({weightKg:10,reps:10}))}}});
  await db.setActiveSession({sessionId:'confirmation',dayId:'do',planVersion:PLAN_VERSION,startedAt:new Date().toISOString(),entries:{},planSnapshot:{budgetMinutes:60,exercises:[ex],optional:[]}});
 });
 await page.goto('/#/workout');
 await expect(page.getByLabel('Satz 1 Gewicht',{exact:true})).toHaveValue('');
 await expect(page.getByRole('button',{name:'11 kg übernehmen',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Frühere Werte bestätigen: kg/Hantel',exact:true}).click();
 await expect(page.getByLabel('Satz 1 Gewicht',{exact:true})).toHaveValue('10');
 await expect(page.getByRole('button',{name:'11 kg übernehmen',exact:true})).toBeVisible();
 const old=await page.evaluate(async()=>(await(await import('/src/db.js')).getAllSessionLogs())[0]);
 expect(old.entries['do-bench~db'].sets[0].weightConvention).toBeUndefined();
});

test('editing a split-sided history set keeps the other side and older common-side logs',async({page})=>{
 await open(page);
 await page.evaluate(async()=>{
  const db=await import('/src/db.js'),{resolveExercise}=await import('/src/training.js');const ex=resolveExercise('mo-splitsquat');
  await db.saveSessionLog({id:'side-history',dayId:'mo',planVersion:'4.1',status:'partial',startedAt:'2026-01-01T12:00:00Z',finishedAt:'2026-01-01T13:00:00Z',entries:{[ex.id]:{exercise:ex,sets:[{weightKg:5,weightConvention:'per-dumbbell',repsLeft:10,repsRight:9},{weightKg:5,reps:8}]}}});
 });
 await page.goto('/#/history/side-history');
 await page.getByRole('button',{name:'Bearbeiten',exact:true}).first().click();
 await page.getByLabel('Wiederholungen links',{exact:true}).fill('8');
 await page.getByRole('button',{name:'Speichern',exact:true}).click();
 const record=await page.evaluate(async()=>(await(await import('/src/db.js')).getAllSessionLogs())[0]);
 expect(record.entries['mo-splitsquat'].sets[0].repsLeft).toBe(8);expect(record.entries['mo-splitsquat'].sets[0].repsRight).toBe(9);
 expect(record.entries['mo-splitsquat'].sets[1].reps).toBe(8);expect(record.entries['mo-splitsquat'].sets[1].repsLeft).toBeUndefined();
 await page.getByRole('button',{name:'Bearbeiten',exact:true}).nth(1).click();
 await expect(page.getByText(/Dieser ältere Satz enthält einen gemeinsamen Wert/)).toBeVisible();
 await expect(page.getByLabel('Wiederholungen',{exact:true})).toHaveValue('8');
});
