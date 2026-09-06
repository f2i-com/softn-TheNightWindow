"""Check every enabled control in constrained STATIC templates; not native UI execution."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).parent
out=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page()
    for width in [320,390,768,1280,1440]:
        for name in ['menu','brief','desk','permit','terminal','questions','settings','confirm','rewrite','camera','notes','directory','ending']:
            page.set_viewport_size({'width':width,'height':700})
            page.set_content((root/('layout-'+name+'.html')).read_text())
            row=page.evaluate('''() => {
                const root=document.querySelector('.nw-root'), bad=[];
                const controls=[...root.querySelectorAll('button,input,textarea')].filter(e=>e.getClientRects().length&&!e.disabled);
                for(const e of controls){
                    e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
                    const r=e.getBoundingClientRect(),c=root.getBoundingClientRect();
                    const x=Math.max(r.left,c.left)+Math.min(r.width,c.width)/2;
                    const y=Math.max(r.top,c.top)+Math.min(r.height,c.height)/2;
                    const hit=document.elementFromPoint(x,y);
                    if(r.bottom<c.top || r.top>c.bottom || r.bottom<0 || r.top>innerHeight || !(hit===e||e.contains(hit)))bad.push({label:e.textContent||e.getAttribute('aria-label')||e.tagName,rect:{top:r.top,bottom:r.bottom},hit:hit?.className});
                }
                return {count:controls.length,rootHeight:root.clientHeight,rootScrollHeight:root.scrollHeight,rootScrollTop:root.scrollTop,horizontal:root.scrollWidth>root.clientWidth+1,bad};
            }''')
            row.update(width=width,snapshot=name);out.append(row)
    b.close()
(root/'scroll-results.json').write_text(json.dumps(out,indent=2))
bad=[r for r in out if r['bad'] or r['horizontal']]
print(json.dumps({'kind':'Constrained static DOM approximation, not native runtime','layouts':len(out),'controls':sum(r['count'] for r in out),'failures':bad},indent=2))
assert not bad
