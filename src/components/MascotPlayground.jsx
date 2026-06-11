import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { sound } from "../lib/sound";

// Autonomous "chaos patrol": the LitmusChaos mascot roams the screen, finds the
// nearest stray Kubernetes resource, body-slams it, and the resource dies through
// the real failure signature of an actual LitmusChaos fault (ChaosHub). Each
// fault walks its own 3-stage arc: healthy -> stressed -> failed -> poof.
// Fully hands-free, built for an unattended booth display.

// Platforms LitmusChaos targets. Each carries its logo + brand tint, used for
// the resource glyph, the box border, and the fault-name flash.
const PLATFORMS = {
  kubernetes: { logo: "/logos/kubernetes.png", color: "#326ce5" },
  aws: { logo: "/logos/aws.png", color: "#ff9900" },
  azure: { logo: "/logos/azure.png", color: "#0089d6" },
  gcp: { logo: "/logos/gcp.png", color: "#4285f4" },
  vmware: { logo: "/logos/vmware.png", color: "#78be20" },
  springboot: { logo: "/logos/springboot.png", color: "#6db33f" },
};

// Curated catalog of real ChaosHub faults across platforms. weight biases how
// often each spawns (common Kubernetes pod faults show up most; cloud / VMware /
// Spring Boot faults are occasional surprises). Each fault walks its own arc:
// healthy -> stressed -> failed.
const FAULTS = [
  // Kubernetes
  { fault: "pod-delete", platform: "kubernetes", kind: "pod", weight: 4, arc: ["Running", "Terminating", "CrashLoopBackOff"] },
  { fault: "pod-cpu-hog", platform: "kubernetes", kind: "pod", weight: 3, arc: ["Running", "CPUThrottling", "OOMKilled"] },
  { fault: "pod-memory-hog", platform: "kubernetes", kind: "pod", weight: 3, arc: ["Running", "MemoryPressure", "OOMKilled"] },
  { fault: "container-kill", platform: "kubernetes", kind: "pod", weight: 2, arc: ["Running", "ContainerKilled", "CrashLoopBackOff"] },
  { fault: "disk-fill", platform: "kubernetes", kind: "pvc", weight: 2, arc: ["Bound", "DiskPressure", "Evicted"] },
  { fault: "pod-network-loss", platform: "kubernetes", kind: "pod", weight: 2, arc: ["Running", "Unreachable", "ConnTimeout"] },
  { fault: "pod-network-latency", platform: "kubernetes", kind: "pod", weight: 2, arc: ["Running", "HighLatency", "Degraded"] },
  { fault: "pod-dns-error", platform: "kubernetes", kind: "pod", weight: 2, arc: ["Running", "NXDOMAIN", "DNSFailure"] },
  { fault: "node-drain", platform: "kubernetes", kind: "node", weight: 1, arc: ["Ready", "SchedulingDisabled", "Drained"] },
  { fault: "node-restart", platform: "kubernetes", kind: "node", weight: 1, arc: ["Ready", "Rebooting", "NotReady"] },
  // AWS
  { fault: "ec2-terminate-by-id", platform: "aws", kind: "ec2", weight: 2, arc: ["running", "stopping", "terminated"] },
  { fault: "ec2-stop-by-tag", platform: "aws", kind: "ec2", weight: 1, arc: ["running", "stopping", "stopped"] },
  { fault: "ebs-loss-by-id", platform: "aws", kind: "ebs", weight: 1, arc: ["in-use", "detaching", "VolumeLost"] },
  { fault: "ecs-container-cpu-hog", platform: "aws", kind: "task", weight: 1, arc: ["RUNNING", "CPUThrottling", "STOPPED"] },
  // Azure
  { fault: "azure-instance-stop", platform: "azure", kind: "vm", weight: 1, arc: ["Running", "Deallocating", "Stopped"] },
  { fault: "azure-disk-loss", platform: "azure", kind: "disk", weight: 1, arc: ["Attached", "Detaching", "DiskLost"] },
  // GCP
  { fault: "gcp-vm-instance-stop", platform: "gcp", kind: "vm", weight: 1, arc: ["RUNNING", "STOPPING", "TERMINATED"] },
  { fault: "gcp-vm-disk-loss", platform: "gcp", kind: "disk", weight: 1, arc: ["READY", "Detaching", "DiskLost"] },
  // VMware
  { fault: "vmware-vm-poweroff", platform: "vmware", kind: "vm", weight: 1, arc: ["poweredOn", "Suspending", "poweredOff"] },
  // Spring Boot
  { fault: "spring-boot-app-kill", platform: "springboot", kind: "app", weight: 1, arc: ["UP", "Terminating", "DOWN"] },
  { fault: "spring-boot-cpu-stress", platform: "springboot", kind: "app", weight: 1, arc: ["UP", "CPUStress", "DOWN"] },
  { fault: "spring-boot-latency", platform: "springboot", kind: "app", weight: 1, arc: ["UP", "HighLatency", "Degraded"] },
  { fault: "spring-boot-exceptions", platform: "springboot", kind: "app", weight: 1, arc: ["UP", "Exceptions", "DOWN"] },
];

// Status dot + label color by arc stage: healthy -> stressed -> failed.
const HEALTH = ["#22c55e", "#f59e0b", "#ef4444"];

const MASCOT_SIZE = 150;
const SPEED = 360; // px per second
const CONTACT = 100; // how close before a slam lands
const SLAM_MS = 320;
const MIN_TARGETS = 3; // keep at least this many on screen so the mascot roams
const MAX_TARGETS = 4;
const REFILL_MIN = 350; // quick top-up delay while below MIN_TARGETS
const REFILL_MAX = 750;
const SPAWN_MIN = 1600; // relaxed cadence while between MIN and MAX
const SPAWN_MAX = 2800;

const TARGET_W = 210;
const TARGET_H = 50;

const TOTAL_WEIGHT = FAULTS.reduce((s, f) => s + f.weight, 0);

const rand = (min, max) => min + Math.random() * (max - min);
const randId = () => Math.random().toString(36).slice(2, 6);

function pickFault() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const f of FAULTS) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return FAULTS[0];
}

// Pick a spawn point in the outer "ring" of the screen so targets never land
// on top of the headline / QR card occupying the centre.
function spawnPoint(w, h) {
  const exW = Math.min(0.66 * w, 1120);
  const exH = 0.72 * h;
  const exLeft = (w - exW) / 2;
  const exRight = w - exLeft;
  const exTop = (h - exH) / 2;
  const exBottom = h - exTop;
  const pad = 24;

  const strips = [];
  if (exLeft > TARGET_W + pad)
    strips.push({ x: [pad, exLeft - TARGET_W], y: [pad, h - TARGET_H - pad] });
  if (w - exRight > TARGET_W + pad)
    strips.push({ x: [exRight, w - TARGET_W - pad], y: [pad, h - TARGET_H - pad] });
  if (exTop > TARGET_H + pad)
    strips.push({ x: [pad, w - TARGET_W - pad], y: [pad, exTop - TARGET_H] });
  if (h - exBottom > TARGET_H + pad)
    strips.push({ x: [pad, w - TARGET_W - pad], y: [exBottom, h - TARGET_H - pad] });

  if (strips.length === 0) {
    return { x: rand(pad, Math.max(pad + 1, w - TARGET_W - pad)), y: pad };
  }
  const s = strips[Math.floor(Math.random() * strips.length)];
  return { x: rand(s.x[0], s.x[1]), y: rand(s.y[0], s.y[1]) };
}

export default function MascotPlayground() {
  const reduce = useReducedMotion();
  const containerRef = useRef(null);
  const mascotRef = useRef(null);
  const [targets, setTargets] = useState([]);
  const [flashes, setFlashes] = useState([]);

  const targetsRef = useRef([]);
  const dimsRef = useRef({ w: 0, h: 0 });
  const timersRef = useRef([]);

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  const setStageAt = useCallback((id, stage) => {
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, stage } : t)));
  }, []);

  const removeTarget = useCallback((id) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addFlash = useCallback((t) => {
    const key = `${t.id}-${Date.now()}`;
    setFlashes((prev) => [
      ...prev,
      { key, x: t.x, y: t.y, fault: t.fault, platform: t.platform },
    ]);
    const tid = setTimeout(
      () => setFlashes((prev) => prev.filter((f) => f.key !== key)),
      950
    );
    timersRef.current.push(tid);
  }, []);

  // Spawn loop: keep MIN_TARGETS..MAX_TARGETS resources alive so the mascot
  // always has somewhere to go. Tops up quickly when the screen runs low.
  useEffect(() => {
    if (reduce) return;
    let alive = true;
    function spawnOne() {
      const { w, h } = dimsRef.current;
      if (w <= 0) return;
      const f = pickFault();
      const p = spawnPoint(w, h);
      setTargets((prev) => [
        ...prev,
        {
          id: `${f.kind}-${randId()}`,
          fault: f.fault,
          kind: f.kind,
          platform: f.platform,
          arc: f.arc,
          stage: 0,
          x: p.x,
          y: p.y,
        },
      ]);
    }
    function schedule() {
      const count = targetsRef.current.length;
      const delay =
        count < MIN_TARGETS
          ? rand(REFILL_MIN, REFILL_MAX)
          : rand(SPAWN_MIN, SPAWN_MAX);
      const id = setTimeout(() => {
        if (!alive) return;
        if (targetsRef.current.length < MAX_TARGETS) spawnOne();
        schedule();
      }, delay);
      timersRef.current.push(id);
    }
    schedule();
    return () => {
      alive = false;
    };
  }, [reduce]);

  // Track container size.
  useEffect(() => {
    if (reduce) return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      dimsRef.current = { w: r.width, h: r.height };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [reduce]);

  // Mascot AI loop (manual rAF -> no per-frame React re-renders).
  useEffect(() => {
    if (reduce) return;
    const half = MASCOT_SIZE / 2;
    const ai = {
      mode: "seeking", // seeking | slam | idle
      pos: { x: dimsRef.current.w * 0.5 || 400, y: dimsRef.current.h * 0.28 || 200 },
      facing: 1,
      slamId: null,
      slamStart: 0,
      struck: false,
      idleAnchor: null,
    };
    let raf;
    let last = performance.now();

    const nearestHealthy = () => {
      const list = targetsRef.current.filter((t) => t.stage === 0);
      let best = null;
      let bestD = Infinity;
      for (const t of list) {
        const d = Math.hypot(t.x - ai.pos.x, t.y - ai.pos.y);
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
      return best;
    };

    const strike = (id) => {
      const t = targetsRef.current.find((x) => x.id === id);
      if (!t) return;
      addFlash(t);
      sound.kill();
      setStageAt(id, 1);
      const t1 = setTimeout(() => setStageAt(id, 2), 380);
      const t2 = setTimeout(() => removeTarget(id), 860);
      timersRef.current.push(t1, t2);
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      let lunge = 0;
      let sy = 1;

      if (ai.mode === "seeking") {
        const t = nearestHealthy();
        if (!t) {
          ai.mode = "idle";
          ai.idleAnchor = { ...ai.pos };
        } else {
          const dx = t.x - ai.pos.x;
          const dy = t.y - ai.pos.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dx < -2) ai.facing = -1;
          else if (dx > 2) ai.facing = 1;
          if (dist <= CONTACT) {
            ai.mode = "slam";
            ai.slamId = t.id;
            ai.slamStart = now;
            ai.struck = false;
          } else {
            const step = Math.min(dist, SPEED * dt);
            ai.pos.x += (dx / dist) * step;
            ai.pos.y += (dy / dist) * step;
            sy = 1 + 0.05 * Math.sin(now / 90); // flight bob
          }
        }
      } else if (ai.mode === "idle") {
        if (nearestHealthy()) {
          ai.mode = "seeking";
        } else {
          const a = ai.idleAnchor || ai.pos;
          ai.pos.x = a.x;
          ai.pos.y = a.y + Math.sin(now / 420) * 9;
          sy = 1 + 0.03 * Math.sin(now / 300);
        }
      } else if (ai.mode === "slam") {
        const p = (now - ai.slamStart) / SLAM_MS;
        const swing = Math.sin(Math.min(p, 1) * Math.PI);
        lunge = swing * 34 * ai.facing;
        sy = 1 - 0.14 * swing; // squash on impact
        if (!ai.struck && p >= 0.5) {
          ai.struck = true;
          strike(ai.slamId);
        }
        if (p >= 1) {
          ai.mode = "seeking";
          ai.slamId = null;
        }
      }

      const node = mascotRef.current;
      if (node) {
        node.style.transform = `translate(${ai.pos.x - half}px, ${
          ai.pos.y - half
        }px) translateX(${lunge}px)`;
        const img = node.firstChild;
        if (img) {
          img.style.transform = `scaleX(${ai.facing}) scaleY(${sy})`;
        }
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce, setStageAt, removeTarget, addFlash]);

  // Clear any pending timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  // Reduced-motion: fall back to a simple gentle floating accent.
  if (reduce) {
    return (
      <img
        src="/mascot.png"
        alt="mascot"
        className="animate-float pointer-events-none absolute -right-6 top-10 h-56 w-56 opacity-90 drop-shadow-2xl sm:h-72 sm:w-72"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <AnimatePresence>
        {targets.map((t) => {
          const status = t.arc[t.stage];
          const health = HEALTH[t.stage];
          const platform = PLATFORMS[t.platform];
          return (
            <motion.div
              key={t.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0, rotate: -12 }}
              transition={{ duration: 0.25, ease: "backOut" }}
              style={{ left: t.x, top: t.y }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <div
                style={{ borderColor: `${platform.color}80` }}
                className="flex items-center gap-2 rounded-lg border bg-chaos-panel/90 px-3 py-2 font-mono text-xs shadow-lg backdrop-blur-sm"
              >
                <img
                  src={platform.logo}
                  alt=""
                  className="h-6 w-6 shrink-0 rounded-sm object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="text-slate-300">{t.id}</span>
                <span
                  className="uppercase tracking-wide transition-colors"
                  style={{ color: health }}
                >
                  {status}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Fault-name flashes at each impact point. */}
      <AnimatePresence>
        {flashes.map((f) => (
          <motion.div
            key={f.key}
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -34, scale: 1 }}
            exit={{ opacity: 0, y: -48 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ left: f.x, top: f.y, color: PLATFORMS[f.platform].color }}
            className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-sm font-bold drop-shadow-lg"
          >
            ☢ {f.fault}
          </motion.div>
        ))}
      </AnimatePresence>

      <div
        ref={mascotRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ width: MASCOT_SIZE, height: MASCOT_SIZE }}
      >
        <img
          src="/mascot.png"
          alt=""
          className="h-full w-full drop-shadow-2xl"
          style={{ transformOrigin: "center center" }}
        />
      </div>
    </div>
  );
}
