"use client";
import { AnimatePresence, motion } from "framer-motion";

export interface CoachNote {
  id: number;
  tip: string;
  elapsed: number;
}

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function CoachPanel({ notes }: { notes: CoachNote[] }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--card)", border: "1px solid var(--card-border)", boxShadow: "var(--shadow-sm)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <span className="font-mono text-xs tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
          Coach Notes
        </span>
        <span
          className="font-mono text-[0.6rem] font-bold tracking-widest px-2 py-0.5 rounded-full border"
          style={{
            color: "var(--accent)",
            background: "var(--accent-glow)",
            borderColor: "rgba(56,189,248,0.25)",
            letterSpacing: "0.12em",
          }}
        >
          AI
        </span>
      </div>

      <div className="p-3 flex flex-col gap-2 max-h-72 overflow-y-auto">
        <AnimatePresence initial={false}>
          {notes.map((note, idx) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="rounded-xl p-3.5 relative overflow-hidden"
              style={{
                background: idx === 0 ? "var(--accent-glow)" : "transparent",
                border: `1px solid ${idx === 0 ? "rgba(56,189,248,0.2)" : "var(--card-border)"}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="font-mono text-[0.6rem] tracking-widest font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  {fmt(note.elapsed)}
                </span>
                {idx === 0 && (
                  <span
                    className="font-mono text-[0.55rem] tracking-widest px-1.5 py-0.5 rounded-full"
                    style={{ background: "var(--accent)", color: "#fff", letterSpacing: "0.08em" }}
                  >
                    NEW
                  </span>
                )}
              </div>
              <p className="text-sm leading-snug" style={{ color: "var(--text-1)", fontFamily: "var(--font-syne)" }}>
                {note.tip}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
