// invest.js — Handles USD-denominated tier selection, auto-lock slot management, wire details, and allocation submission
(function () {
  'use strict';

  var currentCurrency = 'USD';
  var selectedTier = '50k';

  var TIER_DATA = {
    '25k': {
      usd: '$25,000 USD',
      name: 'Strategic Angel (Tier 1)',
      equity: '0.50% iSAFE Equity Stake',
      revshare: '5% Quarterly Gross Revenue Share (Up to 2.5x / $62,500 Return)',
      multiplier: '2.5x Return Cap ($62,500 USD)',
      amountUSD: '25,000',
      totalSlots: 8,
      takenSlots: 3,
      remainingSlots: 5,
      statusBadge: '🟢 8 Slots Total · 5 Available',
      locked: false
    },
    '50k': {
      usd: '$50,000 USD',
      name: 'Co-Founding Syndicate (Tier 2)',
      equity: '1.00% iSAFE Equity Stake',
      revshare: '8% Quarterly Gross Revenue Share (Up to 2.5x / $125,000 Return)',
      multiplier: '2.5x Return Cap ($125,000 USD)',
      amountUSD: '50,000',
      totalSlots: 4,
      takenSlots: 2,
      remainingSlots: 2,
      statusBadge: '🔥 High Demand · 4 Slots Total · 2 Left',
      locked: false
    },
    '100k': {
      usd: '$100,000 USD',
      name: 'Strategic Lead Anchor (Tier 3)',
      equity: '2.00% iSAFE Equity Stake',
      revshare: '10% Quarterly Gross Revenue Share (Up to 3.0x / $300,000 Return)',
      multiplier: '3.0x Return Cap ($300,000 USD)',
      amountUSD: '100,000',
      totalSlots: 2,
      takenSlots: 1,
      remainingSlots: 1,
      statusBadge: '⚡ Lead Anchor · 2 Slots Total · 1 Open',
      locked: false
    },
    'whale': {
      usd: '$100,000 USD',
      name: 'Principal Institutional Whale (Tier 4)',
      equity: '2.00% iSAFE Equity Stake',
      revshare: '12% Quarterly Gross Revenue Share (Up to 3.0x / $300,000 Return)',
      multiplier: '3.0x Return Cap ($300,000 USD)',
      amountUSD: '100,000',
      totalSlots: 1,
      takenSlots: 0,
      remainingSlots: 1,
      statusBadge: '🏛️ Institutional Whale · 1 Exclusive Slot',
      locked: false
    }
  };

  // Render and update Tier Slot Badges & Auto-Lock States
  function renderTierSlots() {
    for (var tierKey in TIER_DATA) {
      if (TIER_DATA.hasOwnProperty(tierKey)) {
        var t = TIER_DATA[tierKey];
        var slotBadge = document.querySelector('[data-slot-badge="' + tierKey + '"]');
        var card = document.querySelector('[data-tier-card="' + tierKey + '"]');
        var actionBtn = document.querySelector('[data-select-tier="' + tierKey + '"]');

        if (slotBadge) {
          slotBadge.textContent = t.statusBadge;
        }

        if (t.remainingSlots <= 0) {
          t.locked = true;
          if (card) card.classList.add('tier-locked');
          if (slotBadge) {
            slotBadge.textContent = '🔒 100% ALLOCATED & LOCKED';
            slotBadge.style.color = '#ff6b6b';
          }
          if (actionBtn) {
            actionBtn.classList.add('disabled');
            actionBtn.textContent = '🔒 Fully Allocated';
            actionBtn.style.pointerEvents = 'none';
          }
        }
      }
    }
  }

  // Tier Selection
  var tierSelectBtns = document.querySelectorAll('[data-select-tier]');
  tierSelectBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var tier = btn.getAttribute('data-select-tier');
      if (TIER_DATA[tier] && TIER_DATA[tier].locked) return;

      selectedTier = tier;
      var desk = document.getElementById('wire-desk');
      if (desk) {
        desk.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      updateWireSummary();
    });
  });

  function updateWireSummary() {
    var data = TIER_DATA[selectedTier] || TIER_DATA['50k'];
    var amountEl = document.getElementById('selectedAmountDisplay');
    var tierNameEl = document.getElementById('selectedTierNameDisplay');
    var equityEl = document.getElementById('selectedEquityDisplay');
    var revEl = document.getElementById('selectedRevDisplay');
    var hiddenTier = document.getElementById('formTier');
    var hiddenAmount = document.getElementById('formAmount');
    var hiddenCur = document.getElementById('formCurrency');

    if (amountEl) {
      amountEl.textContent = data.usd;
    }
    if (tierNameEl) {
      tierNameEl.textContent = data.name;
    }
    if (equityEl) {
      equityEl.textContent = data.equity;
    }
    if (revEl) {
      revEl.textContent = data.revshare;
    }
    if (hiddenTier) hiddenTier.value = selectedTier;
    if (hiddenAmount) hiddenAmount.value = data.amountUSD;
    if (hiddenCur) hiddenCur.value = 'USD';
  }

  // Copy-to-clipboard functionality
  var copyBtns = document.querySelectorAll('[data-copy]');
  copyBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      if (navigator.clipboard && text) {
        navigator.clipboard.writeText(text).then(function () {
          var original = btn.textContent;
          btn.textContent = 'Copied ✓';
          setTimeout(function () {
            btn.textContent = original;
          }, 2000);
        });
      }
    });
  });

  // Interactive Benchmark Simulator
  var calcBtns = document.querySelectorAll('[data-calc-vol]');
  var calcVectorCost = document.getElementById('calcVectorCost');
  var calcBrainCost = document.getElementById('calcBrainCost');
  var calcSavings = document.getElementById('calcSavings');

  var CALC_DATA = {
    '1m': { vector: '$3,800 / mo', brain: '$340 / mo', savings: '91.0% ($41,520 / yr)' },
    '5m': { vector: '$19,000 / mo', brain: '$1,710 / mo', savings: '91.0% ($207,480 / yr)' },
    '20m': { vector: '$76,000 / mo', brain: '$6,840 / mo', savings: '91.0% ($829,920 / yr)' }
  };

  calcBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      calcBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var vol = btn.getAttribute('data-calc-vol');
      if (CALC_DATA[vol]) {
        if (calcVectorCost) calcVectorCost.textContent = CALC_DATA[vol].vector;
        if (calcBrainCost) calcBrainCost.textContent = CALC_DATA[vol].brain;
        if (calcSavings) calcSavings.textContent = CALC_DATA[vol].savings;
      }
    });
  });

  // Code Tab Switching Logic (Technical Proof)
  var codeTabBtns = document.querySelectorAll('[data-code-tab]');
  var codeSnippetBody = document.getElementById('codeSnippetBody');

  var CODE_SNIPPETS = {
    python: '<span class="c-comment"># AI Brain High-Performance Memory Client</span>\n' +
            '<span class="c-keyword">import</span> aibrain\n\n' +
            '<span class="c-comment"># Initialize sub-15ms associative hypergraph</span>\n' +
            'client = aibrain.<span class="c-func">Client</span>(cluster=<span class="c-str">"edge.cluster-01.aibrain.io"</span>)\n\n' +
            '<span class="c-comment"># Recall associative memory across 3 temporal hops</span>\n' +
            'memory = client.hypergraph.<span class="c-func">recall</span>(\n' +
            '    agent_id=<span class="c-str">"agent_enterprise_swarm_42"</span>,\n' +
            '    query=<span class="c-str">"previous architecture decisions on database migration"</span>,\n' +
            '    hops=<span class="c-num">3</span>,\n' +
            '    decay_threshold=<span class="c-num">0.15</span>\n' +
            ')\n\n' +
            '<span class="c-keyword">print</span>(<span class="c-str">f"Recall Latency: {memory.latency_ms} ms"</span>)  <span class="c-accent"># Output: 12.4 ms</span>\n' +
            '<span class="c-keyword">print</span>(<span class="c-str">f"Associative Nodes: {len(memory.nodes)}"</span>)  <span class="c-accent"># 48 connected facts</span>',
    cpp:    '<span class="c-comment">// AI Brain Native In-Memory Hypergraph Kernel</span>\n' +
            '<span class="c-keyword">#include</span> <span class="c-str">&lt;aibrain/hypergraph.hpp&gt;</span>\n\n' +
            '<span class="c-keyword">int</span> <span class="c-func">main</span>() {\n' +
            '    aibrain::<span class="c-func">GraphEngine</span> engine(aibrain::Config::<span class="c-func">LockFreeRCU</span>());\n\n' +
            '    <span class="c-comment">// Sub-15ms multi-hop traversal across synaptic weights</span>\n' +
            '    <span class="c-keyword">auto</span> results = engine.<span class="c-func">traverse_associative</span>(\n' +
            '        <span class="c-comment">/*source_node=*/</span><span class="c-num">0x8f4b21</span>,\n' +
            '        <span class="c-comment">/*depth=*/</span><span class="c-num">3</span>,\n' +
            '        <span class="c-comment">/*decay_half_life=*/</span>std::chrono::hours(<span class="c-num">72</span>)\n' +
            '    );\n\n' +
            '    <span class="c-comment">// Performance: 12.4ms traversal @ 10M edges</span>\n' +
            '    <span class="c-keyword">return</span> results.empty() ? <span class="c-num">1</span> : <span class="c-num">0</span>;\n' +
            '}',
    benchmark: '<span class="c-comment">/* Audited Benchmark Result (50,000 passes) */</span>\n' +
               '{\n' +
               '  <span class="c-str">"test_id"</span>: <span class="c-str">"BENCH-2026-042"</span>,\n' +
               '  <span class="c-str">"target"</span>: <span class="c-str">"AI Brain Associative Hypergraph v0.4.1"</span>,\n' +
               '  <span class="c-str">"cluster"</span>: <span class="c-str">"8x NVIDIA A100 (80GB SXM4)"</span>,\n' +
               '  <span class="c-str">"metrics"</span>: {\n' +
               '    <span class="c-str">"p50_latency_ms"</span>: <span class="c-num">9.8</span>,\n' +
               '    <span class="c-str">"p95_latency_ms"</span>: <span class="c-num">12.4</span>,\n' +
               '    <span class="c-str">"p99_latency_ms"</span>: <span class="c-num">14.9</span>,\n' +
               '    <span class="c-str">"token_cost_savings"</span>: <span class="c-accent">"91.0%"</span>,\n' +
               '    <span class="c-str">"multi_hop_accuracy"</span>: <span class="c-accent">"96.2%"</span>\n' +
               '  }\n' +
               '}'
  };

  codeTabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      codeTabBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var tab = btn.getAttribute('data-code-tab');
      if (codeSnippetBody && CODE_SNIPPETS[tab]) {
        codeSnippetBody.innerHTML = '<code>' + CODE_SNIPPETS[tab] + '</code>';
      }
    });
  });

  // Investor Form Submission
  var form = document.getElementById('investForm');
  var formStatus = document.getElementById('formStatus');
  var formSuccess = document.getElementById('formSuccess');

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Locking Allocation & Generating Term Sheet...';
      }
      if (formStatus) formStatus.textContent = '';

      var payload = {
        name: form.elements['name'] ? form.elements['name'].value : '',
        email: form.elements['email'] ? form.elements['email'].value : '',
        phone: form.elements['phone'] ? form.elements['phone'].value : '',
        country: form.elements['country'] ? form.elements['country'].value : '',
        entity: form.elements['entity'] ? form.elements['entity'].value : '',
        tier: selectedTier,
        amount: TIER_DATA[selectedTier] ? TIER_DATA[selectedTier].amountUSD : '50,000',
        currency: 'USD',
        utr: form.elements['utr'] ? form.elements['utr'].value : '',
        notes: form.elements['notes'] ? form.elements['notes'].value : '',
      };

      try {
        var res = await fetch('/api/invest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        var data = await res.json();
        if (res.ok && data.ok) {
          form.style.display = 'none';
          if (formSuccess) {
            formSuccess.style.display = 'block';
            var refCode = document.getElementById('allocationRefCode');
            if (refCode && data.id) {
              refCode.textContent = 'ALLOC-' + data.id.slice(0, 8).toUpperCase();
            }
          }
        } else {
          if (formStatus) {
            formStatus.textContent = 'Error: ' + (data.error || 'Failed to submit. Please check details.');
            formStatus.style.color = '#ff6b6b';
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Lock Allocation & Register Wire Transfer →';
          }
        }
      } catch (err) {
        if (formStatus) {
          formStatus.textContent = 'Network error. Please try again or email founder@aibrainstartup.com directly.';
          formStatus.color = '#ff6b6b';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Lock Allocation & Register Wire Transfer →';
        }
      }
    });
  }

  // Modal & Legal Term Sheet Logic
  var isafeModal = document.getElementById('isafeModal');
  var openTermSheetBtn = document.getElementById('openTermSheetBtn');
  var openTermSheetBtnTop = document.getElementById('openTermSheetBtnTop');
  var closeTermSheetBtn = document.getElementById('closeTermSheetBtn');
  var printTermSheetBtn = document.getElementById('printTermSheetBtn');
  var printTermSheetBtnBottom = document.getElementById('printTermSheetBtnBottom');
  var acceptTermSheetBtn = document.getElementById('acceptTermSheetBtn');
  var acceptTermSheetBtnBottom = document.getElementById('acceptTermSheetBtnBottom');

  function openModal() {
    if (isafeModal) {
      isafeModal.classList.add('active');
      isafeModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (isafeModal) {
      isafeModal.classList.remove('active');
      isafeModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  if (openTermSheetBtn) openTermSheetBtn.addEventListener('click', openModal);
  if (openTermSheetBtnTop) openTermSheetBtnTop.addEventListener('click', openModal);
  if (closeTermSheetBtn) closeTermSheetBtn.addEventListener('click', closeModal);

  function triggerPrint() {
    window.print();
  }
  if (printTermSheetBtn) printTermSheetBtn.addEventListener('click', triggerPrint);
  if (printTermSheetBtnBottom) printTermSheetBtnBottom.addEventListener('click', triggerPrint);

  function acceptAndGoToWire() {
    closeModal();
    var desk = document.getElementById('wire-desk');
    if (desk) desk.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (acceptTermSheetBtn) acceptTermSheetBtn.addEventListener('click', acceptAndGoToWire);
  if (acceptTermSheetBtnBottom) acceptTermSheetBtnBottom.addEventListener('click', acceptAndGoToWire);
  if (isafeModal) {
    isafeModal.addEventListener('click', function (e) {
      if (e.target === isafeModal) closeModal();
    });
  }

  // Mobile Tier Switcher Tabs
  var mobTabs = document.querySelectorAll('[data-mob-tab]');
  mobTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      mobTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var tier = tab.getAttribute('data-mob-tab');
      selectedTier = tier;
      updateWireSummary();
      var targetBtn = document.querySelector('[data-select-tier="' + tier + '"]');
      if (targetBtn) {
        var card = targetBtn.closest('.tier-card');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // Initialize
  renderTierSlots();
  updateWireSummary();
})();
