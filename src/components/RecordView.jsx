import { Circle, Mic, Square } from "lucide-react";
import { Alert, Box, Card, Chip, Stack, Typography } from "@mui/material";

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
      <Chip
        icon={isRecording ? <Circle size={10} fill="currentColor" /> : <Mic size={16} />}
        label={isRecording ? "Live recording" : STATUS_LABEL[micState]}
        color={isRecording ? "error" : "secondary"}
        variant={isRecording ? "filled" : "outlined"}
        sx={{ mb: 2, fontWeight: 700, "& .MuiChip-icon": { animation: isRecording ? "pulse 1.4s infinite" : "none" }, "@keyframes pulse": { "50%": { opacity: 0.35 } } }}
      />
      <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: "-.04em", fontSize: { xs: "2rem", md: "2.4rem" } }}>Record a thought</Typography>
      <Card variant="outlined" sx={{ mt: 3, p: { xs: 2, md: 3 }, borderRadius: 4, bgcolor: isRecording ? "rgba(254,242,242,.7)" : "background.paper", borderColor: isRecording ? "error.light" : "divider", transition: "all .25s" }}>
        <Typography sx={{ fontSize: { xs: "3.5rem", md: "4.5rem" }, fontWeight: 700, letterSpacing: "-.07em", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: isRecording ? "error.main" : "text.primary" }}>{fmt(elapsedMs)}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>{isRecording ? "Speak naturally — your audio stays on this device" : STATUS_LABEL[micState]}</Typography>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <button
         onClick={onToggleRecord}
         disabled={micState !== "ready" && micState !== "recording"}
         aria-label={isRecording ? "Stop recording" : "Start recording"}
         style={{ margin: "24px 0 18px", width: 88, height: 88, borderRadius: "50%", border: 0, color: "white", background: isRecording ? "#e11d48" : "#7c3aed", boxShadow: isRecording ? "0 0 0 10px rgba(225,29,72,.12), 0 12px 30px rgba(225,29,72,.28)" : "0 12px 30px rgba(124,58,237,.28)", cursor: "pointer", transition: "transform .2s, box-shadow .2s" }}
        >
         {isRecording ? <Square size={28} fill="currentColor" /> : <span style={{ fontSize: "1.875rem" }}>●</span>}
        </button>
      </Box>
      <Typography variant="body2" color="text.secondary">{isRecording ? "Tap to stop recording" : "Tap to start recording"}</Typography>
      <Stack direction="row" sx={{ mt: 2, height: 34, justifyContent: "center", alignItems: "center", gap: "3px", px: 2 }}>
        {waveHeights.map((h, i) => (
          <i key={i} style={{ flex: 1, maxWidth: 6, borderRadius: 99, background: isRecording ? "#fb7185" : "#c4b5fd", height: `${h}px`, transition: "height .08s, background .2s" }} />
        ))}
      </Stack>
      </Card>
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
