"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import CoachPanel, { CoachNote } from "@/components/CoachPanel";
import UsageMeter from "@/components/UsageMeter";
import ReportModal, { Report } from "@/components/ReportModal";
import { getSocket, currentSocket, disconnectSocket } from "@/lib/socket";

const SAMPLE_RATE = 16000;
const FILLERS = [
  "um","uh","er","ah",
  "like","basically","actually","you know","so","literally",
  "i mean","well","okay","ok","right","anyway","honestly",
  "totally","seriously","obviously","sort of","kind of","you see",
];

function highlight(text: string) {
  let out = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  FILLERS.forEach(w => {
    out = out.replace(new RegExp(`\\b${w}\\b`, "gi"), m => `<span class="filler-word">${m}</span>`);
  });
  return out;
}

export default function StudioPage() {
  const { getToken } = useAuth();

  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [wpm, setWpm] = useState(0);
  const [fillers, setFillers] = useState(0);
  const [feedback, setFeedback] = useState("😮‍💨 deep breaths, you got this.");
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
  const noteIdRef = useRef(0);
  const [usage, setUsage] = useState<null | {
    tier: string;
    transcription_seconds_used: number;
    ai_tips_used: number;
    limits: { transcription_seconds: number | null; ai_tips: number | null };
  }>(null);
  const [limitBanner, setLimitBanner] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const updateStats = useCallback(() => {
    const raw = transcriptRef.current.trim();
    const words = raw.split(/\s+/).filter(Boolean);
    const mins = (Date.now() - startTimeRef.current) / 60000;
    const w = mins > 0 ? Math.round(words.length / mins) : 0;
    const fc = FILLERS.reduce((n, f) => n + (raw.match(new RegExp(`\\b${f}\\b`, "gi")) || []).length, 0);
    const ratio = words.length ? fc / words.length : 0;
    setWpm(w);
    setFillers(fc);
    if (words.length < 5)     setFeedback("😮‍💨 deep breaths, you got this.");
    else if (ratio > 0.15)    setFeedback("💬 watch your filler words!");
    else if (w > 160)         setFeedback("⏳ slow it down a notch.");
    else if (w < 90)          setFeedback("🎙️ project your voice!");
    else                      setFeedback("👍 great pace, keep going!");
  }, []);

  const startRecording = async () => {
    const token = await getToken();
    if (!token) return;
    const socket = getSocket(token);

    socket.emit("start_recording");
    setTranscript("");
    setWpm(0);
    setFillers(0);
    setFeedback("😮‍💨 deep breaths, you got this.");
    setCoachNotes([]);
    startTimeRef.current = Date.now();
    statsIntervalRef.current = setInterval(updateStats, 2000);
    setRecording(true);

    socket.on("transcription_update", (text: string) => {
      setTranscript(prev => (prev + " " + text).trim());
    });

    socket.on("final_stats_update", ({ avg_wpm, filler_count }: { avg_wpm: number; filler_count: number }) => {
      setWpm(avg_wpm);
      setFillers(filler_count);
    });

    socket.on("limit_reached", ({ type }: { type: string }) => {
      const msg = type === "transcription"
        ? "You've hit your 60 min/month transcription limit. Upgrade for unlimited access."
        : "You've used your 20 free AI tips this month. Upgrade for unlimited coaching.";
      setLimitBanner(msg);
      if (type === "transcription") stopRecording();
    });

    socket.on("ai_feedback", ({ tip, elapsed }: { tip: string; elapsed: number }) => {
      noteIdRef.current += 1;
      setCoachNotes(prev => [{ id: noteIdRef.current, tip, elapsed }, ...prev].slice(0, 8));
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
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    }
  };

  const stopRecording = async () => {
    try { processorRef.current?.disconnect(); } catch {}
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    try { audioContextRef.current?.close(); } catch {}
    processorRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

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
    if (txt && usage && usage.tier !== "free") {
      const durationSecs = (Date.now() - startTimeRef.current) / 1000;
      const words = txt.split(/\s+/).filter(Boolean);
      const avgWpm = durationSecs > 0 ? Math.round((words.length / durationSecs) * 60) : 0;
      const fc = FILLERS.reduce((n, f) => n + (txt.match(new RegExp(`\\b${f}\\b`, "gi")) || []).length, 0);
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

  // Fetch usage on mount
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/usage", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUsage(await res.json());
    })();
  }, [getToken]);

  useEffect(() => () => { disconnectSocket(); }, []);

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
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg"
            style={{ background: "var(--card)", border: "1px solid #f59e0b", color: "var(--text-1)", maxWidth: "520px" }}
          >
            <span>⚠️ {limitBanner}</span>
            <a href="/pricing" className="underline whitespace-nowrap" style={{ color: "var(--accent)" }}>Upgrade →</a>
            <button onClick={() => setLimitBanner(null)} style={{ color: "var(--text-3)", marginLeft: 4 }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="pt-28 pb-5 text-center">
        <h1 className="font-serif text-3xl tracking-tight" style={{ color: "var(--text-1)" }}>
          SpeakHelp
        </h1>
        <p className="font-mono text-xs tracking-widest mt-1" style={{ color: "var(--text-3)" }}>
          real-time speaking coach · by justin dutta
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-20">

        {/* Stats row */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_2fr] gap-3 mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StatCard label="Words / Min" icon="⚡" value={wpm} />
          <StatCard label="Filler Words" icon="💬" value={fillers} />
          <StatCard label="Live Feedback" icon="🧠" value={feedback} wide />
        </motion.div>

        {/* Two-column workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">

          <div className="flex flex-col gap-4">
            {/* Mic toggle */}
            <div className="flex flex-col items-center gap-2">
              <AnimatePresence>
                {reportLoading && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="font-mono text-xs tracking-wide"
                    style={{ color: "var(--accent)" }}
                  >
                    Generating report…
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="relative flex items-center justify-center w-24 h-24">
                {recording && [0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full"
                    style={{ border: "1.5px solid #f87171" }}
                    initial={{ scale: 0.85, opacity: 0.7 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    transition={{ duration: 2, delay: i * 0.55, repeat: Infinity, ease: "easeOut" }}
                  />
                ))}
                <motion.button
                  onClick={recording ? stopRecording : startRecording}
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative z-10 w-[70px] h-[70px] rounded-full text-white flex flex-col items-center justify-center gap-1 cursor-pointer"
                  style={{
                    background: recording
                      ? "linear-gradient(145deg, #ef4444, #dc2626)"
                      : "linear-gradient(145deg, var(--blue-primary), var(--blue-accent))",
                    boxShadow: recording
                      ? "0 8px 28px rgba(239,68,68,0.4)"
                      : "var(--shadow-accent)",
                    border: "none",
                    transition: "background 0.3s ease, box-shadow 0.3s ease",
                  }}
                >
                  <motion.span
                    key={recording ? "stop" : "mic"}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="text-2xl leading-none"
                  >
                    {recording ? "⏹️" : "🎙️"}
                  </motion.span>
                  <span className="font-mono text-[0.48rem] tracking-widest uppercase opacity-80">
                    {recording ? "stop" : "record"}
                  </span>
                </motion.button>
              </div>
            </div>

            {/* Transcript */}
            <motion.div
              className="rounded-3xl overflow-hidden"
              style={{
                background: "var(--card)",
                border: `1px solid ${recording ? "rgba(56,189,248,0.35)" : "var(--card-border)"}`,
                boxShadow: recording ? "var(--shadow-md), 0 0 0 3px var(--accent-glow)" : "var(--shadow-md)",
                transition: "border-color 0.3s, box-shadow 0.3s",
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: "1px solid var(--card-border)" }}
              >
                <span className="font-mono text-xs tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                  Live Transcript
                </span>
                <AnimatePresence>
                  {recording && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase"
                      style={{ color: "#f87171" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
                      Recording
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div
                className="px-6 py-6 min-h-40 text-base leading-7"
                dangerouslySetInnerHTML={{
                  __html: transcript.trim()
                    ? highlight(transcript.trim())
                    : `<span style="color:var(--text-3);font-style:italic">transcription will appear here…</span>`,
                }}
              />
            </motion.div>
          </div>

          {/* Coach panel + usage meter */}
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <CoachPanel notes={coachNotes} />
            {usage && <UsageMeter usage={usage} />}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
