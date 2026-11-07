// Shared helpers for form endpoints. Files starting with "_" are not exposed as routes.
import { get, put } from '@vercel/blob';
import { createHash } from 'node:crypto';

const PROD_HOSTS = ['aibrainstartup.com', 'www.aibrainstartup.com', 'aibrain-startup.vercel.app'];
export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/;
export const MAX_BODY = 8 * 1024;

export const json = (status, body, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

/** Exact allowlist: production hosts + this deployment's own Vercel URLs (set by the platform). */
function allowedHosts() {
  const hosts = new Set(PROD_HOSTS);
  for (const k of ['VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) {
    if (process.env[k]) hosts.add(process.env[k].replace(/^https?:\/\//, ''));
  }
  if (process.env.VERCEL_ENV === undefined) hosts.add('localhost'); // local dev only
  return hosts;
}

export function originAllowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return allowedHosts().has(hostname);
  } catch {
    return false;
  }
}

/** Parse a small JSON body; returns [data, errorResponse]. */
export async function readJson(request) {
  if (!originAllowed(request)) return [null, json(403, { ok: false, error: 'forbidden' })];
  const ct = request.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return [null, json(415, { ok: false, error: 'unsupported_media_type' })];
  let text;
  try {
    text = await request.text();
  } catch {
    return [null, json(400, { ok: false, error: 'invalid_body' })];
  }
  if (text.length > MAX_BODY) return [null, json(413, { ok: false, error: 'payload_too_large' })];
  try {
    return [JSON.parse(text), null];
  } catch {
    return [null, json(400, { ok: false, error: 'invalid_json' })];
  }
}

/**
 * Bot signals: honeypot field filled, or form submitted implausibly fast.
 * `elapsed` is ms between page load and submit, sent by the browser.
 */
export function looksLikeBot(data) {
  if (data?.company) return true;
  const elapsed = Number(data?.elapsed);
  return !Number.isFinite(elapsed) || elapsed < 1500;
}

export const hashOf = (s) => createHash('sha256').update(s).digest('hex').slice(0, 20);

export function meta(request) {
  return {
    country: request.headers.get('x-vercel-ip-country') || null,
    userAgent: (request.headers.get('user-agent') || '').slice(0, 200),
    referrer: (request.headers.get('referer') || '').slice(0, 200),
  };
}

/** Read a private JSON blob; null when it does not exist (or cannot be parsed). */
export async function readPrivate(pathname) {
  try {
    const res = await get(pathname, { access: 'private' });
    if (!res || res.statusCode !== 200) return null;
    return JSON.parse(await new Response(res.stream).text());
  } catch {
    return null;
  }
}

export async function savePrivate(pathname, record) {
  await put(pathname, JSON.stringify(record, null, 2), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export const methodNotAllowed = () => json(405, { ok: false, error: 'method_not_allowed' }, { Allow: 'POST' });

/* ---------- Rate limiting ----------
 * Two layers, because the project firewall is not configurable from code:
 * 1) in-memory burst limit per warm function instance (5 / minute / IP), free;
 * 2) durable hourly cap per IP stored as a tiny private blob (20 / hour / IP).
 */
const burst = new Map();
function clientIp(request) {
  return (request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
}

export async function rateLimited(request, scope) {
  const ip = clientIp(request);
  const now = Date.now();
  const key = `${scope}:${ip}`;
  const hits = (burst.get(key) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  burst.set(key, hits);
  if (burst.size > 5000) burst.clear();
  if (hits.length > 5) return true;

  const hour = new Date(now).toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const path = `ratelimit/${scope}/${hour}/${hashOf(ip)}.json`;
  const prev = await readPrivate(path);
  const count = (prev?.count || 0) + 1;
  if (count > 20) return true;
  await savePrivate(path, { count, hour });
  return false;
}

/* ---------- Email notification (optional) ----------
 * Active only when RESEND_API_KEY and NOTIFY_EMAIL are set in Vercel → Settings → Environment Variables.
 * NOTIFY_FROM defaults to Resend's test sender, which can only deliver to the Resend account owner's
 * address; set it to e.g. "AI Brain <hello@aibrainstartup.com>" after verifying the domain in Resend.
 * Never throws: a failed email must not fail the signup.
 */
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function notify(subject, fields) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return false;
  const rows = Object.entries(fields)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${escHtml(k)}</td><td style="padding:4px 0">${escHtml(v ?? '')}</td></tr>`)
    .join('');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || 'AI Brain <onboarding@resend.dev>',
        to: to.split(',').map((s) => s.trim()).filter(Boolean),
        subject,
        html: `<div style="font-family:system-ui,sans-serif;font-size:14px"><h2 style="margin:0 0 12px">${escHtml(subject)}</h2><table>${rows}</table></div>`,
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.error('[notify] resend error', res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error('[notify] failed', e?.message);
    return false;
  }
}
