import { Square } from "lucide-react";
import { Alert, Box, Card, LinearProgress, Stack, Typography } from "@mui/material";

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const STATUS_LABEL = {
  idle: "Preparing microphone…",
  requesting: "Preparing microphone…",
  ready: "Ready to record",
  recording: "Recording…",
  saving: "Saving full recording…",
  error: "Microphone unavailable",
};

export default function RecordView({ micState, elapsedMs, waveHeights, onToggleRecord, error, recordingPreview }) {
  const isRecording = micState === "recording";

  return (
    <Box component="section" sx={{ mx: "auto", mt: { xs: 7, md: 12 }, maxWidth: 560, textAlign: "center" }}>
      <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: "-.04em", fontSize: { xs: "2rem", md: "2.4rem" } }}>Recording a note</Typography>
      <Typography sx={{ mt: 3, fontSize: "3.5rem", letterSpacing: "-.06em", fontVariantNumeric: "tabular-nums" }}>{fmt(elapsedMs)}</Typography>
      <Typography color="text.secondary" sx={{ minHeight: 26 }}>{STATUS_LABEL[micState]}</Typography>
      <button
        onClick={onToggleRecord}
        disabled={micState !== "ready" && micState !== "recording"}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        style={{ margin: "24px auto", width: 88, height: 88, borderRadius: "50%", border: 0, color: "white", background: isRecording ? "#e11d48" : "#7c3aed", boxShadow: isRecording ? "0 12px 30px #fda4af" : "0 12px 30px #c4b5fd", cursor: "pointer" }}
      >
        {isRecording ? <Square size={28} fill="currentColor" /> : <span style={{ fontSize: "1.875rem" }}>●</span>}
      </button>
      <Typography variant="body2" color="text.secondary">Tap to start, then tap again to finish</Typography>
      <Stack direction="row" sx={{ mt: 2, height: 24, justifyContent: "center", alignItems: "center", gap: "3px" }}>
        {waveHeights.map((h, i) => (
          <i key={i} style={{ width: 3, borderRadius: 99, background: "#c4b5fd", height: `${h}px`, transition: "height .08s" }} />
        ))}
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 2, textAlign: "left" }}>{error}</Alert>}
      {recordingPreview && (
        <Card variant="outlined" sx={{ mx: "auto", mt: 3, maxWidth: 420, p: 2, textAlign: "left", borderRadius: 3 }}>
          <Typography variant="subtitle2">Latest recording</Typography>
          <audio style={{ marginTop: 12, width: "100%" }} controls src={recordingPreview.url} />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.6 }}>
            {(recordingPreview.size / 1024).toFixed(1)} KB · {recordingPreview.type || "unknown format"} · peak{" "}
            {recordingPreview.peak?.toFixed(5) || "0.00000"} · RMS {recordingPreview.rms?.toFixed(5) || "0.00000"}
          </Typography>
        </Card>
      )}
    </Box>
  );
}
