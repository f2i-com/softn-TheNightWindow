'use strict';
const path=require('node:path'),{spawnSync}=require('node:child_process');
const args=['--test',...['game','content','integration'].map(n=>path.join(__dirname,n+'.test.cjs'))];
const r=spawnSync(process.execPath,args,{stdio:'inherit'});
if(r.error){console.error(r.error.message);process.exitCode=1;}else{process.exitCode=r.status===null?1:r.status;}
