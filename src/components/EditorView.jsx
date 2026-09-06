import { Copy, Download, Trash2, Sparkles, Eye, Pencil } from "lucide-react";

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function EditorView({
  note,
  title,
  transcript,
  summaryMarkdown,
  summaryHtml,
  showSummaryPreview,
  onTitleChange,
  onTranscriptChange,
  onSummaryChange,
  onToggleSummaryView,
  audioUrl,
  onSummarize,
  isSummarizing,
  summaryProgress,
  onCopyTranscript,
  onCopySummary,
  onExportTranscript,
  onExportSummary,
  onDelete,
}) {
  return (
    <section className="mx-auto max-w-3xl pb-24 md:pb-4">
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full bg-transparent py-1 text-3xl font-bold tracking-tight outline-none placeholder:text-stone-300 md:text-[34px]"
        placeholder="Untitled note"
      />
      <div className="mb-6 text-[13px] text-stone-500">
        {new Date(note.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {fmt(note.durationMs || 0)}
      </div>
      {audioUrl && <audio className="my-3 w-full rounded-xl shadow-sm" controls src={audioUrl} />}

      <div className="border-t border-stone-200/80 py-5">
        <div className="mb-2.5 flex items-center justify-between">
          <b className="text-[13px]">TRANSCRIPT</b>
          <div className="flex gap-2">
            <button
              onClick={onCopyTranscript}
              aria-label="Copy transcript"
              className="grid h-9 min-w-9 place-items-center rounded-lg border border-stone-200 bg-white text-xs active:bg-stone-100"
            >
              <Copy size={15} />
            </button>
            <button
              onClick={onExportTranscript}
              aria-label="Export transcript"
              className="grid h-9 min-w-9 place-items-center rounded-lg border border-stone-200 bg-white text-xs active:bg-stone-100"
            >
              <Download size={15} />
            </button>
          </div>
        </div>
        <textarea
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          className="min-h-44 w-full resize-y bg-transparent text-base leading-7 outline-none"
          placeholder="Your transcript will appear here…"
          spellCheck
        />
      </div>

      <div className="border-t border-stone-200/80 py-5">
        <div className="mb-2.5 flex items-center justify-between">
          <b className="text-[13px]">SUMMARY</b>
          <div className="flex gap-2">
            <button
              onClick={onSummarize}
              disabled={isSummarizing}
              className="flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm hover:border-violet-200 hover:bg-violet-50 disabled:opacity-60"
            >
              <Sparkles size={14} /> {isSummarizing ? "Summarizing…" : "Summarize"}
            </button>
            <button
              onClick={onToggleSummaryView}
              aria-label={showSummaryPreview ? "Edit summary" : "Preview summary"}
              className="grid h-9 min-w-9 place-items-center rounded-lg border border-stone-200 bg-white text-xs active:bg-stone-100"
            >
              {showSummaryPreview ? <Pencil size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {isSummarizing && summaryProgress?.label && (
          <div className="mb-3">
            <div className="h-1 overflow-hidden rounded bg-stone-100">
              <div className="h-full bg-accent transition-all" style={{ width: `${summaryProgress.percent}%` }} />
            </div>
            <div className="mt-1 text-xs text-stone-500">{summaryProgress.label}</div>
          </div>
        )}

        {showSummaryPreview ? (
          <div
            className={`leading-relaxed ${summaryMarkdown.trim() ? "text-ink" : "text-stone-500"}`}
            dangerouslySetInnerHTML={{
              __html: summaryMarkdown.trim() ? summaryHtml : "A concise summary will appear here.",
            }}
          />
        ) : (
          <textarea
            value={summaryMarkdown}
            onChange={(e) => onSummaryChange(e.target.value)}
            className="min-h-44 w-full resize-y bg-transparent text-base leading-7 outline-none"
            placeholder="Write a summary…"
            spellCheck
          />
        )}

        {/* Desktop actions — inline, always visible */}
        <div className="mt-3 hidden flex-wrap gap-2 md:flex">
          <button onClick={onCopySummary} className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs">
            Copy summary
          </button>
          <button onClick={onExportSummary} className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs">
            Export MD
          </button>
          <button onClick={onDelete} className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-rose-700">
            Delete note
          </button>
        </div>
      </div>

      <div className="hidden text-xs text-stone-500 md:block">Saved locally</div>

      {/* Mobile actions — fixed bottom bar, thumb's reach, safe-area aware */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex border-t border-stone-200 bg-white/95 px-1 backdrop-blur [padding-bottom:env(safe-area-inset-bottom)] md:hidden">
        <button
          onClick={onCopySummary}
          aria-label="Copy summary"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-stone-600 active:bg-stone-100"
        >
          <Copy size={19} /> Copy
        </button>
        <button
          onClick={onExportSummary}
          aria-label="Export summary"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-stone-600 active:bg-stone-100"
        >
          <Download size={19} /> Export
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete note"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-rose-700 active:bg-rose-50"
        >
          <Trash2 size={19} /> Delete
        </button>
      </div>
    </section>
  );
}
