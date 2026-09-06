"""Drive The Night Window through the real SoftN web runtime and record what happened."""
import json, re, sys, time
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:1420/?open=/demos/TheNightWindow.softn"
OUT = sys.argv[2] if len(sys.argv) > 2 else "."
AUDIO_HOOK = """
window.__nwAudio = [];
(function(){
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function(){
    const el = this, entry = {src: String(el.src).slice(0, 60), loop: el.loop, volume: el.volume, duration: null, result: 'pending', t: Date.now()};
    window.__nwAudio.push(entry);
    el.addEventListener('loadedmetadata', () => { entry.duration = el.duration; }, {once: true});
    const p = origPlay.apply(this, arguments);
    if (p && p.then) p.then(() => { entry.result = 'played'; }, (e) => { entry.result = 'rejected:' + (e && e.name); });
    return p;
  };
})();
"""


CONTRAST_JS = """
() => {
  function parse(c){const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function lum(c){const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
  function blend(top,bottom){const a=top.a;return {r:top.r*a+bottom.r*(1-a),g:top.g*a+bottom.g*(1-a),b:top.b*a+bottom.b*(1-a),a:1};}
  function bgOf(el){let node=el,acc=null;while(node&&node!==document.documentElement){const cs=getComputedStyle(node);const c=parse(cs.backgroundColor);if(c&&c.a>0){acc=acc?blend(acc,c):c;if(acc.a>=1)break;}
    if(cs.backgroundImage&&cs.backgroundImage!=='none'){const g=cs.backgroundImage.match(/rgba?\([^)]+\)/);if(g){const gc=parse(g[0]);if(gc){acc=acc?blend(acc,gc):gc;break;}}}
    node=node.parentElement;}
    if(!acc)acc={r:16,g:25,b:23,a:1};return acc;}
  const out=[];
  for(const b of document.querySelectorAll('button')){const r=b.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(b).visibility==='hidden')continue;
    const fg=parse(getComputedStyle(b).color);const bg=bgOf(b);if(!fg)continue;const l1=lum(fg),l2=lum(bg);const ratio=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    out.push({text:(b.innerText||'').trim().slice(0,40),ratio:Math.round(ratio*100)/100,disabled:b.disabled,cls:b.className.slice(0,60)});}
  return out;
}
"""

def main():
    report = {"console_errors": [], "page_errors": [], "steps": [], "audio": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--autoplay-policy=no-user-gesture-required"])
        ctx = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
        ctx.add_init_script(AUDIO_HOOK)
        page = ctx.new_page()
        import atexit
        def dump():
            try:
                report["audio"] = page.evaluate("window.__nwAudio")
            except Exception as ex:
                report["audio_error"] = str(ex)
            with open(f"{OUT}/report.json", "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
        atexit.register(dump)
        report["requests"] = []
        page.on("request", lambda r: report["requests"].append(r.url) if "/api/" in r.url or "/demos/" in r.url else None)
        page.on("console", lambda m: report["console_errors"].append(m.text) if m.type in ("error",) else None)
        page.on("pageerror", lambda e: report["page_errors"].append(str(e)))

        def step(name, shot=True, full=False):
            report["steps"].append({"name": name, "t": time.time()})
            if shot:
                page.screenshot(path=f"{OUT}/shot-{len(report['steps']):02d}-{name}.png", full_page=full)

        def contrast(name):
            rows = page.evaluate(CONTRAST_JS)
            low = [r for r in rows if r['ratio'] < 4.5 and not r['disabled']]
            report.setdefault("contrast", {})[name] = {"buttons": len(rows), "low": low}
            return low

        def audio_since(n):
            entries = page.evaluate("window.__nwAudio")
            return entries[n:]

        page.goto(URL, wait_until="domcontentloaded")
        page.get_by_text("Seven nights behind a security window", exact=False).wait_for(timeout=120000)
        page.wait_for_timeout(800)
        step("menu")
        contrast("menu")

        page.get_by_role("button", name="How to play").click()
        page.get_by_text("Field guide", exact=False).wait_for()
        step("guide", full=True)
        page.get_by_role("button", name="Back to the menu").click()

        page.get_by_role("button", name=re.compile("New game")).click()
        page.get_by_text("Sign in / open the night window").wait_for()
        page.wait_for_timeout(1500)
        step("brief")
        contrast("brief")
        n0 = len(page.evaluate("window.__nwAudio"))
        page.get_by_role("button", name="Sign in / open the night window").click()
        page.get_by_text("Guided first shift", exact=False).wait_for()
        page.wait_for_timeout(1500)
        report["first_visitor"] = page.locator(".nw-window-id .nw-section-title").inner_text()
        step("desk-tutorial-1", full=True)
        report["audio_after_signin"] = audio_since(n0)
        contrast("desk")
        page.locator(".nw-crt").screenshot(path=f"{OUT}/detail-terminal.png")
        page.locator(".nw-paper").first.screenshot(path=f"{OUT}/detail-card.png")
        page.locator(".nw-tools").screenshot(path=f"{OUT}/detail-tools.png")
        page.get_by_role("button", name=re.compile("Call apartment")).click()
        page.get_by_text("reconnected on night two", exact=False).wait_for()
        page.get_by_role("button", name=re.compile("Ask the outer desk")).click()
        page.locator(".nw-desklog").wait_for()
        page.locator(".nw-tools").screenshot(path=f"{OUT}/detail-tools-log.png")

        page.get_by_role("button", name="Next", exact=True).click()
        page.locator(".nw-tutorial .nw-section-title", has_text="Work the checklist").wait_for()
        rows = page.locator(".nw-form-pop .nw-check-row")
        pop = page.locator(".nw-form-pop")
        pop.wait_for()
        before = pop.bounding_box()
        page.evaluate("document.querySelector('.nw-root').scrollTop = 600")
        page.wait_for_timeout(300)
        after = pop.bounding_box()
        report["form_fixed_while_scrolling"] = abs(before["y"] - after["y"]) < 2
        page.evaluate("document.querySelector('.nw-root').scrollTop = 0")
        pop.screenshot(path=f"{OUT}/detail-form-popover.png")
        page.get_by_role("button", name="Minimise").click()
        page.locator(".nw-form-pill").wait_for()
        report["form_minimised"] = page.locator(".nw-form-pop").count() == 0
        step("desk-form-minimised")
        page.locator(".nw-form-pill").get_by_role("button").click()
        pop.wait_for()
        rows.nth(0).get_by_role("button", name="Compare").click()
        page.locator(".nw-check-active").wait_for()
        pop.screenshot(path=f"{OUT}/detail-checklist-compare.png")
        step("desk-tutorial-3")
        rows.nth(0).get_by_role("button", name="Matches").click()
        page.locator(".nw-tutorial .nw-section-title", has_text="Look at the person").wait_for()
        page.get_by_role("button", name="Observe").click()
        page.locator(".nw-tutorial .nw-section-title", has_text="Ask a question").wait_for()
        n1 = len(page.evaluate("window.__nwAudio"))
        page.get_by_role("button", name="Where have you been?").click()
        page.locator(".nw-answer .nw-small", has_text="Where have you been?").wait_for()
        page.wait_for_timeout(1500)
        report["audio_after_question"] = audio_since(n1)
        step("desk-answer", full=True)
        page.locator(".nw-tutorial .nw-section-title", has_text="File the form with head office").wait_for()
        # The signature is gated on the form.
        page.get_by_role("button", name=re.compile("ADMIT")).click()
        page.get_by_text("requires form 17-B", exact=False).first.wait_for()
        report["gate_blocked"] = page.get_by_text("A decision, not a reflex").count() == 0
        # Pages turn over as they complete; keep marking the first unmarked row on the current page.
        turned = []
        for _ in range(12):
            pending = page.locator(".nw-form-pop .nw-check-row:not(.nw-check-marked):not(.nw-check-auto)")
            if pending.count() == 0:
                if page.get_by_role("button", name="Send form 17-B to head office").count():
                    break
                page.get_by_role("button", name="Next page ▸").click()
                page.wait_for_timeout(200)
                continue
            pending.first.get_by_role("button", name="Matches").click()
            page.wait_for_timeout(200)
            turned.append(page.locator(".nw-form-page-active").inner_text())
        report["form_pages_seen"] = turned
        pop.screenshot(path=f"{OUT}/detail-form-page3.png")
        page.get_by_role("button", name="Send form 17-B to head office").click()
        page.locator(".nw-form-foot", has_text="Filed:").wait_for()
        page.wait_for_timeout(600)
        pop.screenshot(path=f"{OUT}/detail-checklist-filed.png")
        step("desk-filed", full=True)
        page.locator(".nw-tutorial .nw-section-title", has_text="Sign a decision").wait_for()
        page.get_by_role("button", name=re.compile("ADMIT")).click()
        page.get_by_text("A decision, not a reflex").wait_for()
        step("confirm")
        page.get_by_role("button", name="Sign and admit").click()
        page.get_by_text("Signed disposition", exact=False).wait_for()
        page.get_by_text("Form 17-B filed with head office", exact=False).wait_for()
        page.locator(".nw-tutorial .nw-section-title", has_text="Every decision has consequences").wait_for()
        step("receipt", full=True)
        page.get_by_role("button", name="Close ledger entry / next visitor").click()
        page.locator(".nw-window-id .nw-section-title").wait_for()
        page.wait_for_timeout(800)
        report["second_visitor"] = page.locator(".nw-window-id .nw-section-title").inner_text()
        report["second_differs"] = report["second_visitor"] != report["first_visitor"]
        step("visitor2", full=True)
        if page.get_by_role("button", name="Got it").count():
            page.get_by_role("button", name="Got it").click()
        page.get_by_role("button", name="Settings").click()
        page.get_by_text("Voices /", exact=False).wait_for()
        step("settings", full=True)
        contrast("settings")
        page.get_by_role("button", name="Return to the game").click()
        page.wait_for_timeout(500)
        report["voicebar_present"] = page.locator(".nw-voicebar").count()
        report["voicebar_text"] = page.locator(".nw-voicebar").inner_text() if report["voicebar_present"] else ""
        if page.get_by_role("button", name="Replay line").count():
            page.get_by_role("button", name="Replay line").click()
            page.wait_for_timeout(800)

        # Phone layout.
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(800)
        step("mobile-window")
        page.get_by_role("button", name="02 Papers").click()
        page.wait_for_timeout(400)
        step("mobile-papers")
        page.get_by_role("button", name="03 Terminal").click()
        page.wait_for_timeout(400)
        step("mobile-terminal")
        contrast("mobile")
        page.set_viewport_size({"width": 1440, "height": 1000})

        # Reload: the address is now /app/<name>; without a directory API the demo must
        # come back from the catalogue, quietly.
        report["url_before_reload"] = page.url
        errors_before = len(report["console_errors"])
        requests_before = len(report["requests"])
        page.reload(wait_until="domcontentloaded")
        # The game itself restarts at its menu; the runtime must have reopened the bundle for that to show.
        page.get_by_role("button", name="Continue campaign").wait_for(timeout=120000)
        page.get_by_role("button", name="Continue campaign").click()
        page.locator(".nw-window-id .nw-section-title", has_text=report["second_visitor"]).wait_for(timeout=60000)
        page.wait_for_timeout(800)
        report["reload"] = {
            "url": page.url,
            "new_console_errors": report["console_errors"][errors_before:],
            "api_requests": [u for u in report["requests"][requests_before:] if "/api/" in u],
            "demo_requests": [u for u in report["requests"][requests_before:] if "/demos/" in u],
        }
        step("reloaded")

        # Save, menu, continue.
        page.get_by_role("button", name="Save / menu").click()
        page.get_by_role("button", name="Continue campaign").wait_for()
        page.get_by_role("button", name="Continue campaign").click()
        page.locator(".nw-window-id .nw-section-title", has_text=report["second_visitor"]).wait_for()
        step("continued")

        report["audio"] = page.evaluate("window.__nwAudio")
        browser.close()
    with open(f"{OUT}/report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    played = [a for a in report["audio"] if a["result"] == "played"]
    print("steps:", len(report["steps"]), "audio plays:", len(report["audio"]), "played:", len(played), "rejected:", len([a for a in report["audio"] if a["result"].startswith("rejected")]))
    print("console errors:", len(report["console_errors"]), "page errors:", len(report["page_errors"]))
    for e in report["console_errors"][:8]: print("  console:", e[:300])
    for e in report["page_errors"][:8]: print("  pageerror:", e[:300])
    print("after sign-in:", [(round(a['duration'] or 0, 1), a['result'], a['loop']) for a in report["audio_after_signin"]])
    for name, c in report.get("contrast", {}).items(): print("contrast", name, "buttons", c["buttons"], "low:", c["low"][:6])
    print("gate blocked signature:", report.get("gate_blocked"))
    print("visitors:", report.get("first_visitor"), "->", report.get("second_visitor"), "differs:", report.get("second_differs"))
    print("form pages seen:", report.get("form_pages_seen"))
    print("form fixed while scrolling:", report.get("form_fixed_while_scrolling"), "minimised:", report.get("form_minimised"))
    print("reload:", report.get("reload"))
    print("after question:", [(round(a['duration'] or 0, 1), a['result'], a['loop']) for a in report["audio_after_question"]])

if __name__ == "__main__":
    main()
