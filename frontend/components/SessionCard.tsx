"use client";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface Session {
  id: number;
  timestamp: string;
  transcription: string;
  avg_wpm: number;
  filler_count: number;
  duration: number;
}

export default function SessionCard({ session }: { session: Session }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [7, -7]), { stiffness: 180, damping: 18 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-7, 7]), { stiffness: 180, damping: 18 });

  function onMouseMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
    glowX.set(((e.clientX - r.left) / r.width) * 100);
    glowY.set(((e.clientY - r.top) / r.height) * 100);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const date = new Date(session.timestamp).toLocaleString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      whileHover={{ boxShadow: "var(--shadow-md), var(--shadow-accent)" }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="relative rounded-2xl p-6 overflow-hidden cursor-default"
    >
      <div
        className="absolute inset-0 rounded-2xl"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
      />

      {/* Glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(240px circle at ${glowX.get()}% ${glowY.get()}%, var(--accent-glow), transparent 70%)`,
          opacity: 0,
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative z-10">
        <div
          className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-4"
          style={{ borderBottom: "1px solid var(--card-border)" }}
        >
          <span className="font-mono text-sm font-medium" style={{ color: "var(--accent)" }}>
            {date}
          </span>
          <div className="flex gap-2 flex-wrap">
            <Chip>{session.avg_wpm} WPM</Chip>
            <Chip color="green">{session.duration}s</Chip>
            <Chip color="amber">{session.filler_count} fillers</Chip>
          </div>
        </div>
        <p className="text-sm leading-7" style={{ color: "var(--text-1)" }}>
          {session.transcription}
        </p>
      </div>
    </motion.div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color?: "green" | "amber" }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { color: "var(--accent)", background: "var(--accent-glow)", borderColor: "var(--card-border)" },
    green: { color: "#10b981", background: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.2)" },
    amber: { color: "#f59e0b", background: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.2)" },
  };
  return (
    <span
      className="font-mono text-xs font-medium px-2.5 py-1 rounded-full border"
      style={styles[color ?? "default"]}
    >
      {children}
    </span>
  );
}
