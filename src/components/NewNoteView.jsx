import { Mic, Upload } from "lucide-react";
import { Alert, Avatar, Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";

export default function NewNoteView({ onRecord, onUploadClick, error }) {
  return (
    <Box component="section" sx={{ mx: "auto", mt: { xs: 7, md: 14 }, maxWidth: 560, textAlign: "center" }}>
      <Chip label="Private · on-device" color="secondary" variant="outlined" sx={{ mb: 2 }} />
      <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: "-.04em", fontSize: { xs: "2rem", md: "2.4rem" } }}>Start a fresh note</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>Capture a thought now or turn an existing audio file into a private note.</Typography>
      {error && <Alert severity="error" sx={{ mt: 3, textAlign: "left" }}>{error}</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 5, textAlign: "left" }}>
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 3, "&:hover": { borderColor: "secondary.main", bgcolor: "secondary.50" } }}>
          <CardActionArea onClick={onRecord} sx={{ minHeight: 150, p: 1 }}>
            <CardContent>
              <Avatar sx={{ bgcolor: "secondary.light", color: "secondary.main", width: 48, height: 48 }}>
                <Mic size={25} strokeWidth={2.2} />
              </Avatar>
              <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>Record audio</Typography>
              <Typography variant="body2" color="text.secondary">Use your microphone</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 3, "&:hover": { borderColor: "secondary.main", bgcolor: "secondary.50" } }}>
          <CardActionArea onClick={onUploadClick} sx={{ minHeight: 150, p: 1 }}>
            <CardContent>
              <Avatar sx={{ bgcolor: "secondary.light", color: "secondary.main", width: 48, height: 48 }}>
                <Upload size={25} strokeWidth={2.2} />
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
