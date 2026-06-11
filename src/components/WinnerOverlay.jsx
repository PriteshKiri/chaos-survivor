import { motion, AnimatePresence } from "framer-motion";

export default function WinnerOverlay({ winner, onNext, onClose, canNext }) {
  return (
    <AnimatePresence>
      {winner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-chaos-bg/85 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.7, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-3xl border border-running/40 bg-chaos-panel p-12 text-center shadow-2xl"
          >
            <img
              src="/mascot.png"
              alt="mascot"
              className="mx-auto h-28 w-28 drop-shadow-lg"
            />
            <p className="mt-6 font-mono text-sm uppercase tracking-[0.3em] text-running">
              Winner #{winner.rank} · Last Pod Standing
            </p>
            <h2 className="mt-3 break-words text-6xl font-black text-white">
              {winner.name}
            </h2>
            <p className="mt-4 font-mono text-xs text-slate-400">
              survived the chaos experiment ✦ status: Running
            </p>

            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                onClick={onClose}
                className="rounded-xl border border-chaos-border px-6 py-3 font-semibold text-slate-200 transition hover:bg-chaos-bg"
              >
                Claimed ✓
              </button>
              <button
                onClick={onNext}
                disabled={!canNext}
                className="rounded-xl bg-litmus px-6 py-3 font-semibold text-white transition hover:bg-litmus-bright disabled:cursor-not-allowed disabled:opacity-40"
              >
                Not here — Re-inject Chaos (N)
              </button>
            </div>
            {!canNext && (
              <p className="mt-3 font-mono text-[11px] text-slate-500">
                No more survivors left in the cluster.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
