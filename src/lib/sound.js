// Tiny WebAudio sound helper - no asset files needed, works fully offline.
let ctx;
let muted = false;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, duration, type = "sine", gain = 0.15, delay = 0) {
  if (muted) return;
  const ac = getCtx();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ac.destination);
  const start = ac.currentTime + delay;
  osc.start(start);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.stop(start + duration);
}

export const sound = {
  setMuted(value) {
    muted = value;
  },
  isMuted() {
    return muted;
  },
  // Short blip when a pod is terminated.
  kill() {
    tone(180 + Math.random() * 80, 0.12, "sawtooth", 0.08);
  },
  // Rising alarm while chaos runs.
  alarm() {
    tone(440, 0.15, "square", 0.05);
    tone(620, 0.15, "square", 0.05, 0.15);
  },
  // Triumphant arpeggio on winner reveal.
  victory() {
    if (muted) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, 0.5, "triangle", 0.18, i * 0.12)
    );
  },
};
