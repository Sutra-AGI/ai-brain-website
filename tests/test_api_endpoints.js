import { getSlotsState, TOTAL_SLOTS } from '../api/invest-slots.js';

async function test() {
  console.log('Testing api/invest-slots.js logic...');
  const state = await getSlotsState();
  if (!state.ok) throw new Error('State ok is false');
  if (state.totalSlots !== 22) throw new Error(`Expected 22 total slots, got ${state.totalSlots}`);
  if (state.valuationCapUSD !== 4000000) throw new Error('Expected 4M valuation cap');
  if (state.targetRoundUSD !== 700000) throw new Error('Expected 700K target');
  for (const tier of Object.keys(TOTAL_SLOTS)) {
    if (!state.slots[tier]) throw new Error(`Missing tier ${tier}`);
    if (state.slots[tier].total !== TOTAL_SLOTS[tier]) throw new Error(`Mismatch in tier total for ${tier}`);
  }
  console.log('✓ Slot state structure verified successfully!');
  console.log(JSON.stringify(state, null, 2));
}

test().catch(err => {
  console.error('API Test Error:', err);
  process.exit(1);
});
