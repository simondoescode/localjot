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
  if (peak < 0.005 || rms < 0.0005) return samples;

  const gain = Math.min(8, 0.9 / peak);
  if (gain <= 1.05) return samples;
  return Float32Array.from(samples, (sample) => Math.max(-1, Math.min(1, sample * gain)));
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

// Decodes any audio/video blob to mono 16kHz Float32 samples (what the
// Whisper pipeline expects), resampling only when the source isn't already
// 16kHz.
export async function decodeAudio(blob) {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const mono = new Float32Array(decoded.length);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const source = decoded.getChannelData(channel);
      for (let i = 0; i < source.length; i++) mono[i] += source[i] / decoded.numberOfChannels;
    }
    if (decoded.sampleRate === 16000) {
      return { audio: normalizeSpeech(mono), durationMs: Math.round(decoded.duration * 1000) };
    }
    const length = Math.max(1, Math.ceil(decoded.duration * 16000));
    const offline = new OfflineAudioContext(1, length, 16000);
    const buffer = offline.createBuffer(1, mono.length, decoded.sampleRate);
    buffer.copyToChannel(mono, 0);
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return {
      audio: normalizeSpeech(rendered.getChannelData(0)),
      durationMs: Math.round(decoded.duration * 1000),
    };
  } finally {
    await ctx.close();
  }
}
