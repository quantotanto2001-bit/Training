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
  await page.getByText('Vorschlag für heute',{exact:true}).click();
  await page.getByRole('button',{name:'11 kg übernehmen',exact:true}).click();
  await expect(page.getByLabel('Satz 1 Gewicht',{exact:true})).toHaveValue('11');
  await page.getByText('Aufbau, Gewichtsschritt und Notizen',{exact:true}).click();
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

test('RDL quick guide plays, pauses and shows technique phases without horizontal overflow',async({page},info)=>{
  await open(page);await page.getByRole('button',{name:'Training ansehen & starten'}).click();
  await page.getByRole('button',{name:/RDL mit Kurzhanteln/}).click();
  await page.getByText('Schnellansicht · Bewegung',{exact:true}).click();
  const img=page.locator('.motion-image');await expect(img).toBeVisible();
  expect(await img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
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
  await page.locator('.motion-card').screenshot({path:`test-results/previews/rdl-geprueft-${info.project.name}.png`});
});

test.describe('offline installation',()=>{
  test.use({serviceWorkers:'allow'});
  test('cached app shell and RDL images remain available offline',async({page})=>{
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
      const response=await page.reload();
      expect(response.fromServiceWorker()).toBe(true);
      await expect(page.getByRole('heading',{name:'Hallo, Jona'})).toBeVisible();
      await page.getByRole('button',{name:'Training ansehen & starten'}).click();
      await page.getByRole('button',{name:/RDL mit Kurzhanteln/}).click();
      await page.getByText('Schnellansicht · Bewegung',{exact:true}).click();
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
