import { useState } from "react";
import { ArrowRight, CheckCircle2, Download, Mic } from "lucide-react";
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  InputLabel, LinearProgress, MenuItem, Select, Stack, Typography,
} from "@mui/material";

const speechModels = [
  ["Xenova/whisper-tiny.en", "Whisper Tiny (English)", "75 MB"],
  ["Xenova/whisper-base.en", "Whisper Base (English)", "145 MB"],
];
const summaryModels = [["Xenova/distilbart-cnn-6-6", "DistilBART", "1.2 GB"]];

export default function SetupWizard({
  open, onComplete, onRequestMic, onLoadModels, micReady, modelStatus, summaryStatus,
  speechModelId, onModelChange, summaryModelId, onSummaryModelChange,
}) {
  const [step, setStep] = useState(0);
  const [micError, setMicError] = useState("");
  const [speech, setSpeech] = useState(speechModelId);
  const [summary, setSummary] = useState(summaryModelId);

  const requestMic = async () => {
    setMicError("");
    if (await onRequestMic()) setStep(1);
    else setMicError("Microphone access was not granted. Check browser permissions and try again.");
  };
  const loadModels = async () => {
    if (await onLoadModels(speech, summary)) {
      onModelChange(speech);
      onSummaryModelChange(summary);
      setStep(2);
    }
  };

  return (
    <Dialog open={open} fullWidth maxWidth="sm" disableEscapeKeyDown>
      <DialogTitle sx={{ fontWeight: 800, fontSize: "1.5rem" }}>Welcome to LocalJot</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Choose your local models, then grant microphone access.</Typography>
        {step === 0 && <Button fullWidth variant="contained" startIcon={<Mic size={17} />} onClick={requestMic}>Allow microphone</Button>}
        {step >= 1 && (
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Speech model</InputLabel>
              <Select value={speech} label="Speech model" onChange={(e) => setSpeech(e.target.value)} disabled={modelStatus.state === "loading"}>{speechModels.map(([id, name, size]) => <MenuItem key={id} value={id}>{name} · {size}</MenuItem>)}</Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Summary model</InputLabel>
              <Select value={summary} label="Summary model" onChange={(e) => setSummary(e.target.value)} disabled={summaryStatus.state === "loading"}>{summaryModels.map(([id, name, size]) => <MenuItem key={id} value={id}>{name} · {size}</MenuItem>)}</Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">Models download once and remain cached on this device.</Typography>
            {(modelStatus.state === "loading" || summaryStatus.state === "loading") && <Stack spacing={1}><LinearProgress variant="determinate" value={Math.max(modelStatus.progress, summaryStatus.progress)} color="secondary" /><Typography variant="caption" color="text.secondary">{summaryStatus.state === "loading" ? summaryStatus.label : modelStatus.label}</Typography></Stack>}
            {modelStatus.state === "error" && <Typography color="error" variant="body2">{modelStatus.label}</Typography>}
            {summaryStatus.state === "error" && <Typography color="error" variant="body2">{summaryStatus.label}</Typography>}
            {micError && <Typography color="error" variant="body2">{micError}</Typography>}
            {micReady && <Typography color="success.main" variant="body2"><CheckCircle2 size={16} /> Microphone ready</Typography>}
          </Stack>
        )}
        {step === 2 && <Typography color="success.main" sx={{ mt: 2, fontWeight: 600 }}>Everything is ready. Audio and transcripts stay on this device.</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {step === 1 && <Button variant="contained" color="secondary" startIcon={<Download size={17} />} onClick={loadModels} disabled={modelStatus.state === "loading" || summaryStatus.state === "loading"}>Download models</Button>}
        {step === 2 && <Button variant="contained" endIcon={<ArrowRight size={17} />} onClick={onComplete}>Start using LocalJot</Button>}
      </DialogActions>
    </Dialog>
  );
}
