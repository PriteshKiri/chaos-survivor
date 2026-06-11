import { useEffect, useState } from "react";
import MascotPlayground from "./MascotPlayground";
import { sound } from "../lib/sound";

function Step({ icon, title, desc }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-chaos-border bg-chaos-bg text-lg">
        {icon}
      </span>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="font-mono text-xs text-slate-400">{desc}</p>
      </div>
    </li>
  );
}

export default function LandingPage() {
  const [hasQr, setHasQr] = useState(true);
  // Booth display: keep the home screen silent by default. The toggle lets an
  // operator unmute the mascot's pod-termination blips if they want them.
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    sound.setMuted(true);
  }, []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
  }

  return (
    <div className="chaos-backdrop relative flex min-h-screen flex-col overflow-hidden">
      {/* Top-left static brand logo. Drop file at public/logo.png to show it. */}
      <img
        src="/logo.png"
        alt="LitmusChaos"
        className="absolute left-6 top-6 z-10 h-12 w-auto"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />

      {/* Autonomous chaos mascot patrolling the background, terminating stray
          Kubernetes resources. */}
      <MascotPlayground />

      <button
        onClick={toggleMute}
        className="absolute right-6 top-6 z-10 rounded-lg border border-chaos-border bg-chaos-panel/70 px-3 py-2 text-sm text-slate-300 transition hover:bg-chaos-bg"
        title="Toggle sound"
      >
        {muted ? "🔇" : "🔊"}
      </button>

      <main className="relative z-[1] mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-12 px-8 py-20 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: messaging */}
        <div className="max-w-xl text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-litmus/40 bg-litmus/10 px-4 py-1.5 font-mono text-xs font-medium text-litmus-bright">
            ☢ KubeCon India · LitmusChaos Booth
          </span>

          <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
            Enter the
            <br />
            <span className="text-litmus-bright">Giveaway</span> 🎁
          </h1>

          <p className="mt-5 text-lg text-slate-300">
            Scan the QR, complete the quick form, and you're in. Winners are
            drawn <span className="text-white">live at the booth</span> with{" "}
            <span className="font-semibold text-running">Chaos Survivor</span> —
            because only the resilient survive chaos.
          </p>

          <ul className="mt-8 space-y-4 text-left">
            <Step
              icon="⭐"
              title="Star LitmusChaos on GitHub"
              desc="Show some love to the project"
            />
            <Step
              icon="▶️"
              title="Subscribe on YouTube"
              desc="Catch our chaos engineering content"
            />
            <Step
              icon="📝"
              title="Fill the form"
              desc="Takes 30 seconds — then you're entered"
            />
          </ul>
        </div>

        {/* Right: QR */}
        <div className="flex flex-col items-center">
          <div className="rounded-3xl border border-chaos-border bg-chaos-panel p-6 shadow-2xl">
            <div className="flex h-64 w-64 items-center justify-center overflow-hidden rounded-2xl bg-white">
              {hasQr ? (
                <img
                  src="/qr.png"
                  alt="Scan to participate"
                  className="h-full w-full object-contain p-2"
                  onError={() => setHasQr(false)}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="grid grid-cols-3 gap-1.5 opacity-40">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-5 w-5 rounded-sm ${
                          [0, 2, 4, 6, 8].includes(i)
                            ? "bg-chaos-bg"
                            : "bg-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="mt-2 font-mono text-xs text-slate-500">
                    QR placeholder
                  </span>
                </div>
              )}
            </div>
          </div>
          <p className="mt-5 flex items-center gap-2 font-mono text-sm font-semibold text-white">
            <span className="text-litmus-bright">📲</span> Scan to participate
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">
            Drop your QR at <span className="text-slate-400">public/qr.png</span>
          </p>
        </div>
      </main>

      <footer className="relative z-[1] border-t border-chaos-border/60 px-8 py-4 text-center font-mono text-xs text-slate-500">
        Winner announced live at the booth · powered by{" "}
        <span className="text-litmus-bright">LitmusChaos</span>
      </footer>
    </div>
  );
}
