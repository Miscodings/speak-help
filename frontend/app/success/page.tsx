"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function SuccessPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [tier, setTier] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      if (cancelled) return;
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/usage", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setTier(data.tier);
          if (data.tier !== "free") {
            if (!cancelled) setConfirmed(true);
            setTimeout(() => { if (!cancelled) router.push("/"); }, 3000);
            return;
          }
        }
      } catch {}

      attempts++;
      if (attempts < maxAttempts && !cancelled) {
        setTimeout(poll, 2000);
      } else if (!cancelled) {
        setTimeout(() => router.push("/"), 3000);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [getToken, router]);

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
          <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-2)" }}>
            Your subscription is active. Enjoy unlimited transcription and AI coaching.
          </p>

          {confirmed ? (
            <motion.p
              className="font-mono text-xs"
              style={{ color: "var(--accent)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ✓ {tierLabel} plan activated · redirecting to studio…
            </motion.p>
          ) : (
            <p className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
              Confirming subscription
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              >
                …
              </motion.span>
            </p>
          )}

          <button
            onClick={() => router.push("/")}
            className="mt-8 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
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
