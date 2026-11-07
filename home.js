/* AI Brain — homepage interactions (v3). No dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } }
  };

  /* ---------- Nav ---------- */
  function initNav() {
    const nav = $('#nav'), btn = $('#menuBtn'), panel = $('#mobilePanel');
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      panel.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    btn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    $$('a', panel).forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    window.matchMedia('(min-width: 1025px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
  }

  /* ---------- Hero hypergraph canvas ---------- */
  function initGraph() {
    const canvas = $('#graph');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, nodes = [], pulses = [], raf = 0, visible = true;
    const mouse = { x: -9999, y: -9999 };
    const ACCENT = [200, 255, 61];

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(110, Math.max(40, (w * h) / 14000)));
      // Bias nodes toward the right side on desktop so the headline stays readable
      const bias = w > 900 ? 0.42 : 0;
      nodes = Array.from({ length: count }, () => ({
        x: (bias + Math.random() * (1 - bias)) * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() < 0.14 ? 2.6 : 1.3,
        hot: Math.random() < 0.14
      }));
      pulses = [];
    }

    const LINK = () => Math.min(170, Math.max(110, w / 9));

    function frame() {
      ctx.clearRect(0, 0, w, h);
      const link = LINK(), link2 = link * link;

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        const dx = n.x - mouse.x, dy = n.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 22000) { n.x += dx * 0.006; n.y += dy * 0.006; }
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 > link2) continue;
          const t = 1 - d2 / link2;
          const hot = a.hot && b.hot;
          ctx.strokeStyle = hot ? `rgba(${ACCENT},${0.5 * t})` : `rgba(242,241,236,${0.11 * t})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          if (!reduceMotion && pulses.length < 14 && Math.random() < 0.00035) pulses.push({ a, b, t: 0 });
        }
      }

      for (const n of nodes) {
        ctx.fillStyle = n.hot ? `rgb(${ACCENT})` : 'rgba(242,241,236,0.55)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
        if (n.hot && n.r > 2) {
          ctx.fillStyle = `rgba(${ACCENT},0.12)`;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2); ctx.fill();
        }
      }

      pulses = pulses.filter(p => (p.t += 0.018) < 1);
      for (const p of pulses) {
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.fillStyle = `rgba(${ACCENT},${1 - p.t * 0.6})`;
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      }

      if (!reduceMotion && visible) raf = requestAnimationFrame(frame);
    }

    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); start(); }, 150); });
    canvas.parentElement.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) start(); });
    build(); start();
  }

  /* ---------- Scroll reveal + counters ---------- */
  function initReveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        $$('[data-count]', e.target).forEach(countUp);
        io.unobserve(e.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => io.observe(e));
  }
  function countUp(el) {
    const end = +el.dataset.count, t0 = performance.now(), dur = 1200;
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Card spotlight ---------- */
  function initSpotlight() {
    $$('.card').forEach(c => c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${e.clientX - r.left}px`);
      c.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
  }

  /* ---------- Agents ---------- */
  const AGENTS = [
    { id: 'research', name: 'Research Agent', tag: 'Deep-scan investigator',
      desc: 'Searches literature, synthesises datasets and writes structured executive reports.',
      features: ['Paper discovery & citation extraction', 'Multi-document cross-referencing', 'Live web & database crawling'],
      file: 'research_agent.sh',
      log: [['k', '$ aibrain run research --mode=deep_scan'], ['s', '> recalling 214 related memories…'], ['c', '[+] 38 papers analysed'], ['c', '[+] 112 entity nodes linked to graph'], ['ok', '✓ executive synthesis ready (2.4s)']] },
    { id: 'coding', name: 'Coding Agent', tag: 'Software synthesis',
      desc: 'Refactors multi-file codebases, writes tests and keeps lint clean — with memory of every prior change.',
      features: ['Codebase-wide awareness', 'Unit test generation & execution', 'Static analysis compliance'],
      file: 'coding_agent.sh',
      log: [['k', '$ aibrain run coding --task="refactor graph storage"'], ['s', '> loading project memory: 1,284 commits'], ['c', '[+] interfaces standardised'], ['c', '[+] 146 tests passed'], ['ok', '✓ build verified, 0 lint errors']] },
    { id: 'strategy', name: 'Strategy Agent', tag: 'Tactical risk advisor',
      desc: 'Models scenarios, drafts OKRs and assesses operational risk against everything the org already knows.',
      features: ['Scenario modelling & risk matrix', 'Milestone & priority tracking', 'Competitive intelligence'],
      file: 'strategy_agent.sh',
      log: [['k', '$ aibrain run strategy --target="infra scaling"'], ['s', '> recalling Q1–Q3 decisions…'], ['c', '[+] allocation model computed'], ['c', '[+] ROI projection: 3 scenarios'], ['ok', '✓ roadmap generated']] },
    { id: 'knowledge', name: 'Knowledge Agent', tag: 'Hypergraph sync',
      desc: 'Indexes concepts in real time, disambiguates entities and links unstructured data into the graph.',
      features: ['Semantic indexing & embeddings', 'Schema alignment & graph expansion', 'Sub-second relational lookup'],
      file: 'knowledge_agent.sh',
      log: [['k', '$ aibrain run knowledge --action=sync'], ['s', '> embedding 3,920 new points…'], ['c', '[+] 41 entities merged'], ['c', '[+] clustering complete'], ['ok', '✓ knowledge mesh synchronised']] },
    { id: 'automation', name: 'Automation Agent', tag: 'CI/CD & cloud triggers',
      desc: 'Connects webhooks, triggers pipelines and monitors cloud health around the clock.',
      features: ['Event-driven pipelines', 'Self-healing monitoring', 'Cloud trigger management'],
      file: 'automation_agent.sh',
      log: [['k', '$ aibrain run automation --pipeline=prod_deploy'], ['s', '> running pre-flight checks…'], ['c', '[+] SSL valid · CDN cache primed'], ['c', '[+] 0 regressions vs last deploy'], ['ok', '✓ pipeline completed']] }
  ];

  function initAgents() {
    const list = $('#agentList');
    if (!list) return;
    let typer = 0;
    list.innerHTML = AGENTS.map((a, i) => `
      <button class="agent-btn" role="tab" id="tab-${a.id}" aria-controls="agentPanel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}">
        <span class="i">0${i + 1}</span><strong>${a.name}</strong><small>${a.tag}</small>
      </button>`).join('');
    const btns = $$('.agent-btn', list);

    function show(i, instant) {
      const a = AGENTS[i];
      btns.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
      $('#agentPanel').setAttribute('aria-labelledby', `tab-${a.id}`);
      $('#agentName').textContent = a.name;
      $('#agentDesc').textContent = a.desc;
      $('#agentFeatures').innerHTML = a.features.map(f => `<li>${f}</li>`).join('');
      $('#agentFile').textContent = a.file;
      typeLog(a.log, instant);
    }

    function typeLog(lines, instant) {
      const pre = $('#agentTerm');
      clearTimeout(typer);
      const render = n => lines.slice(0, n).map(([c, t]) => `<span class="t-${c}">${t}</span>`).join('\n');
      if (reduceMotion || instant) { pre.innerHTML = render(lines.length) + ' <span class="caret"></span>'; return; }
      let n = 0;
      const step = () => {
        pre.innerHTML = render(n) + (n < lines.length ? '\n<span class="caret"></span>' : ' <span class="caret"></span>');
        if (n++ < lines.length) typer = setTimeout(step, n === 1 ? 150 : 420);
      };
      step();
    }

    list.addEventListener('click', e => { const b = e.target.closest('.agent-btn'); if (b) show(+b.dataset.i); });
    list.addEventListener('keydown', e => {
      const cur = btns.findIndex(b => b.getAttribute('aria-selected') === 'true');
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const next = (cur + dir + btns.length) % btns.length;
      show(next); btns[next].focus();
    });

    // Render immediately (no empty panel), then replay typing when visible
    show(0, true);
    let started = false;
    new IntersectionObserver(([e], io) => {
      if (e.isIntersecting && !started) { started = true; show(0); io.disconnect(); }
    }, { threshold: 0.3 }).observe($('#agentPanel'));
  }

  /* ---------- SDK snippet ---------- */
  const SDK = {
    py: { plain: `import aibrain

client = aibrain.Client(api_key="sk_live_...")

# Recall long-term context for this user
ctx = client.memory.recall(user_id="usr_42", query="current sprint")

# Run an agent that remembers
res = client.agents.run(
    agent="coding",
    prompt="Fix the flaky test",
    context=ctx,
)
print(res.output)` },
    ts: { plain: `import { AIBrain } from "@aibrain/sdk";

const brain = new AIBrain({ apiKey: process.env.AIBRAIN_KEY });

// Recall long-term context for this user
const ctx = await brain.memory.recall({
  userId: "usr_42",
  query: "current sprint",
});

// Run an agent that remembers
const res = await brain.agents.run({
  agent: "coding",
  prompt: "Fix the flaky test",
  context: ctx,
});
console.log(res.output);` }
  };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function highlight(src) {
    return esc(src)
      .replace(/(#.*|\/\/.*)$/gm, '<span class="t-c">$1</span>')
      .replace(/(&quot;[^&]*?&quot;)/g, '<span class="t-s">$1</span>')
      .replace(/\b(import|from|const|await|new|print)\b/g, '<span class="t-k">$1</span>');
  }
  function initSdk() {
    const pre = $('#sdkCode');
    if (!pre) return;
    let lang = 'py';
    const render = () => { pre.innerHTML = highlight(SDK[lang].plain); };
    $$('.sdk-tabs button').forEach(b => b.addEventListener('click', () => {
      lang = b.dataset.lang;
      $$('.sdk-tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
      render();
    }));
    $('#copyBtn').addEventListener('click', async e => {
      try { await navigator.clipboard.writeText(SDK[lang].plain); e.target.textContent = 'copied'; }
      catch { e.target.textContent = 'press ⌘C'; }
      setTimeout(() => { e.target.textContent = 'copy'; }, 1600);
    });
    render();
  }

  /* ---------- Calculator ---------- */
  function initCalc() {
    const f = $('#cFiles'), q = $('#cQueries'), d = $('#cDevs');
    if (!f) return;
    const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : String(Math.round(n));
    const money = n => '$' + Math.round(n).toLocaleString('en-US');
    const fill = el => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
    function calc() {
      [f, q, d].forEach(fill);
      const files = +f.value, prompts = +q.value, devs = +d.value;
      $('#oFiles').textContent = files; $('#oQueries').textContent = prompts; $('#oDevs').textContent = devs;
      const tokens = files * 850 * prompts * 30 * devs;
      const eff = Math.min(98.5, 85 + files * 0.015);
      $('#rTokens').textContent = fmt(tokens);
      $('#rEff').textContent = eff.toFixed(1) + '%';
      $('#rCost').textContent = money(tokens * (eff / 100) * 3 / 1e6);
    }
    [f, q, d].forEach(el => el.addEventListener('input', calc));
    calc();
  }

  /* ---------- Memory demo ---------- */
  function initDemo() {
    const chat = $('#chat'), form = $('#chatForm'), input = $('#chatInput');
    if (!chat) return;
    const memories = [];
    const add = (cls, text, mem) => {
      const el = document.createElement('div');
      el.className = `msg ${cls}`;
      el.textContent = text;
      if (mem) { const m = document.createElement('span'); m.className = 'mem'; m.textContent = mem; el.appendChild(m); }
      chat.appendChild(el);
      chat.scrollTop = chat.scrollHeight;
      return el;
    };
    const setCount = () => { $('#memCount').textContent = `${memories.length} ${memories.length === 1 ? 'memory' : 'memories'}`; };

    function reply(text) {
      const t = text.toLowerCase();
      if (/remember|know about me|who am i|recall/.test(t)) {
        if (!memories.length) return ["I don't have anything about you yet. Tell me something — a name, a project, a preference — and ask again.", null];
        return [`Here's what I remember:\n• ${memories.join('\n• ')}`, `↳ recalled ${memories.length} node${memories.length > 1 ? 's' : ''} · 11ms`];
      }
      if (/persistent|memory work|how does.*memory/.test(t))
        return ['Every exchange is embedded and written into a hypergraph as linked nodes — people, projects, decisions. At query time I traverse the graph to pull only what\'s relevant, so context survives across sessions without resending everything.', '↳ graph traversal · 3 hops'];
      if (/cloud|scale|google|gcp/.test(t))
        return ['Requests hit a serverless Cloud Run gateway, cognition runs on Vertex AI, and the graph is persisted across Firestore, BigQuery and GCS. Agent runtimes autoscale on GKE.', null];
      if (/agent/.test(t) && t.includes('?'))
        return ['Five specialists — research, coding, strategy, knowledge and automation — all sharing one memory graph, so each task builds on the last.', null];
      if (/^(hi|hello|hey|namaste)\b/.test(t)) return ['Hi! Tell me something about yourself, then ask me what I remember.', null];
      if (t.endsWith('?')) return ['Good question. In the full product I\'d answer it with context recalled from your memory graph. For now, try telling me a fact and asking me to recall it.', null];
      const fact = text.trim().replace(/[.!]+$/, '');
      memories.push(fact.length > 90 ? fact.slice(0, 90) + '…' : fact);
      setCount();
      return ['Got it — stored that in long-term memory. Ask me "what do you remember?" any time.', '↳ +1 node written to graph'];
    }

    function send(text) {
      text = text.trim();
      if (!text) return;
      add('user', text);
      const typing = add('ai typing', '');
      typing.innerHTML = '<i></i><i></i><i></i>';
      setTimeout(() => {
        typing.remove();
        const [msg, mem] = reply(text);
        add('ai', msg, mem);
      }, reduceMotion ? 0 : 650);
    }

    form.addEventListener('submit', e => { e.preventDefault(); send(input.value); input.value = ''; });
    $$('#suggest button').forEach(b => b.addEventListener('click', () => send(b.textContent)));
    add('ai', "Hi, I'm AI Brain. Tell me something about you or your project — I'll remember it.");
    setCount();
  }

  /* ---------- Waitlist ---------- */
  function initWaitlist() {
    const form = $('#wlForm');
    if (!form) return;
    const ok = $('#wlOk'), email = $('#wlEmail'), role = $('#wlRole');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
      email.setAttribute('aria-invalid', String(!valid));
      role.setAttribute('aria-invalid', String(!role.value));
      if (!valid) { email.focus(); ok.textContent = 'Please enter a valid email address.'; ok.classList.add('show'); return; }
      if (!role.value) { role.focus(); ok.textContent = 'Please choose your role.'; ok.classList.add('show'); return; }
      const list = store.get('aibrain_waitlist_subscribers', []);
      list.push({ email: email.value.trim(), role: role.value, timestamp: new Date().toISOString(), domain: location.hostname });
      store.set('aibrain_waitlist_subscribers', list);
      ok.textContent = "You're on the list. We'll be in touch at " + email.value.trim() + '.';
      ok.classList.add('show');
      form.reset();
    });
  }

  /* ---------- Contact form → opens the visitor's mail app (real delivery) ---------- */
  function initContact() {
    const form = $('#contactForm');
    if (!form) return;
    const msg = $('#contactMsgBox');
    const show = (cls, text) => { msg.className = `form-msg show ${cls}`; msg.textContent = text; };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#cName'), email = $('#cEmail'), topic = $('#cTopic'), body = $('#cBody');
      const checks = [
        [name, name.value.trim().length > 1, 'Please enter your name.'],
        [email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()), 'Please enter a valid email address.'],
        [body, body.value.trim().length > 9, 'Please write a short message (10+ characters).']
      ];
      for (const [el, ok] of checks) el.setAttribute('aria-invalid', String(!ok));
      const bad = checks.find(c => !c[1]);
      if (bad) { bad[0].focus(); show('err', bad[2]); return; }
      const subject = `[${topic.value}] ${name.value.trim()}`;
      const text = `${body.value.trim()}\n\n—\n${name.value.trim()}\n${email.value.trim()}`;
      window.location.href = `mailto:founder@aibrainstartup.com?cc=team@aibrainstartup.com&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      show('ok', 'Your email app should open with the message ready — just press send. If nothing opened, write to founder@aibrainstartup.com directly.');
    });
  }

  /* ---------- Copy buttons for code blocks ---------- */
  function initCopy() {
    $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
      const pre = document.getElementById(btn.dataset.copy);
      try { await navigator.clipboard.writeText(pre.innerText); btn.textContent = 'copied'; }
      catch { btn.textContent = 'select & copy'; }
      setTimeout(() => { btn.textContent = 'copy'; }, 1600);
    }));
  }

  /* ---------- Table-of-contents scrollspy (docs / legal) ---------- */
  function initToc() {
    const links = $$('.toc a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach(a => a.classList.remove('active'));
        map.get(e.target.id)?.classList.add('active');
      }
    }, { rootMargin: '-30% 0px -60% 0px' });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
    [initNav, initGraph, initReveal, initSpotlight, initAgents, initSdk, initCalc, initDemo, initWaitlist, initContact, initCopy, initToc].forEach(fn => {
      try { fn(); } catch (err) { console.error('[AI Brain]', fn.name, err); }
    });
  });
})();
