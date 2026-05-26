"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "For casual practice",
    features: [
      "60 minutes transcription / month",
      "20 AI coaching tips / month",
      "Full session history",
      "WPM & filler tracking",
    ],
    action: null,
    featured: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 9,
    description: "For serious speakers",
    features: [
      "Unlimited transcription",
      "Unlimited AI coaching tips",
      "Post-session AI report",
      "Everything in Free",
    ],
    action: "pro",
    featured: true,
  },
  {
    id: "studio",
    name: "Studio",
    price: 19,
    description: "For professionals",
    features: [
      "Everything in Pro",
      "Export transcripts",
      "Goal tracking",
      "Advanced analytics",
      "Custom filler word list",
    ],
    action: "studio",
    featured: false,
  },
];

export default function PricingPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/usage", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTier(data.tier);
      }
    })();
  }, [getToken]);

  const checkout = async (plan: string) => {
    setLoading(plan);
    try {
      const token = await getToken();
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (e) {
      console.error(e);
      setLoading(null);
    }
  };

  const openPortal = async () => {
    setLoading("portal");
    try {
      const token = await getToken();
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setLoading(null);
    }
  };

  const getCta = (plan: (typeof plans)[number]) => {
    if (tier === null) return "Loading…";
    if (tier === plan.id) return "Current plan";
    if (plan.id === "free" && tier !== "free") return "Downgrade";
    if (!plan.action) return "Current plan";
    return `Upgrade to ${plan.name}`;
  };

  const getAction = (plan: (typeof plans)[number]) => {
    if (tier === null || tier === plan.id) return null;
    if (plan.id === "free" && tier !== "free") return openPortal;
    if (!plan.action) return null;
    // Already on a paid plan and upgrading/changing — go through portal
    if (tier !== "free" && plan.action) return openPortal;
    return () => checkout(plan.action!);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar />

      <header className="pt-28 pb-10 text-center">
        <motion.h1
          className="font-serif text-4xl md:text-5xl tracking-tight mb-3"
          style={{ color: "var(--text-1)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Simple, honest pricing
        </motion.h1>
        <motion.p
          className="font-mono text-sm tracking-wide"
          style={{ color: "var(--text-3)" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          Free until it actually costs us money to serve you.
        </motion.p>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan, i) => {
            const isCurrent = tier === plan.id;
            const action = getAction(plan);
            const cta = getCta(plan);
            const isLoadingThis = loading === plan.action || (loading === "portal" && action === openPortal);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative rounded-2xl p-7 flex flex-col"
                style={{
                  background: "var(--card)",
                  border: plan.featured
                    ? "1.5px solid var(--accent)"
                    : isCurrent
                    ? "1.5px solid var(--blue-primary)"
                    : "1px solid var(--card-border)",
                  boxShadow: plan.featured
                    ? "var(--shadow-md), var(--shadow-accent)"
                    : "var(--shadow-sm)",
                }}
              >
                {plan.featured && !isCurrent && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 font-mono text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: "var(--accent)", color: "#fff", letterSpacing: "0.08em" }}
                  >
                    MOST POPULAR
                  </div>
                )}
                {isCurrent && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 font-mono text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: "var(--blue-primary)", color: "#fff", letterSpacing: "0.08em" }}
                  >
                    YOUR PLAN
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="font-serif text-2xl mb-1" style={{ color: "var(--text-1)" }}>
                    {plan.name}
                  </h2>
                  <p className="font-mono text-xs tracking-wide" style={{ color: "var(--text-3)" }}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="font-mono text-5xl font-medium tracking-tight" style={{ color: "var(--text-1)" }}>
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="font-mono text-sm ml-1" style={{ color: "var(--text-3)" }}>/mo</span>
                  )}
                </div>

                <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                      <span style={{ color: "var(--accent)" }} className="mt-0.5 flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => action?.()}
                  disabled={!action || isLoadingThis}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "var(--font-syne)",
                    background: plan.featured && !isCurrent
                      ? "linear-gradient(135deg, var(--blue-primary), var(--blue-accent))"
                      : "transparent",
                    color: plan.featured && !isCurrent ? "#fff" : "var(--text-2)",
                    border: plan.featured && !isCurrent ? "none" : "1px solid var(--card-border)",
                    boxShadow: plan.featured && !isCurrent ? "var(--shadow-accent)" : "none",
                    cursor: action ? "pointer" : "default",
                  }}
                >
                  {isLoadingThis ? "Redirecting…" : cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center font-mono text-xs mt-10" style={{ color: "var(--text-3)" }}>
          Payments handled securely by Stripe. Cancel anytime.
        </p>
      </main>
    </div>
  );
}
