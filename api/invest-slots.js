// GET /api/invest-slots — returns current verified allocation slot state across all investor tiers
import { json, readPrivate, savePrivate } from './_lib.js';

export const TOTAL_SLOTS = {
  '15k': 10,
  '25k': 6,
  '50k': 4,
  '100k': 2,
};

const LEDGER_BLOB = 'invest-ledger/slots.json';

export async function getSlotsState() {
  let ledger = null;
  try {
    ledger = await readPrivate(LEDGER_BLOB);
  } catch (e) {
    console.warn('[invest-slots] read failed, using fallback defaults', e?.message);
  }

  const taken = ledger?.taken || { '15k': 0, '25k': 0, '50k': 0, '100k': 0 };
  const slots = {};
  let totalRemaining = 0;
  let totalBooked = 0;

  for (const tier of Object.keys(TOTAL_SLOTS)) {
    const total = TOTAL_SLOTS[tier];
    const takenCount = Math.min(total, Math.max(0, Number(taken[tier]) || 0));
    const remaining = Math.max(0, total - takenCount);
    totalBooked += takenCount;
    totalRemaining += remaining;

    slots[tier] = {
      total,
      taken: takenCount,
      remaining,
      locked: remaining === 0,
      statusBadge: remaining === 0
        ? '🔒 100% ALLOCATED & LOCKED'
        : (tier === '50k' ? `🔥 Featured · ${total} Slots Total · ${remaining} Available` :
           tier === '100k' ? `🏛️ ${total} Exclusive Slots · ${remaining} Available` :
           `🟢 ${total} Slots Total · ${remaining} Available`),
    };
  }

  return {
    ok: true,
    round: 'Pre-Seed Strategic Allocation',
    valuationCapUSD: 4000000,
    targetRoundUSD: 700000,
    totalSlots: 22,
    totalBooked,
    totalRemaining,
    slots,
  };
}

export async function recordSlotBooking(tier) {
  if (!TOTAL_SLOTS[tier]) return null;
  let ledger = null;
  try {
    ledger = await readPrivate(LEDGER_BLOB);
  } catch (e) {}

  const taken = ledger?.taken || { '15k': 0, '25k': 0, '50k': 0, '100k': 0 };
  const current = Number(taken[tier]) || 0;
  if (current < TOTAL_SLOTS[tier]) {
    taken[tier] = current + 1;
    try {
      await savePrivate(LEDGER_BLOB, {
        taken,
        lastUpdated: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[invest-slots] blob save failed', e?.message);
    }
  }
  return taken;
}

export async function GET() {
  const data = await getSlotsState();
  return json(200, data, {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
}
