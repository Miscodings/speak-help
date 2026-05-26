"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/"), 5000);
    return () => clearTimeout(t);
  }, [router]);

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
          <div className="text-6xl mb-6">🎙️</div>
          <h1 className="font-serif text-4xl mb-3" style={{ color: "var(--text-1)" }}>
            You&apos;re all set.
          </h1>
          <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-2)" }}>
            Your subscription is active. Enjoy unlimited transcription and AI coaching.
          </p>
          <p className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
            Redirecting to studio in 5 seconds…
          </p>
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
