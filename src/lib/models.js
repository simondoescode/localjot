let transformersPromise;

async function getTransformers() {
  if (!transformersPromise) {
    transformersPromise = import("@huggingface/transformers").then((module) => {
      module.env.allowRemoteModels = true;
      module.env.allowLocalModels = false;
      return module;
    });
  }
  return transformersPromise;
}

export function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || matchMedia("(pointer:coarse)").matches;
}

// "gpu" in navigator alone is not a reliable signal — the property can exist
// on devices where the WebGPU backend is unstable or unsupported. Mobile
// GPU drivers in particular are prone to crashing the tab under the buffer
// pressure of a quantized model, so we skip WebGPU there entirely and only
// use it elsewhere after actually confirming an adapter is available.
export async function pickDevice() {
  if (isMobileDevice()) return "wasm";
  if (!("gpu" in navigator)) return "wasm";
  try {
    return (await navigator.gpu.requestAdapter()) ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
}

export async function releaseModel(ref) {
  try {
    await ref?.dispose?.();
    await ref?.model?.dispose?.();
  } catch (err) {
    console.warn("Model release failed", err);
  }
}

export async function loadTranscriber(modelId, onProgress) {
  const { pipeline } = await getTransformers();
  const device = await pickDevice();
  return pipeline("automatic-speech-recognition", modelId, {
    device,
    dtype: device === "webgpu" ? "q4" : "q8",
    progress_callback: onProgress,
  });
}

export async function loadSummarizer(onProgress) {
  const { pipeline } = await getTransformers();
  const device = await pickDevice();
  return pipeline("summarization", "Xenova/distilbart-cnn-6-6", {
    device,
    dtype: device === "webgpu" ? "q4" : "q8",
    progress_callback: onProgress,
  });
}
