import { Square } from "lucide-react";

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const STATUS_LABEL = {
  idle: "Preparing microphone…",
  requesting: "Preparing microphone…",
  ready: "Ready to record",
  recording: "Recording…",
  saving: "Saving full recording…",
  error: "Microphone unavailable",
};

export default function RecordView({ micState, elapsedMs, waveHeights, onToggleRecord, error }) {
  const isRecording = micState === "recording";

  return (
    <section className="mx-auto mt-[8vh] max-w-xl text-center">
      <h1 className="text-3xl font-bold tracking-tight">Recording a note</h1>
      <div className="mt-5 text-5xl tracking-tighter tabular-nums">{fmt(elapsedMs)}</div>
      <div className="min-h-6 text-stone-500">{STATUS_LABEL[micState]}</div>
      <button
        onClick={onToggleRecord}
        disabled={micState === "requesting" || micState === "saving"}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        className={`my-6 grid h-[88px] w-[88px] place-items-center rounded-full text-white shadow-xl transition disabled:opacity-60 ${
          isRecording ? "bg-rose-600 shadow-rose-300/40" : "bg-accent shadow-violet-300/40"
        }`}
      >
        {isRecording ? <Square size={28} fill="currentColor" /> : <span className="text-3xl">●</span>}
      </button>
      <div className="text-sm text-stone-500">Tap to start, then tap again to finish</div>
      <div className="mt-4 flex h-6 items-center justify-center gap-[3px]">
        {waveHeights.map((h, i) => (
          <i key={i} className="w-[3px] rounded-full bg-violet-300" style={{ height: `${h}px`, transition: "height .08s" }} />
        ))}
      </div>
      {error && <div className="mt-3 text-sm text-rose-700">{error}</div>}
    </section>
  );
}
