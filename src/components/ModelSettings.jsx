export default function ModelSettings({ open, onToggle, modelId, onModelChange, onLoadModel, transcriberStatus, summarizerStatus }) {
  return (
    <details open={open} onToggle={(e) => onToggle(e.target.open)} className="mb-4 rounded-xl border border-stone-200 bg-white p-3.5">
      <summary className="cursor-pointer text-[13px] text-stone-500">Speech model &amp; local processing</summary>
      <div className="pt-3.5">
        <div className="flex flex-wrap gap-2.5">
          <select
            value={modelId}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={transcriberStatus.state === "loading"}
            className="min-h-11 min-w-40 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-base"
          >
            <option value="Xenova/whisper-tiny.en">Tiny English — fast</option>
            <option value="Xenova/whisper-base.en">Base English — more accurate</option>
          </select>
          <button
            onClick={onLoadModel}
            disabled={transcriberStatus.state === "loading"}
            className="min-h-11 rounded-lg bg-accent px-3 py-2 font-semibold text-white disabled:opacity-60"
          >
            {transcriberStatus.state === "ready" ? "Model ready" : "Load model"}
          </button>
        </div>
        {transcriberStatus.state === "loading" && (
          <div className="mt-2.5 h-1 overflow-hidden rounded bg-stone-100">
            <div className="h-full bg-accent transition-all" style={{ width: `${transcriberStatus.progress}%` }} />
          </div>
        )}
        {transcriberStatus.label && <div className="mt-1 text-xs text-stone-500">{transcriberStatus.label}</div>}
        <div className="mt-2 text-xs text-stone-500">
          {summarizerStatus.label || "Summary model will download quietly when needed."}
        </div>
        {summarizerStatus.state === "loading" && (
          <div className="mt-2 h-1 overflow-hidden rounded bg-stone-100">
            <div className="h-full bg-accent transition-all" style={{ width: `${summarizerStatus.progress}%` }} />
          </div>
        )}
      </div>
    </details>
  );
}
