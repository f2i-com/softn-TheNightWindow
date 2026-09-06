'use strict';
/** Install/rebuild against an isolated path/schema fixture, NOT a full SoftN checkout. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const release=path.resolve(__dirname,'..'),fixture=fs.mkdtempSync(path.join(os.tmpdir(),'night-window-install-'));
function write(rel,text){const dest=path.join(fixture,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,text);}
function digest(){let all=[];function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const n=path.join(dir,f.name);if(f.isDirectory())walk(n);else all.push([path.relative(fixture,n),fs.readFileSync(n)]);}}walk(fixture);const h=crypto.createHash('sha256');for(const [n,b]of all.sort())h.update(n).update(b);return h.digest('hex');}
const log=[],checks=[];
function run(...args){const p=cp.spawnSync(process.execPath,[path.join(release,'install.cjs'),fixture,...args],{encoding:'utf8'});log.push('$ node install.cjs <isolated fixture> '+args.join(' ')+'\n'+p.stdout+p.stderr);if(p.error)throw p.error;return p;}
try{
  fs.mkdirSync(path.join(fixture,'packages/@softn/core'),{recursive:true});
  write('apps/demo/scripts/build-bundle.cjs',fs.readFileSync(path.join(__dirname,'upstream/apps/demo/scripts/build-bundle.cjs')));
  write('apps/demo/package.json',JSON.stringify({name:'@softn/demo',scripts:{test:'node existing-test.cjs',keep:'echo original'}},null,2));
  write('apps/softn-api/lib/seed.php',"<?php\nclass Fixture {\n private const CATEGORY = ['notes' => 'demos'];\n private const TAGS = ['notes' => 'notes'];\n}\n");
  write('apps/softn-web/public/demos/index.json',JSON.stringify([{id:'notes',file:'Notes.softn',name:'Notes',custom:'retain'}]));
  const before=digest();assert.equal(run('--dry-run').status,0);assert.equal(digest(),before);checks.push('dry-run changed no files');
  const installed=run();assert.equal(installed.status,0);assert.match(installed.stdout,/# tests 45/);assert.match(installed.stdout,/# fail 0/);checks.push('install + captured upstream rebuild + all 45 model/content/integration tests passed');
  const canonical=fs.readFileSync(path.join(fixture,'apps/demo/bundles/TheNightWindow.softn'));
  assert.ok(canonical.equals(fs.readFileSync(path.join(release,'repository/apps/demo/bundles/TheNightWindow.softn'))));checks.push('installed rebuild matches release bundle byte-for-byte');
  const after=digest();assert.equal(run().status,0);assert.equal(digest(),after);checks.push('second install is idempotent');
  write('apps/demo/bundles/TheNightWindow/README.md','user edits must be preserved');const conflict=digest();assert.notEqual(run().status,0);assert.equal(digest(),conflict);checks.push('conflicting source refuses without changes');
  assert.equal(run('--replace').status,0);const backups=fs.readdirSync(path.join(fixture,'.night-window-backup')).filter(s=>s.startsWith('replaced-'));assert.ok(backups.length);assert.equal(fs.readFileSync(path.join(fixture,'.night-window-backup',backups[0],'apps/demo/bundles/TheNightWindow/README.md'),'utf8'),'user edits must be preserved');checks.push('--replace retains differing user file backup');
  const entry=JSON.parse(fs.readFileSync(path.join(fixture,'apps/softn-web/public/demos/index.json')));assert.equal(entry[0].custom,'retain');assert.equal(entry.filter(x=>x.id==='the-night-window').length,1);assert.equal(entry.find(x=>x.id==='the-night-window').size,canonical.length);checks.push('other catalogue entries preserved; game metadata matches actual bytes');
  const result={kind:'Installer fixture, not a full repository/native build',passed:true,checks};fs.writeFileSync(path.join(__dirname,'installer-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{fs.writeFileSync(path.join(__dirname,'installer-test.log'),log.join('\n'));fs.rmSync(fixture,{recursive:true,force:true});}
