#!/usr/bin/env python3
"""Generate custom 1200x630 dark-luxury OpenGraph cards for AI Brain using local Chrome & Pillow."""
import html
import pathlib
import subprocess
import tempfile
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "og"
OUT_DIR.mkdir(exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CARDS = [
    ("hi.jpg", "हिन्दी · AI BRAIN", "AI एजेंट्स के लिए स्थायी मेमोरी लेयर", "वेक्टर एम्बेडिंग्स और नॉलेज ग्राफ़ का संगम — हर सेशन के पार निरंतर स्मृति।", "MSME UDYAM-RJ-05-0067280 · Early Access Waitlist"),
    ("architecture.jpg", "ARCHITECTURE BLUEPRINT", "Cloud-Native, Graph-Native Engine", "Associative hypergraph mesh on Google Cloud Run, Vertex AI, TPU v5e & compiled traversal kernels (<15ms design target).", "aibrainstartup.com/architecture · Security & Zero-Trust"),
    ("docs.jpg", "DEVELOPER DOCS · API PREVIEW", "Hypergraph Memory & Swarm SDK", "Python & TypeScript preview interfaces (@aibrainstartup/sdk) plus planned REST endpoints: /v1/memory/remember, /recall & /swarm/sync.", "OpenAPI 3.1 Spec Available · Pre-release Waitlist Open"),
    ("about.jpg", "COMPANY & FOUNDER", "Built for Persistent Machine Cognition", "Founded by Bhoja Ram Choudhary under AI BRAIN STARTUPS — Govt. of India MSME registered enterprise in Rajasthan.", "UDYAM-RJ-05-0067280 · Est. 10 Oct 2025"),
    ("resume.jpg", "EXECUTIVE DOSSIER", "Bhoja Ram Choudhary — Founder & Chief Architect", "Creator of AI Brain's associative hypergraph memory architecture and multi-agent consensus systems.", "AI BRAIN STARTUPS · aibrainstartup.com/resume"),
    ("invest.jpg", "PRE-SEED STRATEGIC ROUND", "$700K Target · $4.0M Valuation Cap", "22 capped allocation slots ($15K–$100K) governed by India iSAFE notes with 3.0x–3.5x revenue-share hurdle & CCPS equity.", "RBI FEMA P0802 · Direct Bank Settlement"),
    ("deck.jpg", "10-SLIDE PITCH DECK", "The Missing Memory Infrastructure for AI Agents", "Institutional presentation covering market gap, associative hypergraph moat, unit economics, and 2026–2028 rollout.", "AI BRAIN STARTUPS · Accredited Angel & Syndicate Briefing"),
    ("terms.jpg", "LEGAL FRAMEWORK · iSAFE", "Syndicate Term Sheet & Revenue Covenant", "25% Series A conversion discount, quarterly gross revenue distributions (up to 3.5x cap), and MCA incorporation covenants.", "Indian Contract Act 1872 · RBI FEMA P0802 Compliant"),
    ("wire.jpg", "CAPITAL SETTLEMENT DESK", "Direct Sovereign SWIFT & RTGS Transmission", "Zero intermediary deductions via State Bank of India (SWIFT: SBININBB) with automated FIRC issuance within 48 hours.", "Barmer / Jaipur, India · Purpose Code P0802"),
    ("invest-docs.jpg", "GOVERNANCE & COMPLIANCE", "Investor Privacy, KYC & Regulatory Disclosures", "Institutional banking confidentiality, DPDP data protections, and statutory private placement risk covenants.", "AI BRAIN STARTUPS · UDYAM-RJ-05-0067280"),
    ("contact.jpg", "DIRECT LINE", "Connect with AI Brain & Founder", "Technical partnerships, developer early access, and institutional investor diligence.", "team@aibrainstartup.com · +91 94611 27967"),
    ("legal.jpg", "TRUST & GOVERNANCE", "Privacy Policy & Terms of Service", "Clear data minimization, waitlist retention controls, and usage terms for aibrainstartup.com.", "DPDP Aligned · Contact: team@aibrainstartup.com"),
    ("compare.jpg", "ARCHITECTURE COMPARISON", "AI Brain vs Vector DBs vs Mem0, Zep & Letta", "Engineering comparison across multi-hop recall, temporal decay, agent swarm consensus, and deployment maturity.", "aibrainstartup.com/compare · Technical Tradeoffs"),
    ("benchmarks.jpg", "EVALUATION PROTOCOL", "Benchmarks & Performance Targets", "Pre-release test harness methodology for LoCoMo, LongMemEval, p99 multi-hop latency (<15ms goal) & token reduction.", "Transparent Specification · No Synthetic Scores"),
    ("research.jpg", "TECHNICAL RESEARCH", "Hypergraph Memory, Token Math & DPDP Compliance", "Deep-dive engineering notes on multi-hop graph recall, redundant token math, and India DPDP Act 2023 tenant isolation.", "Bhoja Ram Choudhary · AI BRAIN STARTUPS"),
]

TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face {{ font-family: 'Geist'; font-weight: 100 900; src: url('file://{root}/fonts/geist-latin.woff2') format('woff2'); }}
  @font-face {{ font-family: 'Geist Mono'; font-weight: 100 900; src: url('file://{root}/fonts/geist-mono-latin.woff2') format('woff2'); }}
  @font-face {{ font-family: 'Instrument Serif'; font-style: italic; font-weight: 400; src: url('file://{root}/fonts/instrument-serif-italic-latin.woff2') format('woff2'); }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{
    width: 1200px; height: 630px; overflow: hidden;
    background: radial-gradient(900px 520px at 88% 12%, rgba(200,255,61,.16), transparent 60%),
                radial-gradient(650px 420px at 14% 92%, rgba(124,140,255,.12), transparent 60%),
                #08090b;
    color: #f2f1ec;
    font-family: 'Geist', -apple-system, 'Noto Sans Devanagari', sans-serif;
  }}
  .frame {{
    position: relative;
    width: 1200px; height: 630px;
    padding: 64px 72px;
    display: flex; flex-direction: column; justify-content: space-between;
  }}
  .grid-bg {{
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(circle at center, black 45%, transparent 92%);
  }}
  .top {{ position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; }}
  .brand {{ display: flex; align-items: center; gap: 14px; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }}
  .kicker {{
    font-family: 'Geist Mono', monospace;
    font-size: 15px; letter-spacing: 0.14em; color: #c8ff3d;
    border: 1px solid rgba(200,255,61,0.38); background: rgba(200,255,61,0.08);
    padding: 8px 16px; border-radius: 999px;
  }}
  .mid {{ position: relative; z-index: 2; max-width: 980px; }}
  h1 {{
    font-size: 60px; line-height: 1.08; letter-spacing: -0.035em; font-weight: 600;
    margin-bottom: 22px; color: #f6f5f0;
  }}
  p {{
    font-size: 25px; line-height: 1.42; color: #b5b7c0; max-width: 900px; font-weight: 400;
  }}
  .bot {{
    position: relative; z-index: 2;
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid rgba(255,255,255,0.12); padding-top: 24px;
    font-family: 'Geist Mono', monospace; font-size: 16px; color: #9ea1ab;
  }}
  .domain {{ color: #f2f1ec; font-weight: 500; }}
</style>
</head>
<body>
  <div class="frame">
    <div class="grid-bg"></div>
    <div class="top">
      <div class="brand">
        <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" stroke="#c8ff3d" stroke-opacity=".55" stroke-width="1.2"/>
          <circle cx="9" cy="12" r="2.8" fill="#c8ff3d"/>
          <circle cx="22" cy="9" r="2.2" fill="#f2f1ec"/>
          <circle cx="23" cy="21" r="2.8" fill="#c8ff3d"/>
          <circle cx="12" cy="23" r="2.2" fill="#f2f1ec"/>
          <path d="M9 12L22 9M9 12l14 9M22 9l1 12M9 12l3 11M12 23l11-2" stroke="#f2f1ec" stroke-opacity=".55" stroke-width="1.2"/>
        </svg>
        <span>AI Brain</span>
      </div>
      <div class="kicker">{kicker}</div>
    </div>
    <div class="mid">
      <h1>{title}</h1>
      <p>{desc}</p>
    </div>
    <div class="bot">
      <span>{meta}</span>
      <span class="domain">aibrainstartup.com</span>
    </div>
  </div>
</body>
</html>"""

def main():
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = pathlib.Path(tmp)
        for filename, kicker, title, desc, meta in CARDS:
            html_file = tmp_path / f"{filename}.html"
            png_file = tmp_path / f"{filename}.png"
            jpg_file = OUT_DIR / filename
            html_file.write_text(
                TEMPLATE.format(
                    root=ROOT.as_posix(),
                    kicker=html.escape(kicker),
                    title=html.escape(title),
                    desc=html.escape(desc),
                    meta=html.escape(meta),
                ),
                encoding="utf-8",
            )
            subprocess.run(
                [
                    CHROME,
                    "--headless=new",
                    "--disable-gpu",
                    "--hide-scrollbars",
                    "--window-size=1200,630",
                    f"--screenshot={png_file}",
                    html_file.as_uri(),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            with Image.open(png_file) as im:
                im.convert("RGB").resize((1200, 630), Image.Resampling.LANCZOS).save(
                    jpg_file, "JPEG", quality=90, optimize=True, progressive=True
                )
            print(f"generated og/{filename} ({jpg_file.stat().st_size:,} bytes)")

if __name__ == "__main__":
    main()
