"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "For casual practice",
    features: [
      { icon: "⏱️", text: "60 minutes transcription / month" },
      { icon: "💡", text: "20 AI coaching tips / month" },
      { icon: "📋", text: "Full session history" },
      { icon: "📊", text: "WPM & filler tracking" },
    ],
    action: null as string | null,
    featured: false,
    accent: "var(--text-3)",
  },
  {
    id: "pro",
    name: "Pro",
    price: 9,
    description: "For serious speakers",
    features: [
      { icon: "♾️", text: "Unlimited transcription" },
      { icon: "🤖", text: "Unlimited AI coaching tips" },
      { icon: "📈", text: "Post-session AI report" },
      { icon: "✅", text: "Everything in Free" },
    ],
    action: "pro" as string | null,
    featured: true,
    accent: "var(--accent)",
  },
  {
    id: "studio",
    name: "Studio",
    price: 19,
    description: "For professionals",
    features: [
      { icon: "🎯", text: "Everything in Pro" },
      { icon: "📤", text: "Export transcripts" },
      { icon: "🏆", text: "Goal tracking" },
      { icon: "📊", text: "Advanced analytics" },
      { icon: "🔧", text: "Custom filler word list" },
    ],
    action: "studio" as string | null,
    featured: false,
    accent: "#a78bfa",
  },
];

export default function PricingPage() {
  const { getToken } = useAuth();
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
    if (plan.id === "free" && tier !== "free") return "Manage billing";
    if (!plan.action) return "Current plan";
    return `Upgrade to ${plan.name}`;
  };

  const getAction = (plan: (typeof plans)[number]) => {
    if (tier === null || tier === plan.id) return null;
    if (plan.id === "free" && tier !== "free") return openPortal;
    if (!plan.action) return null;
    if (tier !== "free" && plan.action) return openPortal;
    return () => checkout(plan.action!);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar />

      <header className="pt-28 pb-10 text-center px-6">
        <motion.h1
          className="font-serif text-4xl md:text-5xl tracking-tight mb-3"
          style={{ color: "var(--text-1)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: [0.22, 1, 0.36, 1] }}
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

      <main className="max-w-5xl mx-auto px-6 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => {
            const isCurrent = tier === plan.id;
            const action = getAction(plan);
            const cta = getCta(plan);
            const isLoadingThis = loading !== null && (
              loading === plan.action || (loading === "portal" && action === openPortal)
            );

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-2xl p-7 flex flex-col"
                style={{
                  background: plan.featured
                    ? "linear-gradient(160deg, var(--card) 0%, var(--accent-glow) 100%)"
                    : "var(--card)",
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
                {/* Badge */}
                <AnimatePresence>
                  {(plan.featured && !isCurrent) && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 font-mono text-xs font-bold px-4 py-1 rounded-full"
                      style={{
                        background: "linear-gradient(90deg, var(--blue-primary), var(--accent))",
                        color: "#fff",
                        letterSpacing: "0.1em",
                        boxShadow: "var(--shadow-accent)",
                      }}
                    >
                      MOST POPULAR
                    </motion.div>
                  )}
                  {isCurrent && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 font-mono text-xs font-bold px-4 py-1 rounded-full"
                      style={{ background: "var(--blue-primary)", color: "#fff", letterSpacing: "0.1em" }}
                    >
                      YOUR PLAN
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Plan name */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <h2
                      className="font-serif text-2xl"
                      style={{ color: plan.featured ? plan.accent : "var(--text-1)" }}
                    >
                      {plan.name}
                    </h2>
                  </div>
                  <p className="font-mono text-xs tracking-wide" style={{ color: "var(--text-3)" }}>
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6 pb-6" style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <div className="flex items-end gap-1">
                    <span
                      className="font-mono text-5xl font-medium tracking-tight leading-none"
                      style={{ color: plan.featured ? plan.accent : "var(--text-1)" }}
                    >
                      ${plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="font-mono text-sm mb-1" style={{ color: "var(--text-3)" }}>/mo</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f.text} className="flex items-start gap-3 text-sm" style={{ color: "var(--text-2)" }}>
                      <span className="text-base leading-5 flex-shrink-0">{f.icon}</span>
                      <span className="leading-5">{f.text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => action?.()}
                  disabled={!action || isLoadingThis}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "var(--font-syne)",
                    background: plan.featured && !isCurrent
                      ? "linear-gradient(135deg, var(--blue-primary), var(--blue-accent))"
                      : isCurrent
                      ? "var(--accent-glow)"
                      : "transparent",
                    color: plan.featured && !isCurrent ? "#fff" : "var(--text-2)",
                    border: plan.featured && !isCurrent ? "none" : "1px solid var(--card-border)",
                    boxShadow: plan.featured && !isCurrent ? "var(--shadow-accent)" : "none",
                    cursor: action && !isLoadingThis ? "pointer" : "default",
                  }}
                >
                  {isLoadingThis ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="inline-block"
                      >
                        ⟳
                      </motion.span>
                      Redirecting…
                    </span>
                  ) : cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          className="text-center font-mono text-xs mt-10"
          style={{ color: "var(--text-3)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Payments handled securely by Stripe · Cancel anytime · No hidden fees
        </motion.p>
      </main>
    </div>
  );
}
