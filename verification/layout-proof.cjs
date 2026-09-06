/** Static layout inspection ONLY. This is not a game, a runtime, or a ZIPP test.
 * Resolves native UI templates with a captured Node-side model projection, emits
 * non-interactive markup with the inspected components' structural/default styles,
 * and measures it in Chromium. No gameplay event handlers are put in the HTML.
 */
const fs=require('node:fs'),path=require('node:path');
const {engine,root}=require('../repository/apps/demo/bundles/TheNightWindow/tests/harness.cjs');
const {composeBundleSource}=require('./upstream/apps/demo/scripts/bundle-source-composer.cjs');
const m=JSON.parse(fs.readFileSync(root+'/manifest.json'));const files=new Map([...m.files.ui,...m.files.logic].map(f=>[f,fs.readFileSync(root+'/'+f,'utf8')]));
const composed=composeBundleSource(files,m.main,m.files.logic),css=composed.match(/<style>([\s\S]*?)<\/style>/)[1];
const src=composed.replace(/<style>[\s\S]*?<\/style>/,'').replace(/<logic>[\s\S]*?<\/logic>/,'');let pos=0;
function ws(){while(/\s/.test(src[pos]||'')&&pos<src.length)pos++;}
function balanced(open,close){const start=++pos;let depth=1,quote='';while(pos<src.length){let c=src[pos];if(quote){if(c==='\\'){pos+=2;continue;}if(c===quote)quote='';}else if(c==='"'||c==="'"||c==='`')quote=c;else if(c===open)depth++;else if(c===close&&--depth===0){let val=src.slice(start,pos);pos++;return val;}pos++;}throw Error('Unclosed expression at '+start);}
function ident(){let match=/^[@\w:-]+/.exec(src.slice(pos));if(!match)throw Error('Expected identifier '+src.slice(pos,pos+80));pos+=match[0].length;return match[0];}
function children(end){let out=[];while(pos<src.length){ws();if(src.startsWith('#end',pos)){if(end!=='each')throw Error('Unexpected #end');pos+=4;return out;}if(src.startsWith('</',pos)){pos+=2;let n=ident();ws();if(src[pos++]!=='>')throw Error('Closing syntax');if(n!==end)throw Error(n+' closes '+end);return out;}
 if(src.startsWith('#each',pos)){pos+=5;ws();const exp=balanced('(',')');const match=/^(\w+)\s+in\s+([\s\S]+)$/.exec(exp);if(!match)throw Error('each syntax');out.push({type:'each',variable:match[1],expr:match[2],children:children('each')});continue;}
 if(src[pos]==='<'){pos++;const tag=ident(),attrs={};while(pos<src.length){ws();if(src.startsWith('/>',pos)){pos+=2;out.push({type:'tag',tag,attrs,children:[]});break;}if(src[pos]==='>'){pos++;out.push({type:'tag',tag,attrs,children:children(tag)});break;}let key=ident();ws();if(src[pos++]!=='=')throw Error('Expected attribute value '+key);ws();if(src[pos]==='{')attrs[key]={expr:balanced('{','}')};else if(src[pos]==='"'||src[pos]==="'"){const q=src[pos++],start=pos;while(src[pos]!==q&&pos<src.length)pos++;attrs[key]={text:src.slice(start,pos++)};}else throw Error('Unquoted attribute');}continue;}
 if(src[pos]==='{'){out.push({type:'expr',expr:balanced('{','}')});continue;}
 const start=pos;while(pos<src.length&&src[pos]!=='<'&&src[pos]!=='{'&&!src.startsWith('#each',pos)&&!src.startsWith('#end',pos))pos++;if(pos===start)break;out.push({type:'text',text:src.slice(start,pos).replace(/\s+/g,' ')});
 }if(end)throw Error('Missing closing '+end);return out;}
const ast=children(null),htmlEscape=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const style=o=>Object.entries(o||{}).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+(typeof v==='number'&&v!==0&&!['opacity','zIndex','fontWeight','flex','lineHeight'].includes(k)?v+'px':v)).join(';');
const snapshots={
 menu:'',brief:'nwStartNew()',desk:'nwStartNew();nwBeginShift()',
 permit:'nwStartNew();nwBeginShift();nwConfirm="admit";nwConfirmAction();nwNextVisitor();nwSetDoc("permit");nwSetPanel("counterfoil");nwMobile="papers";nwRefresh()',
 terminal:'nwStartNew();nwBeginShift();nwSetMobile("terminal")',
 questions:'nwStartNew();nwBeginShift();nwQuestion("where");nwQuestion("detail");nwQuestion("follow")',
 settings:'nwOpenSettings()',
 confirm:'nwStartNew();nwBeginShift();nwRequestDecision("quarantine")',
 rewrite:'nwStartNew();nwSession.cursor=30;nwSession.night=5;nwEnter(nwSession);nwScreen="desk";nwSetPanel("register");nwSetMobile("terminal")',
 camera:'nwStartNew();nwSession.cursor=22;nwSession.night=4;nwEnter(nwSession);nwScreen="desk";nwDoCamera();nwRefresh()',
 notes:'nwStartNew();nwBeginShift();nwSetPanel("notes");nwSetMobile("terminal")',
 directory:'nwStartNew();nwBeginShift();nwSetPanel("directory");nwSetMobile("terminal")',
 ending:'nwStartNew();nwSession.cursor=49;nwSession.turn=null;nwSession.phase="finale";nwRoute("survivor");nwRefresh()'
};
const name=process.argv[2]||'menu';if(!(name in snapshots))throw Error('Unknown proof '+name);
const e=engine();e.ctx.asset=p=>'data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,p)).toString('base64');e.run(snapshots[name]+';nwMeta.reduced=true;nwRefresh();');
function render(nodes){return nodes.map(n=>{
 if(n.type==='text')return htmlEscape(n.text);if(n.type==='expr')return htmlEscape(e.run('('+n.expr+')'));
 if(n.type==='each'){const values=e.run('('+n.expr+')');return values.map(v=>{const old=e.ctx[n.variable];e.ctx[n.variable]=v;const str=render(n.children);e.ctx[n.variable]=old;return str;}).join('');}
 const attrs={};for(const [k,v]of Object.entries(n.attrs)){if(k.startsWith('@'))continue;attrs[k]=v.expr!==undefined?e.run('('+v.expr+')'):v.text;}
 if('if'in attrs&&!attrs.if)return '';let cls=attrs.className?` class="${htmlEscape(attrs.className)}"`:'';let s={...(n.tag==='Box'?{borderRadius:0,boxShadow:'none'}:{}),...(attrs.style||{})};
 if(n.tag==='Image'){s={position:'relative',display:'inline-block',width:attrs.width,height:attrs.height,borderRadius:0,overflow:'hidden',...s};return `<div${cls} style="${style(s)}"><img src="${htmlEscape(attrs.src)}" alt="${htmlEscape(attrs.alt)}" style="display:block;width:100%;height:100%;object-fit:${attrs.objectFit||'cover'};object-position:${attrs.objectPosition||'center'}"></div>`;}
 if(n.tag==='Button'){s={display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',height:'2.5rem',padding:'0.5rem 1rem',fontSize:14,border:'1px solid transparent',background:'#6366f1',color:'white',borderRadius:6,...s};return `<button${cls} style="${style(s)}"${attrs.disabled?' disabled':''}${attrs.ariaLabel?' aria-label="'+htmlEscape(attrs.ariaLabel)+'"':''}>${render(n.children)}</button>`;}
 if(n.tag==='Text'){s={fontSize:16,lineHeight:1.5,color:'var(--color-text)',...s};return `<span${cls} style="${style(s)}">${render(n.children)}</span>`;}
 if(n.tag==='Input'||n.tag==='TextArea'){return `<label style="display:block">${htmlEscape(attrs.label)}${n.tag==='TextArea'?`<textarea rows="${attrs.rows||4}" style="padding:12px">${htmlEscape(attrs.value)}</textarea>`:`<input value="${htmlEscape(attrs.value)}" style="padding:12px">`}</label>`;}
 if(!['App','Box'].includes(n.tag))throw Error('Unknown component '+n.tag);
 if(n.tag==='App'){cls=' class="softn-app softn-theme-dark"';s={height:'calc(100vh - 48px)',width:'100%',overflow:'hidden',marginTop:'48px',...s};}
 return `<div${cls} style="${style(s)}">${render(n.children)}</div>`;
}).join('');}
const proof=`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>STATIC LAYOUT PROOF — NOT SOFTN RUNTIME</title><style>html,body{margin:0;background:#101917;height:100%;overflow:hidden} ${css}</style></head><body>${render(ast)}<script>addEventListener('load',()=>{const bad=[...document.querySelectorAll('button,input,textarea')].filter(x=>x.getClientRects().length).filter(x=>{let r=x.getBoundingClientRect();return r.left < -1 || r.right>innerWidth+1});const imgs=[...document.images].filter(x=>!x.complete||x.naturalWidth===0);const p=document.createElement('pre');p.id='layout-result';p.style='display:none';p.textContent=JSON.stringify({kind:'STATIC LAYOUT PROOF, NOT NATIVE RUNTIME',width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflowControls:bad.map(x=>x.textContent),brokenImages:imgs.length,buttons:[...document.querySelectorAll('button')].filter(x=>x.getClientRects().length).length});document.body.appendChild(p);});</script></body></html>`;
const out=path.join(__dirname,'layout-'+name+'.html');fs.writeFileSync(out,proof);console.log(out);
