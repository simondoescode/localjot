import { useState } from "react";
import { CheckCircle2, Mic, Download, ArrowRight } from "lucide-react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";

export default function SetupWizard({ open, onComplete, onRequestMic, onLoadModel, micReady, modelStatus }) {
  const [step, setStep] = useState(0);
  const [micError, setMicError] = useState("");

  const requestMic = async () => {
    setMicError("");
    const granted = await onRequestMic();
    if (granted) setStep(1);
    else setMicError("Microphone access was not granted. Check your browser permissions and try again.");
  };

  const loadModel = async () => {
    const loaded = await onLoadModel();
    if (loaded) setStep(2);
  };

  return (
    <Dialog open={open} fullWidth maxWidth="sm" disableEscapeKeyDown>
      <DialogTitle sx={{ fontWeight: 800, fontSize: "1.5rem" }}>Welcome to Jot</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Set up private, on-device voice notes in two quick steps.
        </Typography>
        <List disablePadding>
          <ListItem sx={{ px: 0 }}>
            <ListItemIcon><Mic color={micReady ? "#16a34a" : undefined} /></ListItemIcon>
            <ListItemText primary="Allow microphone access" secondary={micReady ? "Microphone is ready." : "Needed to record voice notes."} />
            {micReady && <CheckCircle2 color="#16a34a" size={21} />}
          </ListItem>
          <ListItem sx={{ px: 0 }}>
            <ListItemIcon><Download color={modelStatus.state === "ready" ? "#16a34a" : undefined} /></ListItemIcon>
            <ListItemText primary="Download the speech model" secondary={modelStatus.state === "ready" ? "Ready and cached on this device." : "Downloaded once, then used offline."} />
            {modelStatus.state === "ready" && <CheckCircle2 color="#16a34a" size={21} />}
          </ListItem>
        </List>
        {micError && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{micError}</Typography>}
        {modelStatus.state === "loading" && <Stack spacing={1} sx={{ mt: 2 }}><LinearProgress variant="determinate" value={modelStatus.progress} color="secondary" /><Typography variant="caption" color="text.secondary">{modelStatus.label}</Typography></Stack>}
        {modelStatus.state === "error" && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{modelStatus.label}</Typography>}
        {step === 2 && <Typography color="success.main" sx={{ mt: 2, fontWeight: 600 }}>You’re all set. Your audio and transcripts stay on this device.</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {step === 0 && <Button variant="contained" startIcon={<Mic size={17} />} onClick={requestMic}>Allow microphone</Button>}
        {step === 1 && <Button variant="contained" color="secondary" startIcon={<Download size={17} />} onClick={loadModel} disabled={modelStatus.state === "loading"}>Download model</Button>}
        {step === 2 && <Button variant="contained" endIcon={<ArrowRight size={17} />} onClick={onComplete}>Start using Jot</Button>}
      </DialogActions>
    </Dialog>
  );
}
