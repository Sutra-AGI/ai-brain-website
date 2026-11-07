// POST /api/contact — keeps a private copy of every contact-form message, so nothing is lost
// even when the visitor's email app does not open. View in: Storage → aibrain-waitlist → contact/
import { randomUUID } from 'node:crypto';
import { EMAIL_RE, json, looksLikeBot, meta, methodNotAllowed, rateLimited, readJson, savePrivate } from './_lib.js';

const TOPICS = new Set(['Investment / funding', 'Enterprise cluster', 'Strategic partnership', 'SDK & technical support', 'Other']);

export async function POST(request) {
  const [data, err] = await readJson(request);
  if (err) return err;
  if (looksLikeBot(data)) return json(200, { ok: true });

  try {
    if (await rateLimited(request, 'contact')) return json(429, { ok: false, error: 'too_many_requests' }, { 'Retry-After': '60' });
  } catch (e) {
    console.error('[contact] rate-limit check failed', e); // fail open: never block real users on a limiter error
  }

  const name = String(data?.name || '').trim().slice(0, 120);
  const email = String(data?.email || '').trim().toLowerCase();
  const topic = TOPICS.has(data?.topic) ? data.topic : 'Other';
  const message = String(data?.message || '').trim().slice(0, 4000);

  if (name.length < 2) return json(400, { ok: false, error: 'invalid_name' });
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: 'invalid_email' });
  if (message.length < 10) return json(400, { ok: false, error: 'invalid_message' });

  const now = new Date();
  const id = randomUUID();
  try {
    await savePrivate(`contact/${now.toISOString().slice(0, 10)}/${now.getTime()}-${id.slice(0, 8)}.json`, {
      id, name, email, topic, message, createdAt: now.toISOString(), ...meta(request),
    });
  } catch (e) {
    console.error('[contact] blob write failed', e);
    return json(500, { ok: false, error: 'storage_unavailable' });
  }
  console.log('[contact] message stored', { topic });
  return json(200, { ok: true });
}

export const GET = methodNotAllowed;
