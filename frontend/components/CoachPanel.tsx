"use client";
import { AnimatePresence, motion } from "framer-motion";

export interface CoachNote {
  id: number;
  tip: string;
  elapsed: number;
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function CoachPanel({ notes }: { notes: CoachNote[] }) {
  return (
    <aside
      className="rounded-2xl overflow-hidden sticky top-20 self-start"
      style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <span
          className="font-mono text-xs tracking-widest uppercase"
          style={{ color: "var(--text-2)" }}
        >
          Coach Notes
        </span>
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-full border"
          style={{ color: "var(--accent)", background: "var(--accent-glow)", borderColor: "var(--card-border)" }}
        >
          AI
        </span>
      </div>

      <div className="p-3 flex flex-col gap-2 min-h-44 max-h-[440px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {notes.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-40 text-center px-4"
            >
              <p
                className="font-mono text-xs leading-relaxed tracking-wide"
                style={{ color: "var(--text-3)" }}
              >
                Start recording to get live coaching tips.
              </p>
            </motion.div>
          ) : (
            notes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="rounded-xl p-3"
                style={{ background: "var(--accent-glow)", border: "1px solid var(--card-border)" }}
              >
                <span
                  className="block font-mono text-xs mb-1.5 tracking-wide"
                  style={{ color: "var(--accent)" }}
                >
                  {fmt(note.elapsed)}
                </span>
                <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
                  {note.tip}
                </p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
