import { Mic, Upload } from "lucide-react";
import { Alert, Avatar, Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";

export default function NewNoteView({ onRecord, onUploadClick, error }) {
  return (
    <Box component="section" sx={{ mx: "auto", mt: { xs: 3, md: 8 }, maxWidth: 720, textAlign: "center" }}>
      <Box sx={{ p: { xs: 2, sm: 2.5, md: 4 }, borderRadius: { xs: 3, md: 4 }, background: "linear-gradient(135deg, rgba(255,255,255,.94), rgba(242,239,255,.92))", border: "1px solid rgba(109,91,208,.14)", boxShadow: "0 18px 50px rgba(51,43,94,.08)" }}>
      <Chip label="Private · on-device" color="secondary" variant="outlined" size="small" sx={{ mb: 2, bgcolor: "rgba(255,255,255,.65)" }} />
      <Typography variant="h3" sx={{ letterSpacing: "-.05em", fontSize: { xs: "2rem", md: "2.7rem" } }}>Start a fresh note</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 480, mx: "auto" }}>Capture a thought now or turn an existing audio file into a private note.</Typography>
      {error && <Alert severity="error" sx={{ mt: 3, textAlign: "left" }}>{error}</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 3, textAlign: "left" }}>
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 3, bgcolor: "rgba(255,255,255,.78)", transition: "transform .2s, box-shadow .2s", "&:hover": { borderColor: "secondary.main", transform: "translateY(-2px)", boxShadow: "0 10px 24px rgba(51,43,94,.1)" } }}>
          <CardActionArea onClick={onRecord} sx={{ minHeight: { xs: 112, sm: 132 }, p: .75 }}>
            <CardContent>
              <Avatar sx={{ bgcolor: "secondary.light", color: "secondary.main", width: 40, height: 40 }}>
                <Mic size={21} />
              </Avatar>
              <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>Record audio</Typography>
              <Typography variant="body2" color="text.secondary">Use your microphone</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 3, bgcolor: "rgba(255,255,255,.78)", transition: "transform .2s, box-shadow .2s", "&:hover": { borderColor: "secondary.main", transform: "translateY(-2px)", boxShadow: "0 10px 24px rgba(51,43,94,.1)" } }}>
          <CardActionArea onClick={onUploadClick} sx={{ minHeight: { xs: 112, sm: 132 }, p: .75 }}>
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
    </Box>
  );
}
