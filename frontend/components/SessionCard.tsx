"use client";
import { useRef, useState } from "react";
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
  const [expanded, setExpanded] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [4, -4]), { stiffness: 200, damping: 22 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-4, 4]), { stiffness: 200, damping: 22 });

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

  const wordCount = session.transcription.trim().split(/\s+/).filter(Boolean).length;
  const fillerRatio = wordCount > 0 ? Math.round((session.filler_count / wordCount) * 100) : 0;
  const durationMin = Math.floor(session.duration / 60);
  const durationSec = Math.round(session.duration % 60);
  const durationLabel = durationMin > 0
    ? `${durationMin}m ${durationSec}s`
    : `${durationSec}s`;

  const date = new Date(session.timestamp);
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeLabel = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const PREVIEW_LENGTH = 160;
  const isLong = session.transcription.length > PREVIEW_LENGTH;
  const displayText = expanded || !isLong
    ? session.transcription
    : session.transcription.slice(0, PREVIEW_LENGTH).trimEnd() + "…";

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="relative rounded-2xl overflow-hidden cursor-default"
    >
      {/* Card base */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
      />

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
        style={{ background: "linear-gradient(180deg, var(--accent), var(--blue-accent))" }}
      />

      {/* Cursor glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(260px circle at ${glowX.get()}% ${glowY.get()}%, var(--accent-glow), transparent 70%)`,
          opacity: 0,
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative z-10 pl-6 pr-5 py-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <span
              className="font-semibold text-sm block"
              style={{ color: "var(--text-1)", fontFamily: "var(--font-syne)" }}
            >
              {dateLabel}
            </span>
            <span className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
              {timeLabel}
            </span>
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-1.5 justify-end">
            <Chip>{session.avg_wpm} WPM</Chip>
            <Chip color="green">{durationLabel}</Chip>
            <Chip color="amber">{session.filler_count} fillers</Chip>
            <Chip color="rose">{fillerRatio}% rate</Chip>
          </div>
        </div>

        {/* Transcript */}
        <div>
          <p className="text-sm leading-7" style={{ color: "var(--text-2)" }}>
            {displayText}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="mt-1.5 font-mono text-xs transition-opacity hover:opacity-80"
              style={{ color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {expanded ? "show less ↑" : "show more ↓"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color?: "green" | "amber" | "rose" }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { color: "var(--accent)", background: "var(--accent-glow)", borderColor: "rgba(56,189,248,0.25)" },
    green:   { color: "#10b981", background: "rgba(52,211,153,0.1)",  borderColor: "rgba(52,211,153,0.25)" },
    amber:   { color: "#f59e0b", background: "rgba(251,191,36,0.1)",  borderColor: "rgba(251,191,36,0.25)" },
    rose:    { color: "#f43f5e", background: "rgba(244,63,94,0.1)",   borderColor: "rgba(244,63,94,0.25)" },
  };
  return (
    <span
      className="font-mono text-[0.68rem] font-medium px-2.5 py-0.5 rounded-full border"
      style={styles[color ?? "default"]}
    >
      {children}
    </span>
  );
}
