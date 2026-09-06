import { useCallback, useRef, useState } from "react";
import { makeWav } from "../lib/audio.js";

const WAVE_BARS = 48;

// micState: idle | requesting | ready | recording | saving | error
export function useRecorder({ onStop }) {
  const [micState, setMicState] = useState("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [waveHeights, setWaveHeights] = useState(() => Array(WAVE_BARS).fill(4));

  const streamRef = useRef(null);
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const processorRef = useRef(null);
  const silencerRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const rafRef = useRef(null);
  const recordingRef = useRef(false);

  const openMic = useCallback(async () => {
    setMicState("requesting");
    try {
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
    if (!streamRef.current || recordingRef.current) return;
    const context = new AudioContext();
    const source = context.createMediaStreamSource(streamRef.current);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const silencer = context.createGain();
    silencer.gain.value = 0.00001;
    chunksRef.current = [];
    processor.onaudioprocess = (event) => chunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    source.connect(processor);
    processor.connect(silencer);
    silencer.connect(context.destination);
    context.resume();
    contextRef.current = context;
    sourceRef.current = source;
    processorRef.current = processor;
    silencerRef.current = silencer;
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
    await new Promise((resolve) => setTimeout(resolve, 120));
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    silencerRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const sampleRate = contextRef.current.sampleRate;
    await contextRef.current.close();
    const length = chunksRef.current.reduce((total, chunk) => total + chunk.length, 0);
    const samples = new Float32Array(length);
    let offset = 0;
    chunksRef.current.forEach((chunk) => {
      samples.set(chunk, offset);
      offset += chunk.length;
    });
    setMicState("idle");
    if (!samples.length) {
      onStop?.(null, "No microphone audio was captured. Check the input device and try again.");
      return;
    }
    onStop?.({ blob: makeWav(samples, sampleRate), durationMs: stoppedAt - startedAtRef.current }, null);
  }, [onStop]);

  return { micState, elapsedMs, waveHeights, openMic, startRecording, stopRecording };
}
