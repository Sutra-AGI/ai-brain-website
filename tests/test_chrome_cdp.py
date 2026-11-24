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

PORT = 3355
CDP_PORT = 9222
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def start_http_server():
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
        httpd.serve_forever()

async def test_page_cdp(ws_url, page_url):
    print(f"\n--- Testing {page_url} via Chrome CDP ---")
    async with websockets.connect(ws_url) as ws:
        # Enable Page, Runtime, Console
        await ws.send(json.dumps({"id": 1, "method": "Page.enable"}))
        await ws.send(json.dumps({"id": 2, "method": "Runtime.enable"}))
        await ws.send(json.dumps({"id": 3, "method": "Console.enable"}))
        
        # Navigate
        await ws.send(json.dumps({"id": 4, "method": "Page.navigate", "params": {"url": page_url}}))
        
        errors = []
        warnings = []
        start_time = time.time()
        
        while time.time() - start_time < 3.5:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=0.8)
                data = json.loads(msg)
                method = data.get("method", "")
                
                if method == "Runtime.exceptionThrown":
                    err = data["params"]["exceptionDetails"]
                    text = err.get("text", "") + " " + err.get("exception", {}).get("description", "")
                    errors.append(f"JS Exception: {text}")
                elif method == "Console.messageAdded":
                    level = data["params"]["message"]["level"]
                    text = data["params"]["message"]["text"]
                    if level == "error":
                        errors.append(f"Console Error: {text}")
                    elif level == "warning":
                        warnings.append(f"Console Warning: {text}")
            except asyncio.TimeoutError:
                break
                
        if errors:
            print(f"❌ Errors found on {page_url}:")
            for e in errors:
                print("   ", e)
        else:
            print(f"✓ No runtime/console errors on {page_url}")
            
        return len(errors) == 0

async def main():
    t = threading.Thread(target=start_http_server, daemon=True)
    t.start()
    time.sleep(0.5)
    
    # Launch Headless Chrome
    chrome_proc = subprocess.Popen([
        CHROME,
        "--headless=new",
        f"--remote-debugging-port={CDP_PORT}",
        "--no-first-run",
        "--no-default-browser-check",
        "--user-data-dir=/tmp/chrome-test-profile"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    time.sleep(1.5)
    
    try:
        # Get WebSocket debugger URL
        tabs = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json").read())
        ws_url = tabs[0]["webSocketDebuggerUrl"]
        
        pages = [
            f"http://127.0.0.1:{PORT}/",
            f"http://127.0.0.1:{PORT}/invest.html",
            f"http://127.0.0.1:{PORT}/invest/terms.html",
            f"http://127.0.0.1:{PORT}/invest/wire.html",
            f"http://127.0.0.1:{PORT}/contact.html",
            f"http://127.0.0.1:{PORT}/about.html",
            f"http://127.0.0.1:{PORT}/architecture.html",
            f"http://127.0.0.1:{PORT}/docs.html",
            f"http://127.0.0.1:{PORT}/resume.html",
            f"http://127.0.0.1:{PORT}/hi.html",
            f"http://127.0.0.1:{PORT}/admin.html",
            f"http://127.0.0.1:{PORT}/privacy-policy.html",
            f"http://127.0.0.1:{PORT}/terms-of-service.html",
            f"http://127.0.0.1:{PORT}/404.html"
        ]
        
        all_passed = True
        for p in pages:
            passed = await test_page_cdp(ws_url, p)
            if not passed:
                all_passed = False
                
        print("\n==================================================")
        if all_passed:
            print("ALL PAGES PASSED HEADLESS CHROME BROWSER TESTING!")
        else:
            print("SOME PAGES HAD ERRORS")
        print("==================================================")
    finally:
        chrome_proc.terminate()

if __name__ == "__main__":
    asyncio.run(main())
