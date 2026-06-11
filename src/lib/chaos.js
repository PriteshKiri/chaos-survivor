// Deterministic, seeded survival ranking for Chaos Survivor.
//
// We generate a "kill order" (the order in which pods get terminated by the
// chaos experiment). The LAST pod to die is the most resilient -> Winner #1.
// Reversing the kill order gives the ranked winner list, which lets us advance
// to the next winner if the announced person isn't at the booth.

// mulberry32 PRNG - small, fast, deterministic given a 32-bit seed.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeSeed() {
  return Math.floor(Math.random() * 0xffffffff);
}

/**
 * Returns indices [0..n-1] shuffled deterministically by seed (Fisher-Yates).
 * This is the kill order: index killOrder[0] dies first.
 */
export function killOrder(n, seed) {
  const rng = mulberry32(seed);
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Ranked winners (most resilient first) = reverse of kill order.
 * winnerRanking[0] survives longest -> Winner #1.
 */
export function winnerRanking(n, seed) {
  return killOrder(n, seed).slice().reverse();
}
