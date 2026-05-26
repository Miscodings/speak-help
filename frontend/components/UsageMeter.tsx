"use client";
import Link from "next/link";
import { motion } from "framer-motion";

interface Usage {
  tier: string;
  transcription_seconds_used: number;
  ai_tips_used: number;
  limits: { transcription_seconds: number | null; ai_tips: number | null };
}

function Bar({ value, max, warning }: { value: number; max: number; warning?: boolean }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          background: warning && pct > 80
            ? "linear-gradient(90deg, #f59e0b, #ef4444)"
            : "linear-gradient(90deg, var(--blue-primary), var(--accent))",
        }}
      />
    </div>
  );
}

export default function UsageMeter({ usage }: { usage: Usage }) {
  if (usage.tier !== "free") return null;

  const txMins = Math.round(usage.transcription_seconds_used / 60);
  const txMax = 60;
  const tipsUsed = usage.ai_tips_used;
  const tipsMax = 20;

  return (
    <div
      className="rounded-2xl p-4 mt-4"
      style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs tracking-widest uppercase" style={{ color: "var(--text-2)" }}>
          Free Tier Usage
        </span>
        <Link
          href="/pricing"
          className="font-mono text-xs font-semibold tracking-wide transition-colors"
          style={{ color: "var(--accent)" }}
        >
          Upgrade →
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-mono text-xs" style={{ color: "var(--text-3)" }}>Transcription</span>
            <span className="font-mono text-xs" style={{ color: txMins > 48 ? "#f59e0b" : "var(--text-3)" }}>
              {txMins} / {txMax} min
            </span>
          </div>
          <Bar value={txMins} max={txMax} warning />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="font-mono text-xs" style={{ color: "var(--text-3)" }}>AI Tips</span>
            <span className="font-mono text-xs" style={{ color: tipsUsed > 16 ? "#f59e0b" : "var(--text-3)" }}>
              {tipsUsed} / {tipsMax}
            </span>
          </div>
          <Bar value={tipsUsed} max={tipsMax} warning />
        </div>
      </div>
    </div>
  );
}
