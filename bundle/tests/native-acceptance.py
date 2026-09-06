#!/usr/bin/env python3
"""Acceptance driver for a REAL running SoftN web runtime, never a replacement host.

Requires Python + Playwright and an installed Chromium. Example from repo root:
  python apps/demo/bundles/TheNightWindow/tests/native-acceptance.py \
    --url 'http://localhost:4173/web/?open=/demos/TheNightWindow.softn'

This driver was syntax-checked, but NOT executed against SoftN in this release.
It creates a disposable browser context. No existing browser saves are touched.
Campaign truth is read from source for test expectations only, never injected.
"""
import argparse
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent


def campaign():
    text = (ROOT / 'logic/campaign.logic').read_text(encoding='utf-8')
    return json.loads(text[text.index('['):text.rfind(']') + 1])


def play(page, checks, route):
    game = page.locator('.nw-root')
    expect(game).to_be_visible(timeout=90000)
    game.get_by_role('button', name='New game', exact=True).click()
    confirm = game.locator('.nw-confirm button').first
    if confirm.is_visible():
        confirm.click()
    cases = campaign()
    for i, case in enumerate(cases):
        if i % 7 == 0:
            game.get_by_role('button', name='Sign in / open the night window', exact=True).click()
        expect(game.locator('.nw-window-id .nw-section-title')).to_be_visible()
        checks.append({'case': case['id'], 'route': route, 'stage': 'visitor-visible'})
        if i == 0:
            # Cross-source selections are made through native UI buttons.
            game.get_by_role('button', name='Resident card', exact=True).click()
            game.locator('.nw-paper .nw-fact').first.click()
            game.get_by_role('button', name='Register', exact=True).click()
            game.locator('.nw-term .nw-fact').first.click()
            game.get_by_role('button', name='Pin comparison to notebook', exact=True).click()
            game.get_by_role('button', name=re.compile('^Ⅱ HOLD')).click()
            expect(game.get_by_role('button', name='HELD / INVESTIGATE', exact=True)).to_be_disabled()
        lamp = game.get_by_role('button', name='Switch on battery lamp', exact=True)
        if lamp.is_visible():
            lamp.click()
        game.get_by_role('button', name='Return slip', exact=True).click()
        game.get_by_role('button', name='Observe', exact=True).click()
        archive = game.get_by_role('button', name='Archive', exact=True)
        if archive.is_enabled():
            archive.click()
        else:
            game.get_by_role('button', name='Counterfoil', exact=True).click()
        for label in ['Call apartment', 'Take still']:
            tool = game.get_by_role('button', name=label, exact=True)
            if tool.is_visible() and tool.is_enabled():
                tool.click()
        scanner = game.get_by_role('button', name=re.compile('^Scan ·'))
        if scanner.is_visible() and scanner.is_enabled():
            scanner.click()
        # All accessible authored neutral/gentle branches, with a finite guard.
        for _ in range(12):
            available = game.locator('.nw-question-list button:not(.nw-press)')
            if available.count() == 0:
                break
            q = available.first.inner_text()
            available.first.click()
            expect(game.get_by_role('button', name=q, exact=True)).to_have_count(0)
        else:
            raise AssertionError('Dialogue failed to consume an available node')
        if i == 1:
            name = game.locator('.nw-window-id .nw-section-title').inner_text()
            game.get_by_role('button', name='Save / menu', exact=True).click()
            page.reload(wait_until='domcontentloaded')
            expect(game).to_be_visible(timeout=90000)
            game.get_by_role('button', name='Continue campaign', exact=True).click()
            expect(game.locator('.nw-window-id .nw-section-title')).to_have_text(name)
            checks.append({'case': case['id'], 'check': 'reload-continue-native'})
        if i == 2:
            page.set_viewport_size({'width': 390, 'height': 844})
            for tab in ['02 Papers', '03 Terminal', '01 Window']:
                game.get_by_role('button', name=tab, exact=True).click()
            assert game.evaluate('(e) => e.scrollWidth <= e.clientWidth + 1'), 'Mobile horizontal overflow'
            page.set_viewport_size({'width': 1440, 'height': 1000})
            checks.append({'check': 'native-mobile-tabs-and-width'})
        choice = 'QUARANTINE' if case['truth'] == 'hostile' or route == 'purge' else 'ADMIT'
        if i == 3 and route != 'purge':
            choice = 'DENY'  # Deliberate human rejection exercises consequences.
        game.locator('.nw-actions').get_by_role('button', name=re.compile(choice)).click()
        expect(game.locator('.nw-confirm')).to_be_visible()
        game.locator('.nw-confirm button').first.click()
        expect(game.get_by_role('button', name='Close ledger entry / continue', exact=True)).to_be_visible()
        game.get_by_role('button', name='Close ledger entry / continue', exact=True).click()
        if i % 7 == 6 and i != len(cases) - 1:
            game.get_by_role('button', name='Read the next shift’s briefing', exact=True).click()
    title = 'Countersign the administrative sweep' if route == 'purge' else 'Keep the perimeter; protect the shelter'
    game.locator('.nw-route').filter(has=game.get_by_text(title, exact=True)).get_by_role('button').click()
    for _ in range(3):
        game.locator('.nw-finale-copy button').first.click()
    expect(game.get_by_text('Ending retained / the outer queue is unlocked', exact=True)).to_be_visible()
    game.get_by_role('button', name='Return to menu / ending collection', exact=True).click()
    checks.append({'check': 'native-campaign-ending', 'ending': route})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True, help='Real SoftN runtime URL opening the built bundle')
    parser.add_argument('--out', default='night-window-native-results')
    parser.add_argument('--headed', action='store_true')
    parser.add_argument('--chromium', help='Optional system Chromium executable path')
    args = parser.parse_args()
    if not args.url.startswith(('http://', 'https://')):
        parser.error('--url must identify the real http(s) SoftN runtime')
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    checks, errors = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed, **({'executable_path': args.chromium} if args.chromium else {}))
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        page = context.new_page()
        page.set_default_timeout(20000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            page.goto(args.url, wait_until='domcontentloaded')
            game = page.locator('.nw-root')
            expect(game).to_be_visible(timeout=90000)
            game.get_by_role('button', name='Settings', exact=True).click()
            game.get_by_role('button', name='Decrease master volume by ten percent', exact=True).click()
            game.get_by_role('button', name='Reduce motion and disable transitions', exact=True).click()
            game.get_by_role('button', name='Mute all sound', exact=True).click()
            expect(game.get_by_text('Master volume / 35%', exact=True)).to_be_visible()
            game.get_by_role('button', name='Return to the game', exact=True).click()
            play(page, checks, 'survivor')
            play(page, checks, 'purge')
            game.get_by_role('button', name='Start outer queue', exact=True).click()
            expect(game.locator('.nw-actions')).to_be_visible()
            game.locator('.nw-actions').get_by_role('button', name=re.compile('ADMIT')).click()
            game.locator('.nw-confirm button').first.click()
            game.get_by_role('button', name='Close ledger entry / continue', exact=True).click()
            game.get_by_role('button', name='Save / menu', exact=True).click()
            page.reload(wait_until='domcontentloaded')
            expect(game).to_be_visible(timeout=90000)
            game.get_by_role('button', name='Continue queue', exact=True).click()
            checks.append({'check': 'native-arcade-save-reload'})
            page.screenshot(path=str(out / 'native-arcade.png'))
            game.get_by_role('button', name='Settings', exact=True).click()
            expect(game.get_by_text('Master volume / 35%', exact=True)).to_be_visible()
            expect(game.get_by_role('button', name='Reduced motion on / enable animation', exact=True)).to_be_visible()
            game.get_by_role('button', name='Reset save…', exact=True).click()
            game.get_by_role('button', name='Erase all game data', exact=True).click()
            expect(game.get_by_role('button', name='Continue campaign', exact=True)).to_have_count(0)
            expect(game.get_by_role('button', name='Continue queue', exact=True)).to_have_count(0)
            checks.append({'check': 'native-settings-persistence-and-reset'})
            if errors:
                raise AssertionError('Browser errors: ' + '\n'.join(errors))
        except Exception as error:
            page.screenshot(path=str(out / 'native-failure.png'))
            (out / 'results.json').write_text(json.dumps({'passed': False, 'checks': checks, 'pageErrors': errors, 'failure': str(error)}, indent=2))
            raise
        finally:
            context.close()
            browser.close()
    (out / 'results.json').write_text(json.dumps({'passed': True, 'checks': checks, 'pageErrors': errors, 'runtime': args.url}, indent=2))
    print('Native acceptance passed:', out / 'results.json')


if __name__ == '__main__':
    main()
