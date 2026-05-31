"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Status = "checking" | "up" | "down";

export default function BackendStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch("/api/health", { signal: controller.signal });
        clearTimeout(timeout);
        if (!cancelled) setStatus(res.ok ? "up" : "down");
      } catch {
        clearTimeout(timeout);
        if (!cancelled) {
          setStatus("down");
          timer = setTimeout(() => {
            if (!cancelled) setAttempt(a => a + 1);
          }, 6000);
        }
      }
    };

    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt]);

  const visible = status === "down";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl text-sm shadow-xl"
          style={{
            background: "var(--card)",
            border: "1px solid #f59e0b55",
            color: "var(--text-2)",
            maxWidth: "440px",
            width: "calc(100vw - 2.5rem)",
          }}
        >
          {/* Pulsing dot */}
          <span className="relative flex-shrink-0 w-2 h-2">
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-60"
              style={{ background: "#f59e0b" }}
            />
            <span
              className="relative block w-2 h-2 rounded-full"
              style={{ background: "#f59e0b" }}
            />
          </span>

          <span className="leading-snug" style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
            Backend is waking up — usually ~30s on first visit.
          </span>

          <button
            onClick={() => setAttempt(a => a + 1)}
            className="flex-shrink-0 text-xs underline transition-opacity hover:opacity-70"
            style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)" }}
          >
            retry
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
