import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, LinearProgress, List, ListItemButton, ListItemText, Stack, TextField, Typography } from "@mui/material";

const iconUrl = `${import.meta.env.BASE_URL}icon.svg`;

function noteTitle(note) {
  const firstLine = (note.transcript || "").trim().split(/(?<=[.!?])\s|\n/)[0]?.slice(0, 70);
  return note.title || firstLine || "Untitled note";
}

export default function Sidebar({ notes, selectedId, onSelect, onNewNote, onRename, onDelete, storage }) {
  const [renameNote, setRenameNote] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteNote, setDeleteNote] = useState(null);

  const submitRename = async () => {
    const title = renameValue.trim();
    if (!title || !renameNote) return;
    await onRename(renameNote, title);
    setRenameNote(null);
  };

  return (
    <Box sx={{ display: "flex", height: "100%", flexDirection: "column", px: { xs: 1.5, md: 2 }, py: { xs: 2, md: 3 } }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1, pb: 3 }}>
        <img style={{ width: 34, height: 34 }} src={iconUrl} alt="" />
        <Box><Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>Jot</Typography><Typography variant="caption" color="text.secondary">Private voice notes</Typography></Box>
      </Stack>
      <Button onClick={onNewNote} variant="contained" color="primary" startIcon={<Plus size={18} />} sx={{ minHeight: 46, justifyContent: "flex-start", borderRadius: 2.5, fontWeight: 700 }}>New note</Button>
      <Stack direction="row" justifyContent="space-between" sx={{ px: 1, pt: 4, pb: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: ".12em" }}>Notes</Typography><Chip label={notes.length} size="small" />
      </Stack>
      <List disablePadding sx={{ flex: 1, overflow: "auto" }}>
        {notes.length === 0 && <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: "block" }}>No notes yet</Typography>}
        {notes.map((note) => (
          <ListItemButton
            key={note.id}
            onClick={() => onSelect(note)}
            selected={note.id === selectedId}
            sx={{ borderRadius: 2.5, mb: .5, "&.Mui-selected": { bgcolor: "secondary.50", borderLeft: 3, borderColor: "secondary.main" }, "&:hover .note-actions": { opacity: 1 } }}
          >
            <ListItemText primary={noteTitle(note)} primaryTypographyProps={{ noWrap: true, fontWeight: 700, fontSize: 14 }} />
            <Stack className="note-actions" direction="row" sx={{ opacity: { xs: 1, md: 0 }, transition: "opacity .15s" }}>
              <IconButton size="small" aria-label={`Rename ${noteTitle(note)}`} onClick={(event) => { event.stopPropagation(); setRenameNote(note); setRenameValue(noteTitle(note)); }}>
                <Pencil size={15} />
              </IconButton>
              <IconButton size="small" color="error" aria-label={`Delete ${noteTitle(note)}`} onClick={(event) => { event.stopPropagation(); setDeleteNote(note); }}>
                <Trash2 size={15} />
              </IconButton>
            </Stack>
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ mt: 2 }} />
      <Box sx={{ px: 1, pt: 2 }}><Typography variant="subtitle2">On-device storage</Typography><Typography variant="caption" color="text.secondary">{storage.usageLabel}</Typography><LinearProgress variant="determinate" value={storage.percent} color="secondary" sx={{ my: 1, height: 6, borderRadius: 5 }} /><Typography variant="caption" color="text.secondary">{storage.remainingLabel}</Typography></Box>
      <Dialog open={Boolean(renameNote)} onClose={() => setRenameNote(null)} fullWidth maxWidth="xs">
        <DialogTitle>Rename note</DialogTitle>
        <DialogContent><TextField autoFocus fullWidth label="Note name" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitRename(); }} sx={{ mt: 1 }} /></DialogContent>
        <DialogActions><Button onClick={() => setRenameNote(null)}>Cancel</Button><Button onClick={submitRename} variant="contained" disabled={!renameValue.trim()}>Save</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(deleteNote)} onClose={() => setDeleteNote(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete note?</DialogTitle>
        <DialogContent><Typography color="text.secondary">This will permanently delete “{deleteNote ? noteTitle(deleteNote) : ""}” and its audio.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setDeleteNote(null)}>Cancel</Button><Button color="error" variant="contained" onClick={async () => { await onDelete(deleteNote); setDeleteNote(null); }}>Delete</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
