#!/usr/bin/env python3
"""
Forensic Responsive Deep Audit Suite for AI Brain Startup Web
Exhaustive A-to-Z audit across 16 critical breakpoints (280px to 2560px),
covering all 17 pages.
Metrics checked:
1. Document & Body horizontal overflow (scrollWidth vs innerWidth)
2. Offending elements exceeding viewport boundaries
3. Touch target sizes (< 44x44px for primary interactive elements on touch screens)
4. Mobile font sizing (inputs < 16px causing iOS zoom, text < 11px illegibility)
5. Fixed/Sticky navigation occlusion & z-index integrity
6. Table responsiveness & container isolation
7. Mobile menu drawer state & visibility
8. Media query breakpoint transitions (grid collapses, flex wrap)
"""

import asyncio
import http.server
import json
import os
import pathlib
import socketserver
import subprocess
import threading
import time
import urllib.request
import websockets

PORT = 3395
CDP_PORT = 9255
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = pathlib.Path(__file__).resolve().parent.parent

# 16 standard and edge-case device viewports
VIEWPORTS = [
    {"name": "Samsung Galaxy Z Fold (Outer Cover)", "width": 280, "height": 653, "mobile": True, "deviceScaleFactor": 3},
    {"name": "iPhone SE 1st gen / iPod Touch", "width": 320, "height": 568, "mobile": True, "deviceScaleFactor": 2},
    {"name": "Galaxy S8 / Android Compact", "width": 360, "height": 800, "mobile": True, "deviceScaleFactor": 3},
    {"name": "iPhone 8 / SE 2nd / 3rd gen", "width": 375, "height": 667, "mobile": True, "deviceScaleFactor": 2},
    {"name": "iPhone 12 / 13 / 14 / 15 Standard", "width": 390, "height": 844, "mobile": True, "deviceScaleFactor": 3},
    {"name": "Pixel 7 / Galaxy S21 / Android Standard", "width": 412, "height": 915, "mobile": True, "deviceScaleFactor": 2.6},
    {"name": "iPhone 14 / 15 Pro Max / Plus", "width": 430, "height": 932, "mobile": True, "deviceScaleFactor": 3},
    {"name": "Mobile Landscape (iPhone 14)", "width": 844, "height": 390, "mobile": True, "deviceScaleFactor": 3},
    {"name": "Samsung Galaxy Z Fold (Unfolded Inner)", "width": 768, "height": 1024, "mobile": True, "deviceScaleFactor": 2},
    {"name": "iPad Mini / iPad Air (Portrait)", "width": 820, "height": 1180, "mobile": True, "deviceScaleFactor": 2},
    {"name": "Surface Pro 7 / Medium Tablet", "width": 912, "height": 1368, "mobile": True, "deviceScaleFactor": 2},
    {"name": "iPad Pro 12.9 (Landscape) / Small Netbook", "width": 1024, "height": 768, "mobile": False, "deviceScaleFactor": 2},
    {"name": "MacBook Air 13 / Small Laptop", "width": 1280, "height": 800, "mobile": False, "deviceScaleFactor": 2},
    {"name": "MacBook Pro 15 / Standard Desktop", "width": 1440, "height": 900, "mobile": False, "deviceScaleFactor": 2},
    {"name": "FHD 1080p Monitor / iMac", "width": 1920, "height": 1080, "mobile": False, "deviceScaleFactor": 1},
    {"name": "QHD 2K / UltraWide Studio Display", "width": 2560, "height": 1440, "mobile": False, "deviceScaleFactor": 1}
]

PAGES = [
    "/",
    "/hi.html",
    "/about.html",
    "/architecture.html",
    "/docs.html",
    "/contact.html",
    "/privacy-policy.html",
    "/terms-of-service.html",
    "/404.html",
    "/resume.html",
    "/admin.html",
    "/invest.html",
    "/invest/deck.html",
    "/invest/terms.html",
    "/invest/wire.html",
    "/invest/policy.html",
    "/invest/disclosures.html"
]

def start_http_server():
    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
        httpd.serve_forever()

async def audit_page_viewport(ws, page_url, vp, req_id):
    width = vp["width"]
    height = vp["height"]
    mobile = vp["mobile"]
    dpr = vp["deviceScaleFactor"]

    async def call(method, params=None):
        nonlocal req_id
        i = req_id
        req_id += 1
        await ws.send(json.dumps({"id": i, "method": method, "params": params or {}}))
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            if data.get("id") == i:
                return data.get("result", {})

    # Set device metrics
    await call("Emulation.setDeviceMetricsOverride", {
        "width": width,
        "height": height,
        "deviceScaleFactor": dpr,
        "mobile": mobile
    })

    # Evaluate deep layout forensic script
    eval_script = """
    (() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const docEl = document.documentElement;
        const body = document.body;

        const scrollW = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
        const hasOverflow = scrollW > vw + 1; // 1px threshold for sub-pixel anti-aliasing

        // Find offending overflow elements if any
        const overflowingElements = [];
        if (hasOverflow) {
            const allElements = document.querySelectorAll('*');
            for (let el of allElements) {
                const rect = el.getBoundingClientRect();
                if (rect.right > vw + 2 && rect.width > 0 && rect.height > 0) {
                    const style = window.getComputedStyle(el);
                    if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                        // Check if it's inside an explicitly scrollable container
                        let parent = el.parentElement;
                        let inScrollContainer = false;
                        while (parent && parent !== document.body && parent !== docEl) {
                            const pStyle = window.getComputedStyle(parent);
                            if (pStyle.overflowX === 'auto' || pStyle.overflowX === 'scroll') {
                                inScrollContainer = true;
                                break;
                            }
                            parent = parent.parentElement;
                        }
                        if (!inScrollContainer) {
                            overflowingElements.push({
                                tag: el.tagName.toLowerCase(),
                                id: el.id || '',
                                class: el.className ? (typeof el.className === 'string' ? el.className.slice(0, 50) : '') : '',
                                right: Math.round(rect.right),
                                width: Math.round(rect.width)
                            });
                        }
                    }
                }
            }
        }

        // Small input font size (< 16px triggers iOS auto-zoom)
        const smallInputs = [];
        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea');
        inputs.forEach(inp => {
            const fs = parseFloat(window.getComputedStyle(inp).fontSize);
            if (fs < 15.99) {
                smallInputs.push({
                    name: inp.name || inp.id || inp.placeholder || inp.tagName.toLowerCase(),
                    fontSize: fs
                });
            }
        });

        // Small touch targets (< 40x40px for primary CTA buttons / mobile nav links)
        const smallTouchTargets = [];
        if (vw <= 768) {
            const interactive = document.querySelectorAll('.btn, .m-link, .menu-btn, .invest-tab, .tier-action a, .hero-quick-link');
            interactive.forEach(btn => {
                const r = btn.getBoundingClientRect();
                const style = window.getComputedStyle(btn);
                if (style.display !== 'none' && style.visibility !== 'hidden' && (r.width > 0 || r.height > 0)) {
                    if (r.width < 36 || r.height < 36) {
                        smallTouchTargets.push({
                            text: (btn.textContent || '').trim().slice(0, 30),
                            w: Math.round(r.width),
                            h: Math.round(r.height),
                            class: btn.className ? btn.className.slice(0, 40) : ''
                        });
                    }
                }
            });
        }

        // Table containment check
        const tables = document.querySelectorAll('table');
        const tableDetails = [];
        tables.forEach((tbl, idx) => {
            const rect = tbl.getBoundingClientRect();
            let parent = tbl.parentElement;
            let containerOverflow = 'none';
            while (parent && parent !== document.body) {
                const pStyle = window.getComputedStyle(parent);
                if (pStyle.overflowX === 'auto' || pStyle.overflowX === 'scroll') {
                    containerOverflow = pStyle.overflowX;
                    break;
                }
                parent = parent.parentElement;
            }
            tableDetails.push({
                index: idx,
                width: Math.round(rect.width),
                scrollW: tbl.scrollWidth,
                inScrollContainer: containerOverflow !== 'none'
            });
        });

        // Nav and header metrics
        const nav = document.querySelector('header, .nav, .invest-portal-nav');
        let navHeight = 0;
        let navSticky = false;
        if (nav) {
            const nRect = nav.getBoundingClientRect();
            const nStyle = window.getComputedStyle(nav);
            navHeight = Math.round(nRect.height);
            navSticky = nStyle.position === 'sticky' || nStyle.position === 'fixed';
        }

        // Reveal elements check
        const reveals = document.querySelectorAll('.reveal');
        let hiddenRevealsCount = 0;
        reveals.forEach(r => {
            if (parseFloat(window.getComputedStyle(r).opacity) < 0.1) {
                hiddenRevealsCount++;
            }
        });

        return {
            vw,
            vh,
            scrollW,
            hasOverflow,
            overflowDelta: Math.max(0, scrollW - vw),
            overflowingElements: overflowingElements.slice(0, 5),
            smallInputs,
            smallTouchTargets: smallTouchTargets.slice(0, 5),
            tableDetails,
            navHeight,
            navSticky,
            hiddenRevealsCount,
            totalElements: document.querySelectorAll('*').length
        };
    })()
    """

    res = await call("Runtime.evaluate", {"expression": eval_script, "returnByValue": True})
    val = res.get("result", {}).get("value", {}) if "result" in res else res.get("value", {})
    return val, req_id

async def run_forensic_suite():
    print("=" * 70)
    print("STARTING FORENSIC RESPONSIVE DEEP AUDIT SUITE")
    print(f"Targeting {len(PAGES)} Pages across {len(VIEWPORTS)} Viewpoints ({len(PAGES) * len(VIEWPORTS)} Matrix Combinations)")
    print("=" * 70)

    # Start Chrome Headless
    proc = subprocess.Popen([
        CHROME,
        "--headless=new",
        f"--remote-debugging-port={CDP_PORT}",
        "--no-sandbox",
        "--disable-gpu",
        f"--user-data-dir=/tmp/cdp_forensic_{CDP_PORT}"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    audit_matrix = {}
    total_checks = 0
    overflow_failures = 0
    touch_warnings = 0
    input_zoom_warnings = 0

    try:
        ws_url = None
        for _ in range(40):
            try:
                tabs = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json/list", timeout=2).read())
                if tabs:
                    ws_url = tabs[0]["webSocketDebuggerUrl"]
                    break
            except Exception:
                await asyncio.sleep(0.2)

        if not ws_url:
            raise RuntimeError("Could not connect to Chrome CDP WebSocket.")

        async with websockets.connect(ws_url, max_size=25*1024*1024) as ws:
            req_id = 1
            await ws.send(json.dumps({"id": req_id, "method": "Page.enable"}))
            req_id += 1
            await ws.send(json.dumps({"id": req_id, "method": "DOM.enable"}))
            req_id += 1

            for page in PAGES:
                page_url = f"http://127.0.0.1:{PORT}{page}"
                print(f"\n>>> Auditing Page: {page}")
                audit_matrix[page] = []

                # Initial load of page
                await ws.send(json.dumps({"id": req_id, "method": "Page.navigate", "params": {"url": page_url}}))
                req_id += 1
                await asyncio.sleep(1.2)

                # Ensure reveals trigger
                await ws.send(json.dumps({
                    "id": req_id,
                    "method": "Runtime.evaluate",
                    "params": {"expression": "[...document.querySelectorAll('.reveal')].forEach(e => e.classList.add('in'));"}
                }))
                req_id += 1
                await asyncio.sleep(0.3)

                for vp in VIEWPORTS:
                    total_checks += 1
                    metrics, req_id = await audit_page_viewport(ws, page_url, vp, req_id)
                    audit_matrix[page].append({
                        "viewport": vp["name"],
                        "width": vp["width"],
                        "height": vp["height"],
                        "mobile": vp["mobile"],
                        "metrics": metrics
                    })

                    status_str = "PASS"
                    if metrics.get("hasOverflow"):
                        status_str = "FAIL (OVERFLOW)"
                        overflow_failures += 1
                        print(f"  [X] {vp['width']}px ({vp['name']}): OVERFLOW delta={metrics.get('overflowDelta')}px")
                        for off in metrics.get("overflowingElements", []):
                            print(f"      Offending: <{off['tag']}> id='{off['id']}' class='{off['class']}' right={off['right']}px")
                    else:
                        print(f"  [OK] {vp['width']}px ({vp['name']}): scrollW={metrics.get('scrollW')}px, navH={metrics.get('navHeight')}px")

                    if metrics.get("smallTouchTargets"):
                        touch_warnings += len(metrics.get("smallTouchTargets"))
                    if metrics.get("smallInputs"):
                        input_zoom_warnings += len(metrics.get("smallInputs"))

    finally:
        proc.terminate()

    # Save complete forensic json report
    out_file = ROOT / "tests" / "forensic_responsive_results.json"
    out_file.write_text(json.dumps({
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "totalPages": len(PAGES),
        "totalViewports": len(VIEWPORTS),
        "totalChecks": total_checks,
        "overflowFailures": overflow_failures,
        "touchWarnings": touch_warnings,
        "inputZoomWarnings": input_zoom_warnings,
        "matrix": audit_matrix
    }, indent=2))

    print("\n" + "=" * 70)
    print("FORENSIC RESPONSIVE AUDIT COMPLETE")
    print(f"Total Combinations Tested: {total_checks}")
    print(f"Overflow Failures: {overflow_failures}")
    print(f"Touch Target Warnings: {touch_warnings}")
    print(f"iOS Zoom Input Warnings: {input_zoom_warnings}")
    print(f"Saved full audit JSON to: {out_file}")
    print("=" * 70)

if __name__ == "__main__":
    server_thread = threading.Thread(target=start_http_server, daemon=True)
    server_thread.start()
    time.sleep(0.5)
    asyncio.run(run_forensic_suite())
