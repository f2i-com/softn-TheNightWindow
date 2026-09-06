"""Measure non-interactive snapshots of native templates, NOT a SoftN playtest."""
from pathlib import Path
import json, subprocess
from playwright.sync_api import sync_playwright
root = Path(__file__).parent
names = ['menu','brief','desk','permit','terminal','questions','settings','confirm','rewrite','camera','notes','directory','ending']
for name in names:
    subprocess.run(['node', str(root/'layout-proof.cjs'), name], check=True, capture_output=True)
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        timeout=15000, args=['--no-sandbox','--disable-dev-shm-usage'])
    page = browser.new_page(viewport={'width':1440,'height':1000})
    for width in [320,390,768,1280,1440]:
        page.set_viewport_size({'width':width,'height':900})
        for name in names:
            page.set_content((root/('layout-'+name+'.html')).read_text(), timeout=5000)
            page.wait_for_selector('#layout-result', state='attached')
            report = json.loads(page.locator('#layout-result').text_content())
            report['snapshot'] = name
            report.update(page.evaluate('''() => ({shortControls: [...document.querySelectorAll('button,input,textarea')].filter(e=>e.getClientRects().length).filter(e=>e.getBoundingClientRect().height<43.5).map(e=>e.textContent),animated: [...document.querySelectorAll('*')].filter(e=>getComputedStyle(e).animationName!=='none').length})'''))
            results.append(report)
            if (width,name) in [(1440,'menu'),(1440,'desk'),(390,'desk'),(390,'permit'),(390,'terminal'),(1440,'camera'),(768,'ending')]:
                page.screenshot(path=str(root/f'layout-proof-{name}-{width}.png'),full_page=True)
    browser.close()
(root/'layout-results.json').write_text(json.dumps(results,indent=2))
bad=[r for r in results if r['scrollWidth']>r['width'] or r['overflowControls'] or r['brokenImages'] or r['shortControls'] or r['animated']]
print(json.dumps({'kind':'Static component-structure approximation, not SoftN runtime','measurements':len(results),'failures':bad},indent=2))
assert not bad
