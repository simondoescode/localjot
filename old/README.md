# Local Transcriber — browser-only Whisper PWA

A mobile-first speech-to-text PWA using Whisper through Transformers.js.

## Privacy model

- Audio is recorded with the browser microphone.
- Audio is decoded and sent directly to the local Whisper model running in the browser.
- Transcripts are summarized by a second small model (DistilBART CNN via Transformers.js) that also runs entirely in the browser — the transcript text never leaves the device.
- Past recordings (audio + transcript + summary) are saved to this browser's IndexedDB storage for this site only — not to a server, not to the cloud.
- There is no transcription API, summarization API, or application backend.
- After the models have been downloaded/cached, the app can be used offline (subject to browser cache/model availability).

## Recording history

- Every finished recording is saved locally (IndexedDB) with its audio, transcript, and (once run) its summary.
- The History card lists past recordings newest-first, with playback, per-recording Summarize/Re-summarize, and delete.
- "Clear all" wipes every saved recording from this device after confirmation.
- This history is tied to the browser/device it was recorded on — clearing site data or using a different browser/device won't show it.

## Summarization

- A small summarization model (`Xenova/distilbart-cnn-6-6`, quantized) starts downloading automatically in the background as soon as the app opens — no button press required.
- Progress is shown quietly in the "Summary" card; the rest of the app (recording, transcribing) is not blocked while it downloads.
- If you tap "Summarize" before the download finishes, the app queues the request and runs it automatically the moment the model is ready.
- Long transcripts are split into chunks locally before summarizing, since on-device models have a bounded input length; the chunk summaries are then joined.
- Like Whisper, the model is cached by the browser after first download, so later summaries can run offline too.

## Important first-run note

The app imports Transformers.js from jsDelivr and downloads the selected Whisper model, plus the summarization model, from Hugging Face on first use. This is required for the browser-only starter build.

If you want a *fully self-contained* offline package with no CDN/model host dependency at all, download/vendor the Transformers.js runtime and model files into the project and change `env.allowLocalModels` plus the model path in `app.js`.

## Run on your phone

Microphone access normally requires a secure context (HTTPS). The easiest test:

1. Put this folder on any static HTTPS host, or run a local HTTPS development server accessible from your phone.
2. Open the HTTPS URL in Chrome/Edge on Android (or Safari on iPhone).
3. Add it to the home screen.
4. Choose Tiny English for the first test.
5. Tap "Download / load Whisper model".
6. Allow microphone access.
7. Record and stop.

For Android Chrome, WebGPU availability varies by device/browser. If WebGPU is unavailable, the app falls back to WASM.

## Files

- `index.html` — mobile-first UI
- `app.js` — microphone, audio decoding/resampling and Whisper inference
- `sw.js` — PWA app-shell caching
- `manifest.webmanifest` — installable PWA metadata
- `icon.svg` — app icon

## Recommended next upgrades

- Fully vendor Transformers.js and model assets for strict air-gapped operation
- Add multilingual Whisper
- Add audio-file import
- Add transcript history using IndexedDB
- Add SRT/VTT timestamp export
- Add wake/keep-screen-awake support
- Add model management and storage usage UI
- Offer a summary length/style choice (bullet points vs. paragraph)
- Cache the summarization model choice so users can pick a larger/more accurate model on capable devices
- Add search/filter within recording history, and a storage-usage indicator
