/** Original synthesis score. No recordings or third-party sound assets.
 * Run: node apps/demo/bundles/TheNightWindow/assets-src/make-sfx.cjs
 * Uses the same synthesizer as existing SoftN demo games.
 */
const path = require('node:path');
const sfxLib=process.env.SOFTN_SFX_LIB||[path.resolve(__dirname,'../../tools/sfx-lib.cjs'),path.resolve(__dirname,'../../../scripts/sfx-lib.cjs')].find(p=>require('node:fs').existsSync(p));
const {RATE,rand,blank,tone,noise,writeAll} = require(sfxLib);
const sounds={};
function sound(name,seconds,draw){const b=blank(seconds);draw(b);const fade=Math.min(110,b.length/4);for(let i=0;i<fade;i++){b[i]*=i/fade;b[b.length-1-i]*=i/fade;}sounds[name]=b;}
sound('click',.09,b=>{noise(b,{len:.024,gain:.18,cutoff:.7});tone(b,{freq:840,len:.07,gain:.08});});
sound('terminal',.19,b=>{tone(b,{freq:880,len:.09,gain:.15,shape:'tri'});tone(b,{at:.075,freq:660,len:.11,gain:.11});});
sound('paper',.43,b=>{noise(b,{len:.36,gain:.34,cutoff:.65,decay:2});noise(b,{at:.24,len:.16,gain:.22,cutoff:.9});});
sound('door',1.45,b=>{noise(b,{len:1.25,gain:.4,cutoff:.025,decay:2});tone(b,{freq:p=>86-28*p,len:1.1,gain:.22,decay:2});noise(b,{at:1.1,len:.18,gain:.46,cutoff:.3});});
sound('contain',2.5,b=>{tone(b,{freq:110,len:2.1,gain:.14,decay:.6});tone(b,{freq:117,len:2.1,gain:.09,decay:.8});for(let i=0;i<3;i++){noise(b,{at:.25+i*.62,len:.2,gain:.28,cutoff:.12});}tone(b,{at:2.05,freq:330,len:.3,gain:.13});});
sound('arrival',1.1,b=>{for(let i=0;i<3;i++){noise(b,{at:i*.31,len:.12,gain:.28,cutoff:.04});tone(b,{at:i*.31,freq:92,len:.12,gain:.10});}tone(b,{at:.65,freq:420,len:.35,gain:.10});});
sound('outage',1.7,b=>{tone(b,{freq:p=>120*(1-p)+26,len:1.45,gain:.18,decay:1});noise(b,{at:.03,len:.18,gain:.18,cutoff:.6});});
sound('knock',1.25,b=>{for(let i=0;i<3;i++){tone(b,{at:.1+i*.36,freq:125,len:.15,gain:.25});noise(b,{at:.1+i*.36,len:.06,gain:.29,cutoff:.12});}});
sound('ring',1.8,b=>{for(let i=0;i<2;i++){tone(b,{at:.1+i*.8,freq:510,len:.42,gain:.11,decay:1.2});tone(b,{at:.1+i*.8,freq:670,len:.42,gain:.06,decay:1.2});}});
sound('hold',.7,b=>{tone(b,{freq:330,len:.2,gain:.15});tone(b,{at:.23,freq:440,len:.3,gain:.12});});
sound('intercom',.65,b=>{noise(b,{len:.05,gain:.3,cutoff:.6});noise(b,{at:.1,len:.4,gain:.18,cutoff:.19,decay:.8});tone(b,{at:.12,freq:310,len:.35,gain:.055});});
sound('scan',1.1,b=>{tone(b,{freq:p=>320+p*690,len:.75,gain:.1,decay:.7});tone(b,{at:.82,freq:960,len:.12,gain:.12});});
sound('camera',.5,b=>{noise(b,{len:.04,gain:.30,cutoff:.8});tone(b,{at:.05,freq:p=>320-110*p,len:.35,gain:.12});noise(b,{at:.34,len:.05,gain:.24,cutoff:.55});});
sound('alarm',2.2,b=>{tone(b,{freq:p=>310+Math.sin(p*28)*80,len:2,gain:.14,decay:.4,attack:.06});});
sound('dawn',4.5,b=>{for(const [i,f] of [130.81,196,261.63,293.66].entries()){tone(b,{at:i*.25,freq:f,len:3.5,gain:.065,attack:.35,decay:1.5});}});
// Seamless rain + ventilation: overlap-add tail into head, then rotate past the
// crossfade. Hum frequencies are integral cycles in the 8-second loop.
const n=RATE*8,k=2205,raw=new Float64Array(n+k);let lo=0,hi=0;
for(let i=0;i<raw.length;i++){const w=rand()*2;lo+=(w-lo)*.08;hi+=(w-hi)*.7;raw[i]=lo*.24+hi*.07+Math.sin(i*2*Math.PI*50/RATE)*.019+Math.sin(i*2*Math.PI*100/RATE)*.008;}
for(let i=0;i<k;i++){const p=i/k;raw[n+i]=raw[n+i]*(1-p)+raw[i]*p;}
sounds.rain=raw.slice(k,n+k);
writeAll(path.resolve(__dirname,'..'),sounds);
