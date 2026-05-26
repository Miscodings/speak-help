"use client";
import { motion, AnimatePresence } from "framer-motion";

export interface Report {
  score: number;
  pacing: string;
  fillers: string;
  improvements: string[];
}

interface Props {
  report: Report | null;
  onClose: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? "var(--accent)" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-24 h-24 flex-shrink-0">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--card-border)" strokeWidth="6" />
        <motion.circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <motion.span
        className="font-mono text-2xl font-semibold"
        style={{ color }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {score}
      </motion.span>
    </div>
  );
}

export default function ReportModal({ report, onClose }: Props) {
  return (
    <AnimatePresence>
      {report && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            className="relative z-10 w-full max-w-lg rounded-3xl p-7 flex flex-col gap-5"
            style={{ background: "var(--card)", border: "1px solid var(--card-border)", boxShadow: "var(--shadow-md)" }}
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                Session Report
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-opacity hover:opacity-60"
                style={{ color: "var(--text-3)", background: "var(--card-border)" }}
              >
                ✕
              </button>
            </div>

            {/* Score row */}
            <div className="flex items-center gap-5">
              <ScoreRing score={report.score} />
              <div className="flex flex-col gap-1">
                <span className="font-serif text-xl" style={{ color: "var(--text-1)" }}>
                  {report.score >= 80 ? "Great session!" : report.score >= 60 ? "Solid effort." : "Room to grow."}
                </span>
                <span className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
                  overall score
                </span>
              </div>
            </div>

            {/* Pacing + Fillers */}
            <div className="flex flex-col gap-3">
              {[
                { label: "Pacing", icon: "⚡", text: report.pacing },
                { label: "Filler Words", icon: "💬", text: report.fillers },
              ].map(({ label, icon, text }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4"
                  style={{ background: "var(--bg)", border: "1px solid var(--card-border)" }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">{icon}</span>
                    <span className="font-mono text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--text-3)" }}>
                      {label}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Top 3 improvements */}
            <div>
              <span className="font-mono text-xs tracking-widest uppercase mb-3 block" style={{ color: "var(--text-3)" }}>
                Top Improvements
              </span>
              <div className="flex flex-col gap-2">
                {report.improvements.map((tip, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-3 rounded-xl px-4 py-3"
                    style={{ background: "var(--accent-glow)", border: "1px solid var(--card-border)" }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                  >
                    <span
                      className="font-mono text-xs font-bold w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{tip}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
