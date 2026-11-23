// invest.js — Handles currency toggle, tier selection, wire details generation, and allocation submission
(function () {
  'use strict';

  var currentCurrency = 'USD';
  var selectedTier = '10L';

  var TIER_DATA = {
    '10L': {
      usd: '$12,000 USD',
      inr: '₹10,00,000 INR',
      name: 'Strategic Angel',
      equity: '1.0% iSAFE Equity Stake',
      revshare: '5% Monthly Gross Revenue Share (up to 2.0x return)',
      amountUSD: '12,000',
      amountINR: '10,00,000',
    },
    '20L': {
      usd: '$24,000 USD',
      inr: '₹20,00,000 INR',
      name: 'Co-Founding Growth Partner',
      equity: '2.5% iSAFE Equity Stake',
      revshare: '7.5% Monthly Gross Revenue Share (up to 2.0x return)',
      amountUSD: '24,000',
      amountINR: '20,00,000',
    },
    '30L': {
      usd: '$36,000 USD',
      inr: '₹30,00,000 INR',
      name: 'Lead Anchor Investor',
      equity: '4.0% iSAFE Equity Stake',
      revshare: '10% Monthly Gross Revenue Share (up to 2.0x return)',
      amountUSD: '36,000',
      amountINR: '30,00,000',
    },
  };

  // Currency Toggle Listeners
  var curBtnUSD = document.getElementById('curBtnUSD');
  var curBtnINR = document.getElementById('curBtnINR');

  function setCurrency(cur) {
    currentCurrency = cur;
    if (curBtnUSD && curBtnINR) {
      if (cur === 'USD') {
        curBtnUSD.classList.add('active');
        curBtnINR.classList.remove('active');
      } else {
        curBtnINR.classList.add('active');
        curBtnUSD.classList.remove('active');
      }
    }

    var priceTags = document.querySelectorAll('[data-tier-price]');
    priceTags.forEach(function (el) {
      var tier = el.getAttribute('data-tier-price');
      if (TIER_DATA[tier]) {
        el.textContent = cur === 'USD' ? TIER_DATA[tier].usd : TIER_DATA[tier].inr;
      }
    });

    var wireCurBadge = document.getElementById('wireCurrencyBadge');
    if (wireCurBadge) {
      wireCurBadge.textContent = cur === 'USD' ? 'International SWIFT Wire (USD / EUR / Global)' : 'Domestic Indian Wire (RTGS / NEFT / IMPS)';
    }

    updateWireSummary();
  }

  if (curBtnUSD) {
    curBtnUSD.addEventListener('click', function () {
      setCurrency('USD');
    });
  }
  if (curBtnINR) {
    curBtnINR.addEventListener('click', function () {
      setCurrency('INR');
    });
  }

  // Tier Selection
  var tierSelectBtns = document.querySelectorAll('[data-select-tier]');
  tierSelectBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var tier = btn.getAttribute('data-select-tier');
      selectedTier = tier;
      var desk = document.getElementById('wire-desk');
      if (desk) {
        desk.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      updateWireSummary();
    });
  });

  function updateWireSummary() {
    var data = TIER_DATA[selectedTier] || TIER_DATA['10L'];
    var amountEl = document.getElementById('selectedAmountDisplay');
    var tierNameEl = document.getElementById('selectedTierNameDisplay');
    var equityEl = document.getElementById('selectedEquityDisplay');
    var revEl = document.getElementById('selectedRevDisplay');
    var hiddenTier = document.getElementById('formTier');
    var hiddenAmount = document.getElementById('formAmount');
    var hiddenCur = document.getElementById('formCurrency');

    if (amountEl) {
      amountEl.textContent = currentCurrency === 'USD' ? data.usd : data.inr;
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
    if (hiddenAmount) hiddenAmount.value = currentCurrency === 'USD' ? data.amountUSD : data.amountINR;
    if (hiddenCur) hiddenCur.value = currentCurrency;

    // Toggle domestic vs international wire details view
    var intlBox = document.getElementById('intlWireBox');
    var domBox = document.getElementById('domWireBox');
    if (intlBox && domBox) {
      if (currentCurrency === 'USD') {
        intlBox.style.display = 'block';
        domBox.style.display = 'none';
      } else {
        intlBox.style.display = 'none';
        domBox.style.display = 'block';
      }
    }
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
        amount: currentCurrency === 'USD' ? TIER_DATA[selectedTier].amountUSD : TIER_DATA[selectedTier].amountINR,
        currency: currentCurrency,
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
          formStatus.style.color = '#ff6b6b';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Lock Allocation & Register Wire Transfer →';
        }
      }
    });
  }

  // Initialize
  setCurrency('USD');
})();
