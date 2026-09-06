import { useCallback, useRef, useState } from "react";
import { loadTranscriber, loadSummarizer, releaseModel, isMobileDevice } from "../lib/models.js";

const IDLE = { state: "idle", progress: 0, label: "" };

export function useModels(modelId) {
  const transcriberRef = useRef(null);
  const summarizerRef = useRef(null);
  const transcriberLoadRef = useRef(null);
  const [transcriberStatus, setTranscriberStatus] = useState(IDLE);
  const [summarizerStatus, setSummarizerStatus] = useState(IDLE);

  const loadModel = useCallback(async () => {
    setTranscriberStatus({ state: "loading", progress: 2, label: "Preparing speech model…" });
    try {
      transcriberRef.current = await loadTranscriber(modelId, (p) => {
        if (typeof p?.progress === "number") {
          setTranscriberStatus({
            state: "loading",
            progress: Math.max(2, Math.min(100, p.progress)),
            label: `${p.file || "Model"} · ${Math.round(p.progress)}%`,
          });
        }
      });
      setTranscriberStatus({ state: "ready", progress: 100, label: "Speech model ready — it stays on this device." });
    } catch (err) {
      console.error(err);
      setTranscriberStatus({ state: "error", progress: 0, label: "Could not load the speech model. Check your connection." });
    }
  }, [modelId]);

  const ensureTranscriber = useCallback(async () => {
    if (transcriberRef.current) return true;
    if (!transcriberLoadRef.current) {
      transcriberLoadRef.current = loadModel().finally(() => {
        transcriberLoadRef.current = null;
      });
    }
    await transcriberLoadRef.current;
    return Boolean(transcriberRef.current);
  }, [loadModel]);

  const ensureSummarizer = useCallback(async () => {
    if (summarizerRef.current) return true;
    setSummarizerStatus({ state: "loading", progress: 2, label: "Downloading the private summary model…" });
    try {
      // Two large models resident at once is exactly what tends to get a
      // mobile tab killed for memory. If the transcriber is loaded and we're
      // on mobile, free it first — it reloads quickly since its weights are
      // already cached by the browser.
      if (isMobileDevice() && transcriberRef.current) {
        setSummarizerStatus({
          state: "loading",
          progress: 2,
          label: "Freeing up memory before downloading the summary model…",
        });
        await releaseModel(transcriberRef.current);
        transcriberRef.current = null;
        setTranscriberStatus(IDLE);
      }
      summarizerRef.current = await loadSummarizer((p) => {
        if (typeof p?.progress === "number") {
          setSummarizerStatus({
            state: "loading",
            progress: Math.max(2, Math.min(100, p.progress)),
            label: "Downloading the private summary model…",
          });
        }
      });
      setSummarizerStatus({ state: "ready", progress: 100, label: "Summary model ready — runs on this device." });
      return true;
    } catch (err) {
      console.error(err);
      setSummarizerStatus({
        state: "error",
        progress: 0,
        label: "Couldn't load the summary model. Try closing other tabs to free up memory, then try again.",
      });
      return false;
    }
  }, []);

  return {
    transcriberRef,
    summarizerRef,
    transcriberStatus,
    summarizerStatus,
    loadModel,
    ensureTranscriber,
    ensureSummarizer,
  };
}
