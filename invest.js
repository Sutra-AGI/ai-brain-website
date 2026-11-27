// invest.js — Handles USD-denominated tier selection, auto-lock slot management, wire details, and allocation submission
(function () {
  'use strict';

  var pageLoadTime = Date.now();
  var currentCurrency = 'USD';
  var selectedTier = '50k';
  var STORAGE_KEY = 'aibrain_invest_slots_v1';
  var SESS_STORAGE_KEY = 'aibrain_investor_session';
  var BANK_VERIFY_KEY = 'aibrain_investor_verified';

  // Server-side slot synchronization engine (BUG-0002)
  function syncSlotsFromServer() {
    fetch('/api/invest-slots')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok && data.slots) {
          for (var k in data.slots) {
            if (TIER_DATA[k]) {
              TIER_DATA[k].takenSlots = data.slots[k].taken;
              TIER_DATA[k].remainingSlots = data.slots[k].remaining;
              if (TIER_DATA[k].remainingSlots === 0) {
                TIER_DATA[k].statusBadge = '🔒 100% ALLOCATED & LOCKED';
                TIER_DATA[k].locked = true;
              } else {
                TIER_DATA[k].statusBadge = '🟢 ' + TIER_DATA[k].totalSlots + ' Slots Total · ' + TIER_DATA[k].remainingSlots + ' Available';
                TIER_DATA[k].locked = false;
              }
            }
          }
          saveSlotsStorage();
          renderTierSlots();
          updateTermSheetDynamicData();
        }
      })
      .catch(function (e) {
        console.warn('Server slot sync unavailable, using local cache', e);
      });
  }

  // 2-Step Verified Bank Wire Coordinate Unmasking (BUG-0006)
  function initBankCoordinatesVerification() {
    var promptEl = document.getElementById('bankVerifyPrompt');
    var coordsBox = document.getElementById('intlWireBox') || document.getElementById('bankDetailsContent');
    var revealBtn = document.getElementById('btnRevealBankCoords');

    if (!revealBtn) return;

    function showCoords() {
      if (promptEl) promptEl.style.display = 'none';
      if (coordsBox) coordsBox.style.display = 'block';
    }

    var isVerified = false;
    try {
      isVerified = sessionStorage.getItem(BANK_VERIFY_KEY) === 'true';
    } catch (e) {}

    if (isVerified) {
      showCoords();
    } else {
      if (promptEl) promptEl.style.display = 'block';
      if (coordsBox) coordsBox.style.display = 'none';
    }

    if (revealBtn) {
      revealBtn.addEventListener('click', function () {
        try {
          sessionStorage.setItem(BANK_VERIFY_KEY, 'true');
        } catch (e) {}
        showCoords();
      });
    }
  }

  var TIER_DATA = {
    '15k': {
      usd: '$15,000 USD',
      name: 'Founding Angel (Tier 1)',
      equity: '0.375% iSAFE Equity Stake',
      revshare: '5% Quarterly Gross Revenue Share (Up to 3.0x / $45,000 Return)',
      multiplier: '3.0x Return Cap ($45,000 USD)',
      amountUSD: '15,000',
      totalSlots: 10,
      takenSlots: 0,
      remainingSlots: 10,
      statusBadge: '🟢 10 Slots Total · 10 Available',
      locked: false
    },
    '25k': {
      usd: '$25,000 USD',
      name: 'Syndicate Partner (Tier 2)',
      equity: '0.625% iSAFE Equity Stake',
      revshare: '7% Quarterly Gross Revenue Share (Up to 3.0x / $75,000 Return)',
      multiplier: '3.0x Return Cap ($75,000 USD)',
      amountUSD: '25,000',
      totalSlots: 6,
      takenSlots: 0,
      remainingSlots: 6,
      statusBadge: '🟢 6 Slots Total · 6 Available',
      locked: false
    },
    '50k': {
      usd: '$50,000 USD',
      name: 'Strategic Anchor (Tier 3)',
      equity: '1.250% iSAFE Equity Stake',
      revshare: '10% Quarterly Gross Revenue Share (Up to 3.0x / $150,000 Return)',
      multiplier: '3.0x Return Cap ($150,000 USD)',
      amountUSD: '50,000',
      totalSlots: 4,
      takenSlots: 0,
      remainingSlots: 4,
      statusBadge: '🟢 4 Slots Total · 4 Available',
      locked: false
    },
    '100k': {
      usd: '$100,000 USD',
      name: 'Sovereign Partner (Tier 4)',
      equity: '2.500% Major Equity Stake',
      revshare: '15% Quarterly Gross Revenue Share (Up to 3.5x / $350,000 Return)',
      multiplier: '3.5x Return Cap ($350,000 USD)',
      amountUSD: '100,000',
      totalSlots: 2,
      takenSlots: 0,
      remainingSlots: 2,
      statusBadge: '🏛️ 2 Exclusive Slots · 2 Available',
      locked: false
    }
  };

  // URL query parameter support for direct tier pre-selection (e.g. ?tier=15k) or session restore
  try {
    var hasQTier = false;
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      var urlParams = new URLSearchParams(window.location.search);
      var qTier = urlParams.get('tier');
      if (qTier && TIER_DATA[qTier]) {
        selectedTier = qTier;
        hasQTier = true;
      }
    }
    if (!hasQTier) {
      var savedSess = JSON.parse(sessionStorage.getItem(SESS_STORAGE_KEY) || '{}');
      if (savedSess && savedSess.tier && TIER_DATA[savedSess.tier]) {
        selectedTier = savedSess.tier;
      }
    }
  } catch (e) {
    console.warn('URLSearchParams/sessionStorage check failed', e);
  }

  // Local storage persistence for verified slot allocation
  function initSlotsStorage() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        for (var k in parsed) {
          if (TIER_DATA[k] && typeof parsed[k] === 'number') {
            TIER_DATA[k].takenSlots = parsed[k];
            TIER_DATA[k].remainingSlots = Math.max(0, TIER_DATA[k].totalSlots - parsed[k]);
            if (TIER_DATA[k].remainingSlots === 0) {
              TIER_DATA[k].statusBadge = '🔒 100% ALLOCATED & LOCKED';
              TIER_DATA[k].locked = true;
            } else {
              TIER_DATA[k].statusBadge = '🟢 ' + TIER_DATA[k].totalSlots + ' Slots Total · ' + TIER_DATA[k].remainingSlots + ' Available';
            }
          }
        }
      }
    } catch (e) {
      console.warn('LocalStorage unavailable for slots', e);
    }
  }

  function saveSlotsStorage() {
    try {
      var toSave = {};
      for (var k in TIER_DATA) {
        toSave[k] = TIER_DATA[k].takenSlots;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save slots to localStorage', e);
    }
  }

  // Real-time Date Engine: Always formats current execution date dynamically (e.g. "23 November 2026")
  function formatCurrentDate() {
    var now = new Date();
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var day = now.getDate();
    var month = months[now.getMonth()];
    var year = now.getFullYear();
    return day + ' ' + month + ' ' + year;
  }

  // Dynamic Term Sheet Engine: Updates dates, Annexure A slots, and investor selections in real-time
  function updateTermSheetDynamicData() {
    var dateStr = formatCurrentDate();

    // 1. Dynamic Date Auto-Stamping across Document
    var docDateEl = document.getElementById('docExecutionDate');
    if (docDateEl) docDateEl.textContent = dateStr;

    var founderSignDateEl = document.getElementById('founderSignDate');
    if (founderSignDateEl) founderSignDateEl.textContent = dateStr;

    var docTimestampEl = document.getElementById('docGeneratedTimestamp');
    if (docTimestampEl) docTimestampEl.textContent = dateStr + ' · LIVE EXECUTABLE INSTRUMENT';

    // 2. Annexure A Dynamic Slots Auto-Update
    for (var tierKey in TIER_DATA) {
      if (TIER_DATA.hasOwnProperty(tierKey)) {
        var t = TIER_DATA[tierKey];
        var slotCell = document.getElementById('annexureSlot' + tierKey);
        var row = document.getElementById('annexureRow' + tierKey);

        if (slotCell) {
          var rightsLabel = tierKey === '15k' ? 'Information Rights' :
                            tierKey === '25k' ? 'Advisory Observer' :
                            tierKey === '50k' ? 'Formal Advisory Seat' :
                            'Permanent Board Observer';
          if (t.remainingSlots > 0) {
            slotCell.innerHTML = rightsLabel + ' · ' + t.totalSlots + ' Slots Limit (' +
              '<strong style="color:var(--accent,#c8ff3d); font-weight:600;">' + t.remainingSlots + ' Available</strong> · ' +
              t.takenSlots + ' Booked)';
          } else {
            slotCell.innerHTML = rightsLabel + ' · ' + t.totalSlots + ' Slots Limit (' +
              '<strong style="color:#ff6b6b; font-weight:600;">🔒 100% ALLOCATED &amp; CLOSED</strong>)';
          }
        }

        // Highlight selected tier row in the legal term sheet
        if (row) {
          if (tierKey === selectedTier) {
            row.classList.add('annexure-row-selected');
          } else {
            row.classList.remove('annexure-row-selected');
          }
        }
      }
    }

    // 3. Update Investor Signature Block with Selected Allocation
    var currentTierData = TIER_DATA[selectedTier] || TIER_DATA['50k'];
    var investorTierEl = document.getElementById('investorSelectedTier');
    if (investorTierEl) {
      investorTierEl.textContent = currentTierData.usd + ' (' + currentTierData.name + ' · ' + currentTierData.equity + ')';
    }

    // 4. Live form fields sync if user typed in wire desk, with sessionStorage persistence fallback
    var formEl = document.getElementById('investForm');
    var nameVal = '';
    var entityVal = '';
    var utrVal = '';

    if (formEl) {
      nameVal = formEl.elements['name'] ? formEl.elements['name'].value.trim() : '';
      entityVal = formEl.elements['entity'] ? formEl.elements['entity'].value.trim() : '';
      utrVal = formEl.elements['utr'] ? formEl.elements['utr'].value.trim() : '';
    }

    try {
      var savedSession = JSON.parse(sessionStorage.getItem(SESS_STORAGE_KEY) || '{}');
      if (!nameVal && savedSession.name) nameVal = savedSession.name;
      if (!entityVal && savedSession.entity) entityVal = savedSession.entity;
      if (!utrVal && savedSession.utr) utrVal = savedSession.utr;
    } catch (e) {}

    var investorSignName = document.getElementById('investorSignName');
    var investorSignEntity = document.getElementById('investorSignEntity');
    var investorEntityDisplay = document.getElementById('investorEntityDisplay');
    var investorSignDate = document.getElementById('investorSignDate');

    if (investorSignName) {
      investorSignName.textContent = nameVal || '___________________________________';
    }
    if (investorSignEntity) {
      if (entityVal) {
        investorSignEntity.textContent = entityVal;
      } else if (nameVal) {
        investorSignEntity.textContent = 'Individual Angel Investor';
      } else {
        investorSignEntity.textContent = '_________________________________';
      }
    }
    if (investorEntityDisplay) {
      if (entityVal) {
        investorEntityDisplay.textContent = entityVal.toUpperCase();
      } else if (nameVal) {
        investorEntityDisplay.textContent = nameVal.toUpperCase() + ' (INDIVIDUAL ALLOCATOR)';
      } else {
        investorEntityDisplay.textContent = 'ACCREDITED INVESTOR / ALLOCATOR';
      }
    }
    if (investorSignDate) {
      if (utrVal) {
        investorSignDate.textContent = dateStr + ' · UTR Ref: ' + utrVal;
      } else {
        investorSignDate.textContent = 'Auto-executed upon wire submission';
      }
    }
  }

  // Render and update Tier Slot Badges & Auto-Lock States
  function renderTierSlots() {
    var totalSlots = 22;
    var totalTaken = 0;

    for (var tierKey in TIER_DATA) {
      if (TIER_DATA.hasOwnProperty(tierKey)) {
        var t = TIER_DATA[tierKey];
        totalTaken += t.takenSlots;
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

    // Dynamic Hero Banner Progress Update
    var totalRemaining = Math.max(0, totalSlots - totalTaken);
    var pct = Math.round((totalTaken / totalSlots) * 100);

    var heroCounter = document.getElementById('heroSlotsCounter');
    if (heroCounter) {
      heroCounter.textContent = totalTaken === 0
        ? (totalRemaining + ' of ' + totalSlots + ' Slots Open')
        : (totalRemaining + ' of ' + totalSlots + ' Slots Open · ' + pct + '% Allocated');
    }
    var heroProgress = document.getElementById('heroProgressBarFill');
    var heroProgressWrap = document.getElementById('heroProgressWrap');
    if (heroProgress) {
      heroProgress.style.width = Math.max(pct, totalTaken === 0 ? 0 : 4) + '%';
    }
    if (heroProgressWrap) {
      heroProgressWrap.classList.toggle('is-idle', totalTaken === 0);
    }

    // Dynamic Navigation Bar Slots Pill
    var navSlotsPill = document.getElementById('navSlotsPill');
    if (navSlotsPill) {
      navSlotsPill.textContent = '🟢 ' + totalRemaining + ' Slots Open';
    }

    // Synchronize Term Sheet PDF Annexure A
    updateTermSheetDynamicData();
  }

  function persistSelectedTier(tier) {
    try {
      var sess = JSON.parse(sessionStorage.getItem(SESS_STORAGE_KEY) || '{}');
      sess.tier = tier;
      sessionStorage.setItem(SESS_STORAGE_KEY, JSON.stringify(sess));
    } catch (e) {}
  }

  // Persist URL ?tier= immediately when arriving on /invest/wire or /invest/terms
  if (typeof window !== 'undefined' && window.location && window.location.search) {
    try {
      var initQ = new URLSearchParams(window.location.search).get('tier');
      if (initQ && TIER_DATA[initQ]) persistSelectedTier(initQ);
    } catch (e) {}
  }

  // Tier Selection
  var tierSelectBtns = document.querySelectorAll('[data-select-tier]');
  tierSelectBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var tier = btn.getAttribute('data-select-tier');
      if (TIER_DATA[tier] && TIER_DATA[tier].locked) {
        e.preventDefault();
        return;
      }

      selectedTier = tier;
      persistSelectedTier(tier);

      // Direct 1-click Tier Card CTA navigates cleanly to /invest/wire?tier=...
      if (btn.hasAttribute('data-direct-wire')) {
        return;
      }

      e.preventDefault();
      updateWireSummary();

      document.querySelectorAll('.tier-card[data-tier-card]').forEach(function (c) {
        c.classList.toggle('tier-selected', c.getAttribute('data-tier-card') === tier);
      });

      if (window.location && window.location.pathname && window.location.pathname.indexOf('/invest/wire') !== -1 && window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '/invest/wire?tier=' + encodeURIComponent(tier));
      }

      var desk = document.getElementById('wire-desk');
      if (desk && window.location.pathname.indexOf('/invest/wire') === -1) {
        desk.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (!desk) {
        window.location.href = '/invest/wire?tier=' + encodeURIComponent(tier);
      }
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

    tierSelectBtns.forEach(function (b) {
      if (b.getAttribute('data-select-tier') === selectedTier) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

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

    // Sync all Wire Desk & iSAFE Agreement cross-links with selected tier
    var wireBtn = document.getElementById('btnGoToWireDesk');
    if (wireBtn) {
      wireBtn.href = '/invest/wire?tier=' + encodeURIComponent(selectedTier);
    }
    document.querySelectorAll('a[href="/invest/terms"], a[href^="/invest/terms?"]').forEach(function (a) {
      a.href = '/invest/terms?tier=' + encodeURIComponent(selectedTier);
    });
    document.querySelectorAll('a[href="/invest/wire"], a[href^="/invest/wire?"]:not([data-direct-wire])').forEach(function (a) {
      a.href = '/invest/wire?tier=' + encodeURIComponent(selectedTier);
    });

    updateTermSheetDynamicData();
  }

  // Copy-to-clipboard functionality with resilient fallback
  var copyBtns = document.querySelectorAll('[data-copy]');
  copyBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      if (!text) return;
      var original = btn.textContent;
      function showSuccess() {
        btn.textContent = 'Copied ✓';
        setTimeout(function () {
          btn.textContent = original;
        }, 2000);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showSuccess).catch(function () {
          fallbackCopy(text, showSuccess);
        });
      } else {
        fallbackCopy(text, showSuccess);
      }
    });
  });

  function fallbackCopy(text, onSuccess) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok && onSuccess) onSuccess();
    } catch (e) {
      console.warn('Clipboard fallback failed', e);
    }
  }



  // Investor Form Submission
  var form = document.getElementById('investForm');
  var formStatus = document.getElementById('formStatus');
  var formSuccess = document.getElementById('formSuccess');

  function prefillFormFromSession() {
    if (!form) return;
    try {
      var savedSess = JSON.parse(sessionStorage.getItem(SESS_STORAGE_KEY) || '{}');
      if (savedSess.name && form.elements['name'] && !form.elements['name'].value) {
        form.elements['name'].value = savedSess.name;
      }
      if (savedSess.entity && form.elements['entity'] && !form.elements['entity'].value) {
        form.elements['entity'].value = savedSess.entity;
      }
      if (savedSess.utr && form.elements['utr'] && !form.elements['utr'].value) {
        form.elements['utr'].value = savedSess.utr;
      }
    } catch (e) {}
  }

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
        name: form.elements['name'] ? form.elements['name'].value.trim() : '',
        email: form.elements['email'] ? form.elements['email'].value.trim() : '',
        phone: form.elements['phone'] ? form.elements['phone'].value.trim() : '',
        country: form.elements['country'] ? form.elements['country'].value.trim() : '',
        entity: form.elements['entity'] ? form.elements['entity'].value.trim() : '',
        tier: selectedTier,
        amount: TIER_DATA[selectedTier] ? TIER_DATA[selectedTier].amountUSD : '50,000',
        currency: 'USD',
        utr: form.elements['utr'] ? form.elements['utr'].value.trim() : '',
        notes: form.elements['notes'] ? form.elements['notes'].value.trim() : '',
        elapsed: Date.now() - pageLoadTime,
      };

      if (payload.name.length < 2) {
        if (formStatus) {
          formStatus.textContent = 'Please enter your full legal or institutional name.';
          formStatus.style.color = '#ff6b6b';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Lock Allocation & Register Wire Transfer →';
        }
        return;
      }

      if (!payload.email.includes('@') || !payload.email.includes('.')) {
        if (formStatus) {
          formStatus.textContent = 'Please enter a valid official/angel email address.';
          formStatus.style.color = '#ff6b6b';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Lock Allocation & Register Wire Transfer →';
        }
        return;
      }

      if (payload.utr.length < 3) {
        if (formStatus) {
          formStatus.textContent = 'Please enter your bank transfer reference number or UTR.';
          formStatus.style.color = '#ff6b6b';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Lock Allocation & Register Wire Transfer →';
        }
        return;
      }

      // Guarantee submission elapsed is at least 1600ms so autofill doesn't trigger server bot-drop
      var elapsed = Date.now() - pageLoadTime;
      if (elapsed < 1600) {
        await new Promise(function (resolve) { setTimeout(resolve, 1600 - elapsed); });
        elapsed = Date.now() - pageLoadTime;
      }
      payload.elapsed = elapsed;

      try {
        var res = await fetch('/api/invest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        var data = await res.json();
        if (res.ok && data.ok) {
          try {
            sessionStorage.setItem(SESS_STORAGE_KEY, JSON.stringify({
              name: payload.name,
              entity: payload.entity,
              utr: payload.utr,
              tier: selectedTier
            }));
          } catch (e) {}
          form.style.display = 'none';
          if (formSuccess) {
            formSuccess.style.display = 'block';
            var refCode = document.getElementById('allocationRefCode');
            if (refCode && data.id) {
              refCode.textContent = 'ALLOC-' + data.id.slice(0, 8).toUpperCase();
            }
          }
          // Real-time slot reservation upon successful UTR registration
          if (TIER_DATA[selectedTier] && TIER_DATA[selectedTier].remainingSlots > 0) {
            TIER_DATA[selectedTier].takenSlots += 1;
            TIER_DATA[selectedTier].remainingSlots -= 1;
            if (TIER_DATA[selectedTier].remainingSlots === 0) {
              TIER_DATA[selectedTier].statusBadge = '🔒 100% ALLOCATED & LOCKED';
            } else {
              TIER_DATA[selectedTier].statusBadge = '🟢 ' + TIER_DATA[selectedTier].totalSlots + ' Slots Total · ' + TIER_DATA[selectedTier].remainingSlots + ' Available';
            }
            saveSlotsStorage();
            renderTierSlots();
            updateTermSheetDynamicData();
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
          formStatus.style.color = '#ff6b6b';
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
  var openTermSheetQuickBtn = document.getElementById('openTermSheetQuickBtn');
  var closeTermSheetBtn = document.getElementById('closeTermSheetBtn');
  var printTermSheetBtn = document.getElementById('printTermSheetBtn');
  var printTermSheetBtnTop = document.getElementById('printTermSheetBtnTop');
  var printTermSheetBtnBottom = document.getElementById('printTermSheetBtnBottom');
  var printTermSheetBtnMobile = document.getElementById('printTermSheetBtnMobile');
  var acceptTermSheetBtn = document.getElementById('acceptTermSheetBtn');
  var acceptTermSheetBtnBottom = document.getElementById('acceptTermSheetBtnBottom');

  function openModal(e) {
    if (isafeModal) {
      if (e && e.preventDefault) e.preventDefault();
      updateTermSheetDynamicData();
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
  if (openTermSheetQuickBtn) openTermSheetQuickBtn.addEventListener('click', openModal);
  if (closeTermSheetBtn) closeTermSheetBtn.addEventListener('click', closeModal);

  function triggerPrint() {
    updateTermSheetDynamicData();
    window.print();
  }
  [printTermSheetBtn, printTermSheetBtnTop, printTermSheetBtnBottom, printTermSheetBtnMobile].forEach(function (btn) {
    if (btn) btn.addEventListener('click', triggerPrint);
  });
  document.querySelectorAll('[data-print-doc], #btnDeckPrint').forEach(function (btn) {
    btn.addEventListener('click', triggerPrint);
  });

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

  // Real-time listener on Wire Desk Form Inputs to reflect name/entity in Term Sheet live
  if (form) {
    ['name', 'entity', 'utr'].forEach(function (fieldName) {
      if (form.elements[fieldName]) {
        form.elements[fieldName].addEventListener('input', updateTermSheetDynamicData);
      }
    });
  }

  // Dedicated Investor Portal Mobile Menu Drawer Toggle
  var portalMenuBtn = document.getElementById('portalMenuBtn');
  var portalMobilePanel = document.getElementById('portalMobilePanel');
  var investNav = document.getElementById('investNav');
  if (portalMenuBtn && portalMobilePanel) {
    portalMenuBtn.addEventListener('click', function () {
      var isOpen = portalMobilePanel.classList.toggle('active');
      if (investNav) investNav.classList.toggle('open', isOpen);
      portalMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) {
        portalMobilePanel.removeAttribute('inert');
      } else {
        portalMobilePanel.setAttribute('inert', '');
      }
    });
    portalMobilePanel.querySelectorAll('a, button').forEach(function (link) {
      link.addEventListener('click', function () {
        portalMobilePanel.classList.remove('active');
        if (investNav) investNav.classList.remove('open');
        portalMenuBtn.setAttribute('aria-expanded', 'false');
        portalMobilePanel.setAttribute('inert', '');
      });
    });
  }

  // Lightweight reveal observer for invest sub-pages without home.js
  function initRevealObserver() {
    var reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;
    var vh = window.innerHeight || document.documentElement.clientHeight || 900;
    if ('IntersectionObserver' in window) {
      var revealObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            entry.target.classList.add('in');
            revealObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.02, rootMargin: '0px 0px -20px 0px' });
      reveals.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < vh * 1.05) {
          el.classList.add('visible');
          el.classList.add('in');
        } else {
          revealObs.observe(el);
        }
      });
    } else {
      reveals.forEach(function (el) {
        el.classList.add('visible');
        el.classList.add('in');
      });
    }
  }

  // Initialize: Load persistent allocations, render slots, format real-time dates, bind print hook & reveal observer
  initSlotsStorage();
  prefillFormFromSession();
  renderTierSlots();
  updateWireSummary();
  updateTermSheetDynamicData();
  initRevealObserver();
  initBankCoordinatesVerification();
  syncSlotsFromServer();
  window.addEventListener('beforeprint', updateTermSheetDynamicData);
})();
