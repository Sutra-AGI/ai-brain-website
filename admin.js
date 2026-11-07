/* AI Brain — private admin dashboard. Token stays in sessionStorage (cleared when the tab closes). */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const KEY = 'aibrain_admin_token';
  const COLS = {
    waitlist: [['createdAt', 'Signed up'], ['email', 'Email'], ['role', 'Role'], ['country', 'Country'], ['signups', 'Signups'], ['source', 'Source']],
    contact: [['createdAt', 'Received'], ['name', 'Name'], ['email', 'Email'], ['topic', 'Topic'], ['message', 'Message'], ['country', 'Country']],
  };
  let type = 'waitlist';
  let items = [];

  const store = {
    get: () => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } },
    set: (v) => { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch { /* blocked */ } },
  };
  let token = store.get();

  const show = (dash) => {
    $('#loginView').hidden = dash;
    $('#dashView').hidden = !dash;
    $('#logoutBtn').hidden = !dash;
  };
  const loginMsg = (cls, text) => { const m = $('#loginMsg'); m.className = `form-msg show ${cls}`; m.textContent = text; };
  const fmtDate = (s) => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); };

  async function load() {
    $('#countLine').textContent = 'Loading…';
    const res = await fetch(`/api/admin?type=${type}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) { logout('Wrong token.'); return; }
    if (res.status === 503) { logout('Admin is not configured: set ADMIN_TOKEN (16+ characters) in Vercel and redeploy.'); return; }
    if (res.status === 429) { logout('Too many attempts. Try again in a minute.'); return; }
    if (!res.ok || !body.ok) { $('#countLine').textContent = 'Could not load data.'; return; }
    items = body.items;
    show(true);
    render();
  }

  function render() {
    const cols = COLS[type];
    const q = $('#filter').value.trim().toLowerCase();
    const rows = q ? items.filter((it) => JSON.stringify(it).toLowerCase().includes(q)) : items;
    $('#countLine').textContent = `${rows.length} of ${items.length} ${type === 'waitlist' ? 'signups' : 'messages'}`;
    const thead = $('#table thead'), tbody = $('#table tbody');
    thead.replaceChildren(); tbody.replaceChildren();
    const hr = document.createElement('tr');
    cols.forEach(([, label]) => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; hr.appendChild(th); });
    thead.appendChild(hr);
    if (!rows.length) {
      const tr = document.createElement('tr'); const td = document.createElement('td');
      td.colSpan = cols.length; td.className = 'empty'; td.textContent = items.length ? 'No matches.' : 'Nothing yet.';
      tr.appendChild(td); tbody.appendChild(tr); return;
    }
    for (const it of rows) {
      const tr = document.createElement('tr');
      cols.forEach(([k]) => {
        const td = document.createElement('td');
        if (k === 'message') td.className = 'msg';
        if (k === 'email') { const a = document.createElement('a'); a.href = `mailto:${it.email}`; a.textContent = it.email; td.appendChild(a); }
        else td.textContent = k === 'createdAt' ? fmtDate(it[k]) : (it[k] ?? '');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
  }

  function csv() {
    const cols = COLS[type];
    const cell = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent spreadsheet formula injection
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [cols.map(([, l]) => cell(l)).join(','), ...items.map((it) => cols.map(([k]) => cell(it[k])).join(','))];
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aibrain-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function logout(message) {
    token = ''; store.set(''); items = [];
    show(false);
    if (message) loginMsg('err', message);
    $('#token').focus();
  }

  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    token = $('#token').value.trim();
    store.set(token);
    $('#token').value = '';
    load().catch(() => loginMsg('err', 'Network error.'));
  });
  $('#logoutBtn').addEventListener('click', () => logout());
  $('#refreshBtn').addEventListener('click', () => load());
  $('#csvBtn').addEventListener('click', csv);
  $('#filter').addEventListener('input', render);
  document.querySelectorAll('.admin-tabs button').forEach((b) => b.addEventListener('click', () => {
    type = b.dataset.type;
    document.querySelectorAll('.admin-tabs button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $('#filter').value = '';
    load();
  }));

  if (token) load().catch(() => show(false)); else show(false);
})();
