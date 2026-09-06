export const SUM_CHUNK_CHARS = 3000;
export const SUM_MAX_CHUNKS = 12;

// Splits on sentence boundaries into pieces safely under distilbart's
// ~1024-token input limit, rather than hard-truncating the transcript.
export function chunkText(text, maxChars = SUM_CHUNK_CHARS) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxChars) {
      chunks.push(current.trim());
      current = "";
    }
    current += (current ? " " : "") + sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

export async function summarizeChunk(summarizer, text, maxNewTokens = 100, minNewTokens = 20) {
  const result = await summarizer(text, { max_new_tokens: maxNewTokens, min_new_tokens: minNewTokens });
  return result?.[0]?.summary_text?.trim() || "";
}

// Summarizes long transcripts in chunks (sequential, one model call at a
// time so peak memory stays flat), then combines the partial summaries into
// one final pass. onProgress receives { label, percent } after every step.
export async function summarizeTranscript(summarizer, text, onProgress) {
  let chunks = chunkText(text.trim());
  let truncated = false;
  if (chunks.length > SUM_MAX_CHUNKS) {
    chunks = chunks.slice(0, SUM_MAX_CHUNKS);
    truncated = true;
  }

  const partials = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress?.({
      label: chunks.length > 1 ? `Summarizing part ${i + 1} of ${chunks.length}…` : "Summarizing…",
      percent: Math.round(((i + 1) / chunks.length) * (chunks.length > 1 ? 70 : 100)),
    });
    const partial = await summarizeChunk(summarizer, chunks[i], chunks.length > 1 ? 90 : 120, 20);
    if (partial) partials.push(partial);
  }

  let finalText;
  if (partials.length > 1) {
    onProgress?.({ label: "Combining summary…", percent: 85 });
    const combined = partials.join(" ");
    finalText =
      combined.length > SUM_CHUNK_CHARS
        ? (await Promise.all(chunkText(combined).map((c) => summarizeChunk(summarizer, c, 90, 15)))).join(" ")
        : await summarizeChunk(summarizer, combined, 140, 30);
    onProgress?.({ label: "Summary ready", percent: 100 });
  } else {
    finalText = partials[0] || "";
  }

  return { text: finalText, truncated };
}
