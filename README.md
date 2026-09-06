# Jot (React + Tailwind rewrite)

Private, on-device voice notes: record or upload audio, transcribe it locally
with Whisper (via [Transformers.js](https://github.com/huggingface/transformers.js)),
and optionally summarize the transcript — all in the browser, nothing leaves
the device.

This is a React + Tailwind rewrite of the original vanilla-JS app, with the
same brand (paper/ink/violet-accent) and the same on-device model logic, but
restructured into components/hooks and reworked for a much better mobile
experience.

## Run it

```
npm install
npm run dev
```

Build for deployment:

```
npm run build
npm run preview   # sanity-check the production build locally
```

## What's different from the vanilla version

**Structure** — split into `lib/` (DB, audio encode/decode, model loading,
chunked summarization), `hooks/` (`useNotes`, `useModels`, `useRecorder`,
`useStorageInfo`), and `components/` (`Sidebar`, `ModelSettings`,
`NewNoteView`, `RecordView`, `EditorView`). `App.jsx` wires it all together.

**Mobile styling:**
- Real navigation instead of a squashed inline notes strip: a hamburger menu
  opens a slide-in drawer with the notes list and storage panel, closing on
  selection or backdrop tap.
- A sticky bottom action bar (Copy / Export / Delete) sits within thumb's
  reach in the editor on small screens, padded for the iOS home indicator via
  `env(safe-area-inset-bottom)`.
- `min-h-dvh` instead of `min-h-screen`, so the layout doesn't jump when
  mobile browser chrome (URL bar) shows/hides.
- All inputs/textareas/selects are forced to 16px+ so iOS Safari doesn't
  zoom in on focus.
- Touch targets are sized to at least 44×44px (`min-h-11`/`min-w-11`)
  throughout.
- Icons (via `lucide-react`) instead of ASCII glyphs for clearer, more
  consistent touch targets.

**Everything else is unchanged in behavior** from the last vanilla-JS
version: WebGPU is only used after actually confirming an adapter (and never
on mobile, where GPU-driver crashes were the original bug report), the
transcriber model is freed from memory before the summarizer downloads on
mobile to avoid an out-of-memory tab kill, and long transcripts are
summarized in sentence-aware chunks rather than hard-truncated.

## Service worker note

`public/sw.js` does runtime (network-first, cache-fallback) caching of
same-origin requests, same strategy as the original. It does **not**
precache a build-time asset list, because Vite hashes output filenames per
build — for a fully offline-capable first load, add
[`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/), which generates that
manifest automatically. As shipped, the app becomes available offline after
the first successful visit.

## Model weights

The Whisper and summarization model weights are downloaded from the Hugging
Face CDN on first use and cached by the browser/onnxruntime-web's own
storage layer — they are not bundled with this project.
