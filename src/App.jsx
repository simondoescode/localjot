import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { ArrowLeft, Download, Settings, Square } from "lucide-react";
import { AppBar, Box, Button, CssBaseline, Drawer, IconButton, LinearProgress, ThemeProvider, Toolbar, Typography, Chip, CircularProgress, Paper, Stack } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import Sidebar from "./components/Sidebar.jsx";
import ModelSettings from "./components/ModelSettings.jsx";
import SetupWizard from "./components/SetupWizard.jsx";
import NewNoteView from "./components/NewNoteView.jsx";
import RecordView from "./components/RecordView.jsx";
import EditorView from "./components/EditorView.jsx";
import { useNotes } from "./hooks/useNotes.js";
import { useModels } from "./hooks/useModels.js";
import { useRecorder } from "./hooks/useRecorder.js";
import { useStorageInfo } from "./hooks/useStorageInfo.js";
import { chunkAudio, convertAudioToWav, decodeAudio } from "./lib/audio.js";
import { summarizeTranscript } from "./lib/summarize.js";

marked.setOptions({ breaks: true });

const theme = createTheme({
  palette: { mode: "light", primary: { main: "#33205f" }, secondary: { main: "#7655d6", light: "#eee8ff", dark: "#5633ad" }, background: { default: "#f8f6ff", paper: "#ffffff" }, divider: "#e4dff2" },
  typography: { fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', button: { textTransform: "none", fontWeight: 650 }, h3: { fontWeight: 800 } },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiIconButton: { styleOverrides: { root: { "&:focus-visible": { outline: "3px solid #8b5cf6", outlineOffset: 2 } } } },
    MuiCard: { styleOverrides: { root: { boxShadow: "none", borderColor: "#e7e5e4" } } },
    MuiPaper: { styleOverrides: { outlined: { borderColor: "#e7e5e4" } } },
  },
});

function safeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function firstLine(text = "") {
  return text.trim().split(/(?<=[.!?])\s|\n/)[0]?.slice(0, 70) || "";
}

function titleFromSummary(text = "") {
  const candidate = text
    .replace(/^#+\s*/gm, "")
    .replace(/\*+/g, "")
    .split(/\n|[.!?]\s/)
    .map((line) => line.trim())
    .find(Boolean) || "";
  return candidate.replace(/[:;,\-]+$/, "").slice(0, 70) || "Untitled note";
}

function mergeTranscript(previous, next) {
  const left = previous.trim();
  const right = next.trim();
  if (!left) return right;
  if (!right) return left;

  const leftWords = left.split(/\s+/);
  const rightWords = right.split(/\s+/);
  const maxOverlap = Math.min(12, leftWords.length, rightWords.length);
  for (let size = maxOverlap; size > 0; size -= 1) {
    const leftTail = leftWords.slice(-size).join(" ").toLowerCase().replace(/[.,!?]+$/g, "");
    const rightHead = rightWords.slice(0, size).join(" ").toLowerCase().replace(/[.,!?]+$/g, "");
    if (leftTail === rightHead) return `${left} ${rightWords.slice(size).join(" ")}`.trim();
  }
  return `${left} ${right}`.trim();
}

function readRoute() {
  const value = window.location.hash.replace(/^#\/?/, "");
  const [page = "notes", id] = value.split("/");
  return { page, id };
}

export default function App() {
  const { notes, saveNote, deleteNote } = useNotes();
  const storage = useStorageInfo();
  const [modelId, setModelId] = useState("Xenova/whisper-tiny.en");
  const [summarizerModelId, setSummarizerModelId] = useState("Xenova/distilbart-cnn-6-6");
  const [speakerLabels, setSpeakerLabels] = useState(() => localStorage.getItem("localjot-speaker-labels") === "true");
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false);
  const models = useModels(modelId, summarizerModelId);

  const [view, setView] = useState("new"); // new | record | editor
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [route, setRoute] = useState(() => readRoute());
  const [selectedNote, setSelectedNote] = useState(null);
  const [title, setTitle] = useState("");
  const [recordingPreset, setRecordingPreset] = useState(() => localStorage.getItem("localjot-recording-preset") || "voice-memo");
  const [transcript, setTranscript] = useState("");
  const [summaryMarkdown, setSummaryMarkdown] = useState("");
  const [tags, setTags] = useState([]);
  const [noteSearch, setNoteSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [showSummaryPreview, setShowSummaryPreview] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingPreview, setRecordingPreview] = useState(null);
  const [recordError, setRecordError] = useState("");
  const [processingLabel, setProcessingLabel] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState(null);
  const [setupOpen, setSetupOpen] = useState(() => localStorage.getItem("localjot-setup-complete") !== "true");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const saveTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentAudioUrlRef = useRef(null);
  const selectedNoteRef = useRef(null);
  const processingCancelledRef = useRef(false);
  selectedNoteRef.current = selectedNote;

  const navigate = useCallback((page, id = "") => {
    const nextHash = `#/${page}${id ? `/${id}` : ""}`;
    if (window.location.hash !== nextHash) window.history.pushState({}, "", nextHash);
    setRoute({ page, id });
  }, []);

  useEffect(() => {
    const handleRouteChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", handleRouteChange);
    window.addEventListener("popstate", handleRouteChange);
    return () => {
      window.removeEventListener("hashchange", handleRouteChange);
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    setIsInstalled(standalone);
    const handlePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }, [installPrompt]);

  const summaryHtml = useMemo(() => (summaryMarkdown.trim() ? marked.parse(summaryMarkdown) : ""), [summaryMarkdown]);

  const persistCurrent = useCallback(async () => {
    const current = selectedNoteRef.current;
    if (!current) return;
    const updated = {
      ...current,
      title: title.trim() || "Untitled note",
      transcript,
      summaryMarkdown: summaryMarkdown || null,
      tags,
      updatedAt: Date.now(),
    };
    setSelectedNote(updated);
    await saveNote(updated);
  }, [title, transcript, summaryMarkdown, tags, saveNote]);

  const queueSave = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(persistCurrent, 450);
  }, [persistCurrent]);

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  const openNote = useCallback(
    async (note) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        await persistCurrent();
      }
      setSelectedNote(note);
      setTitle(note.title || firstLine(note.transcript) || "Untitled note");
      setRecordingPreset(note.preset || "voice-memo");
      setTranscript(note.transcript || "");
      setSummaryMarkdown(note.summaryMarkdown || "");
      setTags(Array.isArray(note.tags) ? note.tags : []);
      setShowSummaryPreview(true);
      setView("editor");
      navigate("note", note.id);
      setDrawerOpen(false);
      if (currentAudioUrlRef.current) URL.revokeObjectURL(currentAudioUrlRef.current);
      if (note.audioBlob) {
        const url = URL.createObjectURL(note.audioBlob);
        currentAudioUrlRef.current = url;
        setAudioUrl(url);
      } else {
        currentAudioUrlRef.current = null;
        setAudioUrl(null);
      }
      storage.refresh();
    },
    [navigate, persistCurrent, storage]
  );

  useEffect(() => {
    if (route.page === "note" && route.id && notes.length && selectedNoteRef.current?.id !== route.id) {
      const note = notes.find((item) => item.id === route.id);
      if (note) openNote(note);
    }
  }, [notes, openNote, route]);

  const createNoteFromAudio = useCallback(
    async (blob, recordedDurationMs = 0, suppliedTitle = "") => {
      processingCancelledRef.current = false;
      setView("record");
      setProcessingLabel("Transcribing locally");
      setRecordError("");
      if (!(await models.ensureTranscriber())) {
        setProcessingLabel("");
        setView("record");
        setRecordError("Speech model could not be loaded. Check your connection and try again.");
        return;
      }
      if (processingCancelledRef.current) return;
      try {
        const { audio, durationMs } = await decodeAudio(blob);
        const audioChunks = chunkAudio(audio);
        let text = "";
        for (let index = 0; index < audioChunks.length; index += 1) {
          if (processingCancelledRef.current) return;
          setProcessingLabel(`Transcribing part ${index + 1} of ${audioChunks.length}`);
          const result = await models.transcriberRef.current(audioChunks[index], {
            return_timestamps: false,
          });
          text = mergeTranscript(text, result?.text || "");
        }
        if (processingCancelledRef.current) return;
        const note = {
          id: safeId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          durationMs: recordedDurationMs || durationMs,
          audioBlob: blob,
          model: modelId,
          transcript: text,
          title: suppliedTitle || firstLine(text) || "Untitled note",
          summaryMarkdown: null,
          tags: [],
          preset: recordingPreset,
        };
        await saveNote(note);
        await openNote(note);
      } catch (err) {
        if (processingCancelledRef.current) return;
        console.error(err);
        const detail = err instanceof Error && err.message ? ` (${err.message.slice(0, 140)})` : "";
        setRecordError(`Transcription failed${detail}`);
        setView("record");
      } finally {
        setProcessingLabel("");
      }
    },
    [models, modelId, recordingPreset, saveNote, openNote]
  );

  const redoTranscript = useCallback(async (enabled = speakerLabels) => {
    const note = selectedNoteRef.current;
    processingCancelledRef.current = false;
    if (!note?.audioBlob || !(await models.ensureTranscriber())) return;
    setRecordError("");
    setProcessingLabel("Redoing transcript locally");
    try {
      const { audio } = await decodeAudio(note.audioBlob);
      let text = "";
      for (const chunk of chunkAudio(audio)) {
        if (processingCancelledRef.current) return;
        const result = await models.transcriberRef.current(chunk, { return_timestamps: false });
        text = mergeTranscript(text, result?.text || "");
      }
      if (processingCancelledRef.current) return;
      const updated = { ...note, transcript: text, updatedAt: Date.now(), speakerLabels: enabled };
      setTranscript(text);
      setSelectedNote(updated);
      await saveNote(updated);
    } catch (err) {
      if (processingCancelledRef.current) return;
      console.error(err);
      setRecordError("Could not redo the transcript. Try again.");
    } finally {
      setProcessingLabel("");
    }
  }, [models, saveNote, speakerLabels]);

  const cancelProcessing = useCallback(() => {
    processingCancelledRef.current = true;
    setProcessingLabel("");
    setRecordError("Processing stopped.");
  }, []);

  const handleRecorderStop = useCallback(
    (result, error) => {
      if (error) {
        setRecordError(error);
        return;
      }
      if (recordingPreview) URL.revokeObjectURL(recordingPreview.url);
      const url = URL.createObjectURL(result.blob);
      setRecordingPreview({
        url,
        size: result.blob.size,
        type: result.blob.type,
        durationMs: result.durationMs,
        peak: result.peak,
        rms: result.rms,
      });
      createNoteFromAudio(result.blob, result.durationMs);
    },
    [createNoteFromAudio, recordingPreview]
  );

  const recorder = useRecorder({ onStop: handleRecorderStop });

  const completeSetup = useCallback(() => {
    localStorage.setItem("localjot-setup-complete", "true");
    setSetupOpen(false);
    recorder.closeMic();
  }, [recorder]);

  useEffect(
    () => () => {
      if (recordingPreview) URL.revokeObjectURL(recordingPreview.url);
    },
    [recordingPreview]
  );

  const newNote = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      await persistCurrent();
    }
    if (recorder.micState === "recording" || recorder.micState === "paused") await recorder.stopRecording();
    setSelectedNote(null);
    setSelectedFile(null);
    setView("new");
    navigate("new");
    setDrawerOpen(false);
  }, [navigate, persistCurrent, recorder]);

  const openRecorder = useCallback(async () => {
    setRecordError("");
    setView("record");
    navigate("record");
    setDrawerOpen(false);
    if (!(await models.ensureTranscriber())) {
      setView("new");
      return;
    }
    if (!(await recorder.openMic())) {
      setRecordError("Microphone access was unavailable. Allow microphone access and try again.");
    }
  }, [models, navigate, recorder]);

  const handleToggleRecord = useCallback(async () => {
    try {
      if (recorder.micState === "recording") await recorder.stopRecording();
      else if (recorder.micState === "ready") await recorder.startRecording();
      else if (recorder.micState === "idle") {
        if (await recorder.openMic()) await recorder.startRecording();
      }
    } catch (err) {
      console.error(err);
      setRecordError("Could not start recording. Check that your microphone is available and try again.");
    }
  }, [recorder]);

  const handleDeviceChange = useCallback(async (deviceId) => {
    if (recorder.micState === "recording" || recorder.micState === "paused") return;
    recorder.closeMic();
    await recorder.openMic(deviceId);
  }, [recorder]);

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.currentTarget.files?.[0];
      e.target.value = "";
      if (!file) return;
      setSelectedFile({ name: file.name, size: file.size, type: file.type || "audio" });
      const isMp3 = file.type === "audio/mpeg" || /\.mp3$/i.test(file.name);
      if (!isMp3) {
        await createNoteFromAudio(file, 0, file.name.replace(/\.[^/.]+$/, ""));
        return;
      }
      setRecordError("");
      setProcessingLabel("Converting MP3 to WAV");
      try {
        const converted = await convertAudioToWav(file);
        if (processingCancelledRef.current) {
          setProcessingLabel("");
          return;
        }
        await createNoteFromAudio(converted.blob, converted.durationMs, file.name.replace(/\.[^/.]+$/, ""));
      } catch (err) {
        if (processingCancelledRef.current) return;
        console.error(err);
        setRecordError("Could not convert this MP3 file to WAV. Try another audio file.");
        setProcessingLabel("");
      }
    },
    [createNoteFromAudio]
  );

  const handleSummarize = useCallback(async () => {
    if (!transcript.trim() || !selectedNoteRef.current) return;
    if (!(await models.ensureSummarizer())) return;
    setIsSummarizing(true);
    setSummaryProgress({ label: "Summarizing…", percent: 2 });
    try {
      const { text, truncated } = await summarizeTranscript(models.summarizerRef.current, transcript, (p) =>
        setSummaryProgress(p)
      );
      const nextSummary = `## Key points\n\n${text}${
        truncated ? "\n\n*(Summary covers the first part of a very long transcript.)*" : ""
      }`;
      const currentNote = selectedNoteRef.current;
      const defaultTitle = firstLine(transcript) || "Untitled note";
      const shouldImproveTitle = !title.trim() || title.trim() === defaultTitle || title.trim() === "Untitled note";
      const nextTitle = shouldImproveTitle ? titleFromSummary(text) : title.trim();
      setSummaryMarkdown(nextSummary);
      setShowSummaryPreview(true);
      const updated = {
        ...currentNote,
        transcript,
        summaryMarkdown: nextSummary,
        title: nextTitle,
        updatedAt: Date.now(),
      };
      setTitle(nextTitle);
      setSelectedNote(updated);
      await saveNote(updated);
    } catch (err) {
      console.error(err);
      setRecordError("Summarization failed. Try a shorter transcript.");
    } finally {
      setIsSummarizing(false);
      setSummaryProgress(null);
    }
  }, [transcript, models, title, saveNote]);

  const download = (content, name, type) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteNote = useCallback(async () => {
    if (!selectedNoteRef.current) return;
    if (!confirm("Delete this note?")) return;
    await deleteNote(selectedNoteRef.current.id);
    setSelectedNote(null);
    setView("new");
    navigate("notes");
  }, [deleteNote, navigate]);

  const handleSidebarRename = useCallback(async (note, nextTitle) => {
    const updated = { ...note, title: nextTitle, updatedAt: Date.now() };
    await saveNote(updated);
    if (selectedNoteRef.current?.id === note.id) {
      setSelectedNote(updated);
      setTitle(nextTitle);
    }
  }, [saveNote]);

  const handleTagsChange = useCallback((nextTags) => {
    setTags(nextTags);
    queueSave();
  }, [queueSave]);

  const allTags = useMemo(
    () => [...new Set(notes.flatMap((note) => (Array.isArray(note.tags) ? note.tags : [])))].sort(),
    [notes]
  );
  const visibleNotes = useMemo(() => {
    const query = noteSearch.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesQuery = !query || `${note.title || ""} ${note.transcript || ""}`.toLowerCase().includes(query);
      const noteTags = Array.isArray(note.tags) ? note.tags : [];
      return matchesQuery && (!activeTag || noteTags.includes(activeTag));
    });
  }, [notes, noteSearch, activeTag]);

  const handleSidebarDelete = useCallback(async (note) => {
    await deleteNote(note.id);
    if (selectedNoteRef.current?.id === note.id) {
      setSelectedNote(null);
      setView("new");
      navigate("notes");
    }
  }, [deleteNote, navigate]);

  return (
    <ThemeProvider theme={theme}><CssBaseline /><SetupWizard open={setupOpen} onComplete={completeSetup} onRequestMic={recorder.openMic} onLoadModels={(speechId, summaryId) => models.ensureTranscriber(speechId).then((loaded) => loaded && models.ensureSummarizer(summaryId))} onModelChange={setModelId} speechModelId={modelId} summaryModelId={summarizerModelId} onSummaryModelChange={setSummarizerModelId} micReady={recorder.micState === "ready"} modelStatus={models.transcriberStatus} summaryStatus={models.summarizerStatus} />        <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", color: "text.primary", backgroundImage: "radial-gradient(circle at 88% 0%, rgba(167,139,250,.28), transparent 28rem), linear-gradient(145deg, #f8f6ff 0%, #fcfbff 52%, #f1edff 100%)" }}>
      {/* Mobile top bar */}
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ display: route.page === "notes" ? "none" : "block", borderBottom: 1, borderColor: "rgba(232,231,239,.9)", bgcolor: "rgba(250,250,252,.82)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}>
        <Toolbar sx={{ justifyContent: "space-between", minHeight: 60, px: 1.25, paddingTop: "env(safe-area-inset-top)" }}>
        <IconButton onClick={() => navigate("notes")} aria-label="Back to notes" size="large">
          <ArrowLeft size={20} />
        </IconButton>
        <Typography fontWeight={800} noWrap sx={{ maxWidth: "70%", letterSpacing: "-.04em", fontSize: "1.05rem" }}>
          {route.page === "note" ? (selectedNote?.title || "Note") : route.page === "new" ? "New note" : route.page === "record" ? "Record" : "Settings"}
        </Typography>
        <IconButton
          onClick={() => navigate("settings")}
          aria-label="Model settings"
          size="large">
          <Settings size={18} />
        </IconButton>
        </Toolbar></AppBar>

      <Box sx={{ display: { md: "grid" }, minHeight: { md: "calc(100dvh - 1px)" }, gridTemplateColumns: route.page === "notes" ? "minmax(0,1fr)" : "minmax(0,1fr)" }}>
        <Box component="main" sx={{ width: "100%", minWidth: 0, px: { xs: 1.25, sm: 3, md: "4vw" }, py: { xs: 1.25, md: 4 }, pb: { xs: "calc(80px + env(safe-area-inset-bottom))", md: 4 }, background: "linear-gradient(145deg, rgba(248,246,255,.96) 0%, rgba(252,251,255,.98) 52%, rgba(241,237,255,.96) 100%)" }}>
          {route.page === "notes" ? (
            <Sidebar notes={visibleNotes} totalNotes={notes.length} selectedId={selectedNote?.id} onSelect={openNote} onNewNote={newNote} onRename={handleSidebarRename} onDelete={handleSidebarDelete} storage={storage} search={noteSearch} onSearchChange={setNoteSearch} activeTag={activeTag} onTagChange={setActiveTag} tags={allTags} />
          ) : (
          <>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Button onClick={() => navigate("notes")} size="small" startIcon={<ArrowLeft size={16} />}>Notes</Button>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
              {route.page === "note" ? "Note" : route.page === "new" ? "New note" : route.page}
            </Typography>
          </Stack>
          {installPrompt && !isInstalled && (
            <Paper
              variant="outlined"
              role="status"
              sx={{ mb: 2, p: 1.25, maxWidth: 720, borderRadius: 3, bgcolor: "rgba(255,255,255,.8)", borderColor: "rgba(109,91,208,.24)" }}
            >
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Download size={19} color="#6d5bd0" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={750}>Install LocalJot</Typography>
                  <Typography variant="caption" color="text.secondary">Open your private notes faster, even offline.</Typography>
                </Box>
                <Button onClick={handleInstall} variant="contained" color="secondary" size="small">Install</Button>
              </Stack>
            </Paper>
          )}
          {processingLabel && (
            <Paper variant="outlined" role="status" aria-live="polite" sx={{ mb: 2, px: 1.5, py: 1, maxWidth: 560 }}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <CircularProgress size={17} color="secondary" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700}>{processingLabel}</Typography>
                  {selectedFile && (
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {selectedFile.name}
                    </Typography>
                  )}
                </Box>
                <Button
                  onClick={cancelProcessing}
                  size="small"
                  color="inherit"
                  startIcon={<Square size={13} />}
                  sx={{ ml: "auto", flexShrink: 0 }}>
                  Stop
                </Button>
              </Stack>
              {processingLabel === "Converting MP3 to WAV" && (
                <LinearProgress color="secondary" sx={{ mt: 1.25, borderRadius: 1 }} />
              )}
            </Paper>
          )}
          {selectedFile && !processingLabel && (
            <Chip
              size="small"
              color="secondary"
              variant="outlined"
              label={`Selected: ${selectedFile.name}`}
              sx={{ mb: 2, maxWidth: "100%" }}
            />
          )}
          <Box sx={{ mb: { md: 8 }, display: { xs: "none", md: "block" } }}>
            <Typography variant="body2" color="text.secondary">Private · on-device transcription</Typography>
          </Box>

          <ModelSettings
            open={modelSettingsOpen || route.page === "settings"}
            onToggle={setModelSettingsOpen}
            modelId={modelId}
            onModelChange={setModelId}
            onLoadModel={models.loadModel}
            transcriberStatus={models.transcriberStatus}
            summarizerStatus={models.summarizerStatus}
            speakerLabels={speakerLabels}
            onSpeakerLabelsChange={(enabled) => {
              setSpeakerLabels(enabled);
              localStorage.setItem("localjot-speaker-labels", String(enabled));
            }}
          />

          {route.page === "new" && (
            <NewNoteView onRecord={openRecorder} onUploadClick={() => fileInputRef.current?.click()} error={recordError} />
          )}

          {route.page === "record" && (
            <RecordView
              micState={recorder.micState}
              elapsedMs={recorder.elapsedMs}
              waveHeights={recorder.waveHeights}
              onToggleRecord={handleToggleRecord}
              onPause={recorder.pauseRecording}
              onResume={recorder.resumeRecording}
              inputDevices={recorder.inputDevices}
              onDeviceChange={handleDeviceChange}
              isPaused={recorder.isPaused}
              error={recordError}
              recordingPreview={recordingPreview}
              preset={recordingPreset}
              onPresetChange={(preset) => {
                setRecordingPreset(preset);
                localStorage.setItem("localjot-recording-preset", preset);
              }}
            />
          )}

          {route.page === "note" && selectedNote && (
            <EditorView
              note={selectedNote}
              title={title}
              transcript={transcript}
              summaryMarkdown={summaryMarkdown}
              summaryHtml={summaryHtml}
              showSummaryPreview={showSummaryPreview}
              onTitleChange={(v) => {
                setTitle(v);
                queueSave();
              }}
              onTranscriptChange={(v) => {
                setTranscript(v);
                queueSave();
              }}
              onSummaryChange={(v) => {
                setSummaryMarkdown(v);
                queueSave();
              }}
              tags={tags}
              onTagsChange={handleTagsChange}
              availableTags={allTags}
              preset={recordingPreset}
              onToggleSummaryView={() => setShowSummaryPreview((s) => !s)}
              transcriptOpen={transcriptOpen}
              onTranscriptToggle={() => setTranscriptOpen((open) => !open)}
              summaryOpen={summaryOpen}
              onSummaryToggle={() => setSummaryOpen((open) => !open)}
              audioUrl={audioUrl}
              onSummarize={handleSummarize}
              isSummarizing={isSummarizing}
              summaryProgress={summaryProgress}
              onCopyTranscript={() => navigator.clipboard.writeText(transcript)}
              onCopySummary={() => navigator.clipboard.writeText(summaryMarkdown)}
              onExportTranscript={() => download(transcript, `${title || "note"}.txt`, "text/plain")}
              onExportSummary={() => download(summaryMarkdown, `${title || "note"}.md`, "text/markdown")}
              onDelete={handleDeleteNote}
              speakerLabels={speakerLabels}
              onSpeakerLabelsChange={(enabled) => {
                setSpeakerLabels(enabled);
                localStorage.setItem("localjot-speaker-labels", String(enabled));
                redoTranscript(enabled);
              }}
              onRedoTranscript={() => redoTranscript()}
              transcriptError={recordError}
            />
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            aria-label="Choose an audio file"
            style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}
            onChange={handleFileChange}
          />
          </>
          )}
        </Box>
      </Box>
    </Box></ThemeProvider>
  );
}
