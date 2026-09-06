'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {engine,root,code} = require('./harness.cjs');
const e = engine(), m = JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
function walk(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(path.join(dir,f.name)):[path.join(dir,f.name)]);}
function isMp3(b){return b.toString('ascii',0,3)==='ID3'||(b[0]===0xff&&(b[1]&0xe0)===0xe0);}
test('manifest enumerates every deployed asset and imports only existing relative source files',()=>{
  const listed=[m.main,m.icon,...m.files.ui,...m.files.logic,...m.files.assets];
  for(const f of listed){assert.ok(!f.includes('..')&&!path.isAbsolute(f),f);assert.ok(fs.existsSync(path.join(root,f)),f);}
  const actual=walk(path.join(root,'assets')).map(f=>path.relative(root,f).replace(/\\/g,'/')).sort();assert.deepEqual(m.files.assets.slice().sort(),actual);
  assert.equal(actual.filter(f=>!f.startsWith('assets/voice/')).length,326,'326 art and sound assets besides the voice clips');
  for(const f of m.files.ui){const source=fs.readFileSync(path.join(root,f),'utf8');for(const match of source.matchAll(/(?:src|from)="(\.[^"]+)"/g))assert.ok(fs.existsSync(path.resolve(root,path.dirname(f),match[1])),match[1]);}
  assert.equal(new Set(m.files.logic).size,13);assert.ok(m.files.logic.indexOf('logic/checklist.logic')>m.files.logic.indexOf('logic/documents.logic'));assert.equal(m.files.logic[m.files.logic.length-1],'logic/main.logic');assert.ok(m.files.logic.indexOf('logic/voice.logic')>m.files.logic.indexOf('logic/tutorial.logic'));
  assert.equal(m.config.execution,'main');assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'permission.json'))).permissions,{});
});
test('all 300 resident portrait variants and six ending scenes resolve locally',()=>{
  const variants=['base','eye','mole','scar','pupil','ear','hand','reflection','shadow','teeth','temperature','bandage','open','defensive','anxious'];
  for(const r of e.get('NW_RESIDENTS'))for(const v of variants)assert.ok(fs.existsSync(path.join(root,'assets/portraits',r.id,v+'.svg')),r.id+'/'+v);
  assert.equal(walk(path.join(root,'assets/portraits')).length,300);
  for(const id of ['sealed','ward','rain','radio','garden','dawn','title'])assert.ok(fs.existsSync(path.join(root,'assets/scenes',id+'.svg')),id);
});
test('SVG assets are self-contained and have no executable or external content',()=>{
  for(const file of walk(path.join(root,'assets')).filter(f=>f.endsWith('.svg'))){const s=fs.readFileSync(file,'utf8');assert.match(s,/<svg\b/);assert.match(s,/viewBox=/);assert.doesNotMatch(s,/<(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']https?:|url\(\s*https?:/i,file);}
});
test('seventeen sound effects: sixteen MP3 one-shots and a seamless PCM rain bed that the adapter references correctly',()=>{
  const files=walk(path.join(root,'assets/sfx'));assert.equal(files.length,17);
  const names=files.map(f=>path.basename(f)).sort();
  assert.deepEqual(names,['alarm.mp3','arrival.mp3','camera.mp3','click.mp3','contain.mp3','dawn.mp3','door.mp3','hold.mp3','intercom.mp3','knock.mp3','outage.mp3','paper.mp3','printer.mp3','rain.wav','ring.mp3','scan.mp3','terminal.mp3']);
  for(const file of files){const b=fs.readFileSync(file);
    if(file.endsWith('.mp3')){assert.ok(isMp3(b),file);assert.ok(b.length>3000&&b.length<200000,file+' size '+b.length);continue;}
    assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(4),b.length-8);assert.equal(b.toString('ascii',8,12),'WAVE');assert.equal(b.readUInt16LE(20),1);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),22050);assert.equal(b.readUInt16LE(34),16);assert.equal(b.readUInt32LE(40),b.length-44);
    let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));assert.ok(peak>100&&peak<32767,file+' peak '+peak);
    const seconds=(b.length-44)/2/22050;assert.ok(seconds>=15&&seconds<=22,'rain bed length '+seconds);
    assert.ok(Math.abs(b.readInt16LE(44)-b.readInt16LE(b.length-2))<6000,'Rain seam should not be an impulse');
  }
  // Every sound the adapter plays exists with the extension the adapter uses.
  for(const name of ['click','terminal','paper','door','contain','arrival','outage','knock','ring','hold','intercom','scan','camera','alarm','dawn','printer'])assert.equal(e.run('nwSfxFile('+JSON.stringify(name)+')'),'assets/sfx/'+name+'.mp3');
  assert.equal(e.run('nwSfxFile("rain")'),'assets/sfx/rain.wav');
  for(const match of code.matchAll(/nwPlay\("(\w+)"\)/g))assert.ok(names.includes(match[1]+'.mp3')||match[1]==='rain','nwPlay references a missing sound: '+match[1]);
});
test('every scripted line has a recorded voice clip and every clip is a real MP3 that is referenced',()=>{
  const voice=e.get('NW_VOICE'),ids=Object.keys(voice),files=walk(path.join(root,'assets/voice')).map(f=>path.basename(f,'.mp3'));
  assert.equal(e.get('NW_VOICE_COUNT'),ids.length);assert.ok(ids.length>=500,'voiced ids '+ids.length);
  const keys=new Set(Object.values(voice));
  for(const key of keys)assert.ok(files.includes(key),'missing clip '+key);
  for(const key of files)assert.ok(keys.has(key),'orphan clip '+key);
  for(const key of files){const b=fs.readFileSync(path.join(root,'assets/voice',key+'.mp3'));assert.ok(isMp3(b),key);assert.ok(b.length>2000&&b.length<400000,key+' size '+b.length);assert.match(key,/^(narrator|marr|[a-z]+)_[0-9a-f]{8}$/);}
  // Complete coverage of the campaign script, briefings, endings, tutorial and tips.
  const cases=e.get('NW_CAMPAIGN'),nights=e.get('NW_NIGHTS'),endings=e.get('NW_ENDING_DEFS'),tutorial=e.get('NW_TUTORIAL'),tips=e.get('NW_TIPS'),residents=e.get('NW_RESIDENTS');
  for(const c of cases){assert.ok(voice['opening/'+c.id],c.id);assert.ok(voice['call/'+c.id],c.id);for(const n of c.nodes){assert.ok(voice['reply/'+c.id+'/'+n.id],c.id+'/'+n.id);assert.ok(voice['reply/'+c.id+'/'+n.id].startsWith(c.resident+'_'),'wrong speaker for '+c.id+'/'+n.id);}}
  for(let i=1;i<=nights.length;i++){assert.ok(voice['brief/'+i].startsWith('narrator_'));assert.ok(voice['note/'+i].startsWith('marr_'));assert.ok(voice['incident/'+i]);}
  for(const d of endings)for(let i=0;i<3;i++)assert.ok(voice['ending/'+d.id+'/'+i],d.id+'/'+i);
  for(const s of tutorial)assert.ok(voice['tutorial/'+s.id],s.id);for(const t of tips)assert.ok(voice['tip/'+t.id],t.id);
  for(const r of residents)for(const k of ['arcade-voice','arcade-gentle','arcade-press'])assert.ok(voice[k+'/'+r.id].startsWith(r.id+'_'),k+'/'+r.id);
  assert.ok(voice.finale);for(let i=0;i<e.get('NW_OFFICE_LINES').length;i++)assert.ok(voice['office/'+i].startsWith('office_'),'office/'+i);
  // Every id the adapter can ask for resolves, and unknown ids are harmless.
  assert.equal(e.run('nwVoiceKey("no/such/line")'),'');assert.equal(e.run('nwVoiceKey("finale")'),voice.finale);
  const total=files.reduce((n,k)=>n+fs.statSync(path.join(root,'assets/voice',k+'.mp3')).size,0);assert.ok(total<26*1024*1024,'voice clips must leave the bundle under the runtime’s 32 MB remote limit: '+total);
});
test('every UI action names a real function; no per-frame VM or external network game path',()=>{
  const all=m.files.ui.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
  for(const x of all.matchAll(/@\w+=\{(\w+)/g))assert.equal(e.run('typeof '+x[1]),'function',x[1]);
  assert.doesNotMatch(code,/\b(?:setInterval|requestAnimationFrame|fetch|XMLHttpRequest|eval)\s*\(/);assert.doesNotMatch(all,/<(?:iframe|Canvas|Loop|WebView|Script)\b/);
  assert.match(all,/prefers-reduced-motion/);assert.match(all,/max-width:740px/);assert.match(all,/focus-visible/);
  // The photograph on file belongs to the terminal record, never to the card the visitor hands over.
  const desk=fs.readFileSync(path.join(root,'ui/desk.ui'),'utf8'),term=fs.readFileSync(path.join(root,'ui/terminal.ui'),'utf8');
  assert.ok(term.includes('nwView.referencePortrait'),'terminal shows the record photograph');assert.ok(!/nwDoc === "card"[\s\S]*?referencePortrait[\s\S]*?nwDoc === "permit"/.test(desk),'the card carries no photograph');
  for(const key of ['tutorialActive','tutorialTitle','tipTitle','panelHint','docHint','speaking','lastSpeaker','canReplay','guide','voice','toolLog','holdLabel','terminalQuery','checklist','checklistAuto','checklistReady','checklistSent','checklistProgress','checklistSummary','customPair','formOpen','formPage','formPages','formPageDone','formLast'])assert.ok(all.includes('nwView.'+key),'UI does not use nwView.'+key);
});
test('resident lookup tolerates apartment punctuation and never exposes secrets',()=>{
  e.run('nwDirectorySearch("C041")');assert.equal(e.run('nwView.directory.length'),1);assert.equal(e.run('nwView.directory[0].id'),'ada');
  e.run('nwDirectorySelect("ada")');assert.doesNotMatch(e.run('nwView.directoryDetails'),/penny|Lucet/);
});
test('backup recovery also works with a missing primary key, and saves stay bounded',()=>{
  e.run('var s=nwNew("campaign",198917);nwStartShift(s);nwWriteSlot(localStorage,NW_SAVE_KEY,s);nwAsk(s,"where");nwWriteSlot(localStorage,NW_SAVE_KEY,s);localStorage.removeItem(NW_SAVE_KEY);');assert.ok(e.run('nwLoadSlot(localStorage,NW_SAVE_KEY).session!==null'));assert.match(e.run('nwLoadSlot(localStorage,NW_SAVE_KEY).message'),/Recovered/);
  e.run('nwSession=s;nwScreen="desk";nwRefresh()');assert.ok(Buffer.byteLength(e.run('JSON.stringify(nwView)'))<40000);assert.ok(Buffer.byteLength(e.run('nwEncode(s)'))<300000);
});

test('returning from menu preserves unsaved campaign and arcade decisions after quota failure',()=>{
  const e=engine();e.run('nwStartNew();nwBeginShift();nwQuestion("where")');
  e.store.setItem=()=>{throw Error('quota');};
  e.run('nwQuestion("detail");nwMenu();nwContinue()');
  assert.equal(e.run('nwSession.turn.asked.includes("detail")'),true);
  assert.equal(e.run('nwScreen'),'desk');
  assert.match(e.run('nwSaveStatus'),/could not be saved|SAVE FAILED/);
  e.run('nwMeta.endings=["survivor"];nwNewArcade(17);nwQuestion("where");nwMenu();nwContinueArcade()');
  assert.equal(e.run('nwSession.mode'),'arcade');
  assert.equal(e.run('nwSession.turn.asked.includes("where")'),true);
  assert.equal(e.run('nwScreen'),'desk');
});
