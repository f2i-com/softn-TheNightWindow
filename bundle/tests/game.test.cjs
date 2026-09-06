'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {engine}=require('./harness.cjs');
const e=engine();
function fresh(){e.run('var s=nwNew("campaign",198917); nwStartShift(s);');}
function at(id){e.set('caseId',id);e.run('var s=nwNew("campaign",198917); s.cursor=NW_CAMPAIGN.findIndex(function(c){return c.id===caseId;});s.night=NW_CAMPAIGN[s.cursor].night;nwEnter(s);');}
function campaign(policy='correct'){
 e.set('policy',policy);
 e.run(`var s=nwNew("campaign",198917);var transitions=0;
 while(s.phase!=="finale" && transitions++<220){
  if(s.phase==="brief"){nwStartShift(s);}
  else if(s.phase==="desk"){
   nwInspect(s,"archive");var c=nwCaseAt(s);
   for(var j=0;j<c.nodes.length;j++){nwAsk(s,c.nodes[j].id);}
   var action=policy==="correct"?(c.truth==="hostile"?"quarantine":"admit"):policy;
   nwResolve(s,action);
  }else if(s.phase==="receipt"){nwAdvance(s);}else if(s.phase==="shiftEnd"){nwNextNight(s);}
  if(nwDecode(nwEncode(s))===null){throw Error("Save roundtrip failed in "+s.phase+" at "+s.cursor);}
 }if(s.phase!=="finale"){throw Error("Campaign stuck");}`);
 return e.get('s');
}

test('roster has 20 unique, fully authored residents and valid relationships',()=>{
 const rows=e.get('NW_RESIDENTS'),ids=rows.map(r=>r.id);assert.equal(rows.length,20);assert.equal(new Set(ids).size,20);assert.equal(new Set(rows.map(r=>r.residentId)).size,20);
 for(const r of rows){for(const k of ['name','dob','apartment','occupation','feature','household','schedule','personality','background','memory','mundane','voice','signature'])assert.ok(r[k],r.id+'/'+k);for(const id of r.relations)assert.ok(ids.includes(id),id);assert.ok(!Number.isNaN(Date.parse(r.dob)),r.dob);}
});
test('49 curated encounters, exactly seven per night, and valid dialogue graph',()=>{
 const cases=e.get('NW_CAMPAIGN');assert.equal(cases.length,49);assert.equal(new Set(cases.map(c=>c.id)).size,49);
 for(let n=1;n<=7;n++)assert.equal(cases.filter(c=>c.night===n).length,7);
 for(const c of cases){assert.ok(e.run('nwResident('+JSON.stringify(c.resident)+')!==null'));const ids=c.nodes.map(n=>n.id);assert.equal(new Set(ids).size,ids.length);for(const node of c.nodes){assert.ok(node.q&&node.a);for(const req of node.requires||[])assert.ok(ids.includes(req),c.id+'/'+req);}
  assert.ok(c.archive&&c.call&&c.hold&&c.resolution,c.id);for(const a of c.anomalies)assert.ok(e.run('nwAnomaly('+JSON.stringify(a)+')!==null'));
  if(c.memoryKey)assert.ok(c.nodes.some(n=>n.a.includes(c.memoryText)),c.id+' remembers an unheard fact');
 }
});
test('anomalies: 36 unique types, detection routes and mundane exceptions',()=>{
 const a=e.get('NW_ANOMALIES');assert.equal(a.length,36);assert.equal(new Set(a.map(x=>x.id)).size,36);
 for(const x of a){assert.ok(x.target&&x.field&&x.value&&x.detectVia.length);assert.ok(x.tier>=1&&x.tier<=3);if(x.mundaneAllowed)assert.ok(x.mundaneResolution);}
});
test('new game, guided first shift and initially gated tools',()=>{
 e.run('nwStartNew();nwBeginShift()');assert.equal(e.run('nwView.name'),'Ada Venn');assert.equal(e.run('nwView.tutorialActive'),true);assert.equal(e.run('nwView.tutorialTitle'),'Your first visitor');assert.equal(e.run('nwView.tutorialStep'),1);assert.equal(e.run('nwView.tutorialNext'),true);
 assert.equal(e.run('nwDoCall()'),undefined);assert.equal(e.run('nwSession.turn.call'),false);assert.equal(e.run('nwSession.turn.scan'),false);assert.equal(e.run('nwHasSave'),true);
});
test('guided first shift follows the player through every step, then retires itself',()=>{
 const e=engine();e.run('nwStartNew();nwBeginShift()');
 // Voice: the opening narration is queued, the tutorial follows it once it ends.
 const opening=e.sounds.filter(s=>String(s[0]).startsWith('assets/voice/narrator_'));assert.ok(opening.length>=1,'narrator introduces the visitor');
 e.endAll();assert.equal(e.run('nwView.speaking'),'Narrator');
 e.run('nwTutorialNext()');assert.equal(e.run('nwView.tutorialStep'),2);assert.equal(e.run('nwView.tutorialTitle'),'Work the checklist');
 e.run('nwCheckCompare("name")');assert.deepEqual(e.get('nwSession.turn.selected'),['card:name','record:name']);assert.equal(e.run('nwMobile'),'terminal');assert.equal(e.run('nwView.checklist[0].active'),true);assert.equal(e.run('nwView.checklist[0].state'),'agree');
 e.run('nwCheckMatch("name")');assert.equal(e.run('nwView.tutorialStep'),3);assert.equal(e.run('nwView.tutorialTitle'),'Look at the person');
 e.run('nwSetDoc("live")');assert.equal(e.run('nwView.tutorialStep'),4);
 e.run('nwQuestion("where")');assert.equal(e.run('nwView.tutorialStep'),5);assert.equal(e.run('nwView.tutorialTitle'),'File the form with head office');assert.ok(e.sounds.some(s=>String(s[0]).startsWith('assets/voice/ada_')),'Ada answers aloud');assert.equal(e.run('nwView.speaking'),'Ada Venn','guidance waits for the resident to finish');
 const queued=e.sounds.length;e.endAll();assert.equal(e.run('nwView.speaking'),'Narrator');assert.equal(e.sounds.slice(queued).filter(s=>String(s[0]).startsWith('assets/voice/narrator_')).length,1,'the next step is narrated once Ada has finished');
 // No signature before the form is filed.
 e.run('nwRequestDecision("admit")');assert.equal(e.run('nwConfirm'),'');assert.match(e.run('nwView.message'),/form 17-B/i);
 // Marking a marked row again clears it, so only the unmarked rows are ticked here.
 e.run('for(var i=0;i<NW_CHECKLIST.length;i++){if(!nwSession.turn.checklist[NW_CHECKLIST[i].id]){nwCheckMatch(NW_CHECKLIST[i].id);}}nwFileChecklist()');assert.equal(e.run('nwSession.turn.checklistSent'),true);assert.equal(e.run('nwView.tutorialStep'),6);assert.ok(e.sounds.some(s=>String(s[0]).startsWith('assets/voice/office_')),'head office acknowledges');
 e.run('nwRequestDecision("admit");nwConfirmAction()');assert.equal(e.run('nwScreen'),'receipt');assert.equal(e.run('nwView.tutorialStep'),7);assert.equal(e.run('nwView.tutorialTitle'),'Every decision has consequences');
 e.run('nwNextVisitor()');assert.equal(e.run('nwView.tutorialActive'),false);assert.equal(e.run('nwMeta.tutorialDone'),true);assert.equal(e.run('nwReadMeta(localStorage).tutorialDone'),true);assert.match(e.run('nwMessage'),/complete/i);
 // The second visitor introduces the counterfoil with a one-time tip; dismissing it is remembered.
 assert.equal(e.run('nwView.tipTitle'),'A permit error is not an identity');e.run('nwDismissTip()');assert.equal(e.run('nwView.tipTitle'),'');assert.ok(e.run('nwReadMeta(localStorage).tipsSeen.includes("n1-02-mara")'));
 // A later new game skips the guidance until it is asked for again.
 e.run('nwStartNew();nwBeginShift()');assert.equal(e.run('nwView.tutorialActive'),false);e.run('nwTutorialReset();nwStartNew();nwBeginShift()');assert.equal(e.run('nwView.tutorialActive'),true);
 // Steps already satisfied out of order are passed over together; skipping ends guidance for good.
 e.run('nwCheckMatch("dob");nwSetDoc("live");nwTutorialNext()');assert.equal(e.run('nwView.tutorialStep'),4);e.run('nwTutorialSkip()');assert.equal(e.run('nwView.tutorialActive'),false);assert.equal(e.run('nwMeta.tutorialDone'),true);
});
test('form 17-B: compare, mark, file, gate the signature, survive a reload and reach the ledger',()=>{
 const e=engine();e.run('nwStartNew();nwBeginShift();nwTutorialSkip()');
 assert.equal(e.run('nwView.checklist.length'),8);assert.equal(e.run('nwView.checklistReady'),false);assert.match(e.run('nwView.checklistProgress'),/0 of 8/);
 // Pair rows lay the two facts side by side and open the right panels; view rows open the panels.
 e.run('nwCheckCompare("feature")');assert.deepEqual(e.get('nwSession.turn.selected'),['card:feature','live:feature']);assert.equal(e.run('nwDoc'),'live');assert.ok(e.run('nwHas(nwSession.turn.seen,"live")'));
 e.run('nwCheckCompare("photo")');assert.equal(e.run('nwPanel'),'register');assert.equal(e.run('nwDoc'),'live');e.run('nwCheckCompare("permit")');assert.equal(e.run('nwDoc'),'permit');assert.equal(e.run('nwPanel'),'counterfoil');
 // Marks toggle and clear; wrong ids and marks are refused.
 e.run('nwCheckMatch("name")');assert.equal(e.run('nwSession.turn.checklist.name'),'match');e.run('nwCheckDiffers("name")');assert.equal(e.run('nwSession.turn.checklist.name'),'differs');e.run('nwCheckDiffers("name")');assert.equal(e.run('nwSession.turn.checklist.name'),undefined);
 assert.equal(e.run('nwChecklistMark(nwSession,"nope","match")'),false);assert.equal(e.run('nwChecklistMark(nwSession,"name","maybe")'),false);
 // Filing needs every row; the signature needs the filing.
 e.run('nwFileChecklist()');assert.equal(e.run('nwSession.turn.checklistSent'),false);assert.match(e.run('nwView.message'),/0 of 8/);
 e.run('nwRequestDecision("quarantine")');assert.equal(e.run('nwConfirm'),'');
 e.run('for(var i=0;i<NW_CHECKLIST.length;i++){nwCheckSet(NW_CHECKLIST[i].id,i%3===0?"differs":i%3===1?"match":"unclear");}');assert.equal(e.run('nwView.checklistReady'),true);
 // Reload keeps the marks, and a sent flag without a complete form is dropped.
 e.run('var back=nwDecode(nwEncode(nwSession))');assert.deepEqual(e.get('back.turn.checklist'),e.get('nwSession.turn.checklist'));
 e.run('var forged=nwClone(nwSession);forged.turn.checklistSent=true;forged.turn.checklist={};var forgedBack=nwDecode(nwEncode(forged))');assert.equal(e.run('forgedBack.turn.checklistSent'),false);
 const before=e.sounds.length;e.run('nwFileChecklist()');assert.equal(e.run('nwSession.turn.checklistSent'),true);assert.match(e.run('nwView.checklistProgress'),/Filed/);assert.match(e.run('nwView.checklistSummary'),/3 match · 3 differ · 2 unclear/);
 assert.ok(e.sounds.slice(before).some(s=>s[0]==='assets/sfx/printer.mp3'),'the desk printer runs');assert.equal(e.run('nwView.lastSpeaker'),'Head office');
 assert.match(e.run('nwSession.journal[nwSession.journal.length-1].title'),/FORM 17-B/);assert.equal(e.run('nwFileChecklist()'),undefined);assert.equal(e.run('nwChecklistMark(nwSession,"name","match")'),false,'a filed form is locked');
 e.run('nwRequestDecision("admit")');assert.equal(e.run('nwConfirm'),'admit');e.run('nwConfirmAction()');assert.equal(e.run('nwScreen'),'receipt');assert.match(e.run('nwView.checklistSummary'),/3 match/);
 assert.ok(e.run('nwDecode(nwEncode(nwSession))!==null'));
 // The form floats and folds; the guided shift reopens it when it needs it.
 assert.equal(e.run('nwView.formOpen'),true);e.run('nwFormToggle()');assert.equal(e.run('nwView.formOpen'),false);e.run('nwFormShow()');assert.equal(e.run('nwView.formOpen'),true);
 e.run('nwFormToggle();nwTutorialFocus({where:"checklist"});nwRefresh()');assert.equal(e.run('nwView.formOpen'),true);
 // Three pages: a finished page turns over by itself, and the tabs and buttons turn them by hand.
 e.run('nwMeta.endings=[];nwStartNew();nwBeginShift();nwTutorialSkip()');assert.equal(e.run('nwView.formPage'),1);assert.equal(e.run('nwView.formPages.length'),3);assert.equal(e.run('nwView.checklist.filter(function(r){return r.onPage;}).length'),4);
 e.run('nwCheckMatch("name");nwCheckMatch("dob");nwCheckMatch("apartment")');assert.equal(e.run('nwView.formPage'),1);e.run('nwCheckMatch("residentId")');assert.equal(e.run('nwView.formPage'),2);assert.match(e.run('nwView.formPages[0].label'),/✓/);assert.match(e.run('nwView.caption'),/turns over/);
 e.run('nwFormPagePrev()');assert.equal(e.run('nwView.formPage'),1);e.run('nwFormPageSet(3)');assert.equal(e.run('nwView.formLast'),true);assert.equal(e.run('nwView.checklist.filter(function(r){return r.onPage;}).length'),1);e.run('nwFormPageSet(9)');assert.equal(e.run('nwView.formPage'),3);
 e.run('nwFormPageSet(2);nwCheckMatch("feature");nwCheckMatch("eyes");nwCheckMatch("photo")');assert.equal(e.run('nwView.formPage'),3);e.run('nwCheckMatch("permit")');assert.equal(e.run('nwView.formPage'),3);assert.equal(e.run('nwView.checklistReady'),true);
 e.run('nwFileChecklist();nwRequestDecision("admit");nwConfirmAction();nwNextVisitor()');assert.equal(e.run('nwView.formPage'),1,'a new visitor starts on page one');
 // The outer queue uses the same form.
 e.run('nwMeta.endings=["survivor"];nwNewArcade(5)');assert.equal(e.run('nwView.checklist.length'),8);e.run('nwCheckCompare("dob")');assert.equal(e.run('nwView.checklist[1].active'),true);
});
test('tools explain themselves when locked and report their results in the desk log',()=>{
 const e=engine();e.run('nwStartNew();nwBeginShift();nwTutorialSkip()');
 assert.equal(e.run('nwView.callUnlocked'),false);e.run('nwToolLocked("call")');assert.match(e.run('nwView.message'),/night two/);e.run('nwToolLocked("scan")');assert.match(e.run('nwView.message'),/night four/);
 assert.equal(e.run('nwView.toolLog.length'),0);assert.match(e.run('nwView.holdLabel'),/2 left/);
 e.run('nwDoHold()');assert.equal(e.run('nwView.toolLog.length'),1);assert.match(e.run('nwView.toolLog[0].title'),/HOLD/);assert.match(e.run('nwView.toolLog[0].text'),/LEFT eyebrow/);assert.equal(e.run('nwView.holdLabel'),'Outer desk paper received');assert.equal(e.run('nwView.canHold'),false);
 e.run('nwSession.night=4;nwRefresh();nwDoCall();nwDoScan();nwDoCamera()');assert.equal(e.run('nwView.toolLog.length'),4);assert.deepEqual(e.get('nwView.toolLog.map(function(x){return x.title.split(" ")[0];})'),['HOLD','INTERCOM','SIGNAL','CAMERA']);
 assert.equal(e.run('nwView.terminalQuery'),'QUERY RESIDENT M17-4100');e.run('nwSetPanel("comms")');assert.match(e.run('nwView.terminalQuery'),/COMMS/);
 assert.equal(e.run('nwView.recordId'),'M17-4100');
});
test('voice lines never overlap, respect mute and voice volume, and can be replayed',()=>{
 const e=engine();e.run('nwStartNew();nwBeginShift();nwTutorialSkip();nwQuestion("where")');
 const first=e.sounds.filter(s=>String(s[0]).startsWith('assets/voice/ada_'));assert.equal(first.length,1);
 e.run('nwQuestion("home")');const stops=e.sounds.filter(s=>s[0]==='stop'&&s[1]===first[0][2]);assert.equal(stops.length,1,'the earlier line is stopped when the next begins');
 assert.equal(e.run('nwView.lastSpeaker'),'Ada Venn');assert.equal(e.run('nwView.canReplay'),true);
 const before=e.sounds.length;e.run('nwReplay()');assert.ok(e.sounds.slice(before).some(s=>String(s[0]).startsWith('assets/voice/ada_')));
 e.run('nwToggleMute()');const muted=e.sounds.length;e.run('nwQuestion("detail")');assert.ok(!e.sounds.slice(muted).some(s=>String(s[0]).startsWith('assets/voice/')),'no voice while muted');assert.equal(e.run('nwView.canReplay'),false);
 e.run('nwToggleMute();nwMeta.voice=0;');const silent=e.sounds.length;e.run('nwQuestion("follow")');assert.ok(!e.sounds.slice(silent).some(s=>String(s[0]).startsWith('assets/voice/')),'voice volume zero is silent');
 e.run('nwVoiceVolume(10);nwVoiceVolume(10)');assert.equal(e.run('nwMeta.voice'),20);assert.equal(e.run('nwReadMeta(localStorage).voice'),20);
 const clip=e.sounds.filter(s=>String(s[0]).startsWith('assets/voice/')).pop();assert.equal(clip[1].volume,0.2);
 e.run('nwMenu()');assert.equal(e.run('nwView.speaking'),'');
});
test('briefings, endings, witnesses and the outer queue are voiced from their own ids',()=>{
 const e=engine();e.run('nwStartNew()');assert.ok(e.sounds.some(s=>s[0]==='assets/voice/'+e.get('NW_VOICE["brief/1"]')+'.mp3'));
 e.endAll();assert.ok(e.sounds.some(s=>s[0]==='assets/voice/'+e.get('NW_VOICE["note/1"]')+'.mp3'),'Marr reads his note after the briefing');
 e.run('nwBeginShift();nwTutorialSkip();for(var i=0;i<NW_CHECKLIST.length;i++){nwCheckMatch(NW_CHECKLIST[i].id);}nwFileChecklist();nwRequestDecision("admit");nwConfirmAction();nwNextVisitor();nwSession.night=2;nwSession.turn.call=false;nwDoCall()');assert.ok(e.sounds.some(s=>s[0]==='assets/voice/'+e.get('NW_VOICE["call/n1-02-mara"]')+'.mp3'));
 e.run('var s=nwNew("campaign",198917);while(s.phase!=="finale"){if(s.phase==="brief")nwStartShift(s);else if(s.phase==="desk"){nwInspect(s,"archive");var c=nwCaseAt(s);for(var j=0;j<c.nodes.length;j++)nwAsk(s,c.nodes[j].id);nwResolve(s,c.truth==="hostile"?"quarantine":"admit");}else if(s.phase==="receipt")nwAdvance(s);else nwNextNight(s);}nwSession=s;nwScreen="finale";nwRoute("truth")');
 assert.ok(e.sounds.some(x=>x[0]==='assets/voice/'+e.get('NW_VOICE["ending/truth/0"]')+'.mp3'));e.run('nwSceneNext()');assert.ok(e.sounds.some(x=>x[0]==='assets/voice/'+e.get('NW_VOICE["ending/truth/1"]')+'.mp3'));
 e.run('nwMeta.endings=["truth"];nwNewArcade(99);');assert.ok(e.sounds.some(x=>x[0]==='assets/voice/'+e.get('NW_VOICE["arcade-voice/"+nwCaseAt(nwSession).resident]')+'.mp3'));
 e.run('nwQuestion("press")');assert.ok(e.sounds.some(x=>x[0]==='assets/voice/'+e.get('NW_VOICE["arcade-press/"+nwCaseAt(nwSession).resident]')+'.mp3'));
});
test('follow-up prerequisites and exclusive dialogue tone branches',()=>{
 fresh();assert.equal(e.run('nwAsk(s,"follow")'),false);assert.equal(e.run('nwAsk(s,"detail")'),true);assert.equal(e.run('nwAsk(s,"follow")'),true);assert.equal(e.run('nwAsk(s,"follow")'),false);
 assert.equal(e.run('nwAsk(s,"gentle")'),true);assert.equal(e.run('nwAsk(s,"press")'),false);assert.equal(e.run('s.relationships.ada'),1);assert.ok(e.run('nwHas(s.memories,"boats")'));
});
test('document comparison uses independent fields and cannot issue a verdict',()=>{
 at('n1-03-tomas');e.run('nwSelectFact(s,"card:feature"); nwSelectFact(s,"live:feature");');assert.match(e.run('nwComparison(s)'),/disagree/);
 assert.equal(e.run('nwPin(s)'),true);assert.equal(e.run('nwPin(s)'),false);assert.equal(e.run('s.journal.length'),1);
 e.run('nwSelectFact(s,"card:feature");nwSelectFact(s,"record:feature");');assert.equal(e.run('s.turn.selected.length'),2);
});
test('paper originals cannot be mutated by a terminal rewrite',()=>{
 at('n5-03-selene');const before=e.get('nwDocuments(nwCaseAt(s),s.turn)');e.run('nwInspect(s,"register")');const after=e.get('nwDocuments(nwCaseAt(s),s.turn)');
 assert.notEqual(before.record.apartment,after.record.apartment);assert.deepEqual(before.original,after.original);assert.deepEqual(before.card,after.card);assert.ok(e.run('s.journal.length>0'));
});
test('holding consumes a limited slot, supplies testimony, and does not finalize',()=>{
 fresh();assert.equal(e.run('nwHold(s)'),true);assert.equal(e.run('nwHold(s)'),false);assert.equal(e.run('s.phase'),'desk');assert.equal(e.run('s.holds'),1);assert.match(e.run('s.turn.transcript[0].q'),/HOLD/);
 e.run('nwResolve(s,"admit");nwAdvance(s);nwHold(s)');assert.equal(e.run('s.holds'),0);e.run('nwResolve(s,"admit");nwAdvance(s)');assert.equal(e.run('nwHold(s)'),false);
});
test('human admission is safe; repeated final clicks cannot double-count',()=>{
 fresh();assert.equal(e.run('nwResolve(s,"admit")'),true);assert.equal(e.run('nwResolve(s,"admit")'),false);assert.equal(e.run('s.correctAdmissions'),1);assert.equal(e.run('s.decisions.length'),1);assert.equal(e.run('s.presence.ada'),'inside');
});
test('hostile admission increments breach; hostile quarantine leaves real resident alive',()=>{
 at('n1-03-tomas');e.run('nwResolve(s,"admit")');assert.equal(e.run('s.breaches'),1);assert.equal(e.run('s.echoesAdmitted'),1);
 at('n1-03-tomas');e.run('nwResolve(s,"quarantine")');assert.equal(e.run('s.contained'),1);assert.equal(e.run('s.falsePositives'),0);assert.equal(e.run('s.presence.tomas'),'inside');
});
test('wrong quarantine harms residents; denial is not a universal safe button',()=>{
 fresh();e.run('nwResolve(s,"quarantine")');assert.equal(e.run('s.falsePositives'),1);assert.equal(e.run('s.presence.ada'),'quarantine');assert.equal(e.run('s.harm'),2);
 fresh();e.run('nwResolve(s,"deny")');assert.equal(e.run('s.humansDenied'),1);assert.equal(e.run('s.presence.ada'),'outside');assert.ok(e.run('s.harm>0'));
 at('n4-03-mara');e.run('nwResolve(s,"deny")');assert.equal(e.run('s.presence.mara'),'dead');assert.match(e.run('nwConsequences(s)'),/thermos/);
});
test('detained humans return under escort and denial retains custody',()=>{
 at('n2-01-tomas');e.run('s.presence.tomas="quarantine";nwEnter(s)');assert.match(e.run('s.turn.reaction'),/appeal/);e.run('nwResolve(s,"deny")');assert.equal(e.run('s.presence.tomas'),'quarantine');
});
test('relationships and consequences affect later dialogue, not only final score',()=>{
 at('n2-06-lio');e.run('s.presence.nessa="quarantine";nwEnter(s)');assert.match(e.run('s.turn.reaction'),/Mum/);
 at('n3-04-leon');e.run('s.presence.mara="dead";nwEnter(s)');assert.match(e.run('s.turn.reaction'),/thermos/);
});
test('absent witnesses become explicitly dated testimony',()=>{
 at('n2-01-tomas');e.run('s.presence.ivo="quarantine";nwCall(s)');assert.match(e.run('s.turn.transcript[0].a'),/dated message/);
});
test('appeal mechanism opens night five, cannot farm trust, and never erases harm',()=>{
 at('n5-01-victor');e.run('s.presence.ada="quarantine";s.harm=2');assert.equal(e.run('nwAppeal(s,"ada")'),true);assert.equal(e.run('nwAppeal(s,"ada")'),false);assert.equal(e.run('s.harm'),2);assert.equal(e.run('s.presence.ada'),'inside');
});
test('scanner readings overlap; no threshold is a species test',()=>{
 at('n4-02-mara');e.run('nwScan(s)');assert.match(e.run('s.turn.scanText'),/PHASE 23/);assert.equal(e.run('nwScan(s)'),false);
 at('n6-05-pavel');e.run('nwScan(s)');assert.match(e.run('s.turn.scanText'),/PHASE 82/);assert.equal(e.run('s.scans'),1);
});
test('camera and blackout lamp are gated, captioned and non-timed',()=>{
 at('n4-01-anja');e.run('nwSession=s;nwRefresh()');assert.equal(e.run('nwView.blackout'),true);assert.equal(e.run('nwLamp(s)'),true);assert.equal(e.run('nwPhotograph(s)'),true);assert.equal(e.run('nwPhotograph(s)'),false);assert.match(e.run('s.journal[0].title'),/CAMERA/);
});
test('full 49-case protective campaign traverses every phase with save roundtrips',()=>{
 const s=campaign();assert.equal(s.cursor,49);assert.equal(s.resolved,49);assert.equal(s.harm,0);assert.equal(s.breaches,0);assert.equal(s.evidence.length,14);assert.equal(s.memories.length,10);
 const routes=e.get('nwEndings(s)');for(const id of ['survivor','purge','whistleblower','coexistence','truth'])assert.ok(routes.find(x=>x.id===id).enabled,id);
});
for(const id of ['survivor','purge','whistleblower','coexistence','truth'])test('reachable ending: '+id+' has three scenes and a durable unlock',()=>{
 campaign();assert.equal(e.run('nwChooseEnding(s,'+JSON.stringify(id)+')'),true);assert.equal(e.run('s.endingStep'),0);e.run('nwEndingNext(s)');
 if(id==='truth'){assert.equal(e.run('nwEndingNext(s)'),false);e.run('nwCircuit(s,"B")');assert.equal(e.run('s.endingStep'),1);e.run('nwCircuit(s,"C")');}else{e.run('nwEndingNext(s)');}
 e.run('nwEndingNext(s);nwSession=s;nwNoteDraft=s.notes;nwPersist();nwRefresh()');assert.equal(e.run('s.phase'),'credits');assert.equal(e.run('s.ending'),id);assert.ok(e.run('nwHas(nwReadMeta(localStorage).endings,'+JSON.stringify(id)+')'));assert.ok(e.run('nwDecode(nwEncode(s))!==null'));
});
test('breach is reachable through harmful admissions; other routes are closed',()=>{
 const s=campaign('admit');assert.ok(s.breaches>=5);assert.deepEqual(e.get('nwEndings(s).map(function(r){return r.id;})'),['breach']);assert.equal(e.run('nwChooseEnding(s,"truth")'),false);assert.equal(e.run('nwChooseEnding(s,"breach")'),true);e.run('nwEndingNext(s);nwEndingNext(s);nwEndingNext(s)');assert.equal(e.run('s.ending'),'breach');
});
test('wrong circuit changes the actual final scene to evacuation',()=>{
 campaign();e.run('nwChooseEnding(s,"truth");nwEndingNext(s);nwCircuit(s,"A")');assert.equal(e.run('s.finale'),'breach');assert.equal(e.run('s.endingStep'),0);
});
test('all-deny and all-quarantine campaigns reach an ending but carry substantial harm',()=>{
 for(const action of ['deny','quarantine']){const s=campaign(action);assert.ok(s.harm>30);assert.ok(s.residents<25);assert.equal(s.phase,'finale');assert.ok(!e.get('nwEndings(s)').find(r=>r.id==='coexistence').enabled);}
});
test('save preserves mid-interview selections, journal, questions, notes and resources',()=>{
 at('n4-01-anja');e.run('nwAsk(s,"detail");nwAsk(s,"follow");nwHold(s);nwScan(s);nwSelectFact(s,"card:dob");s.notes="Compare the unaltered circuit sheet.";var restored=nwDecode(nwEncode(s));');assert.deepEqual(e.get('restored'),e.get('s'));
});
test('checksum/version/shape corruption is contained rather than crashing',()=>{
 fresh();for(const raw of ['',null,'{}','{oops','[]','null']){e.set('raw',raw);assert.equal(e.run('nwDecode(raw)'),null);}
 e.run('var bad=nwClone(s);bad.phase="teleported";');assert.equal(e.run('nwDecode(nwEncode(bad))'),null);
 e.run('bad=nwClone(s);bad.presence.ada="unknown";');assert.equal(e.run('nwDecode(nwEncode(bad))'),null);
 e.run('bad=nwClone(s);bad.cursor=49;');assert.equal(e.run('nwDecode(nwEncode(bad))'),null);
 e.run('bad=nwClone(s);bad.harm=-1;');assert.equal(e.run('nwDecode(nwEncode(bad))'),null);
 const encoded=e.run('nwEncode(s)');e.set('raw',encoded.replace('198917','198918'));assert.equal(e.run('nwDecode(raw)'),null);
});
test('backup recovery, quota error and reset are app-local',()=>{
 fresh();e.run('nwWriteSlot(localStorage,NW_SAVE_KEY,s);nwAsk(s,"where");nwWriteSlot(localStorage,NW_SAVE_KEY,s);localStorage.setItem(NW_SAVE_KEY,"broken");');assert.match(e.run('nwLoadSlot(localStorage,NW_SAVE_KEY).message'),/Recovered/);assert.ok(e.run('nwLoadSlot(localStorage,NW_SAVE_KEY).session!==null'));
 e.run('var full={getItem:function(){return null;},setItem:function(){throw Error("quota");}}');assert.match(e.run('nwWriteSlot(full,NW_SAVE_KEY,s)'),/SAVE FAILED/);
 e.run('localStorage.setItem("another-app", "untouched");nwDeleteSaves(localStorage)');assert.equal(e.store.getItem('another-app'),'untouched');assert.equal(e.run('nwLoadSlot(localStorage,NW_SAVE_KEY).session'),null);
});
test('menu confirmations, continue, settings and input events',()=>{
 e.run('nwStartNew();nwBeginShift();nwNoteChange({target:{value:"The cup had seven stars."}});nwMenu();nwContinue()');assert.equal(e.run('nwSession.notes'),'The cup had seven stars.');assert.equal(e.run('nwScreen'),'desk');
 e.run('nwRequestNew()');assert.equal(e.run('nwConfirm'),'new');e.run('nwCancel()');assert.equal(e.run('nwConfirm'),'');
 e.run('nwVolume(10);nwToggleMute();nwReduced();');assert.equal(e.run('nwMeta.reduced'),true);assert.match(e.run('nwRootClass'),/nw-reduced/);assert.equal(e.run('nwReadMeta(localStorage).muted'),true);
 e.run('nwMeta.endings=["survivor"];nwSetSeed("1.5");nwBeginArcade()');assert.match(e.run('nwMessage'),/whole number/);
 e.run('nwRequestReset();nwConfirmAction()');assert.equal(e.run('nwHasSave'),false);assert.equal(e.run('nwMeta.endings.length'),0);assert.equal(e.run('nwScreen'),'menu');
});
test('procedural cases: 10,000 deterministic valid, applicable, detectable encounters',()=>{
 const result=e.run(`(function(){var coverage={},channels={},humans=0,echoes=0,peace=0;
 for(var i=0;i<10000;i++){
  var seed=1+(i*7919)%2147483646,index=i%150,c=nwArcade(seed,index),r=nwResident(c.resident),d=nwDocuments(c,{rewritten:true});
  if(JSON.stringify(c)!==JSON.stringify(nwArcade(seed,index))){throw Error("Nondeterministic");}
  if(c.truth==="human"){humans++;}else if(c.truth==="hostile"){echoes++;if(!c.anomalies.length){throw Error("Undetectable impostor");}}else{peace++;}
  channels[c.verification.channel]=true;
  for(var j=0;j<c.detectors.length;j++){var clue=c.detectors[j],a=nwAnomaly(clue.anomaly);coverage[a.id]=true;if(!nwEligible(a,r)){throw Error("Inapplicable "+a.id);}if(clue.observed===clue.independent||!clue.independent){throw Error("No discrepancy "+a.id);}if(d[clue.source][clue.field]!==clue.observed){throw Error("Unobservable clue");}}
  if(/impersonator|actual resident is still|no amendment or replacement counterfoil/i.test(c.archive)){throw Error("Archive is a truth oracle");}
 }
 return {coverage:Object.keys(coverage).length,channels:Object.keys(channels).length,humans:humans,echoes:echoes,peace:peace};})()`);
 assert.equal(result.coverage,36);assert.equal(result.channels,3);assert.ok(result.humans>3000&&result.echoes>3000&&result.peace>100);
});
test('arcade scoring, resource renewal, independent save and >500-case bounded history',()=>{
 e.run(`var s=nwNew("arcade",123456);for(var i=0;i<510;i++){var c=nwCaseAt(s);nwResolve(s,c.truth==="hostile"?"quarantine":"admit");nwAdvance(s);}var reload=nwDecode(nwEncode(s));`);
 assert.ok(e.run('reload!==null'));assert.equal(e.run('s.decisions.length'),500);assert.equal(e.run('s.journal.length'),160);assert.equal(e.run('s.cursor'),510);assert.equal(e.run('s.streak'),510);assert.ok(e.run('s.score>51000'));assert.equal(e.run('s.holds'),2);
});
test('every campaign deals its queue afresh: nights in order, a genuine opener, pinned openers, paired cases in order',()=>{
 const cases=e.get('NW_CAMPAIGN'),ids=cases.map(c=>c.id),before=e.get('NW_ORDER_BEFORE'),firsts=e.get('NW_FIRST_VISITORS'),pinned=e.get('NW_ORDER_FIRST');
 assert.deepEqual(e.get('nwCampaignOrder(198917)'),cases.map((c,i)=>i),'the authored seed is the authored order');
 const openers=new Set(),orders=new Set();
 for(let seed=1;seed<=300;seed++){
  e.set('seed',seed);const order=e.get('nwCampaignOrder(seed)');
  assert.equal(order.length,49);assert.equal(new Set(order).size,49,'a permutation');
  const nights=order.map(i=>cases[i].night);for(let k=1;k<nights.length;k++)assert.ok(nights[k]>=nights[k-1],'nights stay in sequence for seed '+seed);
  const first=cases[order[0]];assert.ok(firsts.includes(first.id)&&first.truth==='human'&&first.anomalies.length===0,'a genuine first visitor with clean papers for seed '+seed);openers.add(first.id);
  for(const n of Object.keys(pinned)){const idx=nights.indexOf(Number(n));assert.equal(cases[order[idx]].id,pinned[n],'night '+n+' opener pinned for seed '+seed);}
  assert.equal(cases[order[48]].id,'n7-07-orin');
  const pos=id=>order.indexOf(ids.indexOf(id));for(const [a,b] of before)assert.ok(pos(a)<pos(b),a+' before '+b+' for seed '+seed);
  orders.add(order.join(','));
 }
 assert.deepEqual([...openers].sort(),['n1-01-ada','n1-06-ruth'],'the campaign opens with Ada or Ruth');assert.ok(orders.size>250,'orders differ between seeds');
 // A shuffled campaign still teaches every memory and yields every piece of evidence, and saves at every step.
 e.run('var s=nwNew("campaign",4242);var transitions=0;while(s.phase!=="finale"&&transitions++<220){if(s.phase==="brief"){nwStartShift(s);}else if(s.phase==="desk"){nwInspect(s,"archive");var c=nwCaseAt(s);for(var j=0;j<c.nodes.length;j++){nwAsk(s,c.nodes[j].id);}nwResolve(s,c.truth==="hostile"?"quarantine":"admit");}else if(s.phase==="receipt"){nwAdvance(s);}else if(s.phase==="shiftEnd"){nwNextNight(s);}if(nwDecode(nwEncode(s))===null){throw Error("Save roundtrip failed at "+s.cursor);}}');
 assert.equal(e.run('s.phase'),'finale');assert.equal(e.run('s.evidence.length'),14);assert.equal(e.run('s.memories.length'),10);assert.equal(e.run('s.night'),7);
 for(const id of ['survivor','purge','whistleblower','coexistence','truth'])assert.ok(e.get('nwEndings(s)').find(x=>x.id===id).enabled,id+' reachable on a shuffled queue');
 // A reload keeps the same order because the seed is saved with the session.
 e.run('var t=nwNew("campaign",777);nwStartShift(t);nwAsk(t,"where");nwResolve(t,"admit");nwAdvance(t);var back=nwDecode(nwEncode(t))');assert.equal(e.run('nwCaseAt(back).id'),e.run('nwCaseAt(t).id'));assert.notEqual(e.run('nwCaseAt(t).id'),'n1-02-mara','seed 777 does not follow the authored order');
 // A new game from the adapter takes a fresh seed; the harness pins Math.random to the authored one.
 e.run('nwStartNew()');assert.equal(e.run('nwSession.seed'),198917);e.run('Math.random=function(){return 0.5;};nwStartNew();');assert.notEqual(e.run('nwSession.seed'),198917);assert.ok(e.run('NW_FIRST_VISITORS.indexOf(nwCaseAt(nwSession).id)>=0'));
 e.run('Math.random=function(){return 198916.5/2147483645;};nwStartNew();');assert.equal(e.run('nwSession.seed'),198917);
});
test('no omniscient campaign truth crosses the UI projection',()=>{
 at('n1-03-tomas');e.run('nwSession=s;nwScreen="desk";nwRefresh()');const v=e.get('nwView');assert.ok(!('truth'in v));assert.ok(!('resolution'in v));assert.ok(!('anomalies'in v));assert.ok(!('residents'in v));assert.equal(v.name,'Tomas Rusk');
});
