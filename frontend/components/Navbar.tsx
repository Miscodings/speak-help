"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 44);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-400"
      style={{
        padding: scrolled ? "12px 0" : "22px 0",
        background: scrolled ? "var(--nav-bg)" : "transparent",
        backdropFilter: scrolled ? "blur(28px)" : "none",
        borderBottom: scrolled ? "1px solid var(--card-border)" : "none",
        boxShadow: scrolled ? "var(--shadow-md)" : "none",
      }}
    >
      <div className="max-w-5xl mx-auto px-8 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 no-underline hover:opacity-75 transition-opacity">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, var(--blue-primary), var(--blue-accent))", boxShadow: "var(--shadow-accent)" }}
          >
            🎙️
          </div>
          <span className="font-syne font-bold text-lg tracking-tight" style={{ color: "var(--text-1)" }}>
            SpeakHelp
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              color: pathname === "/" ? "var(--accent)" : "var(--text-2)",
              background: pathname === "/" ? "var(--accent-glow)" : "transparent",
            }}
          >
            Studio
          </Link>
          <Link
            href="/history"
            className="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              color: pathname === "/history" ? "var(--accent)" : "var(--text-2)",
              background: pathname === "/history" ? "var(--accent-glow)" : "transparent",
            }}
          >
            Progress
          </Link>
          <Link
            href="/pricing"
            className="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              color: pathname === "/pricing" ? "var(--accent)" : "var(--text-2)",
              background: pathname === "/pricing" ? "var(--accent-glow)" : "transparent",
            }}
          >
            Pricing
          </Link>

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-lg border flex items-center justify-center text-sm ml-1.5 transition-all hover:scale-105"
              style={{ borderColor: "var(--card-border)", background: "var(--card)", color: "var(--text-2)" }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
          )}

          <div className="ml-2">
            <UserButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
