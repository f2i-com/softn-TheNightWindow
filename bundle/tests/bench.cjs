'use strict';
/** Diagnostic only: these are V8 model measurements, NOT ZIPP/browser timings. */
const {engine,code}=require('./harness.cjs'),{performance}=require('node:perf_hooks'),os=require('node:os');
const e=engine();
const report={environment:{engine:'Node/V8, not ZIPP',node:process.version,cpu:os.cpus()[0].model,platform:process.platform},measurements:[]};
function sample(name,fn,n=300){for(let i=0;i<30;i++)fn();const a=[];for(let i=0;i<n;i++){const start=performance.now();fn();a.push(performance.now()-start);}a.sort((a,b)=>a-b);report.measurements.push({name,iterations:n,p50_ms:+a[Math.floor(n*.5)].toFixed(4),p95_ms:+a[Math.floor(n*.95)].toFixed(4),max_ms:+a[n-1].toFixed(4)});}
sample('100 seeded case/document constructions',()=>e.run('for(var j=0;j<100;j++){nwDocuments(nwArcade(198917,j),{rewritten:true});}'),100);
e.run('nwStartNew();nwBeginShift();');
sample('Refresh current native-UI projection',()=>e.run('nwRefresh()'));
sample('Autosave + checksum/backup + UI refresh',()=>e.run('nwPersist();nwRefresh()'));
e.run(`var s=nwNew('campaign',198917);nwStartShift(s);while(s.phase!=='finale'){if(s.phase==='brief')nwStartShift(s);if(s.phase==='desk'){var c=nwCaseAt(s);nwInspect(s,'archive');for(var k=0;k<c.nodes.length;k++)nwAsk(s,c.nodes[k].id);nwResolve(s,c.truth==='hostile'?'quarantine':'admit');}if(s.phase==='receipt')nwAdvance(s);if(s.phase==='shiftEnd')nwNextNight(s);}var finalSave=nwEncode(s);`);
sample('Decode and validate completed 49-case campaign',()=>e.run('nwDecode(finalSave)'));
report.sizes={logicUtf8Bytes:Buffer.byteLength(code),firstCaseProjectionBytes:Buffer.byteLength(e.run('JSON.stringify(nwView)')),completeCampaignSaveBytes:Buffer.byteLength(e.run('finalSave')),journalEntries:e.run('s.journal.length')};
console.log(JSON.stringify(report,null,2));
