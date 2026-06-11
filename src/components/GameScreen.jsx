import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import PodCard from "./PodCard";
import WinnerOverlay from "./WinnerOverlay";
import { killOrder, winnerRanking } from "../lib/chaos";
import { sound } from "../lib/sound";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fireConfetti() {
  const end = Date.now() + 800;
  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 70,
      origin: { x: 0 },
      colors: ["#6c5ce7", "#8a7dff", "#22c55e", "#f59e0b"],
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 70,
      origin: { x: 1 },
      colors: ["#6c5ce7", "#8a7dff", "#22c55e", "#f59e0b"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function GameScreen({
  names,
  seed,
  winners,
  onWinnersChange,
  onReset,
}) {
  const n = names.length;
  const ranking = useMemo(() => winnerRanking(n, seed), [n, seed]);
  const kill = useMemo(() => killOrder(n, seed), [n, seed]);

  const [statuses, setStatuses] = useState(() => Array(n).fill("running"));
  const [phase, setPhase] = useState("idle"); // idle | running | revealed
  const [currentRank, setCurrentRank] = useState(0); // winners revealed so far
  const [overlayWinner, setOverlayWinner] = useState(null);
  const [muted, setMuted] = useState(false);
  const busy = useRef(false);

  // Reconstruct board state from persisted winners on first mount.
  useEffect(() => {
    if (winners.length > 0) {
      const k = winners.length;
      const next = Array(n).fill("crashed");
      next[ranking[k - 1]] = "running";
      setStatuses(next);
      setCurrentRank(k);
      setPhase("revealed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatusAt = useCallback((index, value) => {
    setStatuses((prev) => {
      const next = prev.slice();
      next[index] = value;
      return next;
    });
  }, []);

  function recordWinner(rank) {
    const idx = ranking[rank - 1];
    const entry = {
      name: names[idx],
      rank,
      index: idx,
      at: new Date().toISOString(),
    };
    onWinnersChange([...winners, entry]);
    setOverlayWinner(entry);
    sound.victory();
    fireConfetti();
  }

  // Runs a full chaos elimination round that ends on the given ranked survivor.
  // Used for BOTH the first draw and every "re-inject chaos" (next winner), so
  // each winner is found with the same suspenseful cycle.
  async function runChaos(targetRank) {
    if (busy.current) return;
    if (targetRank < 1 || targetRank > n) return;
    busy.current = true;
    setOverlayWinner(null);
    setPhase("running");

    const k0 = targetRank - 1;
    const survivor = ranking[k0];
    // Previously revealed winners are "claimed" and stay out of the cluster.
    const claimed = new Set(ranking.slice(0, k0));

    // Revive the eligible pods back to Running so the whole cluster restarts,
    // then let chaos hit them again.
    setStatuses(() => {
      const next = Array(n).fill("running");
      claimed.forEach((i) => {
        next[i] = "crashed";
      });
      return next;
    });
    await sleep(900);

    const toKill = kill.filter((i) => !claimed.has(i) && i !== survivor);
    // Slower, more suspenseful pacing (~7s total, with sensible per-pod bounds).
    const stepDelay = Math.max(
      120,
      Math.min(520, Math.round(7000 / Math.max(1, toKill.length)))
    );

    for (const idx of toKill) {
      setStatusAt(idx, "terminating");
      sound.alarm();
      await sleep(stepDelay * 0.6);
      setStatusAt(idx, "crashed");
      await sleep(stepDelay * 0.4);
    }

    await sleep(600);
    setCurrentRank(targetRank);
    setPhase("revealed");
    recordWinner(targetRank);
    busy.current = false;
  }

  function injectChaos() {
    if (phase !== "idle") return;
    runChaos(1);
  }

  function nextWinner() {
    if (phase !== "revealed" || currentRank >= n) return;
    runChaos(currentRank + 1);
  }

  // Keyboard shortcuts for hands-free booth operation.
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (phase === "idle") injectChaos();
      } else if (e.key === "n" || e.key === "N") {
        if (phase === "revealed" && currentRank < n) nextWinner();
      } else if (e.key === "Escape") {
        setOverlayWinner(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentRank, n]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
  }

  const aliveCount = statuses.filter((s) => s !== "crashed").length;
  const currentWinnerName =
    currentRank > 0 ? names[ranking[currentRank - 1]] : null;

  return (
    <div className="chaos-backdrop relative flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-chaos-border bg-chaos-panel/70 px-6 py-3">
        <div className="flex items-center gap-3">
          <img src="/mascot.png" alt="mascot" className="h-10 w-10" />
          <div>
            <h1 className="text-lg font-black leading-none text-white">
              Chaos <span className="text-litmus-bright">Survivor</span>
            </h1>
            <p className="font-mono text-[11px] text-slate-400">
              cluster: litmus-booth · {n} pods · {aliveCount} running
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="rounded-lg border border-chaos-border px-3 py-2 text-sm text-slate-300 transition hover:bg-chaos-bg"
            title="Toggle sound"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          {phase === "idle" ? (
            <button
              onClick={injectChaos}
              className="rounded-lg bg-crashed px-5 py-2 font-bold text-white shadow-lg transition hover:brightness-110"
            >
              ☢ Inject Chaos (Space)
            </button>
          ) : (
            <button
              onClick={nextWinner}
              disabled={phase !== "revealed" || currentRank >= n}
              className="rounded-lg bg-litmus px-5 py-2 font-bold text-white transition hover:bg-litmus-bright disabled:cursor-not-allowed disabled:opacity-40"
            >
              ↻ Next Winner (N)
            </button>
          )}
          <button
            onClick={onReset}
            className="rounded-lg border border-chaos-border px-3 py-2 text-sm text-slate-300 transition hover:border-crashed hover:text-crashed"
            title="Clear all data and start over"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Pod grid */}
        <main className="terminal-scanline relative flex-1 overflow-auto p-6">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {names.map((name, i) => (
              <PodCard
                key={i}
                name={name}
                status={statuses[i]}
                isWinner={
                  phase === "revealed" && ranking[currentRank - 1] === i
                }
              />
            ))}
          </div>
        </main>

        {/* Winner log */}
        <aside className="hidden w-72 shrink-0 flex-col border-l border-chaos-border bg-chaos-panel/70 lg:flex">
          <div className="border-b border-chaos-border px-4 py-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-slate-400">
              Survivor Log
            </h2>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {winners.length === 0 ? (
              <p className="px-1 py-6 text-center font-mono text-xs text-slate-500">
                Inject chaos to find the
                <br />
                first survivor.
              </p>
            ) : (
              <ol className="space-y-2">
                {winners.map((w) => (
                  <li
                    key={w.rank}
                    className="rounded-lg border border-chaos-border bg-chaos-bg px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-running">
                        #{w.rank}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(w.at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold text-white">
                      {w.name}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {currentWinnerName && (
            <div className="border-t border-chaos-border px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                Current winner
              </p>
              <p className="truncate text-base font-bold text-running">
                {currentWinnerName}
              </p>
            </div>
          )}
        </aside>
      </div>

      <WinnerOverlay
        winner={overlayWinner}
        onClose={() => setOverlayWinner(null)}
        onNext={nextWinner}
        canNext={currentRank < n}
      />
    </div>
  );
}
