#!/usr/bin/env python3
"""Rebuild AI Brain sub-pages from the templates below.

Usage:  python3 scripts/build_pages.py
- Keeps each page's existing SEO <head> (title, meta, JSON-LD) and regenerates nav, body and footer.
- Re-run after editing home.css / pages.css / home.js: it refreshes the ?v= cache-busting hash on every page.
"""
import re, sys, pathlib, subprocess, hashlib
from minify import build_minified_assets

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent)
build_minified_assets(ROOT)
# Cache-busting version = content hash of the shared minified assets (assets are served with a 1-year immutable cache).
V = hashlib.sha1(b"".join((ROOT / f).read_bytes() for f in ("home.min.css", "pages.min.css", "home.min.js", "admin.min.css", "admin.min.js", "invest.min.css", "invest.min.js"))).hexdigest()[:8]

FONTS = '''  <script>document.documentElement.classList.add('js')</script>
  <link rel="llms-txt" href="/llms.txt">
  <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM Context">
  <link rel="alternate" type="text/plain" href="/llms-full.txt" title="LLM Full Context">
  <link rel="alternate" type="application/rss+xml" title="AI Brain Updates" href="/feed.xml">
  <link rel="preload" href="/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/geist-mono-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/instrument-serif-italic-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="home.min.css?v={v}">
  <link rel="stylesheet" href="pages.min.css?v={v}">
'''.format(v=V)

LOGO = '''<svg class="logo-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="15" stroke="#c8ff3d" stroke-opacity=".35"/>
          <circle cx="9" cy="12" r="2.6" fill="#c8ff3d"/><circle cx="22" cy="9" r="2" fill="#f2f1ec"/>
          <circle cx="23" cy="21" r="2.6" fill="#c8ff3d"/><circle cx="12" cy="23" r="2" fill="#f2f1ec"/>
          <path d="M9 12L22 9M9 12l14 9M22 9l1 12M9 12l3 11M12 23l11-2" stroke="#f2f1ec" stroke-opacity=".5" stroke-width="1"/>
        </svg>'''

NAV_ITEMS = [("/#memory", "Memory", None), ("/#how", "How it works", None), ("/#agents", "Agents", None), ("/#sdk", "SDK", None),
             ("/architecture", "Architecture", "architecture"), ("/docs", "Docs", "docs"), ("/about", "About", "about"),
             ("/invest", "Invest", "invest")]


def nav(active):
    links = "\n        ".join(
        f'<a href="{h}"{" aria-current=\"page\"" if active and k == active else ""}>{t}</a>' for h, t, k in NAV_ITEMS)
    mob = [("/", "Home", "↗"), ("/#memory", "Memory", "01"), ("/#agents", "Agents", "02"), ("/#sdk", "SDK", "03"),
           ("/architecture", "Architecture", "↗"), ("/docs", "Docs", "↗"), ("/compare", "Compare", "↗"),
           ("/benchmarks", "Benchmarks", "↗"), ("/research", "Research", "↗"),
           ("/about", "About", "↗"), ("/invest", "Invest", "↗"), ("/contact", "Contact", "↗")]
    mlinks = "\n    ".join(f'<a class="m-link" href="{h}">{t} <span>{n}</span></a>' for h, t, n in mob)
    contact_cur = ' aria-current="page"' if active == "contact" else ""
    return f'''
  <header class="nav" id="nav">
    <div class="wrap nav-inner">
      <a href="/" class="logo" aria-label="AI Brain home">
        {LOGO}
        AI Brain
      </a>
      <nav class="nav-links" aria-label="Primary">
        {links}
      </nav>
      <div class="nav-cta">
        <a href="/contact" class="btn btn-ghost btn-sm"{contact_cur}>Contact</a>
        <a href="/#waitlist" class="btn btn-primary btn-sm">Early access</a>
        <button class="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="mobilePanel"><span></span></button>
      </div>
    </div>
  </header>
  <div class="mobile-panel" id="mobilePanel" inert>
    {mlinks}
    <a href="/#waitlist" class="btn btn-primary">Get early access →</a>
  </div>
'''


FOOTER = f'''
  <footer class="footer">
    <div class="wrap">
      <div class="foot-grid">
        <div class="foot-brand">
          <a href="/" class="logo">AI Brain</a>
          <p>Building persistent artificial intelligence and autonomous agent networks.</p>
          <a class="mail" href="mailto:founder@aibrainstartup.com">founder@aibrainstartup.com</a>
          <a class="mail" href="mailto:team@aibrainstartup.com">team@aibrainstartup.com</a>
        </div>
        <div><p class="foot-h">Product</p><ul><li><a href="/architecture">Architecture</a></li><li><a href="/compare">Compare</a></li><li><a href="/benchmarks">Benchmarks</a></li><li><a href="/research">Research</a></li><li><a href="/docs">Docs</a></li></ul></div>
        <div><p class="foot-h">Company</p><ul><li><a href="/about">About</a></li><li><a href="/resume">Founder Dossier</a></li><li><a href="/invest">Invest</a></li><li><a href="/contact">Contact</a></li><li><a href="https://github.com/Sutra-AGI" target="_blank" rel="noopener noreferrer">GitHub</a></li><li><a href="https://www.linkedin.com/in/bhoja-ram-choudhary-ai-brain-/" target="_blank" rel="noopener noreferrer">LinkedIn</a></li></ul></div>
        <div><p class="foot-h">Specs &amp; Legal</p><ul><li><a href="/openapi.json">OpenAPI 3.1</a></li><li><a href="/feed.xml">Updates RSS</a></li><li><a href="/privacy-policy">Privacy policy</a></li><li><a href="/terms-of-service">Terms of service</a></li><li><a href="/hi" hreflang="hi" lang="hi">हिन्दी</a></li></ul></div>
      </div>
      <div class="foot-bottom">
        <span class="msme">🇮🇳 Govt. of India registered MSME · Udyam <b>UDYAM-RJ-05-0067280</b></span>
        <span>© <span id="year">2026</span> AI Brain. All rights reserved.</span>
      </div>
      <div class="wordmark" aria-hidden="true">AI Brain</div>
    </div>
  </footer>

  <script defer src="/_vercel/insights/script.js"></script>
  <script src="home.min.js?v={V}" defer></script>
</body>
</html>
'''


def clean_head(html):
    head = html[: html.index("</head>")]
    head = re.sub(r"<style>.*?</style>\s*", "", head, flags=re.S)
    head = re.sub(r"<noscript>.*?</noscript>\s*", "", head, flags=re.S)
    head = re.sub(r"[ \t]*<link[^>]*(fonts\.googleapis\.com/css2|styles\.css)[^>]*>\s*\n?", "", head)
    head = re.sub(r"[ \t]*<link[^>]*(preconnect|dns-prefetch)[^>]*>\s*\n?", "", head)
    head = re.sub(r"[ \t]*<link[^>]*(home(?:\.min)?\.css|pages(?:\.min)?\.css|/fonts/|/llms(-full)?\.txt|/feed\.xml|rel=\"llms-txt\")[^>]*>\s*\n?", "", head)
    head = re.sub(r"[ \t]*<script>document\.documentElement[^<]*</script>\s*\n?", "", head)
    head = re.sub(r"[ \t]*<!--[^>]*(Font|CSS|Stylesheet|Resource Hints|Speed)[^>]*-->\s*\n?", "", head, flags=re.I)
    head = head.replace('content="#070913"', 'content="#08090b"')
    head = re.sub(r"\n{3,}", "\n\n", head).rstrip() + "\n"
    return head


def hero(crumb, kicker, title, lead, actions=""):
    return f'''
  <main id="main">
    <section class="page-hero">
      <div class="wrap">
        <div class="crumbs reveal"><a href="/">Home</a><span>/</span><span>{crumb}</span></div>
        <span class="kicker reveal" style="margin-top:28px">{kicker}</span>
        <h1 class="reveal d1">{title}</h1>
        <p class="lead reveal d2">{lead}</p>
        {actions}
      </div>
    </section>
'''


def code_block(id_, file_, code, badge=""):
    b = f'<span class="tag tag-good">{badge}</span>' if badge else ""
    return f'''<div class="code reveal">
          <div class="term">
            <div class="term-bar"><i></i><i></i><i></i><span style="margin-left:8px">{file_}</span>{b}<button class="copy-btn" type="button" data-copy="{id_}">copy</button></div>
<pre id="{id_}" tabindex="0" aria-label="{file_}">{code}</pre>
          </div>
        </div>'''


CTA = '''
    <section class="page-section">
      <div class="wrap">
        <div class="cta-slim reveal">
          <h2>Ready to give your agents a memory?</h2>
          <a href="/#waitlist" class="btn">Request early access →</a>
        </div>
      </div>
    </section>
'''

# ---------------------------------------------------------------- ABOUT
ABOUT = hero("About", "Leadership &amp; company",
             'Building the <span class="serif">memory</span> layer for AI.',
             "AI Brain is building foundational cognitive memory infrastructure for the next generation of autonomous AI agents — persistent, associative and fast.",
             '<div class="hero-actions reveal d3"><a href="/contact" class="btn btn-primary">Talk to the founder <span class="arrow">→</span></a><a href="/architecture" class="btn btn-ghost">See the architecture</a></div>') + '''
    <section class="page-section">
      <div class="wrap">
        <div class="founder" itemscope itemtype="https://schema.org/Person">
          <article class="card founder-main reveal">
            <div class="avatar" aria-hidden="true">BR</div>
            <h2 itemprop="name">Bhoja Ram Choudhary</h2>
            <span class="role" itemprop="jobTitle">Founder &amp; Chief Architect</span>
            <p class="bio" itemprop="description">Architect of AI Brain — engineering neuromorphic memory systems to eliminate LLM context decay and power autonomous AI agent swarms.</p>
            <dl class="kv">
              <div><dt>Email</dt><dd><a href="mailto:founder@aibrainstartup.com" itemprop="email">founder@aibrainstartup.com</a></dd></div>
              <div><dt>Phone / WhatsApp</dt><dd><a href="tel:+919461127967" itemprop="telephone">+91 94611 27967</a></dd></div>
              <div><dt>Website</dt><dd><a href="https://aibrainstartup.com/">aibrainstartup.com</a></dd></div>
              <div><dt>Based in</dt><dd>Rajasthan, India 🇮🇳</dd></div>
            </dl>
            <div class="founder-actions">
              <a href="https://www.linkedin.com/in/bhoja-ram-choudhary-ai-brain-/" target="_blank" rel="noopener noreferrer" class="btn btn-ghost" itemprop="sameAs">LinkedIn ↗</a>
              <a href="/contact" class="btn btn-primary">Schedule a call <span class="arrow">→</span></a>
            </div>
          </article>
          <div class="pillars">
            <article class="card pillar reveal d1">
              <span class="eyebrow-mono">01 / Vision</span>
              <h3>Persistent cognitive memory</h3>
              <p>A neuromorphic memory stack that lets LLM agents keep cross-session memory without context-window overflow or manual re-prompting.</p>
            </article>
            <article class="card pillar reveal d2">
              <span class="eyebrow-mono">02 / Value</span>
              <h3>Lower cost, better recall</h3>
              <p>Designed to cut redundant API token spend (target: ~91%) with sub-15ms graph traversals — a defensible deep-tech layer for AI infrastructure.</p>
            </article>
            <article class="card pillar reveal d3">
              <span class="eyebrow-mono">03 / Roadmap 2026–28</span>
              <h3>Beta to enterprise</h3>
              <p>From private beta to multi-region enterprise clusters, targeting 10M+ persistent memory nodes and agent-swarm integrations.</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap">
        <div class="sec-head">
          <div>
            <span class="kicker reveal">What makes it different</span>
            <h2 class="h2 reveal d1">Three bets we are <span class="serif">building</span> on.</h2>
          </div>
        </div>
        <div class="grid-3">
          <article class="card reveal"><span class="num">01</span><h3>Hypergraph architecture</h3><p>A multi-hop associative graph designed to go beyond flat vector embeddings, with temporal decay protection.</p></article>
          <article class="card reveal d1"><span class="num">02</span><h3>Sub-15ms recall (target)</h3><p>Fast associative retrieval designed for real-time decision making by autonomous agents.</p></article>
          <article class="card reveal d2"><span class="num">03</span><h3>No context decay (goal)</h3><p>Long-term memory designed to persist across sessions, turns and sub-agent hand-offs.</p></article>
        </div>
      </div>
    </section>

    <section class="page-section" id="registration">
      <div class="wrap">
        <div class="sec-head">
          <div>
            <span class="kicker reveal">Registration</span>
            <h2 class="h2 reveal d1">Government of India <span class="serif">registered</span>.</h2>
          </div>
          <p class="lead reveal d2">AI Brain is registered as a micro enterprise with the Ministry of Micro, Small &amp; Medium Enterprises (MoMSME).</p>
        </div>
        <div class="cert reveal">
          <div class="cert-band"></div>
          <div class="cert-head">
            <div><small>Government of India · MoMSME</small><strong>Ministry of Micro, Small &amp; Medium Enterprises</strong></div>
            <span class="verified">✓ Udyam registered</span>
          </div>
          <dl class="cert-grid">
            <div><dt>Udyam registration no.</dt><dd class="mono">UDYAM-RJ-05-0067280</dd></div>
            <div><dt>Enterprise name</dt><dd>AI BRAIN STARTUPS</dd></div>
            <div><dt>NIC code 62099</dt><dd>IT, software &amp; computer services</dd></div>
            <div><dt>Jurisdiction</dt><dd>Barmer / Jaipur, Rajasthan</dd></div>
          </dl>
          <div class="cert-foot">
            <span>Registered 10/10/2025</span>
            <span>Micro enterprise (services)</span>
            <a href="https://udyamregistration.gov.in/" target="_blank" rel="noopener">Verify at udyamregistration.gov.in ↗</a>
          </div>
        </div>
      </div>
    </section>
''' + CTA + "  </main>\n"

# ---------------------------------------------------------------- ARCHITECTURE
DEPLOY = '''<span class="t-c"># Reference sketch: GKE cluster + TPU v5e node pool.</span>
<span class="t-c"># Check TPU quota and zone availability for your project before running.</span>
gcloud container clusters create <span class="t-s">"aibrain-mesh"</span> \\
  --region=<span class="t-s">"us-central1"</span> \\
  --release-channel=regular \\
  --workload-pool=<span class="t-s">"PROJECT_ID.svc.id.goog"</span> \\
  --enable-shielded-nodes

gcloud container node-pools create <span class="t-s">"tpu-v5e"</span> \\
  --cluster=<span class="t-s">"aibrain-mesh"</span> --region=<span class="t-s">"us-central1"</span> \\
  --node-locations=<span class="t-s">"us-central1-a"</span> \\
  --machine-type=<span class="t-s">"ct5lp-hightpu-4t"</span> --tpu-topology=<span class="t-s">"2x2"</span> \\
  --num-nodes=1 --enable-autoscaling --min-nodes=0 --max-nodes=4'''

ARCH = hero("Architecture", "Infrastructure blueprint",
            'Cloud-native, <span class="serif">graph-native</span>.',
            "A distributed hypergraph memory mesh, TPU/GPU compute and GKE container orchestration on Google Cloud — designed for sub-15ms recall at global scale.") + '''
    <section class="page-section">
      <div class="wrap">
        <div class="sec-head">
          <div>
            <span class="kicker reveal">Request path</span>
            <h2 class="h2 reveal d1">How a query <span class="serif">flows</span>.</h2>
          </div>
          <p class="lead reveal d2">Every request is served from the edge, enriched from the memory graph and written back so the next one starts smarter.</p>
        </div>
        <div class="flow reveal">
          <div><span class="mono">01 · CLIENT</span><strong>@aibrainstartup/sdk</strong><small>Preview Python / TS over gRPC &amp; REST</small></div>
          <div><span class="mono">02 · GATEWAY</span><strong>Cloud Run</strong><small>Serverless API, auth, rate limits</small></div>
          <div><span class="mono">03 · ROUTER</span><strong>Hypergraph router</strong><small>Multi-hop traversal planner</small></div>
          <div><span class="mono">04 · COGNITION</span><strong>Vertex AI · TPU</strong><small>Embeddings &amp; reasoning</small></div>
          <div><span class="mono">05 · OUTPUT</span><strong>Context-complete answer</strong><small>Written back to memory</small></div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap">
        <div class="sec-head">
          <div>
            <span class="kicker reveal">Core layers</span>
            <h2 class="h2 reveal d1">Four layers, <span class="serif">one</span> system.</h2>
          </div>
          <p class="lead reveal d2">Engineered on Google Cloud for low-latency memory retrieval, high availability and no context-window decay.</p>
        </div>
        <div class="layers reveal">
          <div class="layer">
            <span class="idx">01</span>
            <div><h3>Model reasoning</h3><div class="sub">TPU v5e &amp; GPU node pools</div></div>
            <div class="layer-body"><p>Dedicated compute clusters running parallel JAX &amp; PyTorch workloads, multimodal inference and continuous agent reasoning loops.</p><div class="chips"><span class="chip">TPU v5e</span><span class="chip">multimodal inference</span><span class="chip">sub-second reasoning</span></div></div>
          </div>
          <div class="layer">
            <span class="idx">02</span>
            <div><h3>Cognitive memory engine</h3><div class="sub">Cloud Storage + hypergraph DB</div></div>
            <div class="layer-body"><p>A multi-hop associative hypergraph store on high-throughput GCS, built for sub-15ms traversals and lossless context persistence.</p><div class="chips"><span class="chip">GCS</span><span class="chip">associative graph</span><span class="chip">&lt;15ms target</span></div></div>
          </div>
          <div class="layer">
            <span class="idx">03</span>
            <div><h3>Autonomous agent runtime</h3><div class="sub">GKE Enterprise</div></div>
            <div class="layer-body"><p>Isolated Kubernetes pods running 24/7 background agent workflows, with horizontal autoscaling and self-healing recovery.</p><div class="chips"><span class="chip">GKE</span><span class="chip">autoscaling</span><span class="chip">self-healing</span></div></div>
          </div>
          <div class="layer">
            <span class="idx">04</span>
            <div><h3>Security &amp; zero-trust</h3><div class="sub">KMS · Cloud Armor · VPC-SC</div></div>
            <div class="layer-body"><p>TLS 1.3 in transit, AES-256 at rest via Cloud KMS, Cloud Armor DDoS protection and VPC Service Controls isolation.</p><div class="chips"><span class="chip">Cloud KMS</span><span class="chip">Cloud Armor</span><span class="chip">VPC controls</span></div></div>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap">
        <span class="kicker reveal">Design targets · not yet benchmarked</span>
        <h2 class="h2 reveal d1" style="margin-bottom:48px">Performance <span class="serif">goals</span>.</h2>
        <div class="stats reveal">
          <div class="stat"><div class="stat-val"><span data-count="15">15</span><small>ms</small></div><div class="stat-label">Memory recall latency<span class="mono">p99 traversal</span></div></div>
          <div class="stat"><div class="stat-val"><span data-count="91">91</span><small>%</small></div><div class="stat-label">Token burn reduction<span class="mono">vs full re-send</span></div></div>
          <div class="stat"><div class="stat-val">0<small>%</small></div><div class="stat-label">Context window decay<span class="mono">persistent graph</span></div></div>
          <div class="stat"><div class="stat-val">99.99<small>%</small></div><div class="stat-label">Availability goal<span class="mono">multi-region GKE</span></div></div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap sdk">
        <div>
          <span class="kicker reveal">Infrastructure as code</span>
          <h2 class="h2 reveal d1">Reference <span class="serif">deployment</span>.</h2>
          <p class="lead reveal d2">A starting sketch for a self-hosted AI Brain cluster on Google Cloud (not a turnkey installer). Enterprise customers will get a tailored blueprint.</p>
          <p class="reveal d3" style="margin-top:28px"><a href="contact" class="btn btn-ghost">Ask about self-hosting <span class="arrow">→</span></a></p>
        </div>
        ''' + code_block("deployCode", "deploy_cluster.sh — reference sketch", DEPLOY, "GCP") + '''
      </div>
    </section>
''' + CTA + "  </main>\n"

# ---------------------------------------------------------------- DOCS
INSTALL = '''<span class="t-c"># SDK packages are not published yet — coming soon.</span>
<span class="t-c"># Do NOT install "aibrain", "aibrain-sdk" or "@aibrain/sdk" from PyPI/npm:</span>
<span class="t-c"># those names are not owned by AI Brain.</span>

<span class="t-c"># Once you have early access, configure your key:</span>
export AIBRAIN_API_KEY=<span class="t-s">"sk_live_..."</span>'''

MEMORY = '''<span class="t-c"># Pre-release API preview — package not published yet</span>
<span class="t-k">import</span> aibrainstartup

<span class="t-c"># 1. Initialise the hypergraph client</span>
brain = aibrainstartup.HypergraphClient(
    api_key=<span class="t-s">"sk_live_..."</span>,
    tier=<span class="t-s">"ENTERPRISE"</span>,
)

<span class="t-c"># 2. Ingest cross-session memory</span>
memory_node = brain.remember(
    agent_id=<span class="t-s">"executive_agent_01"</span>,
    context={
        <span class="t-s">"user_intent"</span>: <span class="t-s">"Deploy agent swarm"</span>,
        <span class="t-s">"tech_stack"</span>: [<span class="t-s">"Google Cloud"</span>, <span class="t-s">"Gemini"</span>],
        <span class="t-s">"rule"</span>: <span class="t-s">"Zero context decay across sessions"</span>,
    },
    reasoning_weight=0.98,
    decay_protection=True,
)

<span class="t-c"># 3. Multi-hop associative recall</span>
graph_result = brain.recall(
    agent_id=<span class="t-s">"executive_agent_01"</span>,
    query=<span class="t-s">"What architecture rules were specified?"</span>,
    depth=4,  <span class="t-c"># 4-hop graph traversal</span>
    top_k=5,
)

<span class="t-k">print</span>(<span class="t-s">"Recall latency:"</span>, graph_result.latency_ms, <span class="t-s">"ms"</span>)
<span class="t-k">print</span>(<span class="t-s">"Retrieved nodes:"</span>, graph_result.nodes)'''

SWARM = '''<span class="t-c"># Pre-release API preview — package not published yet</span>
<span class="t-k">import</span> aibrainstartup

<span class="t-c"># 1. Connect an agent swarm</span>
swarm = aibrainstartup.SwarmGrid(
    swarm_id=<span class="t-s">"swarm_alpha_dev"</span>,
    agents=[<span class="t-s">"planner_agent"</span>, <span class="t-s">"coder_agent"</span>, <span class="t-s">"evaluator_agent"</span>],
    consensus_protocol=<span class="t-s">"BYZANTINE_HYPERGRAPH_AGREEMENT"</span>,
)

<span class="t-c"># 2. Broadcast a verified artifact to every agent</span>
swarm.broadcast_state(
    source_agent=<span class="t-s">"coder_agent"</span>,
    state_key=<span class="t-s">"verified_memory_spec"</span>,
    payload={<span class="t-s">"status"</span>: <span class="t-s">"PASSED_TESTS"</span>, <span class="t-s">"code_coverage"</span>: <span class="t-s">"99.8%"</span>},
    consensus_mode=<span class="t-s">"IMMEDIATE_SYNC"</span>,
)

<span class="t-c"># 3. Read synchronised state</span>
current_state = swarm.read_state(
    agent_id=<span class="t-s">"evaluator_agent"</span>,
    state_key=<span class="t-s">"verified_memory_spec"</span>,
)
<span class="t-k">print</span>(<span class="t-s">"Swarm sync status:"</span>, current_state.status)'''

DOCS = hero("Docs", "Developer documentation",
            'Build agents that <span class="serif">remember</span>.',
            "A preview of the API for the hypergraph memory engine, swarm consensus and cross-session recall. The SDK is coming soon.",
            '<div class="hero-actions reveal d3"><a href="/#waitlist" class="btn btn-primary">Get SDK early access <span class="arrow">→</span></a><a href="#rest-endpoints" class="btn btn-ghost">REST reference</a></div>') + '''
    <section class="page-section">
      <div class="wrap docs">
        <nav class="toc" aria-label="Documentation sections">
          <p class="toc-h">On this page</p>
          <ol>
            <li><a href="#overview">Overview</a></li>
            <li><a href="#installation">Installation</a></li>
            <li><a href="#hypergraph-api">Hypergraph API</a></li>
            <li><a href="#swarm-matrix">Swarm consensus</a></li>
            <li><a href="#rest-endpoints">REST endpoints</a></li>
            <li><a href="#benchmarks">Benchmarks</a></li>
          </ol>
        </nav>
        <div>
          <div class="callout reveal"><b>Coming soon</b><span>The AI Brain SDK is <strong>not published yet</strong>. The code on this page is an API preview and may change. Packages on PyPI or npm with similar names (<code class="mono">aibrain</code>, <code class="mono">aibrain-sdk</code>, <code class="mono">@aibrain/sdk</code>) are not affiliated with us — please don’t install them. <a href="/#waitlist">Join the waitlist</a> to be notified.</span></div>

          <section class="doc-sec" id="overview">
            <span class="kicker">01 / Overview</span>
            <h2>The cognitive memory model</h2>
            <p>Instead of relying only on cosine similarity over flat vectors, AI Brain links concepts, execution histories and agent intentions into a single persistent hypergraph — so recall can follow relationships, not just keywords.</p>
            <div class="grid-2">
              <article class="card"><span class="eyebrow-mono">Engine</span><h3>Cognitive hypergraph</h3><p>Multi-hop associative reasoning with temporal decay protection.</p></article>
              <article class="card"><span class="eyebrow-mono">Coordination</span><h3>Swarm consensus</h3><p>Shared memory state synchronised across many concurrent agents.</p></article>
            </div>
          </section>

          <section class="doc-sec" id="installation">
            <span class="kicker">02 / Setup</span>
            <h2>Installation <span class="tag tag-good" style="vertical-align:middle;margin-left:8px">coming soon</span></h2>
            <p>Installable Python and Node.js packages will be published at general availability. Until then there is nothing to install.</p>
            ''' + code_block("installCode", "terminal", INSTALL) + '''
          </section>

          <section class="doc-sec" id="hypergraph-api">
            <span class="kicker">03 / Core SDK</span>
            <h2>Hypergraph memory API</h2>
            <p>Store long-term agent experiences with <code class="mono">remember()</code> and retrieve them with multi-hop <code class="mono">recall()</code>.</p>
            ''' + code_block("memoryCode", "memory.py — API preview", MEMORY, "preview") + '''
          </section>

          <section class="doc-sec" id="swarm-matrix">
            <span class="kicker">04 / Multi-agent</span>
            <h2>Swarm consensus protocol</h2>
            <p>Synchronise state across concurrent agents — planner, coder, reviewer — without collisions or context drift.</p>
            ''' + code_block("swarmCode", "swarm.py — API preview", SWARM, "preview") + '''
          </section>

          <section class="doc-sec" id="rest-endpoints">
            <span class="kicker">05 / HTTP</span>
            <h2>REST API reference</h2>
            <p>Planned endpoints for Go, Rust, Java, C++ or anything that speaks HTTP. Not live yet.</p>
            <div class="endpoints reveal">
              <div class="endpoint"><span class="method">POST</span><code>/v1/memory/remember</code><p>Ingest and index new context into the hypergraph.</p></div>
              <div class="endpoint"><span class="method">POST</span><code>/v1/memory/recall</code><p>Run a multi-hop traversal and return relevant context for an agent.</p></div>
              <div class="endpoint"><span class="method">POST</span><code>/v1/swarm/sync</code><p>Broadcast a state update to every agent in a swarm.</p></div>
            </div>
          </section>

          <section class="doc-sec" id="benchmarks">
            <span class="kicker">06 / Performance</span>
            <h2>Benchmark targets</h2>
            <p>What the engine is designed to deliver. These are engineering targets, not published benchmark results.</p>
            <div class="mini-stats reveal">
              <div><strong>&lt; 15ms</strong><span>Memory latency</span><small>design target</small></div>
              <div><strong>91.4%</strong><span>Token reduction</span><small>design target, vs full re-send</small></div>
              <div><strong>0%</strong><span>Context decay</span><small>design goal</small></div>
            </div>
          </section>
        </div>
      </div>
    </section>
''' + CTA + "  </main>\n"

# ---------------------------------------------------------------- CONTACT
CONTACT = hero("Contact", "Get in touch",
               'Let’s <span class="serif">talk</span>.',
               "Partnerships, investment, enterprise clusters or SDK support — reach the founder and team directly.") + '''
    <section class="page-section">
      <div class="wrap contact">
        <div>
          <ul class="contact-list reveal">
            <li><a class="contact-row" href="mailto:founder@aibrainstartup.com"><span class="cr-k">Founder · Bhoja Ram Choudhary</span><span class="cr-v">founder@aibrainstartup.com</span><span class="go" aria-hidden="true">↗</span></a></li>
            <li><a class="contact-row" href="mailto:team@aibrainstartup.com"><span class="cr-k">Team</span><span class="cr-v">team@aibrainstartup.com</span><span class="go" aria-hidden="true">↗</span></a></li>
            <li><a class="contact-row" href="tel:+919461127967"><span class="cr-k">Phone</span><span class="cr-v">+91 94611 27967</span><span class="go" aria-hidden="true">↗</span></a></li>
            <li><a class="contact-row" href="https://wa.me/919461127967" target="_blank" rel="noopener"><span class="cr-k">WhatsApp</span><span class="cr-v">Chat directly</span><span class="go" aria-hidden="true">↗</span></a></li>
            <li><a class="contact-row" href="https://www.linkedin.com/in/bhoja-ram-choudhary-ai-brain-/" target="_blank" rel="noopener"><span class="cr-k">LinkedIn</span><span class="cr-v">Bhoja Ram Choudhary</span><span class="go" aria-hidden="true">↗</span></a></li>
          </ul>
          <div class="cert reveal d1" style="margin-top:16px">
            <div class="cert-band"></div>
            <div class="cert-head">
              <div><small>Govt. of India · MSME</small><strong>AI BRAIN STARTUPS</strong></div>
              <span class="verified">✓ Udyam</span>
            </div>
            <div class="cert-foot"><span class="mono" style="color:var(--accent)">UDYAM-RJ-05-0067280</span><span>Barmer / Jaipur, Rajasthan</span></div>
          </div>
        </div>

        <div class="form-card reveal d1">
          <h2>Send a message</h2>
          <p>Sent straight to the founder. We usually reply within 1–2 business days.</p>
          <form id="contactForm" novalidate>
            <div class="form-grid">
              <div class="f"><label for="cName">Full name</label><input id="cName" name="name" type="text" autocomplete="name" placeholder="Alex Rivera" required></div>
              <div class="f"><label for="cEmail">Work email</label><input id="cEmail" name="email" type="email" autocomplete="email" placeholder="name@company.com" required></div>
              <div class="f full"><label for="cTopic">Inquiry type</label>
                <select id="cTopic" name="topic">
                  <option>Investment / funding</option>
                  <option>Enterprise cluster</option>
                  <option>Strategic partnership</option>
                  <option>SDK &amp; technical support</option>
                  <option>Other</option>
                </select>
              </div>
              <div class="f full"><label for="cBody">Message</label><textarea id="cBody" name="message" placeholder="Briefly describe what you need…" required></textarea></div>
            </div>
            <div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><label for="cCompany">Company</label><input id="cCompany" name="company" type="text" tabindex="-1" autocomplete="off"></div>
            <div class="form-foot">
              <small>Your details are used only to reply. See our <a href="/privacy-policy">privacy policy</a>.</small>
              <button class="btn btn-primary" type="submit">Send message <span class="arrow">→</span></button>
            </div>
            <div class="form-msg" id="contactMsgBox" role="status" aria-live="polite"></div>
          </form>
        </div>
      </div>
    </section>
  </main>
'''

# ---------------------------------------------------------------- LEGAL
def legal(crumb, title, sections, effective="30 July 2026", updated="30 July 2026"):
    toc = "\n            ".join(f'<li><a href="#s{i+1}">{h}</a></li>' for i, (h, _) in enumerate(sections))
    body = "\n          ".join(f'<section id="s{i+1}"><h2>{h}</h2>{p}</section>' for i, (h, p) in enumerate(sections))
    return hero(crumb, "Legal", title, "") .replace('<p class="lead reveal d2"></p>',
        f'<div class="meta-row reveal d2"><span>Effective {effective}</span><span>Last updated {updated}</span></div>') + f'''
    <section class="page-section">
      <div class="wrap legal">
        <nav class="toc" aria-label="Sections">
          <p class="toc-h">Contents</p>
          <ol>
            {toc}
          </ol>
        </nav>
        <div class="prose reveal">
          {body}
        </div>
      </div>
    </section>
  </main>
'''

CONTACT_P = '<p>Email <a href="mailto:team@aibrainstartup.com">team@aibrainstartup.com</a> · Phone <a href="tel:+919461127967">+91 94611 27967</a> · <a href="https://aibrainstartup.com/">aibrainstartup.com</a></p>'

PRIVACY = legal("Privacy policy", 'Privacy <span class="serif">policy</span>.', [
    ("Who we are", "<p>aibrainstartup.com is operated by AI BRAIN STARTUPS, a micro enterprise registered with the Government of India (Udyam UDYAM-RJ-05-0067280), Rajasthan, India. In this policy “we” means AI BRAIN STARTUPS.</p>"),
    ("What we collect", "<p>We only collect what you send us:</p><ul><li><strong>Waitlist:</strong> your email address and the role you select.</li><li><strong>Contact form:</strong> your name, email address, inquiry type and message.</li><li><strong>With each submission:</strong> the time, your approximate country (derived by our hosting provider from your IP address), your browser’s user-agent string and the page you came from.</li><li><strong>Abuse protection:</strong> a one-way hash of your IP address, kept for rate limiting and deleted automatically within about 24 hours.</li></ul><p>We do not store your raw IP address with your submission.</p>"),
    ("Cookies and analytics", "<p>This website does not set cookies and uses no advertising trackers or third-party scripts or fonts. We use <strong>Vercel Web Analytics</strong>, which is cookie-free and records aggregated page views (page, referrer, country, device type) without identifying individual visitors. Our hosting provider also keeps short-lived technical request logs for security and reliability.</p>"),
    ("Why we use it", "<p>To give you early access and send updates about AI Brain, to reply to your messages, and to protect the site from spam and abuse. We do not sell or rent your personal data.</p>"),
    ("Where it is stored", "<p>The site and its forms are hosted by Vercel Inc. Submissions are stored in a private Vercel Blob store located in the United States (Washington, D.C. region), accessible only to us. When a new submission arrives we may send ourselves an email notification through Resend (Resend Inc., United States). Data is encrypted in transit (TLS) and at rest by the providers.</p>"),
    ("How long we keep it", "<ul><li>Waitlist entries: until you ask us to delete them, or until early access ends.</li><li>Contact messages: up to 24 months, unless an ongoing conversation needs longer.</li><li>IP hashes used for rate limiting: about 24 hours.</li></ul>"),
    ("Your rights", "<p>You can ask us to access, correct or delete your data, or withdraw your consent at any time, including under India’s Digital Personal Data Protection Act, 2023. Email <a href=\"mailto:founder@aibrainstartup.com\">founder@aibrainstartup.com</a> and we will respond within 30 days.</p>"),
    ("Children", "<p>This website is not directed at children under 18, and we do not knowingly collect their data.</p>"),
    ("Changes", "<p>If we change this policy we will update the date at the top of this page.</p>"),
    ("Contact &amp; grievance officer", "<p>Bhoja Ram Choudhary, Founder — <a href=\"mailto:founder@aibrainstartup.com\">founder@aibrainstartup.com</a> · <a href=\"tel:+919461127967\">+91 94611 27967</a> · Rajasthan, India</p>"),
], effective="7 November 2026", updated="7 November 2026")

TERMS = legal("Terms of service", 'Terms of <span class="serif">service</span>.', [
    ("Acceptance of terms", "<p>By accessing or using aibrainstartup.com, you agree to these Terms of Service.</p>"),
    ("Description of service", "<p>AI Brain provides persistent memory architecture, autonomous agent systems and AI research previews for developers and enterprises.</p>"),
    ("User obligations", "<p>You agree not to misuse the platform, attempt unauthorised access, or use our services for illegal activities.</p>"),
    ("Intellectual property", "<p>All content, code, branding, architecture diagrams and software on this website are the intellectual property of AI Brain.</p>"),
    ("Limitation of liability", "<p>Our services are provided “as is” without warranty. We are not liable for damages arising from their use.</p>"),
    ("Governing law", "<p>These terms are governed by the laws of India.</p>"),
    ("Contact", CONTACT_P),
])

# ---------------------------------------------------------------- 404
NOTFOUND = '''
  <main id="main">
    <section class="nf">
      <canvas class="hero-canvas" id="graph" aria-hidden="true"></canvas>
      <div style="position:relative;z-index:1">
        <div class="nf-code" aria-hidden="true">4<span class="serif">0</span>4</div>
        <h1>This memory doesn’t exist.</h1>
        <p>The page or graph node you’re looking for was moved or never stored. Let’s get you back on track.</p>
        <div class="hero-actions">
          <a href="/" class="btn btn-primary">Back to home <span class="arrow">→</span></a>
          <a href="/docs" class="btn btn-ghost">Developer docs</a>
          <a href="/architecture" class="btn btn-ghost">Architecture</a>
        </div>
      </div>
    </section>
  </main>
'''

# ---------------------------------------------------------------- COMPARE
AUTHOR_BOX = '''
        <div class="author-box reveal">
          <div class="a-id">
            <div class="avatar" aria-hidden="true" style="width:52px;height:52px;font-size:1.1rem;border-radius:14px">BR</div>
            <div class="a-meta">
              <strong>Bhoja Ram Choudhary</strong>
              <span>Founder &amp; Chief Architect · AI BRAIN STARTUPS (UDYAM-RJ-05-0067280)</span>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <a href="/resume" class="btn btn-ghost btn-sm">Founder dossier</a>
            <a href="/about" class="btn btn-ghost btn-sm">Company</a>
          </div>
        </div>
'''

def article_hero(title, lead, kicker, meta):
    return f'''
  <main id="main">
    <section class="page-hero">
      <div class="wrap">
        <div class="crumbs reveal"><a href="/">Home</a><span>/</span><a href="/research">Research</a><span>/</span><span>{kicker}</span></div>
        <span class="kicker reveal" style="margin-top:28px">{kicker}</span>
        <h1 class="reveal d1">{title}</h1>
        <p class="lead reveal d2">{lead}</p>
        <div class="meta-row reveal d3"><span>Published 2026-11-26</span><span>{meta}</span><span>By Bhoja Ram Choudhary</span></div>
      </div>
    </section>
'''

COMPARE = hero("Compare", "Architectural Comparison · Honest Tradeoffs",
               'How AI Brain <span class="serif">compares</span>.',
               "An objective engineering breakdown of flat vector databases, extracted-memory SDKs, temporal knowledge graphs, agentic paging systems, and AI Brain's planned associative hypergraph.",
               '<div class="hero-actions reveal d3"><a href="/benchmarks" class="btn btn-primary">View evaluation protocol <span class="arrow">→</span></a><a href="/architecture" class="btn btn-ghost">System blueprint</a></div>') + '''
    <section class="page-section">
      <div class="wrap">
        <div class="status-banner reveal">
          <div>
            <strong>Development Status Disclosure</strong>
            <p>Mem0, Zep/Graphiti, Letta, and Cognee are publicly installable packages today. AI Brain is in active pre-release development (early-access waitlist and OpenAPI preview only — no fabricated head-to-head scores).</p>
          </div>
          <a href="/benchmarks" class="btn btn-ghost btn-sm">See protocol →</a>
        </div>

        <div class="sec-head">
          <div>
            <span class="kicker reveal">Side-by-side matrix</span>
            <h2 class="h2 reveal d1">Memory paradigms <span class="serif">evaluated</span>.</h2>
          </div>
          <p class="lead reveal d2">Architectural characteristics determine which failure mode appears first when agents cross hundreds of sessions.</p>
        </div>

        <div class="table-scroll reveal">
          <table class="cmp-table">
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Flat Vector DBs (Pinecone, Qdrant, pgvector)</th>
                <th>Extracted Fact Memory (Mem0 pattern)</th>
                <th>Temporal Knowledge Graph (Zep / Graphiti)</th>
                <th>Agentic OS Paging (Letta / MemGPT)</th>
                <th>Graph-Vector ETL (Cognee)</th>
                <th class="cmp-hi">AI Brain (Planned Design)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Core Data Model</th>
                <td>Isolated text chunks + dense ANN vector index</td>
                <td>LLM-extracted facts + key-value user/session store</td>
                <td>Bi-temporal episodic nodes + binary entity edges</td>
                <td>Core/archival/recall memory blocks managed by LLM tool calls</td>
                <td>Document ETL pipeline building ontology graphs + vectors</td>
                <td class="cmp-hi">Dual-layer associative N-ary hypergraph + dense embeddings</td>
              </tr>
              <tr>
                <th>Multi-Hop Causal Chains</th>
                <td>Single-step similarity; drops non-lexical bridging context</td>
                <td>Limited when extracted atomic facts lose provenance</td>
                <td>Good 2–3 hop entity walks with validity timestamps</td>
                <td>Requires extra LLM turns to search archival pages</td>
                <td>Strong offline ETL; slower on high-frequency live turn mutations</td>
                <td class="cmp-hi">Native multi-hop hyperedge traversal linking conversations, code, and decisions</td>
              </tr>
              <tr>
                <th>Multi-Agent Coordination</th>
                <td>External locking required by app team</td>
                <td>Scoped by user_id / agent_id namespace</td>
                <td>Shared graph storage with app-managed orchestration</td>
                <td>Message passing across independent stateful agents</td>
                <td>Shared dataset graph</td>
                <td class="cmp-hi">Built-in Swarm Consensus protocol (planned <code class="mono">/v1/swarm/sync</code>)</td>
              </tr>
              <tr>
                <th>Latency &amp; Compute Plane</th>
                <td>Fast ANN lookup (single index)</td>
                <td>Write path incurs LLM extraction latency</td>
                <td>Graph + embedding hybrid query</td>
                <td>Tool-call round trips add LLM inference latency</td>
                <td>Batch/pipeline ingestion latency</td>
                <td class="cmp-hi">Compiled C++20/systems traversal kernels (&lt;15ms design target) + GCP Cloud plane</td>
              </tr>
              <tr>
                <th>DPDP / Deterministic Erasure</th>
                <td>Needs full chunk re-scan &amp; metadata filter rebuild</td>
                <td>Delete by extracted fact ID</td>
                <td>Graph node/edge tombstone or deletion</td>
                <td>Delete archival blocks via storage engine</td>
                <td>Graph + vector cleanup pipeline</td>
                <td class="cmp-hi">Tenant-partitioned graph subtrees + Cloud KMS &amp; VPC-SC controls (planned)</td>
              </tr>
              <tr>
                <th>Public Availability</th>
                <td>Mature production products</td>
                <td>Public OSS / Hosted SaaS available today</td>
                <td>Public OSS / Hosted Cloud available today</td>
                <td>Public OSS / Server available today</td>
                <td>Public OSS available today</td>
                <td class="cmp-hi">In development (Waitlist &amp; OpenAPI 3.1 preview at <a href="/docs" class="accent">/docs</a>)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap">
        <div class="sec-head">
          <div>
            <span class="kicker reveal">When to choose what</span>
            <h2 class="h2 reveal d1">Pragmatic <span class="serif">engineering</span> guidance.</h2>
          </div>
        </div>
        <div class="grid-3">
          <article class="card reveal">
            <span class="eyebrow-mono">Use Today</span>
            <h3>Shipping immediately</h3>
            <p>If your agent stack needs an installable pip/npm package in production this week for lightweight chat personalization or bi-temporal enterprise timeline tracking, evaluate established open-source offerings like Mem0, Zep/Graphiti, Letta, or Cognee.</p>
          </article>
          <article class="card reveal d1">
            <span class="eyebrow-mono">Flat Vector Limit</span>
            <h3>When cosine RAG breaks</h3>
            <p>If your multi-agent system loses architectural constraints across 100+ turns, fails multi-hop code provenance lookups, or suffers runaway context replay bills, flat chunk retrieval cannot express N-ary relationships without graph structure.</p>
          </article>
          <article class="card reveal d2">
            <span class="eyebrow-mono">Evaluate AI Brain</span>
            <h3>For early-access R&amp;D</h3>
            <p>Join our <a href="/#waitlist" class="accent">early-access waitlist</a> or review the <a href="/openapi.json" class="accent">OpenAPI 3.1 preview</a> if you want sub-15ms graph traversal kernels, Swarm Consensus state sync, and India/global data residency readiness.</p>
          </article>
        </div>
      </div>
    </section>
''' + CTA + '''  </main>\n'''

# ---------------------------------------------------------------- BENCHMARKS
BENCHMARKS = hero("Benchmarks", "Evaluation Protocol · Transparent Status",
                  'Benchmarks &amp; <span class="serif">protocol</span>.',
                  "How we plan to evaluate associative hypergraph recall, multi-hop latency, and redundant token savings — with zero fabricated or pre-audit numbers.",
                  '<div class="hero-actions reveal d3"><a href="/benchmarks.json" class="btn btn-primary">Download benchmarks.json ↗</a><a href="/compare" class="btn btn-ghost">Compare architectures</a></div>') + '''
    <section class="page-section">
      <div class="wrap">
        <div class="status-banner reveal">
          <div>
            <strong>Integrity Commitment · Published Scores Pending</strong>
            <p>AI Brain is currently in active development. We distinguish pre-release engineering targets from audited test results and will never publish unverified synthetic LoCoMo or LongMemEval claims.</p>
          </div>
          <a href="/benchmarks.json" class="btn btn-ghost btn-sm">Inspect JSON schema</a>
        </div>

        <div class="sec-head">
          <div>
            <span class="kicker reveal">Planned Evaluation Suite</span>
            <h2 class="h2 reveal d1">Four verification <span class="serif">dimensions</span>.</h2>
          </div>
          <p class="lead reveal d2">Once our public evaluation harness ships under <a href="https://github.com/Sutra-AGI" target="_blank" rel="noopener noreferrer" class="accent">github.com/Sutra-AGI</a>, every metric below will link directly to reproducible scripts.</p>
        </div>

        <div class="table-scroll reveal">
          <table class="cmp-table">
            <thead>
              <tr>
                <th>Suite / Metric</th>
                <th>What It Measures</th>
                <th>Pre-Release Status</th>
                <th class="cmp-hi">Design Target / Planned Protocol</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>LoCoMo</th>
                <td>Long-term multi-session conversational QA, multi-hop causal inference, and temporal recall over 300+ turn dialogues.</td>
                <td>Harness Planned (Measured: pending)</td>
                <td class="cmp-hi">Evaluate F1, LLM-Judge precision, and Multi-Hop Recall@k against flat vector baseline.</td>
              </tr>
              <tr>
                <th>LongMemEval</th>
                <td>Belief updates, contradiction resolution, user preference shifts, and hallucination abstention.</td>
                <td>Harness Planned (Measured: pending)</td>
                <td class="cmp-hi">Measure temporal update accuracy and false-positive recall abstention rate.</td>
              </tr>
              <tr>
                <th>4-Hop Graph Traversal Latency</th>
                <td>Wall-clock p99 query latency across compiled C++20/systems associative traversal kernels.</td>
                <td>Engineering Design Target</td>
                <td class="cmp-hi"><code class="mono">&lt; 15 ms (p99)</code> under concurrent multi-agent load.</td>
              </tr>
              <tr>
                <th>Context Token Efficiency</th>
                <td>Prompt input tokens injected via bounded subgraph recall vs naive full-session history replay.</td>
                <td>Mathematical Model Target</td>
                <td class="cmp-hi"><code class="mono">~91%</code> redundant input-token reduction vs full re-send (see <a href="/research/hypergraph-vs-vector-rag-token-math" class="accent">token math derivation</a>).</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mini-stats reveal" style="margin-top:28px">
          <div><strong>Pending</strong><span>Published LoCoMo score</span><small>Public harness forthcoming</small></div>
          <div><strong>&lt; 15ms</strong><span>4-hop p99 latency target</span><small>Design goal · not yet benchmarked</small></div>
          <div><strong>0%</strong><span>Target context decay</span><small>Temporal decay protection goal</small></div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="wrap">
        <div class="sec-head">
          <div>
            <span class="kicker reveal">Baseline Topology</span>
            <h2 class="h2 reveal d1">Planned reference <span class="serif">environment</span>.</h2>
          </div>
        </div>
        <div class="grid-3">
          <article class="card reveal"><span class="eyebrow-mono">Traversal Plane</span><h3>Compiled systems kernel</h3><p>Low-overhead C++20 graph traversal workers designed to avoid Python GIL bottlenecks on deep multi-hop neighborhood expansion.</p></article>
          <article class="card reveal d1"><span class="eyebrow-mono">Cloud Plane</span><h3>Google Cloud Run · GKE · TPU</h3><p>Horizontal serverless routing via Cloud Run paired with Vertex AI cognition and GCS/hypergraph persistence (see <a href="/architecture" class="accent">architecture</a>).</p></article>
          <article class="card reveal d2"><span class="eyebrow-mono">Reproducibility</span><h3>Machine-readable output</h3><p>All planned harness outputs conform to <a href="/benchmarks.json" class="accent">/benchmarks.json</a> with hardware specs, commit SHA, and nullable raw scores.</p></article>
        </div>
      </div>
    </section>
''' + CTA + '''  </main>\n'''

# ---------------------------------------------------------------- RESEARCH INDEX
RESEARCH = hero("Research", "Engineering Notes · Technical Depth",
                'Research &amp; <span class="serif">architecture</span> notes.',
                "First-principles engineering essays on why vector similarity plateaus on multi-hop agent reasoning, prompt-window token economics, and DPDP Act 2023 compliance in India.",
                '<div class="hero-actions reveal d3"><a href="/feed.xml" class="btn btn-primary">Subscribe RSS feed ↗</a><a href="/compare" class="btn btn-ghost">View comparison matrix</a></div>') + '''
    <section class="page-section">
      <div class="wrap">
        <div class="article-list">
          <article class="article-card reveal">
            <div>
              <div class="article-meta"><span class="topic">Graph Retrieval</span><span>2026-11-26</span><span>6 min read</span></div>
              <h2><a href="/research/why-cosine-similarity-fails-multi-hop-reasoning">Why Cosine Similarity Fails Multi-Hop Agent Reasoning</a></h2>
              <p>Dense single-step ANN search drops transitive causal links when intermediate decisions do not share surface tokens with the final query. Here is the structural fix with N-ary hyperedges.</p>
            </div>
            <a href="/research/why-cosine-similarity-fails-multi-hop-reasoning" class="btn btn-ghost">Read paper →</a>
          </article>

          <article class="article-card reveal d1">
            <div>
              <div class="article-meta"><span class="topic">Token Economics</span><span>2026-11-26</span><span>5 min read</span></div>
              <h2><a href="/research/hypergraph-vs-vector-rag-token-math">Hypergraph vs Vector RAG: The Token Cost Math</a></h2>
              <p>Explicit token-cost equations comparing naive quadratic history replay, oversized RAG top-k chunk stuffing, and bounded associative subgraph injection.</p>
            </div>
            <a href="/research/hypergraph-vs-vector-rag-token-math" class="btn btn-ghost">Read paper →</a>
          </article>

          <article class="article-card reveal d2">
            <div>
              <div class="article-meta"><span class="topic">India &amp; Governance</span><span>2026-11-26</span><span>7 min read</span></div>
              <h2><a href="/research/dpdp-compliant-agent-memory-india">Building DPDP-Compliant Agent Memory in India</a></h2>
              <p>Designing cryptographic tenant isolation, minimal retention boundaries, and deterministic node/edge erasure under India’s Digital Personal Data Protection (DPDP) Act, 2023.</p>
            </div>
            <a href="/research/dpdp-compliant-agent-memory-india" class="btn btn-ghost">Read paper →</a>
          </article>
        </div>
''' + AUTHOR_BOX + '''
      </div>
    </section>
''' + CTA + '''  </main>\n'''

# ---------------------------------------------------------------- RESEARCH ARTICLES
ART_COSINE = article_hero(
    'Why Cosine Similarity <span class="serif">Fails</span> Multi-Hop Agent Reasoning',
    "Single-step approximate nearest neighbor search retrieves lexically or topically adjacent fragments — not causal reasoning chains across multi-session timelines.",
    "Graph Retrieval",
    "6 min read"
) + '''
    <section class="page-section">
      <div class="wrap article-body">
        <h2>1. The Transitivity Blind Spot in Dense Vectors</h2>
        <p>Consider a real engineering workflow spanning three sessions over two weeks:</p>
        <ul>
          <li><strong>Session 1 (Day 1):</strong> An architect specifies that tenant payment settlement logs must stay inside <code class="mono">asia-south1</code> for regulatory residency.</li>
          <li><strong>Session 14 (Day 9):</strong> A service module <code class="mono">settlement_worker.py</code> is introduced to process async webhooks.</li>
          <li><strong>Session 42 (Day 14):</strong> A coding agent is asked: <em>“Where should we deploy the new async webhook worker?”</em></li>
        </ul>
        <p>Notice the geometric failure: the query embedding mentions <strong>“async webhook worker deployment”</strong>. Session 1’s policy node mentions <strong>“payment settlement logs residency”</strong>. Their pairwise cosine similarity is frequently below the <code class="mono">top-k</code> cutoff because the bridging entity (<code class="mono">settlement_worker.py</code>) lives in Session 14.</p>

        <h2>2. Why Larger Top-K and Rerankers Only Mask the Bug</h2>
        <p>Standard vector RAG pipelines try to patch missing bridges by fetching <code class="mono">top-k = 40</code> or <code class="mono">80</code> chunks and feeding them to a cross-encoder reranker. That approach runs into two walls:</p>
        <ol>
          <li><strong>Quadratic dilution ("lost in the middle"):</strong> Flooding the prompt with 25,000+ semi-relevant tokens degrades attention over rare constraint rules.</li>
          <li><strong>Broken cross-chunk provenance:</strong> Even when Session 1 and Session 14 appear separately, nothing structurally proves that Session 1 constrains Session 14’s deployment target unless a relational edge connects them.</li>
        </ol>

        <h2>3. Associative N-ary Hypergraphs as the Retrieval Substrate</h2>
        <p>In AI Brain’s planned associative hypergraph model, an atomic memory is not an isolated chunk — it participates in typed <strong>hyperedges</strong> binding actors, intents, files, policies, and temporal validity together.</p>
        <div class="formula">Recall(Q) = ExpandEdges(ANN_Seeds(Q), depth=4, decay_guard=True) -> BoundedSubgraph(k)</div>
        <p>When <code class="mono">recall()</code> seeds on <code class="mono">settlement_worker.py</code> via vector similarity, traversing typed edges over 2 to 4 hops surfaces the upstream <code class="mono">asia-south1</code> residency policy automatically — without scanning unrelated turns.</p>

        <h3>Related Engineering Resources</h3>
        <ul>
          <li><a href="/compare" class="accent">Compare Flat Vector DBs vs Temporal Graphs vs AI Brain</a></li>
          <li><a href="/research/hypergraph-vs-vector-rag-token-math" class="accent">Hypergraph vs Vector RAG: The Token Cost Math</a></li>
          <li><a href="/architecture" class="accent">Explore AI Brain System Architecture Blueprint</a></li>
        </ul>
''' + AUTHOR_BOX + '''
      </div>
    </section>
''' + CTA + '''  </main>\n'''

ART_TOKEN_MATH = article_hero(
    'Hypergraph vs Vector RAG: The <span class="serif">Token</span> Cost Math',
    "Explicit algebraic comparison showing why naive history replay scales quadratically with conversation length while bounded subgraph injection stays near-constant per turn.",
    "Token Economics",
    "5 min read"
) + '''
    <section class="page-section">
      <div class="wrap article-body">
        <h2>1. The Quadratic Replay Trap</h2>
        <p>When an application has no persistent external memory and simply appends each conversation turn back into the LLM context window, cumulative input token consumption across <code class="mono">N</code> turns grows as an arithmetic series:</p>
        <div class="formula">T_replay(N) = Sum_{i=1..N} (S_sys + i * L_turn) = N * S_sys + L_turn * N * (N + 1) / 2</div>
        <p>Where <code class="mono">S_sys</code> is system prompt overhead and <code class="mono">L_turn</code> is average tokens added per turn. Doubling session length roughly <strong>quadruples</strong> cumulative input token billing and increases time-to-first-token latency linearly per turn.</p>

        <h2>2. Why Oversized Chunk RAG Still Overpays</h2>
        <p>Naive chunk RAG breaks sessions into fixed 500-token slices and retrieves <code class="mono">K = 20</code> chunks per query (<code class="mono">10,000</code> tokens of surrounding boilerplate) even when the actual decision rule requires only three structured facts totaling ~120 tokens.</p>

        <h2>3. Bounded Associative Subgraph Model (Design Target)</h2>
        <p>Under a structured graph retrieval policy, each query pays only for system framing plus a bounded <code class="mono">k</code>-node subgraph serialized concisely:</p>
        <div class="formula">T_graph(N) = N * (S_sys + K_nodes * L_node + Q_turn)   [O(N) cumulative vs O(N^2) replay]</div>
        <p>For illustration in our <a href="/#calculator" class="accent">homepage savings model</a> (150 files, 850 tokens/file baseline, 80 daily queries across 5 developers): naive full-file re-send touches roughly <code class="mono">1.53B</code> input tokens/month, whereas retrieving compact subgraphs targets up to <strong>~91% redundant token reduction</strong> depending on query graph fan-out.</p>
        <p><em>Honesty note:</em> Actual production savings vary by workload sparsity, cache hit rate (prompt caching), and embedding frequency. See <a href="/benchmarks" class="accent">/benchmarks</a> for our planned reproducible measurement methodology.</p>
''' + AUTHOR_BOX + '''
      </div>
    </section>
''' + CTA + '''  </main>\n'''

ART_DPDP = article_hero(
    'Building <span class="serif">DPDP-Compliant</span> Agent Memory in India',
    "Architectural patterns for strict tenant isolation, purpose limitation, and deterministic memory erasure under India’s Digital Personal Data Protection Act, 2023.",
    "India &amp; Governance",
    "7 min read"
) + '''
    <section class="page-section">
      <div class="wrap article-body">
        <h2>1. Why Vector Stores Struggle with Right-to-Erasure</h2>
        <p>Under India’s <strong>DPDP Act, 2023</strong> (Section 12 — Right to correction and erasure of personal data), Data Principals can withdraw consent and demand verifiable deletion of their personal context. Append-only RAG stores face serious operational friction:</p>
        <ul>
          <li>A single conversation chunk often entangles multiple entities and shared system summaries.</li>
          <li>Rebuilding HNSW vector indexes after sparse metadata deletion causes write amplification or temporarily leaked stale vectors in replicas.</li>
        </ul>

        <h2>2. Tenant-Partitioned Memory Graphs + Deterministic Tombstones</h2>
        <p>AI Brain’s planned architecture models privacy as a first-class graph boundary rather than an afterthought:</p>
        <ol>
          <li><strong>Cryptographic Tenant Namespaces:</strong> Per-tenant envelope keys managed with Cloud KMS (AES-256 at rest) and TLS 1.3 in transit inside VPC Service Controls boundaries.</li>
          <li><strong>Scoped Node Ownership:</strong> Every episodic memory node carries explicit <code class="mono">tenant_id</code> and <code class="mono">subject_id</code> ownership so deletion cascades deterministically along owned hyperedges.</li>
          <li><strong>Regional Residency Enforcement:</strong> Separating stateless compute gateways from regional graph storage planes (<code class="mono">asia-south1</code> Mumbai / Delhi) for regulated Indian fintech and enterprise deployments.</li>
        </ol>

        <h2>3. Auditability for Enterprise &amp; Cross-Border Teams</h2>
        <p>Registered in Rajasthan, India (<code class="mono">AI BRAIN STARTUPS · UDYAM-RJ-05-0067280</code>), AI Brain is architected to serve both domestic Indian DPDP workloads and global enterprise compliance requirements. Review our <a href="/privacy-policy" class="accent">Privacy Policy</a> and <a href="/architecture" class="accent">Security Architecture</a> for full control specifications.</p>
''' + AUTHOR_BOX + '''
      </div>
    </section>
''' + CTA + '''  </main>\n'''

PAGES = {
    "about": ("about", ABOUT), "architecture": ("architecture", ARCH), "docs": ("docs", DOCS),
    "compare": ("compare", COMPARE), "benchmarks": ("benchmarks", BENCHMARKS), "research": ("research", RESEARCH),
    "research/why-cosine-similarity-fails-multi-hop-reasoning": ("research", ART_COSINE),
    "research/hypergraph-vs-vector-rag-token-math": ("research", ART_TOKEN_MATH),
    "research/dpdp-compliant-agent-memory-india": ("research", ART_DPDP),
    "contact": ("contact", CONTACT), "privacy-policy": (None, PRIVACY), "terms-of-service": (None, TERMS),
    "404": (None, NOTFOUND),
}

for name, (active, body) in PAGES.items():
    path = ROOT / f"{name}.html"
    src = path.read_text()
    src = src.replace('AI Brain Inc. / ', '').replace('AI Brain Inc.', 'AI BRAIN STARTUPS')
    out = clean_head(src) + FONTS + "</head>\n<body>\n  <a class=\"skip\" href=\"#main\">Skip to content</a>\n" + nav(active) + body + FOOTER
    # Root-absolute URLs so pages (esp. 404 or nested /research/*) never resolve relatively
    out = re.sub(r'(href|src)="(about|architecture|docs|compare|benchmarks|research|contact|invest|privacy-policy|terms-of-service|home(?:\.min)?\.css|pages(?:\.min)?\.css|invest(?:\.min)?\.css|home(?:\.min)?\.js|invest(?:\.min)?\.js|favicon\.ico|logo\.png|manifest\.json)(["?#])',
                 r'\1="/\2\3', out)
    # Assets: new icons / OG image; make sure every page has a social preview image.
    out = (out.replace('href="/logo.png"', 'href="/icons/apple-touch-icon.png"')
              .replace('https://aibrainstartup.com/logo.png', 'https://aibrainstartup.com/icons/icon-512.png')
              .replace('og-image.png', 'og.jpg'))
    if 'property="og:image"' not in out:
        out = out.replace('  <meta name="theme-color"', '  <meta property="og:image" content="https://aibrainstartup.com/og.jpg">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:image" content="https://aibrainstartup.com/og.jpg">\n  <meta name="theme-color"', 1)
    path.write_text(out)
    print(f"built {name}.html ({len(out):,} bytes)")

# Hand-written pages (homepage, Hindi homepage, resume, admin, invest & portal sub-pages): refresh minified asset references & inline homepage CSS.
inline_home = (ROOT / "home.min.css").read_text()
for page in ("index.html", "hi.html", "resume.html", "admin.html", "invest.html", "invest/terms.html", "invest/wire.html", "invest/tech.html", "invest/deck.html", "invest/policy.html", "invest/disclosures.html"):
    f = ROOT / page
    txt = f.read_text()
    txt = re.sub(r'((?:home|pages|admin|invest))(?:\.min)?\.(css|js)\?v=[\w]+', rf'\1.min.\2?v={V}', txt)
    if page in ("index.html", "hi.html"):
        txt = re.sub(r'<style id="inlineHomeCss">.*?</style>', lambda _m: f'<style id="inlineHomeCss">{inline_home}</style>', txt, flags=re.S)
    f.write_text(txt)
import datetime

def git_lastmod(rel_path, fallback):
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%cs", "--", rel_path],
            cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
        if re.match(r"^\d{4}-\d{2}-\d{2}$", out):
            return out
    except Exception:
        pass
    return fallback

def update_sitemap():
    today = datetime.date.today().isoformat()
    lm = lambda p: git_lastmod(p, today)
    sitemap = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://aibrainstartup.com/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://aibrainstartup.com/"/>
    <xhtml:link rel="alternate" hreflang="hi" href="https://aibrainstartup.com/hi"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://aibrainstartup.com/"/>
    <lastmod>{lm("index.html")}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>https://aibrainstartup.com/og.jpg</image:loc>
      <image:title>AI Brain — AI that never forgets</image:title>
    </image:image>
  </url>
  <url>
    <loc>https://aibrainstartup.com/hi</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://aibrainstartup.com/"/>
    <xhtml:link rel="alternate" hreflang="hi" href="https://aibrainstartup.com/hi"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://aibrainstartup.com/"/>
    <lastmod>{lm("hi.html")}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/architecture</loc>
    <lastmod>{lm("architecture.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/docs</loc>
    <lastmod>{lm("docs.html")}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/compare</loc>
    <lastmod>{lm("compare.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/benchmarks</loc>
    <lastmod>{lm("benchmarks.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/research</loc>
    <lastmod>{lm("research.html")}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/research/why-cosine-similarity-fails-multi-hop-reasoning</loc>
    <lastmod>{lm("research/why-cosine-similarity-fails-multi-hop-reasoning.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/research/hypergraph-vs-vector-rag-token-math</loc>
    <lastmod>{lm("research/hypergraph-vs-vector-rag-token-math.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/research/dpdp-compliant-agent-memory-india</loc>
    <lastmod>{lm("research/dpdp-compliant-agent-memory-india.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/about</loc>
    <lastmod>{lm("about.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/resume</loc>
    <lastmod>{lm("resume.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/invest</loc>
    <lastmod>{lm("invest.html")}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/invest/deck</loc>
    <lastmod>{lm("invest/deck.html")}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/invest/terms</loc>
    <lastmod>{lm("invest/terms.html")}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/invest/wire</loc>
    <lastmod>{lm("invest/wire.html")}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/invest/policy</loc>
    <lastmod>{lm("invest/policy.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/invest/disclosures</loc>
    <lastmod>{lm("invest/disclosures.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/contact</loc>
    <lastmod>{lm("contact.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/privacy-policy</loc>
    <lastmod>{lm("privacy-policy.html")}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>https://aibrainstartup.com/terms-of-service</loc>
    <lastmod>{lm("terms-of-service.html")}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
  </url>
</urlset>
'''
    (ROOT / "sitemap.xml").write_text(sitemap)
    print(f"generated sitemap.xml with git lastmod (fallback={today})")

update_sitemap()
print(f"asset version: {V}")
