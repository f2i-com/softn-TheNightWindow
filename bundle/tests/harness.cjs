'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const code = manifest.files.logic.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
function storage(){const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
// The audio stub answers play() synchronously with a handle, remembers whenEnded watchers so a
// test can end a clip on demand, and records every call so playback order can be asserted.
function engine(){
  const store=storage(),sounds=[],ended=new Map();let seq=0;
  const audio={
    play:(src,opts,cb)=>{const handle='h'+(++seq);sounds.push([src,opts||{},handle]);if(typeof opts==='function'){cb=opts;}if(cb)cb({played:true,handle});},
    stop:(handle,cb)=>{sounds.push(['stop',handle]);const w=ended.get(handle);ended.delete(handle);if(w)w({handle,status:'stopped'});if(cb)cb({stopped:true});},
    stopAll:(cb)=>{sounds.push(['stop']);ended.clear();if(cb)cb({stopped:0});},
    setVolume:(v,cb)=>{if(cb)cb({volume:v});},
    whenEnded:(handle,cb)=>{ended.set(handle,cb);},
  };
  const ctx=vm.createContext({localStorage:store,softn:{audio},console});
  // A new campaign deals its queue from Math.random; tests want the authored order
  // (seed 198917) unless a test overrides Math.random itself.
  vm.runInContext('Math.random=function(){return 198916.5/2147483645;};',ctx);
  vm.runInContext(code+'\n_init();',ctx);
  const endAll=()=>{for(const [handle,cb] of [...ended]){ended.delete(handle);cb({handle,status:'ended'});}};
  return {ctx,store,sounds,ended,endAll,run:(s)=>vm.runInContext(s,ctx,{timeout:30000}),get:(s)=>JSON.parse(vm.runInContext('JSON.stringify('+s+')',ctx)),set:(k,v)=>{ctx[k]=v;},code,root};
}
module.exports={engine,storage,root,code};
