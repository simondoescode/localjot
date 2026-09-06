export function makeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset, text) => [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true));
  return new Blob([buffer], { type: "audio/wav" });
}

function normalizeSpeech(samples) {
  let peak = 0;
  let sumSquares = 0;
  for (const sample of samples) {
    const absolute = Math.abs(sample);
    peak = Math.max(peak, absolute);
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / Math.max(1, samples.length));
  if (peak < 0.0000001 || rms < 0.00000001) return samples;

  const gain = Math.min(32, 0.9 / peak);
  if (gain <= 1.05) return samples;
  return Float32Array.from(samples, (sample) => Math.max(-1, Math.min(1, sample * gain)));
}

function ensureAudible(samples) {
  let peak = 0;
  let sumSquares = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
    sumSquares += sample * sample;
  }
  if (peak < 0.0000001) {
    const rms = Math.sqrt(sumSquares / Math.max(1, samples.length));
    throw new Error(`No usable audio was captured (peak ${peak.toExponential(2)}, RMS ${rms.toExponential(2)}).`);
  }
}

export function chunkAudio(samples, sampleRate = 16000, chunkSeconds = 20, overlapSeconds = 2) {
  const chunkSize = Math.max(1, Math.floor(sampleRate * chunkSeconds));
  const overlap = Math.min(chunkSize - 1, Math.floor(sampleRate * overlapSeconds));
  const step = chunkSize - overlap;
  const chunks = [];

  for (let start = 0; start < samples.length; start += step) {
    chunks.push(samples.slice(start, Math.min(samples.length, start + chunkSize)));
  }
  return chunks;
}

async function decodeWithMediaElement(blob) {
  const url = URL.createObjectURL(blob);
  const element = document.createElement("audio");
  element.src = url;
  element.preload = "auto";
  element.playsInline = true;

  const context = new AudioContext();
  const source = context.createMediaElementSource(element);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const silencer = context.createGain();
  // Keep the graph active so ScriptProcessor receives frames, while making
  // fallback playback effectively inaudible.
  silencer.gain.value = 0.00001;
  const chunks = [];

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("The browser could not load this recorded audio format.")), 8000);
      const ready = () => {
        clearTimeout(timeout);
        resolve();
      };
      element.addEventListener("loadedmetadata", ready, { once: true });
      element.addEventListener("loadeddata", ready, { once: true });
      element.addEventListener("canplay", ready, { once: true });
      element.addEventListener(
        "error",
        () => {
          clearTimeout(timeout);
          const code = element.error?.code ? ` (media error ${element.error.code})` : "";
          reject(new Error(`The browser could not play this audio file${code}.`));
        },
        { once: true }
      );
      element.load();
    });
    processor.onaudioprocess = (event) => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    source.connect(processor);
    processor.connect(silencer);
    silencer.connect(context.destination);
    await context.resume();
    await new Promise(async (resolve, reject) => {
      element.addEventListener("ended", resolve, { once: true });
      element.addEventListener("error", () => reject(new Error("The browser stopped decoding this audio file.")), { once: true });
      try {
        await element.play();
      } catch (err) {
        reject(err);
      }
    });

    const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const samples = new Float32Array(length);
    let offset = 0;
    chunks.forEach((chunk) => {
      samples.set(chunk, offset);
      offset += chunk.length;
    });
    return { samples, sampleRate: context.sampleRate, durationMs: Math.round(element.duration * 1000) };
  } finally {
    element.pause();
    processor.disconnect();
    source.disconnect();
    silencer.disconnect();
    await context.close();
    URL.revokeObjectURL(url);
  }
}

async function resampleTo16k(samples, sampleRate, durationMs) {
  ensureAudible(samples);
  if (sampleRate === 16000) return { audio: normalizeSpeech(samples), durationMs };
  const length = Math.max(1, Math.ceil((samples.length / sampleRate) * 16000));
  const offline = new OfflineAudioContext(1, length, 16000);
  const buffer = offline.createBuffer(1, samples.length, sampleRate);
  buffer.copyToChannel(samples, 0);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return { audio: normalizeSpeech(rendered.getChannelData(0)), durationMs };
}

// Decodes any audio/video blob to mono 16kHz Float32 samples (what the
// Whisper pipeline expects), resampling only when the source isn't already
// 16kHz.
export async function decodeAudio(blob) {
  const ctx = new AudioContext();
  try {
    let decoded;
    try {
      decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    } catch (decodeError) {
      console.warn("Direct audio decoding failed; trying media playback fallback.", decodeError);
      const fallback = await decodeWithMediaElement(blob);
      return resampleTo16k(fallback.samples, fallback.sampleRate, fallback.durationMs);
    }
    const mono = new Float32Array(decoded.length);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const source = decoded.getChannelData(channel);
      for (let i = 0; i < source.length; i++) mono[i] += source[i] / decoded.numberOfChannels;
    }
    if (decoded.sampleRate === 16000) {
      ensureAudible(mono);
      return { audio: normalizeSpeech(mono), durationMs: Math.round(decoded.duration * 1000) };
    }
    return resampleTo16k(mono, decoded.sampleRate, Math.round(decoded.duration * 1000));
  } finally {
    await ctx.close();
  }
}

export async function convertAudioToWav(blob) {
  const decoded = await decodeAudio(blob);
  return {
    blob: makeWav(decoded.audio, 16000),
    durationMs: decoded.durationMs,
  };
}
