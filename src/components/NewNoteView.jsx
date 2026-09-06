import { Mic, Upload } from "lucide-react";

export default function NewNoteView({ onRecord, onUploadClick }) {
  return (
    <section className="mx-auto mt-[7vh] max-w-xl text-center md:mt-[11vh]">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-violet-100 text-3xl text-accent">✦</div>
      <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-[34px]">Start a fresh note</h1>
      <p className="mt-2 text-stone-500">Capture a thought now or turn an existing audio file into a private note.</p>
      <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
        <button
          onClick={onRecord}
          className="min-h-32 rounded-xl border border-stone-200 bg-white p-4.5 text-left transition hover:border-violet-300 hover:bg-violet-50 active:bg-violet-100"
        >
          <Mic className="text-accent" size={26} />
          <strong className="mt-2 block">Record audio</strong>
          <span className="block text-sm text-stone-500">Use your microphone</span>
        </button>
        <button
          onClick={onUploadClick}
          className="min-h-32 rounded-xl border border-stone-200 bg-white p-4.5 text-left transition hover:border-violet-300 hover:bg-violet-50 active:bg-violet-100"
        >
          <Upload className="text-accent" size={26} />
          <strong className="mt-2 block">Upload audio</strong>
          <span className="block text-sm text-stone-500">Choose a file to transcribe</span>
        </button>
      </div>
    </section>
  );
}
