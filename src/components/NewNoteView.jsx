import { Mic, Upload } from "lucide-react";
import { Alert, Avatar, Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";

export default function NewNoteView({ onRecord, onUploadClick, error }) {
  return (
    <Box component="section" sx={{ mx: "auto", mt: { xs: 5, md: 10 }, maxWidth: 560, textAlign: "center" }}>
      <Chip label="On-device" color="secondary" variant="outlined" size="small" sx={{ mb: 2 }} />
      <Typography variant="h3" sx={{ fontWeight: 750, letterSpacing: "-.04em", fontSize: { xs: "2rem", md: "2.35rem" } }}>Start a fresh note</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>Capture a thought now or turn an existing audio file into a private note.</Typography>
      {error && <Alert severity="error" sx={{ mt: 3, textAlign: "left" }}>{error}</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 4, textAlign: "left" }}>
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 2, "&:hover": { borderColor: "secondary.main", bgcolor: "secondary.50" } }}>
          <CardActionArea onClick={onRecord} sx={{ minHeight: 132, p: 1 }}>
            <CardContent>
              <Avatar sx={{ bgcolor: "secondary.light", color: "secondary.main", width: 40, height: 40 }}>
                <Mic size={21} />
              </Avatar>
              <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>Record audio</Typography>
              <Typography variant="body2" color="text.secondary">Use your microphone</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 2, "&:hover": { borderColor: "secondary.main", bgcolor: "secondary.50" } }}>
          <CardActionArea onClick={onUploadClick} sx={{ minHeight: 132, p: 1 }}>
            <CardContent>
              <Avatar sx={{ bgcolor: "secondary.light", color: "secondary.main", width: 40, height: 40 }}>
                <Upload size={21} />
              </Avatar>
              <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>Upload audio</Typography>
              <Typography variant="body2" color="text.secondary">Choose a file to transcribe</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Stack>
    </Box>
  );
}
