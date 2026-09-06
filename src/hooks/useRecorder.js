import { useCallback, useRef, useState } from "react";
const WAVE_BARS = 48;

// micState: idle | requesting | ready | recording | saving | error
export function useRecorder({ onStop }) {
  const [micState, setMicState] = useState("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [waveHeights, setWaveHeights] = useState(() => Array(WAVE_BARS).fill(4));

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const rafRef = useRef(null);
  const recordingRef = useRef(false);

  const openMic = useCallback(async () => {
    setMicState("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("This browser does not support microphone recording.");
      }
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setMicState("ready");
      return true;
    } catch (err) {
      console.error(err);
      setMicState("error");
      return false;
    }
  }, []);

  const animateWave = useCallback(() => {
    if (!recordingRef.current) return;
    setWaveHeights(Array.from({ length: WAVE_BARS }, () => 4 + Math.random() * 20));
    rafRef.current = requestAnimationFrame(animateWave);
  }, []);

  const startRecording = useCallback(() => {
    if (recordingRef.current) return;
    if (!streamRef.current) throw new Error("Microphone access is not ready.");
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((type) =>
      MediaRecorder.isTypeSupported(type)
    );
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorderRef.current = recorder;
    recorder.start(250);
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 200);
    recordingRef.current = true;
    setMicState("recording");
    animateWave();
  }, [animateWave]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setMicState("saving");
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    const stoppedAt = Date.now();
    await new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve();
        return;
      }
      recorder.addEventListener("stop", resolve, { once: true });
      recorder.stop();
    });
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    setMicState("idle");
    if (!blob.size) {
      onStop?.(null, "No microphone audio was captured. Check the input device and try again.");
      return;
    }
    onStop?.({ blob, durationMs: stoppedAt - startedAtRef.current }, null);
  }, [onStop]);

  return { micState, elapsedMs, waveHeights, openMic, startRecording, stopRecording };
}
