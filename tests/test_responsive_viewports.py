#!/usr/bin/env python3
import asyncio
import http.server
import json
import socketserver
import subprocess
import threading
import time
import urllib.request
import websockets

PORT = 3366
CDP_PORT = 9223
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

VIEWPORTS = [
    (320, 568, "iPhone SE 1st gen"),
    (360, 800, "Galaxy S8 / Android Compact"),
    (375, 667, "iPhone 8 / SE 2nd gen"),
    (390, 844, "iPhone 12/13/14"),
    (412, 915, "Pixel 7 / Galaxy S21"),
    (430, 932, "iPhone 14/15 Pro Max"),
    (768, 1024, "iPad Portrait / Tablet"),
    (820, 1180, "iPad Air"),
    (1024, 768, "iPad Landscape"),
    (1280, 800, "Small Laptop"),
    (1440, 900, "Standard Desktop / MacBook"),
    (1920, 1080, "Full HD Desktop")
]

PAGES = [
    f"http://127.0.0.1:{PORT}/",
    f"http://127.0.0.1:{PORT}/invest.html",
    f"http://127.0.0.1:{PORT}/invest/terms.html",
    f"http://127.0.0.1:{PORT}/invest/wire.html",
    f"http://127.0.0.1:{PORT}/contact.html",
    f"http://127.0.0.1:{PORT}/about.html",
    f"http://127.0.0.1:{PORT}/architecture.html",
    f"http://127.0.0.1:{PORT}/docs.html",
    f"http://127.0.0.1:{PORT}/hi.html",
    f"http://127.0.0.1:{PORT}/admin.html",
    f"http://127.0.0.1:{PORT}/privacy-policy.html",
    f"http://127.0.0.1:{PORT}/terms-of-service.html",
    f"http://127.0.0.1:{PORT}/404.html",
    f"http://127.0.0.1:{PORT}/resume.html"
]

def start_http_server():
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
        httpd.serve_forever()

async def check_overflow(ws, width, height):
    # Set device metrics
    await ws.send(json.dumps({
        "id": 10,
        "method": "Emulation.setDeviceMetricsOverride",
        "params": {
            "width": width,
            "height": height,
            "deviceScaleFactor": 1,
            "mobile": width < 768
        }
    }))
    await asyncio.sleep(0.15)
    
    # Evaluate scrollWidth vs clientWidth
    eval_cmd = {
        "id": 11,
        "method": "Runtime.evaluate",
        "params": {
            "expression": "({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, innerWidth: window.innerWidth })",
            "returnByValue": True
        }
    }
    await ws.send(json.dumps(eval_cmd))
    
    while True:
        msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
        data = json.loads(msg)
        if data.get("id") == 11:
            val = data.get("result", {}).get("result", {}).get("value", {})
            scroll_w = val.get("scrollWidth", 0)
            inner_w = val.get("innerWidth", 0)
            overflow = scroll_w > inner_w
            return overflow, scroll_w, inner_w

async def main():
    t = threading.Thread(target=start_http_server, daemon=True)
    t.start()
    time.sleep(0.5)

    chrome_proc = subprocess.Popen([
        CHROME,
        "--headless=new",
        f"--remote-debugging-port={CDP_PORT}",
        "--no-first-run",
        "--user-data-dir=/tmp/chrome-resp-profile"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)

    try:
        tabs = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json").read())
        ws_url = tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url) as ws:
            await ws.send(json.dumps({"id": 1, "method": "Page.enable"}))
            await ws.send(json.dumps({"id": 2, "method": "DOM.enable"}))
            await ws.send(json.dumps({"id": 4, "method": "Network.enable"}))
            await ws.send(json.dumps({"id": 5, "method": "Network.setCacheDisabled", "params": {"cacheDisabled": True}}))

            all_passed = True
            for page in PAGES:
                page_name = page.split(f":{PORT}")[1]
                print(f"\n--- Checking Viewports on {page_name} ---")
                await ws.send(json.dumps({"id": 3, "method": "Page.navigate", "params": {"url": page}}))
                await asyncio.sleep(0.6)

                page_overflows = 0
                for w, h, label in VIEWPORTS:
                    overflow, sw, iw = await check_overflow(ws, w, h)
                    if overflow:
                        print(f"  ❌ Overflow at {w}x{h} ({label}): scrollWidth={sw} > innerWidth={iw}")
                        page_overflows += 1
                        all_passed = False
                    else:
                        print(f"  ✓ {w}px ({label:<25}): OK (scrollWidth={sw}px)")

                if page_overflows == 0:
                    print(f"✓ {page_name}: Zero horizontal overflow across ALL 12 screen widths!")

            print("\n==================================================")
            if all_passed:
                print("RESPONSIVE VERIFICATION PASSED 100% (ZERO OVERFLOW ACROSS ALL 12 VIEWPORTS)")
            else:
                print("RESPONSIVE ISSUES DETECTED")
            print("==================================================")
    finally:
        chrome_proc.terminate()

if __name__ == '__main__':
    asyncio.run(main())
