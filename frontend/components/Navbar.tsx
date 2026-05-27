"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { href: "/", label: "Studio" },
  { href: "/history", label: "Progress" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: scrolled ? "10px 0" : "20px 0",
        background: scrolled ? "var(--nav-bg)" : "transparent",
        backdropFilter: scrolled ? "blur(32px) saturate(180%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(32px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid var(--card-border)" : "none",
        boxShadow: scrolled ? "0 1px 40px rgba(0,0,0,0.08)" : "none",
        transition: "padding 0.3s ease, background 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 no-underline group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-transform group-hover:scale-105"
            style={{
              background: "linear-gradient(135deg, var(--blue-primary), var(--blue-accent))",
              boxShadow: "var(--shadow-accent)",
            }}
          >
            🎙️
          </div>
          <span
            className="font-bold text-[1.05rem] tracking-tight"
            style={{ color: "var(--text-1)", fontFamily: "var(--font-syne)" }}
          >
            Speak
            <span style={{ color: "var(--accent)" }}>Help</span>
          </span>
        </Link>

        {/* Nav links */}
        <div
          className="flex items-center gap-0.5 rounded-2xl p-1"
          style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
        >
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="relative px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  color: active ? "var(--accent)" : "var(--text-2)",
                  fontFamily: "var(--font-syne)",
                }}
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "var(--accent-glow)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {mounted && (
              <motion.button
                key={theme}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-8 h-8 rounded-xl border flex items-center justify-center text-sm transition-all hover:scale-105 hover:border-[var(--accent)]"
                style={{
                  borderColor: "var(--card-border)",
                  background: "var(--card)",
                  color: "var(--text-2)",
                }}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? "🌙" : "☀️"}
              </motion.button>
            )}
          </AnimatePresence>

          <div className="w-8 h-8 flex items-center justify-center">
            <UserButton />
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
