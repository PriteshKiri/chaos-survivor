const KEYS = {
  names: "chaos.names",
  winners: "chaos.winners",
  seed: "chaos.seed",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable - non-fatal for a booth session */
  }
}

export const storage = {
  getNames: () => read(KEYS.names, []),
  setNames: (names) => write(KEYS.names, names),

  getWinners: () => read(KEYS.winners, []),
  setWinners: (winners) => write(KEYS.winners, winners),

  getSeed: () => read(KEYS.seed, null),
  setSeed: (seed) => write(KEYS.seed, seed),

  reset: () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
