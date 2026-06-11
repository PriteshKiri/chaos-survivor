import { motion } from "framer-motion";

const STATUS_META = {
  running: { label: "Running", dot: "bg-running", text: "text-running" },
  terminating: {
    label: "Terminating",
    dot: "bg-terminating",
    text: "text-terminating",
  },
  crashed: {
    label: "CrashLoopBackOff",
    dot: "bg-crashed",
    text: "text-crashed",
  },
};

export default function PodCard({ name, status, isWinner }) {
  const meta = STATUS_META[status] ?? STATUS_META.running;
  const dead = status === "crashed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: dead ? 0.28 : 1,
        scale: isWinner ? 1.12 : dead ? 0.92 : 1,
        filter: dead ? "grayscale(1)" : "grayscale(0)",
      }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={[
        "relative rounded-lg border px-3 py-2 select-none",
        "bg-chaos-panel border-chaos-border",
        isWinner
          ? "winner-glow border-running ring-2 ring-running z-10"
          : status === "terminating"
          ? "border-terminating"
          : "",
      ].join(" ")}
      title={name}
    >
      <div className="flex items-center gap-2">
        <span
          className={[
            "h-2.5 w-2.5 shrink-0 rounded-full",
            meta.dot,
            status === "terminating" ? "animate-ping" : "",
          ].join(" ")}
        />
        <span className="truncate font-mono text-sm font-medium text-white">
          {name}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className={["font-mono text-[10px]", meta.text].join(" ")}>
          {meta.label}
        </span>
        {isWinner && (
          <span className="font-mono text-[10px] text-running">★ SURVIVOR</span>
        )}
      </div>
    </motion.div>
  );
}
