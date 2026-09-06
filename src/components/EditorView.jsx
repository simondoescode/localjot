import { Copy, Download, Trash2, Sparkles, Eye, Pencil } from "lucide-react";
import { Alert, Box, Button, Divider, IconButton, LinearProgress, Paper, Stack, TextField, Typography } from "@mui/material";

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function EditorView({
  note,
  title,
  transcript,
  summaryMarkdown,
  summaryHtml,
  showSummaryPreview,
  onTitleChange,
  onTranscriptChange,
  onSummaryChange,
  onToggleSummaryView,
  audioUrl,
  onSummarize,
  isSummarizing,
  summaryProgress,
  onCopyTranscript,
  onCopySummary,
  onExportTranscript,
  onExportSummary,
  onDelete,
}) {
  return (
    <Box component="section" sx={{ mx: "auto", maxWidth: 800, pb: { xs: 11, md: 2 } }}>
      <TextField
        variant="standard"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled note"
        fullWidth
        InputProps={{ sx: { fontSize: { xs: "2rem", md: "2.4rem" }, fontWeight: 800, letterSpacing: "-.04em" } }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {new Date(note.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {fmt(note.durationMs || 0)}
      </Typography>
      {audioUrl && <audio style={{ width: "100%", margin: "12px 0" }} controls src={audioUrl} />}

      <Box sx={{ borderTop: 1, borderColor: "divider", py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: ".12em" }}>Transcript</Typography>
          <Stack direction="row" spacing={.5}>
            <IconButton
              onClick={onCopyTranscript}
              aria-label="Copy transcript"
              size="small"><Copy size={16} />
            </IconButton>
            <IconButton
              onClick={onExportTranscript}
              aria-label="Export transcript"
              size="small"><Download size={16} /></IconButton>
          </Stack>
        </Stack>
        <TextField
          multiline
          minRows={7}
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Your transcript will appear here…"
          spellCheck
          fullWidth
          variant="outlined"
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </Box>

      <Box sx={{ borderTop: 1, borderColor: "divider", py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: ".12em" }}>Summary</Typography>
          <Stack direction="row" spacing={.5}>
            <Button
              onClick={onSummarize}
              disabled={isSummarizing}
              size="small" variant="outlined" startIcon={<Sparkles size={14} />}>
              {isSummarizing ? "Summarizing…" : "Summarize"}
            </Button>
            <IconButton
              onClick={onToggleSummaryView}
              aria-label={showSummaryPreview ? "Edit summary" : "Preview summary"}
              size="small">{showSummaryPreview ? <Pencil size={16} /> : <Eye size={16} />}</IconButton>
          </Stack>
        </Stack>

        {isSummarizing && summaryProgress?.label && (
          <Box sx={{ mb: 2 }}><LinearProgress variant="determinate" value={summaryProgress.percent} color="secondary" /><Typography variant="caption" color="text.secondary">{summaryProgress.label}</Typography></Box>
        )}

        {showSummaryPreview ? (
          <Box
            sx={{ lineHeight: 1.75, color: summaryMarkdown.trim() ? "text.primary" : "text.secondary", "& h2": { fontSize: "1.2rem" }, "& p": { mb: 1 } }}
            dangerouslySetInnerHTML={{
              __html: summaryMarkdown.trim() ? summaryHtml : "A concise summary will appear here.",
            }}
          />
        ) : (
          <TextField
            multiline
            minRows={7}
            value={summaryMarkdown}
            onChange={(e) => onSummaryChange(e.target.value)}
            placeholder="Write a summary…"
            spellCheck
            fullWidth
            variant="outlined"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2, display: { xs: "none", md: "flex" } }}>
          <Button onClick={onCopySummary} size="small" startIcon={<Copy size={15} />}>Copy summary</Button><Button onClick={onExportSummary} size="small" startIcon={<Download size={15} />}>Export MD</Button><Button onClick={onDelete} size="small" color="error" startIcon={<Trash2 size={15} />}>Delete note</Button>
        </Stack>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>Saved locally</Typography>

      {/* Mobile actions — fixed bottom bar, thumb's reach, safe-area aware */}
      <Paper elevation={8} sx={{ position: "fixed", display: { xs: "flex", md: "none" }, insetInline: 0, bottom: 0, zIndex: 20, pb: "env(safe-area-inset-bottom)" }}>
        <Button
          onClick={onCopySummary}
          aria-label="Copy summary"
          sx={{ flex: 1, minHeight: 56, flexDirection: "column", gap: .25, fontSize: 11 }}><Copy size={19} />Copy</Button>
        <Button
          onClick={onExportSummary}
          aria-label="Export summary"
          sx={{ flex: 1, minHeight: 56, flexDirection: "column", gap: .25, fontSize: 11 }}><Download size={19} />Export</Button>
        <Button
          onClick={onDelete}
          aria-label="Delete note"
          sx={{ flex: 1, minHeight: 56, flexDirection: "column", gap: .25, fontSize: 11 }} color="error"><Trash2 size={19} />Delete</Button>
      </Paper>
    </Box>
  );
}
