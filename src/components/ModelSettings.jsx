import { Box, Button, Collapse, FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select, Stack, Switch, Typography, LinearProgress } from "@mui/material";
export default function ModelSettings({ open, onToggle, modelId, onModelChange, onLoadModel, transcriberStatus, summarizerStatus, speakerLabels, onSpeakerLabelsChange }) {
  return (
    <Paper
      variant="outlined"
      onClick={() => onToggle(!open)}
      sx={{
        mb: 2,
        p: 1.5,
        borderRadius: 2,
        cursor: "pointer",
        transition: "border-color .2s, background-color .2s",
        "&:hover": { borderColor: "secondary.main", bgcolor: "secondary.50" },
      }}
    >
      <Button
        component="div"
        onClick={(event) => event.stopPropagation()}
        sx={{ px: 0, textTransform: "none", color: "text.primary", fontWeight: 700, pointerEvents: "none" }}
      >
        Speech model &amp; local processing
      </Button>
      <Collapse in={open}>
        <Box sx={{ pt: 2 }} onClick={(event) => event.stopPropagation()}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Speech model</InputLabel>
            <Select label="Speech model"
            value={modelId}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={transcriberStatus.state === "loading"}
          >
            <MenuItem value="Xenova/whisper-tiny.en">Tiny English — fast</MenuItem><MenuItem value="Xenova/whisper-base.en">Base English — more accurate</MenuItem>
            </Select></FormControl>
          <Button
            onClick={onLoadModel}
            disabled={transcriberStatus.state === "loading"}
            variant="contained" color="secondary" sx={{ minWidth: 130 }}
          >
            {transcriberStatus.state === "ready" ? "Model ready" : "Load model"}
          </Button></Stack>
        {transcriberStatus.state === "loading" && (
          <LinearProgress variant="determinate" value={transcriberStatus.progress} color="secondary" sx={{ mt: 2 }} />
        )}
        {transcriberStatus.label && <Typography variant="caption" color="text.secondary">{transcriberStatus.label}</Typography>}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{summarizerStatus.label || "Summary model will download quietly when needed."}</Typography>
        {summarizerStatus.state === "loading" && (
          <LinearProgress variant="determinate" value={summarizerStatus.progress} color="secondary" sx={{ mt: 1 }} />
        )}
        <FormControlLabel
          sx={{ mt: 1, alignItems: "flex-start" }}
          control={<Switch checked={speakerLabels} onChange={(event) => onSpeakerLabelsChange(event.target.checked)} />}
          label={
            <Box>
              <Typography variant="body2" fontWeight={600}>Approximate speaker labels</Typography>
              <Typography variant="caption" color="text.secondary">Experimental voice-change detection; it does not identify people.</Typography>
            </Box>
          }
        />
        </Box>
      </Collapse>
    </Paper>
  );
}
