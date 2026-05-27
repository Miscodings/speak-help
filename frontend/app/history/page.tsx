"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import SessionCard from "@/components/SessionCard";

interface Session {
  id: number;
  timestamp: string;
  transcription: string;
  avg_wpm: number;
  filler_count: number;
  duration: number;
}

function Skeleton() {
  return (
    <div
      className="h-28 rounded-2xl"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        animation: "shimmer 1.6s ease infinite",
        backgroundImage: "linear-gradient(90deg, var(--card) 30%, var(--accent-glow) 50%, var(--card) 70%)",
        backgroundSize: "300% 100%",
      }}
    />
  );
}

function OverviewCard({ label, value, sub, accent = "var(--accent)" }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="rounded-2xl p-6 text-center relative overflow-hidden"
      style={{ background: "var(--card)", border: "1px solid var(--card-border)", boxShadow: "var(--shadow-sm)" }}
    >
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{ background: `radial-gradient(160px circle at 50% 0%, ${accent}14, transparent 70%)` }}
      />
      <p className="font-mono text-[0.6rem] tracking-widest uppercase mb-3" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      <p className="font-mono text-4xl font-medium tracking-tight" style={{ color: accent }}>
        {value}
      </p>
      {sub && (
        <p className="font-mono text-xs mt-1.5" style={{ color: "var(--text-3)" }}>{sub}</p>
      )}
    </motion.div>
  );
}

export default function HistoryPage() {
  const { getToken } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSessions(data);
      setLoading(false);
    })();
  }, [getToken]);

  const avgWpm = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + x.avg_wpm, 0) / sessions.length)
    : 0;

  const totalMin = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + x.duration, 0) / 60)
    : 0;

  const bestFillerRatio = sessions.length
    ? (() => {
        const ratios = sessions.map(s => {
          const words = s.transcription.trim().split(/\s+/).filter(Boolean).length;
          return words > 0 ? s.filler_count / words : 1;
        });
        return `${Math.round(Math.min(...ratios) * 100)}%`;
      })()
    : "—";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar />

      <header className="pt-28 pb-6 text-center px-6">
        <motion.h1
          className="font-serif text-4xl md:text-5xl tracking-tight mb-2"
          style={{ color: "var(--text-1)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Progress History
        </motion.h1>
        <motion.p
          className="font-mono text-xs tracking-widest"
          style={{ color: "var(--text-3)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
        >
          your public speaking journey
        </motion.p>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24">

        {/* Overview stats */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <OverviewCard
            label="Sessions"
            value={loading ? "—" : sessions.length}
            sub="total recordings"
          />
          <OverviewCard
            label="Avg WPM"
            value={loading ? "—" : avgWpm}
            sub="words per minute"
            accent="#60a5fa"
          />
          <OverviewCard
            label="Practice Time"
            value={loading ? "—" : `${totalMin}m`}
            sub="total duration"
            accent="#34d399"
          />
          <OverviewCard
            label="Best Filler Rate"
            value={loading ? "—" : bestFillerRatio}
            sub="lowest ratio session"
            accent="#f59e0b"
          />
        </motion.div>

        {/* Sessions list */}
        <div className="flex items-center justify-between mb-5">
          <p className="font-mono text-xs tracking-widest uppercase" style={{ color: "var(--text-2)" }}>
            All Sessions
          </p>
          {!loading && sessions.length > 0 && (
            <p className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
              {sessions.length} recording{sessions.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="skeletons"
              className="flex flex-col gap-3"
              exit={{ opacity: 0 }}
            >
              <Skeleton /><Skeleton /><Skeleton />
            </motion.div>
          ) : sessions.length === 0 ? (
            <motion.div
              key="empty"
              className="text-center py-24"
              style={{ color: "var(--text-2)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl"
                style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
              >
                🎙️
              </div>
              <p className="font-semibold mb-1" style={{ color: "var(--text-1)", fontFamily: "var(--font-syne)" }}>
                No sessions yet
              </p>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                Head to the Studio and start your first recording.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 mt-6 font-semibold text-sm px-5 py-2.5 rounded-xl text-white"
                style={{
                  background: "linear-gradient(135deg, var(--blue-primary), var(--blue-accent))",
                  fontFamily: "var(--font-syne)",
                }}
              >
                Open Studio →
              </a>
            </motion.div>
          ) : (
            <motion.div key="list" className="flex flex-col gap-3">
              {sessions.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <SessionCard session={s} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && sessions.length > 0 && (
          <div className="text-center mt-10">
            <a
              href="/"
              className="inline-flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-xl border transition-all"
              style={{
                color: "var(--accent)",
                background: "var(--accent-glow)",
                borderColor: "var(--card-border)",
                fontFamily: "var(--font-syne)",
              }}
            >
              ← Back to Studio
            </a>
          </div>
        )}
      </main>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 300% 0; }
          100% { background-position: -300% 0; }
        }
      `}</style>
    </div>
  );
}
