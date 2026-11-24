// POST /api/invest — keeps a record of all strategic investor allocations & wire confirmations
import { randomUUID } from 'node:crypto';
import { EMAIL_RE, json, looksLikeBot, meta, methodNotAllowed, notify, rateLimited, readJson, savePrivate } from './_lib.js';
import { getSlotsState, recordSlotBooking } from './invest-slots.js';

const TIERS = new Set(['15k', '25k', '50k', '100k', 'custom']);

export async function POST(request) {
  const [data, err] = await readJson(request);
  if (err) return err;
  if (looksLikeBot(data)) return json(200, { ok: true });

  try {
    if (await rateLimited(request, 'invest')) return json(429, { ok: false, error: 'too_many_requests' }, { 'Retry-After': '60' });
  } catch (e) {
    console.error('[invest] rate-limit check failed', e);
  }

  const name = String(data?.name || '').trim().slice(0, 120);
  const email = String(data?.email || '').trim().toLowerCase();
  const phone = String(data?.phone || '').trim().slice(0, 50);
  const country = String(data?.country || 'International').trim().slice(0, 80);
  const tier = TIERS.has(data?.tier) ? data.tier : '50k';
  const amount = String(data?.amount || '').trim().slice(0, 50);
  const currency = String(data?.currency || 'USD').trim().toUpperCase();
  const utr = String(data?.utr || '').trim().slice(0, 100);
  const entity = String(data?.entity || '').trim().slice(0, 150);
  const notes = String(data?.notes || '').trim().slice(0, 2000);

  if (name.length < 2) return json(400, { ok: false, error: 'invalid_name' });
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: 'invalid_email' });

  const now = new Date();
  const id = randomUUID();
  const record = {
    id,
    name,
    email,
    phone,
    country,
    entity,
    tier,
    amount,
    currency,
    utr,
    notes,
    createdAt: now.toISOString(),
    ...meta(request),
  };

  try {
    await savePrivate(`invest/${now.toISOString().slice(0, 10)}/${now.getTime()}-${id.slice(0, 8)}.json`, record);
  } catch (e) {
    console.error('[invest] blob write failed', e);
    // Continue even if blob write fails, so we can still attempt email alert
  }

  try {
    await recordSlotBooking(tier);
  } catch (e) {
    console.error('[invest] slot ledger update failed', e);
  }

  console.log('[invest] strategic allocation registered', { tier, amount, currency, country });
  await notify(`🚀 NEW STRATEGIC INVESTOR ALLOCATION: ${currency} ${amount} (${tier}) from ${name}`, {
    Name: name,
    Email: email,
    Phone: phone,
    Country: country,
    Entity: entity || 'Individual',
    Tier: tier,
    Amount: `${currency} ${amount}`,
    'Wire Ref / UTR': utr || 'Wire in progress',
    Time: now.toISOString(),
    Notes: notes || 'None',
  });

  return json(200, { ok: true, id, message: 'Allocation confirmed. Wire details locked.' });
}

export async function GET() {
  const data = await getSlotsState();
  return json(200, data, {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
}
