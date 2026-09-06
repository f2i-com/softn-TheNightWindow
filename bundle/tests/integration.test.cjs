'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
// In this repository the registration script lives in tools/; inside a softn.com checkout it is apps/demo/scripts/.
const registerPath=[path.resolve(__dirname,'../../tools/register-night-window.cjs'),path.resolve(__dirname,'../../../scripts/register-night-window.cjs')].find(p=>fs.existsSync(p));
const {register, planRegistration, TEST_COMMAND} = require(registerPath);
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'night-window-register-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const write=(name,text)=>{const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);};
  write('apps/softn-web/public/demos/index.json', JSON.stringify([{id:'notes',file:'Notes.softn',name:'Notes',extra:'keep me',size:17}],null,2)+'\n');
  write('apps/softn-api/lib/seed.php',"<?php\nfinal class Seed {\n private const CATEGORY = [\n 'notes' => 'demos',\n ];\n private const TAGS = [\n 'notes' => 'notes,local-first',\n ];\n // untouched application code\n}\n");
  write('apps/demo/package.json',JSON.stringify({name:'@softn/demo',scripts:{test:'node existing-tests.cjs',other:'node other.cjs'}},null,2)+'\n');
  write('apps/demo/bundles/TheNightWindow/manifest.json',fs.readFileSync(path.resolve(__dirname,'../manifest.json')));
  return {root,write,read:name=>fs.readFileSync(path.join(root,name),'utf8')};
}
test('catalogue registration is idempotent and preserves unrelated entries, tags and tests',t=>{
  const f=fixture(t);assert.equal(register(f.root).length,3);assert.equal(register(f.root).length,0);
  const list=JSON.parse(f.read('apps/softn-web/public/demos/index.json'));
  assert.equal(list.length,2);assert.equal(list[0].extra,'keep me');assert.equal(list[1].id,'the-night-window');
  const pkg=JSON.parse(f.read('apps/demo/package.json'));assert.equal(pkg.scripts['test:night-window'],TEST_COMMAND);assert.equal(pkg.scripts.other,'node other.cjs');assert.equal(pkg.scripts.test,'node existing-tests.cjs && npm run test:night-window');
  const seed=f.read('apps/softn-api/lib/seed.php');assert.match(seed,/'the-night-window' => 'games'/);assert.match(seed,/'the-night-window' => 'story,horror,observation,offline'/);assert.match(seed,/untouched application code/);
  assert.ok(fs.existsSync(path.join(f.root,'.night-window-backup/apps/softn-api/lib/seed.php')));
});
test('registration refuses schema changes without partially editing shared files',t=>{
  const f=fixture(t);const before=f.read('apps/softn-web/public/demos/index.json');f.write('apps/softn-api/lib/seed.php','<?php /* a future schema */');
  assert.throws(()=>register(f.root),/Unsupported seeder/);assert.equal(f.read('apps/softn-web/public/demos/index.json'),before);assert.ok(!fs.existsSync(path.join(f.root,'.night-window-backup')));
});
test('registration refuses conflicting identifiers, category and test commands',t=>{
  const f=fixture(t);f.write('apps/softn-web/public/demos/index.json',JSON.stringify([{id:'the-night-window',file:'SomeoneElse.softn'}]));assert.throws(()=>planRegistration(f.root),/Conflicting/);
  f.write('apps/softn-web/public/demos/index.json','[]');f.write('apps/softn-api/lib/seed.php',"private const CATEGORY = ['the-night-window' => 'tools']; private const TAGS = [];");assert.throws(()=>planRegistration(f.root),/Conflicting/);
  f.write('apps/softn-api/lib/seed.php','private const CATEGORY = []; private const TAGS = [];');f.write('apps/demo/package.json',JSON.stringify({scripts:{test:'existing','test:night-window':'custom'}}));assert.throws(()=>planRegistration(f.root),/differs/);
});
test('registration records built size without deleting custom game metadata',t=>{
  const f=fixture(t);f.write('apps/softn-web/public/demos/index.json',JSON.stringify([{id:'the-night-window',file:'TheNightWindow.softn',custom:'retain'}]));f.write('apps/demo/bundles/TheNightWindow.softn','test fixture bytes');register(f.root);
  const entry=JSON.parse(f.read('apps/softn-web/public/demos/index.json'))[0];assert.equal(entry.size,18);assert.equal(entry.custom,'retain');
});
