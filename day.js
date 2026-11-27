/* AI Brain — Day Mode preview interactions (CSP-strict, zero sync reflows). */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Navbar & Mobile Drawer ---------- */
  function initNav() {
    const nav = $('#nav');
    const btn = $('#menuBtn');
    const panel = $('#mobilePanel');
    if (!nav || !btn || !panel) return;

    let ticking = false;
    const syncScroll = () => {
      ticking = false;
      nav.classList.toggle('scrolled', window.scrollY > 12);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(syncScroll);
    };

    if ('IntersectionObserver' in window) {
      const hero = $('#top');
      if (hero) {
        const sentinel = document.createElement('div');
        sentinel.setAttribute('aria-hidden', 'true');
        sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none;opacity:0;';
        document.body.prepend(sentinel);
        new IntersectionObserver(([entry]) => {
          nav.classList.toggle('scrolled', !entry.isIntersecting);
        }).observe(sentinel);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    const outside = () => [$('main'), $('.footer')].filter(Boolean);
    const setOpen = (open, restoreFocus = true) => {
      const isOpen = nav.classList.contains('open');
      if (open === isOpen) return;
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      panel.inert = !open;
      outside().forEach(el => { el.inert = open; });
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        $('a', panel)?.focus();
      } else if (restoreFocus) {
        btn.focus({ preventScroll: true });
      }
    };

    btn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    $$('a', panel).forEach(link => link.addEventListener('click', () => setOpen(false, false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) setOpen(false);
    });
    window.matchMedia('(min-width: 1025px)').addEventListener('change', e => {
      if (e.matches) setOpen(false, false);
    });
  }

  /* ---------- Daylight Hero Hypergraph Canvas ---------- */
  function initGraph() {
    const canvas = $('#graph');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let nodes = [];
    let pulses = [];
    let raf = 0;
    let visible = true;
    const mouse = { x: -9999, y: -9999 };

    function build(cw, ch) {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.round(cw || 0);
      h = Math.round(ch || 0);
      if (!w || !h) return;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round(Math.min(96, Math.max(36, (w * h) / 15000)));
      const bias = w > 900 ? 0.44 : 0;
      nodes = Array.from({ length: count }, () => ({
        x: (bias + Math.random() * (1 - bias)) * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() < 0.16 ? 2.7 : 1.4,
        hot: Math.random() < 0.16
      }));
      pulses = [];
    }

    const maxDist = () => Math.min(175, Math.max(105, w / 9));

    function frame() {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      const link = maxDist();
      const link2 = link * link;

      for (const n of nodes) {
        if (!reduceMotion) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 22000) {
            n.x += dx * 0.005;
            n.y += dy * 0.005;
          }
        }
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > link2) continue;
          const t = 1 - d2 / link2;
          const hot = a.hot && b.hot;
          ctx.strokeStyle = hot
            ? `rgba(39,100,0,${(0.36 * t).toFixed(3)})`
            : `rgba(13,17,23,${(0.14 * t).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          if (!reduceMotion && pulses.length < 12 && Math.random() < 0.00032) {
            pulses.push({ a, b, t: 0 });
          }
        }
      }

      for (const n of nodes) {
        if (n.hot && n.r > 2) {
          ctx.fillStyle = 'rgba(168,235,18,0.28)';
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 3.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = n.hot ? '#276400' : 'rgba(13,17,23,0.42)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      pulses = pulses.filter(p => (p.t += 0.018) < 1);
      for (const p of pulses) {
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.fillStyle = `rgba(39,100,0,${(0.9 - p.t * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduceMotion && visible) {
        raf = requestAnimationFrame(frame);
      }
    }

    const start = () => {
      if (!w || !h) return;
      cancelAnimationFrame(raf);
      if (reduceMotion) {
        frame();
      } else {
        raf = requestAnimationFrame(frame);
      }
    };

    let resizeTimer = 0;
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(entries => {
        const cr = entries[0]?.contentRect;
        if (!cr || cr.width < 1 || cr.height < 1) return;
        const nw = Math.round(cr.width);
        const nh = Math.round(cr.height);
        const ndpr = Math.min(window.devicePixelRatio || 1, 2);
        if (nw === w && nh === h && ndpr === dpr) return;
        clearTimeout(resizeTimer);
        if (!w) {
          build(nw, nh);
          start();
        } else {
          resizeTimer = setTimeout(() => {
            build(nw, nh);
            start();
          }, 150);
        }
      }).observe(canvas);
    }

    const hero = canvas.parentElement;
    if (hero) {
      hero.addEventListener('pointermove', e => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => {
        mouse.x = mouse.y = -9999;
      });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
      }).observe(canvas);
    }

    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden;
      if (visible) start();
    });
  }

  /* ---------- Hero Live Recall Console ---------- */
  const SCENES = [
    {
      q: 'What did we decide about auth last sprint?',
      path: ['project:api-gateway', 'decision:JWT-rotation', 'note:sec-review'],
      hit: 1,
      out: 'Rotate JWT signing keys every 24h; refresh tokens stay 30 days. Agreed in the 12 Sep security review.',
      meta: '↳ recalled from 3 sessions · 9ms',
      ms: 9,
      hops: 3
    },
    {
      q: 'Which customer asked for SSO?',
      path: ['crm:acme-corp', 'call:2026-10-02', 'request:SAML-SSO'],
      hit: 2,
      out: 'Acme Corp asked for SAML SSO on the 2 Oct call — priority P1 for the Q4 enterprise tier.',
      meta: '↳ linked across CRM + call notes · 12ms',
      ms: 12,
      hops: 3
    },
    {
      q: 'Why did the flaky test fail before?',
      path: ['repo:core', 'test:graph_sync', 'fix:race-condition', 'pr:#412'],
      hit: 2,
      out: 'A race in graph_sync when two agents wrote the same node. Fixed with a version check in PR #412.',
      meta: '↳ coding agent memory · 4 hops · 11ms',
      ms: 11,
      hops: 4
    }
  ];

  function initConsole() {
    const q = $('#cxQuery');
    if (!q) return;
    const path = $('#cxPath');
    const out = $('#cxOut');
    const lat = $('#cxLatency');
    const hops = $('#cxHops');
    const nodes = $('#cxNodes');
    const spark = $('#cxSpark');
    if (!path || !out || !lat || !hops || !nodes || !spark) return;

    spark.innerHTML = Array.from({ length: 28 }, () => '<i></i>').join('');
    const bars = $$('i', spark);
    const jiggle = () => bars.forEach(b => {
      b.style.height = `${Math.round(18 + Math.random() * 82)}%`;
    });
    jiggle();

    let nodeCount = 2418;
    let timers = [];
    let onScreen = true;
    let paused = false;
    let nextScene = 0;

    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    function play(i, immediate = false) {
      const s = SCENES[i % SCENES.length];
      timers.forEach(clearTimeout);
      timers = [];

      q.textContent = '';
      out.classList.remove('on');
      out.innerHTML = '';
      path.innerHTML = s.path
        .map((p, k) => (k ? '<span class="hop">→</span>' : '') + `<span class="node-chip">${p}</span>`)
        .join('');

      const chips = $$('.node-chip', path);
      const arrows = $$('.hop', path);

      if (immediate || reduceMotion) {
        q.textContent = s.q;
        chips.forEach(c => c.classList.add('on'));
        arrows.forEach(a => a.classList.add('on'));
        chips[s.hit]?.classList.add('hit');
        out.innerHTML = `${s.out}<small>${s.meta}</small>`;
        out.classList.add('on');
        lat.textContent = `${s.ms}ms`;
        hops.textContent = String(s.hops);
        if (!reduceMotion) {
          later(() => {
            if (onScreen && !document.hidden) play(i + 1);
            else { paused = true; nextScene = i + 1; }
          }, 4200);
        }
        return;
      }

      let t = 0;
      [...s.q].forEach((ch, k) => {
        t = 180 + k * 18;
        later(() => { q.textContent += ch; }, t);
      });
      t += 220;

      chips.forEach((c, k) => {
        later(() => {
          if (arrows[k - 1]) arrows[k - 1].classList.add('on');
          c.classList.add('on');
          jiggle();
        }, t + k * 240);
      });

      t += chips.length * 240 + 160;
      later(() => { chips[s.hit]?.classList.add('hit'); }, t);
      later(() => {
        out.innerHTML = `${s.out}<small>${s.meta}</small>`;
        out.classList.add('on');
        lat.textContent = `${s.ms}ms`;
        hops.textContent = String(s.hops);
        nodeCount += 1 + Math.floor(Math.random() * 3);
        nodes.textContent = nodeCount.toLocaleString('en-US');
      }, t + 200);

      later(() => {
        if (onScreen && !document.hidden) play(i + 1);
        else { paused = true; nextScene = i + 1; }
      }, t + 4200);
    }

    const resume = () => {
      if (paused && onScreen && !document.hidden) {
        paused = false;
        play(nextScene);
      }
    };

    const consoleEl = q.closest('.console');
    if (consoleEl && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        resume();
      }).observe(consoleEl);
    }
    document.addEventListener('visibilitychange', resume);

    play(0, true);
  }

  /* ---------- Card Pointer Spotlight ---------- */
  function initSpotlight() {
    if (reduceMotion) return;
    $$('.card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      }, { passive: true });
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const yearEl = $('#year');
    if (yearEl) {
      const yr = String(new Date().getFullYear());
      if (yearEl.textContent !== yr) yearEl.textContent = yr;
    }

    [initNav, initGraph, initConsole, initSpotlight].forEach(fn => {
      try { fn(); } catch (err) { console.error('[AI Brain Day]', fn.name, err); }
    });
  });
})();
