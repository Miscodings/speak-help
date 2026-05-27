"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import CoachPanel, { CoachNote } from "@/components/CoachPanel";
import UsageMeter from "@/components/UsageMeter";
import ReportModal, { Report } from "@/components/ReportModal";
import { getSocket, currentSocket, disconnectSocket } from "@/lib/socket";
import { FILLERS, highlight } from "@/lib/highlight";

const SAMPLE_RATE = 16000;

const FEEDBACK_POOL = {
  start: [
    "😮‍💨 deep breaths, you got this.",
    "🎙️ whenever you're ready…",
    "✨ let's make this one count.",
    "🧘 relax your shoulders. breathe.",
  ],
  fillers: [
    "💬 watch the filler words.",
    "⚠️ too many fillers — slow down.",
    "🚨 pause instead of filling silence.",
    "💡 replace fillers with a beat of silence.",
    "🎯 take your time — silence is power.",
  ],
  fast: [
    "⏳ slow it down a little.",
    "🐇 you're rushing — breathe.",
    "📉 pace yourself, you're flying.",
    "🌊 think of it like waves — ride the rhythm.",
  ],
  slow: [
    "🎙️ project your voice more!",
    "📢 speak up and engage your audience.",
    "⬆️ pick up the energy a touch.",
    "🔊 you've got more to give — let it out.",
  ],
  good: [
    "👍 great pace, keep going!",
    "🔥 you're on a roll!",
    "✅ solid delivery right there.",
    "💪 that's the rhythm — hold it!",
    "🌟 sounding confident and clear.",
    "🎯 crisp and controlled — excellent.",
    "🎶 your cadence is spot on.",
  ],
};

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

function getCategory(wordCount: number, ratio: number, wpm: number) {
  if (wordCount < 5) return "start";
  if (ratio > 0.15) return "fillers";
  if (wpm > 160) return "fast";
  if (wpm < 90) return "slow";
  return "good";
}

function formatElapsed(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  start:   "var(--accent)",
  fillers: "#f59e0b",
  fast:    "#a78bfa",
  slow:    "#60a5fa",
  good:    "#34d399",
};

export default function StudioPage() {
  const { getToken } = useAuth();

  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [wpm, setWpm] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [fillerRatio, setFillerRatio] = useState(0);
  const [feedback, setFeedback] = useState(pick(FEEDBACK_POOL.start));
  const [feedbackCat, setFeedbackCat] = useState<keyof typeof FEEDBACK_POOL>("start");
  const [elapsed, setElapsed] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(Array(28).fill(4));
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
  const noteIdRef = useRef(0);

  const [usage, setUsage] = useState<null | {
    tier: string;
    transcription_seconds_used: number;
    ai_tips_used: number;
    limits: { transcription_seconds: number | null; ai_tips: number | null };
  }>(null);
  const usageRef = useRef(usage);
  useEffect(() => { usageRef.current = usage; }, [usage]);

  const [limitBanner, setLimitBanner] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTipActiveRef = useRef(false);
  const aiTipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackCategoryRef = useRef("start");
  const transcriptRef = useRef("");

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const updateStats = useCallback(() => {
    const raw = transcriptRef.current.trim();
    const words = raw.split(/\s+/).filter(Boolean);
    const mins = (Date.now() - startTimeRef.current) / 60000;
    const w = mins > 0 ? Math.round(words.length / mins) : 0;
    const fc = FILLERS.reduce((n, f) =>
      n + (raw.match(new RegExp(`\\b${f.replace(/\s+/g, "\\s+")}\\b`, "gi")) || []).length, 0);
    const ratio = words.length ? fc / words.length : 0;
    setWpm(w);
    setFillerCount(fc);
    setFillerRatio(words.length > 0 ? Math.round(ratio * 100) : 0);

    if (!aiTipActiveRef.current) {
      const cat = getCategory(words.length, ratio, w) as keyof typeof FEEDBACK_POOL;
      if (cat !== feedbackCategoryRef.current) {
        feedbackCategoryRef.current = cat;
        setFeedbackCat(cat);
        setFeedback(pick(FEEDBACK_POOL[cat]));
      }
    }
  }, []);

  const startRecording = async () => {
    const token = await getToken();
    if (!token) return;
    const socket = getSocket(token);

    socket.emit("start_recording");
    setTranscript("");
    setWpm(0);
    setFillerCount(0);
    setFillerRatio(0);
    setElapsed(0);
    const startMsg = pick(FEEDBACK_POOL.start);
    setFeedback(startMsg);
    setFeedbackCat("start");
    feedbackCategoryRef.current = "start";
    setCoachNotes([]);
    startTimeRef.current = Date.now();

    statsIntervalRef.current = setInterval(updateStats, 2000);
    elapsedIntervalRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    waveformIntervalRef.current = setInterval(() => {
      setWaveform(Array(28).fill(0).map(() => Math.random() * 100));
    }, 100);

    setRecording(true);

    socket.on("transcription_update", (text: string) => {
      setTranscript(prev => (prev + " " + text).trim());
    });

    socket.on("final_stats_update", ({ avg_wpm, filler_count }: { avg_wpm: number; filler_count: number }) => {
      setWpm(avg_wpm);
      setFillerCount(filler_count);
    });

    socket.on("limit_reached", ({ type }: { type: string }) => {
      const msg = type === "transcription"
        ? "You've hit your 60 min/month transcription limit. Upgrade for unlimited access."
        : "You've used your 20 free AI tips this month. Upgrade for unlimited coaching.";
      setLimitBanner(msg);
      if (type === "transcription") stopRecording();
    });

    socket.on("ai_feedback", ({ tip, elapsed: e }: { tip: string; elapsed: number }) => {
      noteIdRef.current += 1;
      setCoachNotes(prev => [{ id: noteIdRef.current, tip, elapsed: e }, ...prev].slice(0, 8));
      aiTipActiveRef.current = true;
      setFeedback(`💡 ${tip}`);
      setFeedbackCat("good");
      if (aiTipTimeoutRef.current) clearTimeout(aiTipTimeoutRef.current);
      aiTipTimeoutRef.current = setTimeout(() => {
        aiTipActiveRef.current = false;
        feedbackCategoryRef.current = "";
      }, 12000);
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = e => socket.emit("audio_chunk", e.inputBuffer.getChannelData(0).buffer);
      src.connect(proc);
      proc.connect(ctx.destination);
      processorRef.current = proc;
    } catch {
      alert("Could not access microphone.");
      setRecording(false);
      [statsIntervalRef, elapsedIntervalRef, waveformIntervalRef].forEach(r => {
        if (r.current) { clearInterval(r.current); r.current = null; }
      });
    }
  };

  const stopRecording = async () => {
    try { processorRef.current?.disconnect(); } catch {}
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    try { audioContextRef.current?.close(); } catch {}
    processorRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;

    [statsIntervalRef, elapsedIntervalRef, waveformIntervalRef].forEach(r => {
      if (r.current) { clearInterval(r.current); r.current = null; }
    });
    setWaveform(Array(28).fill(4));

    const socket = currentSocket();
    if (socket) {
      socket.emit("stop_recording", transcriptRef.current);
      socket.off("transcription_update");
      socket.off("final_stats_update");
      socket.off("ai_feedback");
    }

    updateStats();
    setRecording(false);

    const txt = transcriptRef.current.trim();
    const currentUsage = usageRef.current;
    if (txt && currentUsage && currentUsage.tier !== "free") {
      const durationSecs = (Date.now() - startTimeRef.current) / 1000;
      const words = txt.split(/\s+/).filter(Boolean);
      const avgWpm = durationSecs > 0 ? Math.round((words.length / durationSecs) * 60) : 0;
      const fc = FILLERS.reduce((n, f) =>
        n + (txt.match(new RegExp(`\\b${f.replace(/\s+/g, "\\s+")}\\b`, "gi")) || []).length, 0);
      setReportLoading(true);
      try {
        const token = await getToken();
        const res = await fetch("/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ transcript: txt, duration_secs: durationSecs, filler_count: fc, avg_wpm: avgWpm }),
        });
        if (res.ok) setReport(await res.json());
      } catch {}
      setReportLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/usage", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUsage(await res.json());
    })();
  }, [getToken]);

  useEffect(() => () => { disconnectSocket(); }, []);

  const feedbackEmoji = feedback.match(/^(\S+)/)?.[1] ?? "💭";
  const feedbackText = feedback.replace(/^\S+\s*/, "");
  const accentColor = CATEGORY_COLORS[feedbackCat] ?? "var(--accent)";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar />
      <ReportModal report={report} onClose={() => setReport(null)} />

      {/* Limit banner */}
      <AnimatePresence>
        {limitBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl"
            style={{ background: "var(--card)", border: "1px solid #f59e0b", color: "var(--text-1)", maxWidth: "520px" }}
          >
            <span>⚠️ {limitBanner}</span>
            <a href="/pricing" className="underline whitespace-nowrap" style={{ color: "var(--accent)" }}>Upgrade →</a>
            <button onClick={() => setLimitBanner(null)} style={{ color: "var(--text-3)" }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-2xl mx-auto px-5 pb-28 pt-24">

        {/* ── Hero: Mic + Waveform ────────────────────────────────── */}
        <div className="flex flex-col items-center gap-5 mb-8">

          {/* Mic button */}
          <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
            {recording && [0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full"
                style={{ border: "1.5px solid rgba(239,68,68,0.3)" }}
                initial={{ scale: 0.75, opacity: 0.9 }}
                animate={{ scale: 3.0, opacity: 0 }}
                transition={{ duration: 2.8, delay: i * 0.75, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
            <motion.button
              onClick={recording ? stopRecording : startRecording}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="relative z-10 w-[114px] h-[114px] rounded-full text-white flex flex-col items-center justify-center gap-1 cursor-pointer"
              style={{
                background: recording
                  ? "linear-gradient(145deg, #ef4444, #dc2626)"
                  : "linear-gradient(145deg, var(--blue-primary), var(--blue-accent))",
                boxShadow: recording
                  ? "0 20px 60px rgba(239,68,68,0.5), 0 0 0 2px rgba(239,68,68,0.2)"
                  : "var(--shadow-accent), 0 0 40px rgba(59,130,246,0.3)",
                border: "none",
                transition: "background 0.35s, box-shadow 0.35s",
              }}
            >
              <motion.span
                key={recording ? "stop" : "mic"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-[2rem] leading-none"
              >
                {recording ? "⏹️" : "🎙️"}
              </motion.span>
              <span className="font-mono text-[0.42rem] tracking-widest uppercase opacity-70">
                {recording ? "stop" : "record"}
              </span>
            </motion.button>
          </div>

          {/* Waveform */}
          <div className="flex items-center justify-center gap-[2.5px]" style={{ height: 44 }}>
            {waveform.map((h, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: 3,
                  background: recording
                    ? `hsl(${195 + h * 0.6}deg 90% ${55 + h * 0.2}%)`
                    : "var(--card-border)",
                }}
                animate={{ height: recording ? Math.max(3, h * 0.38) : 3 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
              />
            ))}
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 h-5">
            <AnimatePresence mode="wait">
              {recording ? (
                <motion.div
                  key="rec"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="font-mono text-xs tracking-widest" style={{ color: "#f87171" }}>
                    {formatElapsed(elapsed)}
                  </span>
                </motion.div>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-mono text-xs tracking-widest"
                  style={{ color: "var(--text-3)" }}
                >
                  {transcript ? "session complete · tap to record again" : "tap to start"}
                </motion.span>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {reportLoading && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="font-mono text-xs tracking-wide"
                  style={{ color: "var(--accent)" }}
                >
                  · generating report…
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Live Feedback Banner ────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={feedback}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl px-5 py-4 mb-4 flex items-center gap-4"
            style={{
              background: "var(--card)",
              border: `1px solid ${accentColor}28`,
              boxShadow: `var(--shadow-sm), 0 0 20px ${accentColor}10`,
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
              style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}28` }}
            >
              {feedbackEmoji}
            </div>
            <span
              className="text-sm font-semibold leading-snug flex-1"
              style={{ color: "var(--text-1)", fontFamily: "var(--font-syne)" }}
            >
              {feedbackText}
            </span>
            <div
              className="w-1.5 h-6 rounded-full flex-shrink-0"
              style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}55)` }}
            />
          </motion.div>
        </AnimatePresence>

        {/* ── Stats Row ──────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StatTile
            label="Words / Min"
            value={wpm > 0 ? wpm : "—"}
            icon="⚡"
            accent={wpm > 160 ? "#a78bfa" : wpm < 90 && wpm > 0 ? "#60a5fa" : "var(--accent)"}
          />
          <StatTile
            label="Filler Words"
            value={recording || transcript ? fillerCount : "—"}
            icon="💬"
            accent={fillerCount > 5 ? "#f59e0b" : "var(--accent)"}
          />
          <StatTile
            label="Filler Rate"
            value={wpm > 0 ? `${fillerRatio}%` : "—"}
            icon="📊"
            accent={fillerRatio > 15 ? "#ef4444" : fillerRatio > 8 ? "#f59e0b" : "var(--accent)"}
          />
        </motion.div>

        {/* ── Live Transcript ────────────────────────────────────── */}
        <motion.div
          className="rounded-3xl overflow-hidden mb-4"
          style={{
            background: "var(--card)",
            border: `1px solid ${recording ? "rgba(56,189,248,0.4)" : "var(--card-border)"}`,
            boxShadow: recording
              ? "var(--shadow-md), 0 0 0 3px rgba(56,189,248,0.08)"
              : "var(--shadow-sm)",
            transition: "border-color 0.35s, box-shadow 0.35s",
          }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div
            className="flex items-center justify-between px-6 py-3.5"
            style={{ borderBottom: "1px solid var(--card-border)" }}
          >
            <span className="font-mono text-xs tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
              Live Transcript
            </span>
            <AnimatePresence>
              {recording && (
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase"
                  style={{ color: "#f87171" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Recording
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div
            className="px-6 py-6 min-h-48 text-base leading-8"
            style={{ color: "var(--text-1)" }}
            dangerouslySetInnerHTML={{
              __html: transcript.trim()
                ? highlight(transcript.trim())
                : `<span style="color:var(--text-3);font-style:italic;font-family:var(--font-mono);font-size:0.875rem">transcription will appear here as you speak…</span>`,
            }}
          />
        </motion.div>

        {/* ── Coach notes — slide in after session ─────────────── */}
        <AnimatePresence>
          {!recording && coachNotes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ delay: 0.08 }}
              className="mb-4"
            >
              <CoachPanel notes={coachNotes} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Usage meter — hidden during recording ─────────────── */}
        <AnimatePresence>
          {!recording && usage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <UsageMeter usage={usage} />
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

/* ── StatTile — inline, no 3D overhead on the tiny cards ────────── */
function StatTile({ label, value, icon, accent }: {
  label: string;
  value: string | number;
  icon: string;
  accent: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: `radial-gradient(120px circle at 80% 20%, ${accent}18, transparent 70%)` }}
      />
      <span className="absolute top-3 right-3 text-base opacity-30">{icon}</span>
      <p className="font-mono text-[0.6rem] tracking-widest uppercase mb-2" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      <AnimatePresence mode="wait">
        <motion.p
          key={String(value)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="font-mono text-3xl font-medium tracking-tight leading-none"
          style={{ color: accent, fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}
