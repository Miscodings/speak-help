"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function SuccessPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [tier, setTier] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/sync-subscription", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTier(data.tier);
        if (data.tier !== "free") {
          setConfirmed(true);
          setTimeout(() => router.push("/"), 3000);
        }
      }
    } catch {}
    setSyncing(false);
  }, [getToken, router]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;

    const poll = async () => {
      if (cancelled) return;
      await syncNow();
      if (!confirmed) {
        attempts++;
        if (attempts < maxAttempts && !cancelled) {
          setTimeout(poll, 3000);
        }
      }
    };

    poll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tierLabel = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : "";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <motion.div
            className="text-6xl mb-6"
            animate={confirmed ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.5 }}
          >
            {confirmed ? "🎉" : "🎙️"}
          </motion.div>

          <h1 className="font-serif text-4xl mb-3" style={{ color: "var(--text-1)" }}>
            You&apos;re all set.
          </h1>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-2)" }}>
            Your subscription is active. Enjoy unlimited transcription and AI coaching.
          </p>

          {confirmed ? (
            <motion.p
              className="font-mono text-xs mb-6"
              style={{ color: "var(--accent)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ✓ {tierLabel} plan activated · redirecting to studio…
            </motion.p>
          ) : (
            <div className="mb-6">
              <p className="font-mono text-xs mb-3" style={{ color: "var(--text-3)" }}>
                {syncing ? "Confirming subscription…" : "Waiting for Stripe confirmation…"}
              </p>
              <button
                onClick={syncNow}
                disabled={syncing}
                className="font-mono text-xs underline transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}
              >
                {syncing ? "checking…" : "plan not updated? sync manually →"}
              </button>
            </div>
          )}

          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, var(--blue-primary), var(--blue-accent))",
              fontFamily: "var(--font-syne)",
            }}
          >
            Go to Studio
          </button>
        </motion.div>
      </div>
    </div>
  );
}
