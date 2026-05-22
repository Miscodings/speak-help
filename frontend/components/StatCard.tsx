"use client";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface Props {
  label: string;
  value: string | number;
  icon: string;
  wide?: boolean;
}

export default function StatCard({ label, icon, value, wide }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 20 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
    glowX.set(((e.clientX - rect.left) / rect.width) * 100);
    glowY.set(((e.clientY - rect.top) / rect.height) * 100);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const isText = typeof value === "string";

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="relative rounded-2xl overflow-hidden cursor-default"
    >
      <div
        className="absolute inset-0 rounded-2xl"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(200px circle at ${glowX.get()}% ${glowY.get()}%, var(--accent-glow), transparent 70%)`,
          opacity: 0,
        }}
        whileHover={{ opacity: 1 }}
      />
      <div className="relative z-10 p-5">
        <span className="absolute top-4 right-4 text-base opacity-35">{icon}</span>
        <p className="font-mono text-xs tracking-widest uppercase mb-2.5" style={{ color: "var(--text-3)" }}>
          {label}
        </p>
        {isText ? (
          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--accent)" }}>
            {value}
          </p>
        ) : (
          <p
            className="font-mono text-4xl font-medium tracking-tight leading-none"
            style={{ color: "var(--text-1)", fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </p>
        )}
      </div>
    </motion.div>
  );
}
