// GET /api/admin?type=waitlist|contact — private list of submissions for the /admin page.
// Enabled only when ADMIN_TOKEN is set in Vercel → Settings → Environment Variables (Production).
// Request header: Authorization: Bearer <ADMIN_TOKEN>
import { list } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';
import { json, rateLimited, readPrivate } from './_lib.js';

const PREFIX = { waitlist: 'waitlist/', contact: 'contact/' };
const MAX_ITEMS = 1000;

function tokenOk(request, expected) {
  const got = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || expected.length < 16) return json(503, { ok: false, error: 'admin_not_configured' });

  if (!tokenOk(request, expected)) {
    // Throttle password guessing: failed attempts count against the per-IP limit.
    try {
      if (await rateLimited(request, 'admin')) return json(429, { ok: false, error: 'too_many_requests' }, { 'Retry-After': '60' });
    } catch { /* fail open on limiter errors */ }
    return json(401, { ok: false, error: 'unauthorized' });
  }

  const type = new URL(request.url).searchParams.get('type') || 'waitlist';
  const prefix = PREFIX[type];
  if (!prefix) return json(400, { ok: false, error: 'invalid_type' });

  try {
    return await listItems(type, prefix);
  } catch (e) {
    console.error('[admin] list failed', e?.message);
    return json(500, { ok: false, error: 'storage_unavailable' });
  }
}

async function listItems(type, prefix) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore && blobs.length < MAX_ITEMS ? page.cursor : undefined;
  } while (cursor);

  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const items = [];
  const queue = blobs.slice(0, MAX_ITEMS);
  // Read in small parallel batches to stay fast without hammering the store.
  for (let i = 0; i < queue.length; i += 10) {
    const batch = await Promise.all(queue.slice(i, i + 10).map((b) => readPrivate(b.pathname)));
    items.push(...batch.filter(Boolean));
  }
  return json(200, { ok: true, type, count: items.length, truncated: blobs.length > MAX_ITEMS, items });
}

export const POST = () => json(405, { ok: false, error: 'method_not_allowed' }, { Allow: 'GET' });
