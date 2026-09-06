import { Copy, Download, Trash2, Sparkles, Eye, Pencil } from "lucide-react";
import { Alert, Autocomplete, Box, Button, Chip, Collapse, Divider, FormControl, FormControlLabel, IconButton, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Switch, TextField, Typography } from "@mui/material";

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
  speakerLabels,
  onSpeakerLabelsChange,
  onRedoTranscript,
  transcriptError,
  tags,
  onTagsChange,
  availableTags = [],
  preset,
  transcriptOpen,
  onTranscriptToggle,
  summaryOpen,
  onSummaryToggle,
}) {
  return (
    <Box component="section" sx={{ mx: "auto", maxWidth: 800, pb: { xs: 11, md: 2 } }}>
      <TextField
        variant="standard"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled note"
        label="Note title"
        fullWidth
        helperText={false}
        InputProps={{ sx: { fontSize: { xs: "1.8rem", md: "2.4rem" }, fontWeight: 800, letterSpacing: "-.05em", px: { xs: .5, md: 0 } } }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {new Date(note.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {fmt(note.durationMs || 0)}
      </Typography>
      {preset && <Chip label={`${preset.replace("-", " ")} preset`} size="small" variant="outlined" color="secondary" sx={{ mb: 2, textTransform: "capitalize" }} />}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2, maxWidth: 620 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Existing tags</InputLabel>
          <Select
            multiple
            value={tags.filter((tag) => availableTags.includes(tag))}
            label="Existing tags"
            onChange={(event) => {
              const customTags = tags.filter((tag) => !availableTags.includes(tag));
              onTagsChange([...new Set([...customTags, ...event.target.value])]);
            }}
            renderValue={(selected) => (
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
                {selected.map((tag) => <Chip key={tag} label={tag} size="small" color="secondary" />)}
              </Stack>
            )}
          >
            {availableTags.length ? availableTags.map((tag) => <MenuItem key={tag} value={tag}>{tag}</MenuItem>) : <MenuItem disabled>No existing tags</MenuItem>}
          </Select>
        </FormControl>
        <Autocomplete
          freeSolo
          size="small"
          options={[]}
          onChange={(_, value) => {
            if (typeof value === "string" && value.trim()) onTagsChange([...new Set([...tags, value.trim()])]);
          }}
          renderInput={(params) => <TextField {...params} label="Add new tag" placeholder="Work, Ideas…" />}
          sx={{ minWidth: { sm: 210 } }}
        />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        Select existing tags from the dropdown or add a new tag.
      </Typography>
      {audioUrl && <Paper variant="outlined" sx={{ my: 2, p: { xs: 1, md: 1.5 }, borderRadius: 3, bgcolor: "rgba(255,255,255,.72)" }}><audio style={{ width: "100%", display: "block" }} controls src={audioUrl} /></Paper>}

      <Box sx={{ mt: 3, p: { xs: 1.25, md: 2 }, border: 1, borderColor: "divider", borderRadius: 2.5, bgcolor: "rgba(255,255,255,.66)", boxShadow: "0 8px 26px rgba(67,48,125,.04)" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 1, gap: 1 }}>
          <Button onClick={onTranscriptToggle} sx={{ justifyContent: "flex-start", px: .5, color: "text.primary", fontWeight: 800, letterSpacing: ".08em" }}>Transcript {transcriptOpen ? "⌃" : "⌄"}</Button>
          <Stack direction="row" spacing={.5} sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
            <FormControlLabel
              sx={{ mr: 0, "& .MuiFormControlLabel-label": { fontSize: 11 } }}
              control={<Switch size="small" checked={speakerLabels} onChange={(event) => onSpeakerLabelsChange(event.target.checked)} />}
              label="Speakers"
            />
            <Button onClick={onRedoTranscript} size="small">Redo</Button>
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
        <Collapse in={transcriptOpen}>
        {transcriptError && <Alert severity="error" sx={{ mb: 2 }}>{transcriptError}</Alert>}
        {speakerLabels && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Speaker labels are approximate and will be applied when you redo the transcript.
          </Typography>
        )}
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
        </Collapse>
      </Box>

      <Box sx={{ mt: 2, p: { xs: 1.25, md: 2 }, border: 1, borderColor: "divider", borderRadius: 2.5, bgcolor: "rgba(255,255,255,.66)", boxShadow: "0 8px 26px rgba(67,48,125,.04)" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 1, gap: 1 }}>
          <Button onClick={onSummaryToggle} sx={{ justifyContent: "flex-start", px: .5, color: "text.primary", fontWeight: 800, letterSpacing: ".08em" }}>Summary {summaryOpen ? "⌃" : "⌄"}</Button>
          <Stack direction="row" spacing={.5} sx={{ justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
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

        <Collapse in={summaryOpen}>
        {isSummarizing && summaryProgress?.label && (
          <Box sx={{ mb: 2 }}><LinearProgress variant="determinate" value={summaryProgress.percent} color="secondary" /><Typography variant="caption" color="text.secondary">{summaryProgress.label}</Typography></Box>
        )}

        {showSummaryPreview ? (
          <Box
            sx={{ minHeight: 120, lineHeight: 1.75, color: summaryMarkdown.trim() ? "text.primary" : "text.secondary", "& h2": { fontSize: "1.2rem" }, "& p": { mb: 1 } }}
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
        </Collapse>
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
