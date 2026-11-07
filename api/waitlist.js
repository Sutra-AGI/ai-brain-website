// POST /api/waitlist — stores an early-access signup as a private JSON blob.
// Signups are visible only in the Vercel dashboard: Storage → aibrain-waitlist → waitlist/
import { put } from '@vercel/blob';
import { createHash, randomUUID } from 'node:crypto';

const ROLES = new Set(['developer', 'researcher', 'founder', 'other']);
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/;
const ALLOWED_HOSTS = new Set(['aibrainstartup.com', 'www.aibrainstartup.com', 'aibrain-startup.vercel.app']);

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    // Allow production domains, Vercel preview URLs of this project, and the request's own host.
    return ALLOWED_HOSTS.has(host) ||
      (host.startsWith('aibrain-startup-') && host.endsWith('.vercel.app')) ||
      host === new URL(request.url).hostname;
  } catch {
    return false;
  }
}

export async function POST(request) {
  if (!sameOrigin(request)) return json(403, { ok: false, error: 'forbidden' });

  const len = Number(request.headers.get('content-length') || 0);
  if (len > 2048) return json(413, { ok: false, error: 'payload_too_large' });

  let data;
  try {
    data = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }

  // Honeypot: real users never fill the hidden "company" field.
  if (data?.company) return json(200, { ok: true });

  const email = String(data?.email || '').trim().toLowerCase();
  const role = String(data?.role || '');
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: 'invalid_email' });
  if (!ROLES.has(role)) return json(400, { ok: false, error: 'invalid_role' });

  const now = new Date();
  // One file per email (hash in the name), so repeat signups overwrite instead of duplicating.
  const emailHash = createHash('sha256').update(email).digest('hex').slice(0, 16);
  const record = {
    id: randomUUID(),
    email,
    role,
    createdAt: now.toISOString(),
    source: String(data?.source || 'homepage').slice(0, 40),
    referrer: (request.headers.get('referer') || '').slice(0, 200),
    country: request.headers.get('x-vercel-ip-country') || null,
    userAgent: (request.headers.get('user-agent') || '').slice(0, 200),
  };

  try {
    await put(`waitlist/${emailHash}.json`, JSON.stringify(record, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (err) {
    console.error('[waitlist] blob write failed', err);
    return json(500, { ok: false, error: 'storage_unavailable' });
  }

  return json(200, { ok: true });
}

export function GET() {
  return json(405, { ok: false, error: 'method_not_allowed' });
}
