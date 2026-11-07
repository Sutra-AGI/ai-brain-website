// GET /api/cleanup — daily Vercel Cron job (see vercel.json).
// Deletes rate-limit blobs older than 24 hours, as promised in the privacy policy.
// Vercel sends "Authorization: Bearer $CRON_SECRET" when the CRON_SECRET env var is set.
import { del, list } from '@vercel/blob';
import { json } from './_lib.js';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return json(401, { ok: false, error: 'unauthorized' });
  }

  const cutoff = Date.now() - MAX_AGE_MS;
  let cursor;
  let deleted = 0;
  do {
    const page = await list({ prefix: 'ratelimit/', cursor, limit: 1000 });
    const stale = page.blobs.filter((b) => new Date(b.uploadedAt).getTime() < cutoff).map((b) => b.url);
    if (stale.length) {
      await del(stale);
      deleted += stale.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  console.log('[cleanup] deleted rate-limit blobs', { deleted });
  return json(200, { ok: true, deleted });
}
