// POST /api/waitlist — stores an early-access signup as a private JSON blob.
// View signups in the Vercel dashboard: Storage → aibrain-waitlist → waitlist/
import { randomUUID } from 'node:crypto';
import { EMAIL_RE, hashOf, readPrivate, json, looksLikeBot, meta, methodNotAllowed, notify, rateLimited, readJson, savePrivate } from './_lib.js';

const ROLES = new Set(['developer', 'researcher', 'founder', 'other']);

export async function POST(request) {
  const [data, err] = await readJson(request);
  if (err) return err;

  // Pretend success for bots so they don't retry or adapt.
  if (looksLikeBot(data)) return json(200, { ok: true });

  try {
    if (await rateLimited(request, 'waitlist')) return json(429, { ok: false, error: 'too_many_requests' }, { 'Retry-After': '60' });
  } catch (e) {
    console.error('[waitlist] rate-limit check failed', e); // fail open: never block real users on a limiter error
  }

  const email = String(data?.email || '').trim().toLowerCase();
  const role = String(data?.role || '');
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: 'invalid_email' });
  if (!ROLES.has(role)) return json(400, { ok: false, error: 'invalid_role' });

  const pathname = `waitlist/${hashOf(email)}.json`;
  const now = new Date().toISOString();

  let record;
  try {
    // Keep the original signup date and id when the same email signs up again.
    const prev = await readPrivate(pathname);
    record = {
      id: prev?.id || randomUUID(),
      email,
      role,
      createdAt: prev?.createdAt || now,
      updatedAt: now,
      signups: (prev?.signups || 1) + (prev ? 1 : 0),
      source: String(data?.source || 'homepage').slice(0, 40),
      ...meta(request),
    };
    await savePrivate(pathname, record);
  } catch (e) {
    console.error('[waitlist] blob write failed', e);
    return json(500, { ok: false, error: 'storage_unavailable' });
  }

  console.log('[waitlist] signup stored', { role });
  if (record.signups === 1) {
    await notify(`New waitlist signup: ${email}`, { Email: email, Role: role, Country: record.country, Time: record.createdAt, Source: record.source });
  }
  return json(200, { ok: true });
}

export const GET = methodNotAllowed;
