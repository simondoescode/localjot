import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { Menu, X, Settings } from "lucide-react";
import { AppBar, Box, CssBaseline, Drawer, IconButton, ThemeProvider, Toolbar, Typography, Chip } from "@mui/material";
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
import { chunkAudio, decodeAudio } from "./lib/audio.js";
import { summarizeTranscript } from "./lib/summarize.js";

marked.setOptions({ breaks: true });

const theme = createTheme({
  palette: { mode: "light", primary: { main: "#292524" }, secondary: { main: "#7c3aed", light: "#ede9fe" }, background: { default: "#fafaf9", paper: "#ffffff" } },
  typography: { fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', button: { textTransform: "none" } },
  shape: { borderRadius: 12 },
  components: { MuiButton: { defaultProps: { disableElevation: true } }, MuiCard: { styleOverrides: { root: { boxShadow: "0 8px 30px rgba(28,25,23,.04)" } } } },
});

function safeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function firstLine(text = "") {
  return text.trim().split(/(?<=[.!?])\s|\n/)[0]?.slice(0, 70) || "";
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

export default function App() {
  const { notes, saveNote, deleteNote } = useNotes();
  const storage = useStorageInfo();
  const [modelId, setModelId] = useState("Xenova/whisper-tiny.en");
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false);
  const models = useModels(modelId);

  const [view, setView] = useState("new"); // new | record | editor
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [summaryMarkdown, setSummaryMarkdown] = useState("");
  const [showSummaryPreview, setShowSummaryPreview] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingPreview, setRecordingPreview] = useState(null);
  const [recordError, setRecordError] = useState("");
  const [processingLabel, setProcessingLabel] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState(null);
  const [setupOpen, setSetupOpen] = useState(() => localStorage.getItem("localjot-setup-complete") !== "true");

  const saveTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentAudioUrlRef = useRef(null);
  const selectedNoteRef = useRef(null);
  selectedNoteRef.current = selectedNote;

  const summaryHtml = useMemo(() => (summaryMarkdown.trim() ? marked.parse(summaryMarkdown) : ""), [summaryMarkdown]);

  const persistCurrent = useCallback(async () => {
    const current = selectedNoteRef.current;
    if (!current) return;
    const updated = {
      ...current,
      title: title.trim() || "Untitled note",
      transcript,
      summaryMarkdown: summaryMarkdown || null,
      updatedAt: Date.now(),
    };
    setSelectedNote(updated);
    await saveNote(updated);
  }, [title, transcript, summaryMarkdown, saveNote]);

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
      setTranscript(note.transcript || "");
      setSummaryMarkdown(note.summaryMarkdown || "");
      setShowSummaryPreview(true);
      setView("editor");
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
    [persistCurrent, storage]
  );

  const createNoteFromAudio = useCallback(
    async (blob, recordedDurationMs = 0, suppliedTitle = "") => {
      setView("record");
      setProcessingLabel("Transcribing locally");
      setRecordError("");
      if (!(await models.ensureTranscriber())) {
        setProcessingLabel("");
        setView("record");
        setRecordError("Speech model could not be loaded. Check your connection and try again.");
        return;
      }
      try {
        const { audio, durationMs } = await decodeAudio(blob);
        const audioChunks = chunkAudio(audio);
        let text = "";
        for (let index = 0; index < audioChunks.length; index += 1) {
          setProcessingLabel(`Transcribing part ${index + 1} of ${audioChunks.length}`);
          const result = await models.transcriberRef.current(audioChunks[index], {
            return_timestamps: false,
          });
          text = mergeTranscript(text, result?.text || "");
        }
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
        };
        await saveNote(note);
        await openNote(note);
      } catch (err) {
        console.error(err);
        const detail = err instanceof Error && err.message ? ` (${err.message.slice(0, 140)})` : "";
        setRecordError(`Transcription failed${detail}`);
        setView("record");
      } finally {
        setProcessingLabel("");
      }
    },
    [models, modelId, saveNote, openNote]
  );

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
    if (recorder.micState === "recording") await recorder.stopRecording();
    setSelectedNote(null);
    setView("new");
    setDrawerOpen(false);
  }, [persistCurrent, recorder]);

  const openRecorder = useCallback(async () => {
    setRecordError("");
    setView("record");
    setDrawerOpen(false);
    if (!(await models.ensureTranscriber())) {
      setView("new");
      return;
    }
    if (!(await recorder.openMic())) {
      setRecordError("Microphone access was unavailable. Allow microphone access and try again.");
    }
  }, [models, recorder]);

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

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.currentTarget.files?.[0];
      e.target.value = "";
      if (file) await createNoteFromAudio(file, 0, file.name.replace(/\.[^/.]+$/, ""));
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
      setSummaryMarkdown(nextSummary);
      setShowSummaryPreview(true);
      const updated = {
        ...selectedNoteRef.current,
        transcript,
        summaryMarkdown: nextSummary,
        title: title.trim() || "Untitled note",
        updatedAt: Date.now(),
      };
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
  }, [deleteNote]);

  const handleSidebarRename = useCallback(async (note, nextTitle) => {
    const updated = { ...note, title: nextTitle, updatedAt: Date.now() };
    await saveNote(updated);
    if (selectedNoteRef.current?.id === note.id) {
      setSelectedNote(updated);
      setTitle(nextTitle);
    }
  }, [saveNote]);

  const handleSidebarDelete = useCallback(async (note) => {
    await deleteNote(note.id);
    if (selectedNoteRef.current?.id === note.id) {
      setSelectedNote(null);
      setView("new");
    }
  }, [deleteNote]);

  return (
    <ThemeProvider theme={theme}><CssBaseline /><SetupWizard open={setupOpen} onComplete={completeSetup} onRequestMic={recorder.openMic} onLoadModel={models.ensureTranscriber} micReady={recorder.micState === "ready"} modelStatus={models.transcriberStatus} /><Box sx={{ minHeight: "100dvh", bgcolor: "background.default", color: "text.primary" }}>
      {/* Mobile top bar */}
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ display: { xs: "block", md: "none" }, borderBottom: 1, borderColor: "divider", bgcolor: "rgba(250,250,249,.9)", backdropFilter: "blur(16px)" }}>
        <Toolbar sx={{ justifyContent: "space-between", minHeight: 56 }}>
        <IconButton
          onClick={() => setDrawerOpen(true)}
          aria-label="Open notes"
          size="large">
          <Menu size={20} />
        </IconButton>
        <Typography fontWeight={800}>Jot</Typography>
        <IconButton
          onClick={() => setModelSettingsOpen((o) => !o)}
          aria-label="Model settings"
          size="large">
          <Settings size={18} />
        </IconButton>
        </Toolbar></AppBar>

      <Box sx={{ display: { md: "grid" }, minHeight: { md: "calc(100dvh - 1px)" }, gridTemplateColumns: "292px minmax(0,1fr)" }}>
        {/* Desktop sidebar */}
        <Box component="aside" sx={{ display: { xs: "none", md: "flex" }, borderRight: 1, borderColor: "divider", bgcolor: "rgba(245,245,244,.6)", minHeight: "100%" }}>
          <Sidebar notes={notes} selectedId={selectedNote?.id} onSelect={openNote} onNewNote={newNote} onRename={handleSidebarRename} onDelete={handleSidebarDelete} storage={storage} />
        </Box>

        {/* Mobile drawer */}
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} sx={{ display: { md: "none" } }}>
          <Box sx={{ width: "min(85vw, 320px)", height: "100%", bgcolor: "background.paper" }}>
              <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
                <IconButton
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close notes"
                  size="large">
                  <X size={20} />
                </IconButton>
              </Box>
              <Box sx={{ height: "calc(100% - 64px)", overflow: "hidden" }}>
                <Sidebar notes={notes} selectedId={selectedNote?.id} onSelect={openNote} onNewNote={newNote} onRename={handleSidebarRename} onDelete={handleSidebarDelete} storage={storage} />
              </Box>
          </Box>
        </Drawer>

        <Box component="main" sx={{ width: "100%", maxWidth: 1100, px: { xs: 2, md: "7vw" }, py: { xs: 2, md: 4 } }}>
          {processingLabel && (
            <Chip size="small" color="secondary" variant="outlined" label={processingLabel} sx={{ mb: 2 }} />
          )}
          <Box sx={{ mb: { md: 8 }, display: { xs: "none", md: "block" } }}>
            <Typography variant="body2" color="text.secondary">Private · on-device transcription</Typography>
          </Box>

          <ModelSettings
            open={modelSettingsOpen}
            onToggle={setModelSettingsOpen}
            modelId={modelId}
            onModelChange={setModelId}
            onLoadModel={models.loadModel}
            transcriberStatus={models.transcriberStatus}
            summarizerStatus={models.summarizerStatus}
          />

          {view === "new" && (
            <NewNoteView onRecord={openRecorder} onUploadClick={() => fileInputRef.current?.click()} error={recordError} />
          )}

          {view === "record" && (
            <RecordView
              micState={recorder.micState}
              elapsedMs={recorder.elapsedMs}
              waveHeights={recorder.waveHeights}
              onToggleRecord={handleToggleRecord}
              error={recordError}
              recordingPreview={recordingPreview}
            />
          )}

          {view === "editor" && selectedNote && (
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
              onToggleSummaryView={() => setShowSummaryPreview((s) => !s)}
              audioUrl={audioUrl}
              onSummarize={handleSummarize}
              isSummarizing={isSummarizing}
              summaryProgress={summaryProgress}
              onCopyTranscript={() => navigator.clipboard.writeText(transcript)}
              onCopySummary={() => navigator.clipboard.writeText(summaryMarkdown)}
              onExportTranscript={() => download(transcript, `${title || "note"}.txt`, "text/plain")}
              onExportSummary={() => download(summaryMarkdown, `${title || "note"}.md`, "text/markdown")}
              onDelete={handleDeleteNote}
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
        </Box>
      </Box>
    </Box></ThemeProvider>
  );
}
