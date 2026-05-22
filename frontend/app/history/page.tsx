"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
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
      className="h-28 rounded-2xl border"
      style={{
        background: "linear-gradient(90deg, var(--card) 30%, var(--accent-glow) 50%, var(--card) 70%)",
        backgroundSize: "300% 100%",
        borderColor: "var(--card-border)",
        animation: "shimmer 1.6s ease infinite",
      }}
    />
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

  const avg = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + x.avg_wpm, 0) / sessions.length)
    : 0;
  const best = sessions.length ? Math.max(...sessions.map(s => s.avg_wpm)) : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar />

      <header className="pt-28 pb-5 text-center">
        <h1 className="font-serif text-3xl tracking-tight" style={{ color: "var(--text-1)" }}>
          Progress History
        </h1>
        <p className="font-mono text-xs tracking-widest mt-1" style={{ color: "var(--text-3)" }}>
          your public speaking journey · by justin dutta
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-20">

        {/* Overview */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {[
            { label: "Total Sessions", value: loading ? "—" : sessions.length },
            { label: "Avg WPM",        value: loading ? "—" : avg },
            { label: "Personal Best",  value: loading ? "—" : best },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-2xl p-6 text-center"
              style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
            >
              <p className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: "var(--text-2)" }}>
                {label}
              </p>
              <p className="font-mono text-4xl font-medium tracking-tight" style={{ color: "var(--accent)" }}>
                {value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Sessions */}
        <p className="font-mono text-xs tracking-widest uppercase mb-5" style={{ color: "var(--text-2)" }}>
          All Sessions
        </p>

        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton /><Skeleton /><Skeleton />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--text-2)" }}>
            <div className="text-4xl mb-4">🎙️</div>
            <p>No sessions yet. Head to the Studio and start speaking!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <SessionCard session={s} />
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <a
            href="/"
            className="inline-flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-xl border transition-all hover:text-white hover:border-[var(--accent)]"
            style={{
              color: "var(--accent)",
              background: "var(--accent-glow)",
              borderColor: "var(--card-border)",
              fontFamily: "var(--font-syne)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--accent-glow)")}
          >
            ← Back to Studio
          </a>
        </div>
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
