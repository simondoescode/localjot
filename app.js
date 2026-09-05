import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
import { marked } from "https://cdn.jsdelivr.net/npm/marked@12/+esm";

// marked only turns markdown text into HTML locally in the browser — no
// network call, no data leaves the device. The markdown it renders is
// always text we generated ourselves from the local summarizer's output.
marked.setOptions({ breaks: true });

// Transformers.js will cache model assets in the browser.
// Do not use remote APIs for transcription.
env.allowRemoteModels = true;
env.allowLocalModels = false;

const $ = id => document.getElementById(id);
const loadBtn = $("loadBtn"), modelSelect = $("modelSelect"), recordBtn = $("recordBtn");
const progress = $("progress"), progressBar = progress.querySelector("i"), progressText = $("progressText");
const output = $("output"), state = $("state"), errorBox = $("error"), timerEl = $("timer");
const copyBtn = $("copyBtn"), downloadBtn = $("downloadTxtBtn"), clearBtn = $("clearBtn");

const sumStatus = $("sumStatus"), sumProgress = $("sumProgress"), sumProgressBar = sumProgress.querySelector("i");
const summarizeBtn = $("summarizeBtn"), summaryOutput = $("summaryOutput"), summaryPreview = $("summaryPreview");
const toggleSumViewBtn = $("toggleSumViewBtn");
const copySumBtn = $("copySumBtn"), downloadSumBtn = $("downloadSumTxtBtn"), clearSumBtn = $("clearSumBtn");

const historyList = $("historyList"), historyEmpty = $("historyEmpty"), clearHistoryBtn = $("clearHistoryBtn");
const storageInfo = $("storageInfo");

// Small, quantized summarization model. Same "download once, cache in browser" model
// as Whisper above — no server, no remote inference API, just a one-time asset fetch.
const SUMMARY_MODEL = "Xenova/distilbart-cnn-6-6";

// ---- Local recording history (IndexedDB) --------------------------------
// Every finished recording (audio blob + transcript + optional summary) is
// saved here. IndexedDB lives entirely in the browser for this origin —
// nothing is sent anywhere, and nothing is readable outside this device.
const DB_NAME = "local-transcriber";
const DB_VERSION = 1;
const STORE = "recordings";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbPut(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function dbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function dbClear() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let transcriber = null, recorder = null, chunks = [], startedAt = 0, timerId = null, stream = null;
let summarizer = null, summarizerLoading = false, summarizePending = false;

$("network").textContent = navigator.onLine ? "ONLINE" : "OFFLINE";
$("engine").textContent = ("gpu" in navigator) ? "WebGPU" : "WASM";

window.addEventListener("online", () => $("network").textContent = "ONLINE");
window.addEventListener("offline", () => $("network").textContent = "OFFLINE");

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}
function clearError(){ errorBox.classList.add("hidden"); errorBox.textContent=""; }
function fmt(ms){ const s=Math.floor(ms/1000), m=Math.floor(s/60), ss=String(s%60).padStart(2,"0"); return `${String(m).padStart(2,"0")}:${ss}`; }

async function loadModel() {
  clearError();
  const model = modelSelect.value;
  loadBtn.disabled = true; modelSelect.disabled = true;
  progress.classList.remove("hidden"); progressBar.style.width="2%";
  progressText.textContent = "Preparing Whisper…";
  try {
    const device = ("gpu" in navigator) ? "webgpu" : "wasm";
    $("engine").textContent = device === "webgpu" ? "WebGPU" : "WASM";
    transcriber = await pipeline("automatic-speech-recognition", model, {
      device,
      dtype: device === "webgpu" ? "q4" : "q8",
      progress_callback: p => {
        if (p && typeof p.progress === "number") {
          progressBar.style.width = `${Math.max(2, Math.min(100,p.progress))}%`;
          progressText.textContent = p.status === "progress" ? `${p.file || "Model"} · ${Math.round(p.progress)}%` : (p.status || "Loading…");
        }
      }
    });
    progressBar.style.width="100%";
    progressText.textContent = "Model ready. It is cached by the browser for reuse.";
    $("modelTitle").textContent = "Whisper ready";
    $("modelText").textContent = model.includes("base") ? "Base English · better accuracy, more memory" : "Tiny English · fastest mobile option";
    state.textContent = "Ready to record";
    recordBtn.disabled = false;
    loadBtn.textContent = "Model loaded ✓";
  } catch (err) {
    console.error(err);
    showError("Could not load Whisper. Check your connection, browser support, or available memory, then try again.");
    progressText.textContent = "";
    loadBtn.disabled = false; modelSelect.disabled = false;
  }
}

// Downloads/loads the local summarization model quietly in the background.
// Runs automatically (no button press needed) so it's usually ready by the
// time the user has a transcript. Everything happens on-device; nothing is
// uploaded anywhere.
async function loadSummarizerInBackground() {
  if (summarizer || summarizerLoading) return;
  summarizerLoading = true;
  sumProgress.classList.remove("hidden");
  sumProgressBar.style.width = "2%";
  sumStatus.textContent = "Summary model downloading in the background…";
  try {
    const device = ("gpu" in navigator) ? "webgpu" : "wasm";
    summarizer = await pipeline("summarization", SUMMARY_MODEL, {
      device,
      dtype: device === "webgpu" ? "q4" : "q8",
      progress_callback: p => {
        if (p && typeof p.progress === "number") {
          sumProgressBar.style.width = `${Math.max(2, Math.min(100, p.progress))}%`;
          sumStatus.textContent = `Downloading summary model in background · ${p.file || ""} ${Math.round(p.progress)}%`;
        }
      }
    });
    sumProgressBar.style.width = "100%";
    sumStatus.textContent = "Summary model ready (runs fully on-device).";
    setTimeout(() => sumProgress.classList.add("hidden"), 800);
    updateSummarizeAvailability();
    if (summarizePending) { summarizePending = false; summarize(); }
  } catch (err) {
    console.error(err);
    summarizerLoading = false;
    sumStatus.textContent = "Couldn't download the summary model (check connection). Transcription still works normally.";
    sumProgress.classList.add("hidden");
  }
}

function updateSummarizeAvailability() {
  summarizeBtn.disabled = !summarizer || !output.value.trim();
  summarizeBtn.textContent = summarizer ? "Summarize" : "Summarize (downloading…)";
}

async function summarize() {
  const text = output.value.trim();
  if (!text) return;
  if (!summarizer) {
    // Model isn't ready yet — queue the request and let the background
    // download finish; it will run automatically once loaded.
    summarizePending = true;
    sumStatus.textContent = "Still downloading the summary model — will summarize as soon as it's ready…";
    return;
  }
  clearError();
  summarizeBtn.disabled = true;
  const prevLabel = summarizeBtn.textContent;
  summarizeBtn.textContent = "Summarizing…";
  sumStatus.textContent = "Summarizing locally…";
  try {
    const markdownBlock = await summarizeText(text);
    summaryOutput.value += (summaryOutput.value ? "\n\n" : "") + markdownBlock;
    renderSummaryPreview();
    copySumBtn.disabled = !summaryOutput.value.trim();
    downloadSumBtn.disabled = !summaryOutput.value.trim();
    sumStatus.textContent = "Summary model ready (runs fully on-device).";
  } catch (err) {
    console.error(err);
    showError("Summarization failed. Try again, or summarize a shorter transcript.");
    sumStatus.textContent = "Summary model ready (runs fully on-device).";
  } finally {
    updateSummarizeAvailability();
    summarizeBtn.textContent = summarizer ? "Summarize" : prevLabel;
  }
}

// Runs the local summarizer on arbitrary text and returns organized markdown.
// Shared by the main Summary card and by per-recording summarize buttons in
// History, so there's exactly one place that talks to the model.
async function summarizeText(text) {
  const chunksOfText = chunkText(text, 3000);
  const summaries = [];
  for (const part of chunksOfText) {
    const result = await summarizer(part, { max_new_tokens: 120, min_new_tokens: 20 });
    summaries.push((result?.[0]?.summary_text || "").trim());
  }
  return formatAsMarkdownNotes(summaries.join(" ").trim());
}

// Turns the model's plain-text summary into organized markdown notes:
// a short heading, key points as bullets, and any sentence that reads like
// an action ("need to…", "follow up…", etc.) pulled into a checklist.
// Everything here is local string processing — no extra model call.
function formatAsMarkdownNotes(summaryText) {
  const sentences = summaryText
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(s => s.trim())
    .filter(Boolean);

  const actionPattern = /\b(need to|needs to|should|must|have to|remember to|follow up|follow-up|todo|to-do|action item|will need|plan to|make sure)\b/i;
  const keyPoints = [];
  const actionItems = [];
  for (const s of sentences) {
    (actionPattern.test(s) ? actionItems : keyPoints).push(s);
  }

  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  let md = `## Summary — ${time}\n`;
  if (keyPoints.length) {
    md += `\n**Key points**\n` + keyPoints.map(p => `- ${p}`).join("\n") + "\n";
  }
  if (actionItems.length) {
    md += `\n**Action items**\n` + actionItems.map(a => `- [ ] ${a}`).join("\n") + "\n";
  }
  if (!keyPoints.length && !actionItems.length) {
    md += `\n_No summary text was produced._\n`;
  }
  return md.trim();
}

function renderSummaryPreview() {
  const md = summaryOutput.value.trim();
  if (!md) {
    summaryPreview.innerHTML = "Your organized notes will appear here…";
    summaryPreview.classList.add("empty");
    return;
  }
  summaryPreview.classList.remove("empty");
  // Markdown here is always generated locally by us from the local model's
  // output — never fetched or pasted from the web — so rendering it as
  // HTML in this on-device view carries no remote-injection risk.
  summaryPreview.innerHTML = marked.parse(md);
}

// ---- History (past recordings) ------------------------------------------

async function loadHistoryFromDB() {
  try {
    const records = await dbGetAll();
    records.sort((a, b) => b.createdAt - a.createdAt);
    for (const rec of records) historyList.appendChild(createHistoryItemEl(rec));
    updateHistoryEmptyState();
  } catch (err) {
    console.error("Could not load recording history", err);
  }
  updateStorageInfo();
}

function updateHistoryEmptyState() {
  const hasItems = historyList.querySelector(".history-item") !== null;
  historyEmpty.classList.toggle("hidden", hasItems);
}

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

// Shows how much on-device storage the saved recordings are using, via the
// browser's own Storage API — an estimate only, but enough to flag "this is
// filling up" before it becomes a real problem. Nothing here leaves the device.
async function updateStorageInfo() {
  if (!navigator.storage || !navigator.storage.estimate) {
    storageInfo.textContent = "";
    return;
  }
  try {
    const { usage, quota } = await navigator.storage.estimate();
    storageInfo.textContent = quota
      ? `${formatBytes(usage)} used of ${formatBytes(quota)} available on this device`
      : `${formatBytes(usage)} used on this device`;
  } catch {
    storageInfo.textContent = "";
  }
}

function createHistoryItemEl(entry) {
  const el = document.createElement("div");
  el.className = "history-item";
  el.dataset.id = entry.id;

  const dateStr = new Date(entry.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  const durStr = fmt(entry.durationMs || 0);
  const modelLabel = (entry.model || "").includes("base") ? "Whisper Base" : "Whisper Tiny";

  el.innerHTML = `
    <div class="row">
      <div class="grow"><b>${dateStr}</b><div class="muted small">${durStr} · ${modelLabel}</div></div>
      <div class="actions">
        <button type="button" class="small playBtn">▶ Play</button>
        <button type="button" class="small sumBtn">${entry.summaryMarkdown ? "Re-summarize" : "Summarize"}</button>
        <button type="button" class="small danger delBtn">Delete</button>
      </div>
    </div>
    <details>
      <summary class="small">Transcript</summary>
      <p class="transcript-text"></p>
    </details>
    <div class="markdown-preview hidden sum-preview"></div>
    <audio class="hist-audio hidden" controls></audio>
  `;
  el.querySelector(".transcript-text").textContent = entry.transcript || "(empty transcript)";

  if (entry.summaryMarkdown) {
    const prev = el.querySelector(".sum-preview");
    prev.innerHTML = marked.parse(entry.summaryMarkdown);
    prev.classList.remove("hidden");
  }

  el.querySelector(".playBtn").addEventListener("click", () => toggleHistoryAudio(el, entry));
  el.querySelector(".sumBtn").addEventListener("click", () => summarizeHistoryItem(el, entry));
  el.querySelector(".delBtn").addEventListener("click", () => deleteHistoryItem(el, entry.id));
  return el;
}

function toggleHistoryAudio(el, entry) {
  const audioEl = el.querySelector(".hist-audio");
  const playBtn = el.querySelector(".playBtn");
  if (!audioEl.src) {
    // Object URL created lazily, from the blob stored in IndexedDB — the
    // audio never leaves the device or touches a network request.
    audioEl.src = URL.createObjectURL(entry.audioBlob);
    audioEl.addEventListener("play", () => playBtn.textContent = "⏸ Pause");
    audioEl.addEventListener("pause", () => playBtn.textContent = "▶ Play");
    audioEl.addEventListener("ended", () => playBtn.textContent = "▶ Play");
  }
  audioEl.classList.remove("hidden");
  if (audioEl.paused) audioEl.play(); else audioEl.pause();
}

async function summarizeHistoryItem(el, entry) {
  if (!summarizer) {
    sumStatus.textContent = "Still downloading the summary model — try again in a moment.";
    return;
  }
  const btn = el.querySelector(".sumBtn");
  const prevLabel = btn.textContent;
  btn.disabled = true; btn.textContent = "Summarizing…";
  try {
    const markdown = await summarizeText(entry.transcript || "");
    entry.summaryMarkdown = markdown;
    await dbPut(entry);
    const prev = el.querySelector(".sum-preview");
    prev.innerHTML = marked.parse(markdown);
    prev.classList.remove("hidden");
    btn.textContent = "Re-summarize";
  } catch (err) {
    console.error(err);
    showError("Summarizing this recording failed. Try again.");
    btn.textContent = prevLabel;
  } finally {
    btn.disabled = false;
  }
}

async function deleteHistoryItem(el, id) {
  try {
    await dbDelete(id);
    const audioEl = el.querySelector(".hist-audio");
    if (audioEl.src) URL.revokeObjectURL(audioEl.src);
    el.remove();
    updateHistoryEmptyState();
    updateStorageInfo();
  } catch (err) {
    console.error(err);
    showError("Couldn't delete that recording. Try again.");
  }
}

clearHistoryBtn.addEventListener("click", async () => {
  if (!historyList.querySelector(".history-item")) return;
  if (!confirm("Delete all saved recordings, transcripts, and summaries from this device? This can't be undone.")) return;
  try {
    await dbClear();
    historyList.querySelectorAll(".history-item").forEach(el => {
      const audioEl = el.querySelector(".hist-audio");
      if (audioEl.src) URL.revokeObjectURL(audioEl.src);
      el.remove();
    });
    updateHistoryEmptyState();
    updateStorageInfo();
  } catch (err) {
    console.error(err);
    showError("Couldn't clear history. Try again.");
  }
});

function chunkText(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const parts = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const lastBreak = text.lastIndexOf(". ", end);
      if (lastBreak > start + maxChars * 0.5) end = lastBreak + 1;
    }
    parts.push(text.slice(start, end).trim());
    start = end;
  }
  return parts.filter(Boolean);
}

function startTimer(){
  startedAt=Date.now(); timerEl.textContent="00:00";
  timerId=setInterval(()=>timerEl.textContent=fmt(Date.now()-startedAt),250);
}
function stopTimer(){ clearInterval(timerId); timerId=null; }

function makeWave(){
  const wave=$("wave"); wave.innerHTML="";
  for(let i=0;i<60;i++){ const bar=document.createElement("i"); wave.appendChild(bar); }
}
makeWave();

function animateWave(){
  if(!recorder || recorder.state!=="recording") return;
  [...$("wave").children].forEach(b => b.style.height = `${5+Math.random()*24}px`);
  requestAnimationFrame(animateWave);
}

async function startRecording(){
  clearError();
  if(!transcriber) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    chunks=[];
    recorder = new MediaRecorder(stream, {mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm"});
    recorder.ondataavailable=e=>{if(e.data.size) chunks.push(e.data)};
    recorder.onstop=processRecording;
    recorder.start(250);
    recordBtn.classList.add("recording"); recordBtn.textContent="⏹️";
    state.textContent="Recording…"; startTimer(); animateWave();
  } catch(e){
    showError("Microphone access was denied or is unavailable. On a phone, open this PWA over HTTPS and allow microphone access.");
  }
}

function stopRecording(){
  if(recorder && recorder.state!=="inactive") recorder.stop();
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  recordBtn.classList.remove("recording"); recordBtn.textContent="🎙️";
  stopTimer(); state.textContent="Processing locally…";
}

async function processRecording(){
  try{
    const blob=new Blob(chunks,{type:recorder.mimeType || "audio/webm"});
    const arrayBuffer=await blob.arrayBuffer();
    const ctx=new AudioContext();
    const decoded=await ctx.decodeAudioData(arrayBuffer);
    const mono=new Float32Array(decoded.length);
    for(let c=0;c<decoded.numberOfChannels;c++){
      const data=decoded.getChannelData(c);
      for(let i=0;i<data.length;i++) mono[i]+=data[i]/decoded.numberOfChannels;
    }
    // Whisper expects 16 kHz audio. Offline resampling using OfflineAudioContext.
    let audio=mono;
    if(decoded.sampleRate!==16000){
      const targetLength=Math.ceil(decoded.duration*16000);
      const off=new OfflineAudioContext(1,targetLength,16000);
      const src=off.createBufferSource();
      const buf=off.createBuffer(1,mono.length,decoded.sampleRate);
      buf.copyToChannel(mono,0);
      src.buffer=buf; src.connect(off.destination); src.start();
      const rendered=await off.startRendering();
      audio=rendered.getChannelData(0);
    }
    await ctx.close();
    const result=await transcriber(audio,{chunk_length_s:30,stride_length_s:5,return_timestamps:false});
    const text=(result?.text || "").trim();
    output.value += (output.value && text ? "\n\n" : "") + text;
    copyBtn.disabled=!output.value.trim(); downloadBtn.disabled=!output.value.trim();
    updateSummarizeAvailability();
    state.textContent="Ready";

    // Save this recording (audio + transcript) to local history so it can
    // be revisited and summarized later, even after the page is closed.
    try {
      const entry = {
        id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        createdAt: Date.now(),
        durationMs: Date.now() - startedAt,
        audioBlob: blob,
        model: modelSelect.value,
        transcript: text,
        summaryMarkdown: null
      };
      await dbPut(entry);
      historyList.prepend(createHistoryItemEl(entry));
      updateHistoryEmptyState();
      updateStorageInfo();
    } catch (histErr) {
      console.error("Could not save recording to history", histErr);
    }
  }catch(e){
    console.error(e);
    showError("Transcription failed. Try a shorter recording or the Tiny model if your phone is low on memory.");
    state.textContent="Ready to try again";
  }
}

recordBtn.addEventListener("click",()=> recorder?.state==="recording" ? stopRecording() : startRecording());
loadBtn.addEventListener("click",loadModel);
copyBtn.addEventListener("click",async()=>{await navigator.clipboard.writeText(output.value); copyBtn.textContent="Copied ✓"; setTimeout(()=>copyBtn.textContent="Copy",1200)});
downloadBtn.addEventListener("click",()=>{
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([output.value],{type:"text/plain"})); a.download=`transcript-${new Date().toISOString().slice(0,10)}.txt`; a.click(); URL.revokeObjectURL(a.href);
});
clearBtn.addEventListener("click",()=>{output.value="";copyBtn.disabled=true;downloadBtn.disabled=true;updateSummarizeAvailability()});

summarizeBtn.addEventListener("click", summarize);
copySumBtn.addEventListener("click",async()=>{await navigator.clipboard.writeText(summaryOutput.value); copySumBtn.textContent="Copied ✓"; setTimeout(()=>copySumBtn.textContent="Copy",1200)});
downloadSumBtn.addEventListener("click",()=>{
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([summaryOutput.value],{type:"text/markdown"})); a.download=`notes-${new Date().toISOString().slice(0,10)}.md`; a.click(); URL.revokeObjectURL(a.href);
});
clearSumBtn.addEventListener("click",()=>{summaryOutput.value="";copySumBtn.disabled=true;downloadSumBtn.disabled=true;renderSummaryPreview()});
summaryOutput.addEventListener("input", ()=>{ renderSummaryPreview(); copySumBtn.disabled=!summaryOutput.value.trim(); downloadSumBtn.disabled=!summaryOutput.value.trim(); });
toggleSumViewBtn.addEventListener("click", ()=>{
  const showingMarkdown = !summaryOutput.classList.contains("hidden");
  if (showingMarkdown) {
    summaryOutput.classList.add("hidden");
    summaryPreview.classList.remove("hidden");
    toggleSumViewBtn.textContent = "View markdown";
  } else {
    summaryOutput.classList.remove("hidden");
    summaryPreview.classList.add("hidden");
    toggleSumViewBtn.textContent = "View notes";
  }
});
output.addEventListener("input", updateSummarizeAvailability);

// Kick off the summary model download in the background as soon as the app
// opens, without blocking the UI or requiring the user to press anything.
if ("requestIdleCallback" in window) {
  requestIdleCallback(() => loadSummarizerInBackground(), { timeout: 4000 });
} else {
  setTimeout(loadSummarizerInBackground, 800);
}

// Load any previously saved recordings from this device's local storage.
loadHistoryFromDB();
