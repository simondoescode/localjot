import { Plus } from "lucide-react";

function notePreview(note) {
  return (note.summaryMarkdown || note.transcript || "No transcript yet")
    .replace(/[#*_`\n-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function noteTitle(note) {
  const firstLine = (note.transcript || "").trim().split(/(?<=[.!?])\s|\n/)[0]?.slice(0, 70);
  return note.title || firstLine || "Untitled note";
}

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function Sidebar({ notes, selectedId, onSelect, onNewNote, storage }) {
  return (
    <div className="flex h-full flex-col px-3 py-4 md:px-4 md:py-6">
      <div className="flex items-center gap-2.5 px-1 pb-3 md:px-2 md:pb-6">
        <img className="h-8 w-8" src="/icon.svg" alt="" />
        <div>
          <b className="text-lg tracking-tight">Jot</b>
          <span className="block text-xs text-stone-500">Private voice notes</span>
        </div>
      </div>

      <button
        onClick={onNewNote}
        className="flex min-h-11 w-full items-center gap-1.5 rounded-xl bg-ink px-3.5 py-3 text-left font-semibold text-white shadow-sm shadow-stone-900/10 transition hover:-translate-y-0.5 hover:bg-stone-700 hover:shadow-md active:bg-stone-800"
      >
        <Plus size={18} /> New note
      </button>

      <div className="flex justify-between px-1 pb-2 pt-4 text-[11px] font-bold uppercase tracking-widest text-stone-500 md:px-2 md:pt-6">
        <span>Notes</span>
        <span>{notes.length}</span>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-auto">
        {notes.length === 0 && <div className="p-2 text-xs text-stone-500">No notes yet</div>}
        {notes.map((note) => (
          <button
            key={note.id}
            onClick={() => onSelect(note)}
            className={`w-full rounded-xl border p-2.5 text-left transition hover:border-stone-300 hover:bg-white active:bg-stone-100 ${
            note.id === selectedId ? "border-violet-200 bg-violet-50 shadow-sm" : "border-transparent"
            }`}
          >
            <b className="block truncate text-sm">{noteTitle(note)}</b>
            <span className="mt-0.5 block truncate text-xs text-stone-500">{notePreview(note)}</span>
            <small className="mt-1 block text-[11px] text-stone-500">
              {new Date(note.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} ·{" "}
              {fmt(note.durationMs || 0)}
            </small>
          </button>
        ))}
      </div>

      <div className="mt-auto border-t border-stone-200 px-2 pt-4 text-xs text-stone-500">
        <div className="font-medium text-stone-700">On-device storage</div>
        <div className="mt-1">{storage.usageLabel}</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${storage.percent}%` }} />
        </div>
        <div className="mt-1">{storage.remainingLabel}</div>
      </div>
    </div>
  );
}
