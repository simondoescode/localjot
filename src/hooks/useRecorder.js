import { useCallback, useEffect, useRef, useState } from "react";
import { makeWav } from "../lib/audio.js";
const WAVE_BARS = 48;

export function useRecorder({ onStop }) {
  const [micState, setMicState] = useState("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [waveHeights, setWaveHeights] = useState(() => Array(WAVE_BARS).fill(4));
  const [inputDevices, setInputDevices] = useState([]);
  const [isPaused, setIsPaused] = useState(false);

  const streamRef = useRef(null);
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const workletRef = useRef(null);
  const silentOutputRef = useRef(null);
  const analyserRef = useRef(null);
  const analyserDataRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const animationRef = useRef(null);
  const recordingRef = useRef(false);

  const openMic = useCallback(async (deviceId = "") => {
    setMicState("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
        throw new Error("This browser does not support microphone recording.");
      }
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      });
      const devices = await navigator.mediaDevices.enumerateDevices();
      setInputDevices(devices.filter((device) => device.kind === "audioinput"));
      const track = streamRef.current.getAudioTracks()[0];
      if (!track || track.readyState !== "live") {
        throw new Error("The selected microphone is not producing audio.");
      }
      setMicState("ready");
      return true;
    } catch (error) {
      console.error(error);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setMicState("error");
      return false;
    }
  }, []);

  const closeMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMicState("idle");
    setIsPaused(false);
  }, []);

  const animateWave = useCallback(() => {
    if (!recordingRef.current) return;
    const analyser = analyserRef.current;
    const data = analyserDataRef.current;
    if (analyser && data) {
      analyser.getFloatTimeDomainData(data);
      const bucketSize = Math.max(1, Math.floor(data.length / WAVE_BARS));
      const heights = Array.from({ length: WAVE_BARS }, (_, index) => {
        let peak = 0;
        const start = index * bucketSize;
        const end = Math.min(data.length, start + bucketSize);
        for (let sample = start; sample < end; sample += 1) peak = Math.max(peak, Math.abs(data[sample]));
        return Math.min(26, 4 + peak * 44);
      });
      setWaveHeights(heights);
    }
    animationRef.current = requestAnimationFrame(animateWave);
  }, []);

  const startRecording = useCallback(async () => {
    if (!streamRef.current || recordingRef.current) return;

    const context = new AudioContext();
    const workletUrl = URL.createObjectURL(
      new Blob(
        [
          `class CaptureProcessor extends AudioWorkletProcessor {
            process(inputs, outputs) {
              const channel = inputs[0]?.[0];
              const output = outputs[0]?.[0];
              if (channel) {
                this.port.postMessage(channel.slice());
                if (output) output.set(channel);
              }
              return true;
            }
          }
          registerProcessor("localjot-capture", CaptureProcessor);`,
        ],
        { type: "application/javascript" }
      )
    );
    try {
      await context.audioWorklet.addModule(workletUrl);
    } finally {
      URL.revokeObjectURL(workletUrl);
    }
    const source = context.createMediaStreamSource(streamRef.current);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.72;
    const analyserData = new Float32Array(analyser.fftSize);
    const worklet = new AudioWorkletNode(context, "localjot-capture", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    const silentOutput = context.createGain();
    silentOutput.gain.value = 0.001;
    chunksRef.current = [];
    worklet.port.onmessage = (event) => {
      if (!isPausedRef.current) chunksRef.current.push(event.data);
    };
    source.connect(analyser);
    source.connect(worklet);
    worklet.connect(silentOutput);
    silentOutput.connect(context.destination);
    await context.resume();
    if (context.state !== "running") {
      await context.close();
      throw new Error("The audio context could not be started.");
    }
    contextRef.current = context;
    sourceRef.current = source;
    workletRef.current = worklet;
    silentOutputRef.current = silentOutput;
    analyserRef.current = analyser;
    analyserDataRef.current = analyserData;
    recordingRef.current = true;
    isPausedRef.current = false;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 200);
    setMicState("recording");
    animateWave();
  }, [animateWave]);

  const isPausedRef = useRef(false);
  const pauseStartedRef = useRef(0);
  const pauseRecording = useCallback(() => {
    if (!recordingRef.current || isPausedRef.current) return;
    isPausedRef.current = true;
    pauseStartedRef.current = Date.now();
    clearInterval(timerRef.current);
    setIsPaused(true);
    setMicState("paused");
  }, []);

  const resumeRecording = useCallback(() => {
    if (!recordingRef.current || !isPausedRef.current) return;
    startedAtRef.current += Date.now() - pauseStartedRef.current;
    isPausedRef.current = false;
    setIsPaused(false);
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 200);
    setMicState("recording");
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    isPausedRef.current = false;
    setMicState("saving");
    clearInterval(timerRef.current);
    cancelAnimationFrame(animationRef.current);

    const stoppedAt = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 150));
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    workletRef.current?.disconnect();
    silentOutputRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    const sampleRate = context?.sampleRate || 44100;
    await context?.close();
    contextRef.current = null;
    sourceRef.current = null;
    analyserRef.current = null;
    analyserDataRef.current = null;
    workletRef.current = null;
    silentOutputRef.current = null;
    const length = chunksRef.current.reduce((total, chunk) => total + chunk.length, 0);
    const samples = new Float32Array(length);
    let offset = 0;
    chunksRef.current.forEach((chunk) => {
      samples.set(chunk, offset);
      offset += chunk.length;
    });
    let peak = 0;
    let sumSquares = 0;
    for (const sample of samples) {
      peak = Math.max(peak, Math.abs(sample));
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / Math.max(1, samples.length));
    setMicState("idle");
    if (!samples.length) {
      onStop?.(null, "No microphone audio was captured. Check the input device and try again.");
      return;
    }
    onStop?.({ blob: makeWav(samples, sampleRate), durationMs: stoppedAt - startedAtRef.current, peak, rms }, null);
  }, [onStop]);

  useEffect(
    () => () => {
      clearInterval(timerRef.current);
      cancelAnimationFrame(animationRef.current);
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      workletRef.current?.disconnect();
      silentOutputRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      contextRef.current?.close();
      analyserRef.current = null;
      analyserDataRef.current = null;
    },
    []
  );

  return { micState, elapsedMs, waveHeights, inputDevices, isPaused, openMic, closeMic, startRecording, pauseRecording, resumeRecording, stopRecording };
}
