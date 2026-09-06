import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, LinearProgress, List, ListItemButton, ListItemText, Stack, TextField, Typography } from "@mui/material";

const iconUrl = `${import.meta.env.BASE_URL}icon.svg`;

function noteTitle(note) {
  const firstLine = (note.transcript || "").trim().split(/(?<=[.!?])\s|\n/)[0]?.slice(0, 70);
  return note.title || firstLine || "Untitled note";
}

export default function Sidebar({ notes, selectedId, onSelect, onNewNote, onRename, onDelete, storage, onClose }) {
  const [renameNote, setRenameNote] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteNote, setDeleteNote] = useState(null);
  const [memory, setMemory] = useState(null);
  const ragColor = (value) => (value >= 80 ? "error" : value >= 60 ? "warning" : "success");

  useEffect(() => {
    const updateMemory = () => {
      const info = performance.memory;
      setMemory(info ? { used: info.usedJSHeapSize, limit: info.jsHeapSizeLimit } : null);
    };
    updateMemory();
    const timer = setInterval(updateMemory, 2000);
    return () => clearInterval(timer);
  }, []);

  const submitRename = async () => {
    const title = renameValue.trim();
    if (!title || !renameNote) return;
    await onRename(renameNote, title);
    setRenameNote(null);
  };

  return (
    <Box sx={{ display: "flex", height: "100%", flexDirection: "column", px: { xs: 1.5, md: 2.5 }, py: { xs: 2, md: 3 } }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 1, pb: 2 }}>
        <img style={{ width: 34, height: 34 }} src={iconUrl} alt="" />
        <Box sx={{ minWidth: 0, flex: 1 }}><Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>LocalJot</Typography><Typography variant="caption" color="text.secondary">Private voice notes</Typography></Box>
        {onClose && (
          <IconButton onClick={onClose} aria-label="Close notes" size="large">
            <X size={20} />
          </IconButton>
        )}
      </Stack>
      <Button onClick={onNewNote} variant="contained" startIcon={<Plus size={18} />} sx={{ minHeight: 46, justifyContent: "flex-start", borderRadius: 2.5, fontWeight: 700, px: 1.5, bgcolor: "#4c1d95", boxShadow: "0 8px 18px rgba(76,29,149,.18)", "&:hover": { bgcolor: "#3b0764", boxShadow: "0 10px 22px rgba(76,29,149,.24)" } }}>New note</Button>
      <Stack direction="row" justifyContent="space-between" sx={{ px: 1, pt: 2.5, pb: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: ".12em" }}>Notes</Typography><Chip label={notes.length} size="small" />
      </Stack>
      <List
        disablePadding
        sx={{
          flex: 1,
          overflow: "auto",
          mx: { xs: -1.5, md: -2.5 },
          width: { xs: "calc(100% + 24px)", md: "calc(100% + 40px)" },
          py: 0.5,
        }}
      >
        {notes.length === 0 && <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: "block" }}>No notes yet</Typography>}
        {notes.map((note) => (
          <ListItemButton
            key={note.id}
            onClick={() => onSelect(note)}
            selected={note.id === selectedId}
            sx={{ borderRadius: 2, mb: .5, px: 1.25, py: 1.1, "&.Mui-selected": { bgcolor: "#f0edff", borderRadius: 0, borderLeft: 3, borderColor: "secondary.main", "&:hover": { bgcolor: "#ebe7ff" } }, "&:hover .note-actions": { opacity: 1 } }}
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
      <Box sx={{ px: 1, pt: 2, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1 }}>
        <Box sx={{ minWidth: 0, minHeight: 48, display: "flex", flexDirection: "column" }}>
          <Typography variant="caption" display="block" sx={{ color: "#292524", fontSize: 12, fontWeight: 900, letterSpacing: ".02em" }}>Storage</Typography>
          <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ lineHeight: 1.3 }}>{storage.usageLabel} · {storage.remainingLabel}</Typography>
          <LinearProgress variant="determinate" value={storage.percent} color={ragColor(storage.percent)} sx={{ mt: "auto", height: 3, borderRadius: 5 }} />
        </Box>
        <Box sx={{ minWidth: 0, minHeight: 48, display: "flex", flexDirection: "column" }}>
          <Typography variant="caption" display="block" sx={{ color: "#292524", fontSize: 12, fontWeight: 900, letterSpacing: ".02em" }}>Memory</Typography>
          <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ lineHeight: 1.3 }}>
            {memory ? `${(memory.used / 1048576).toFixed(0)} / ${(memory.limit / 1048576).toFixed(0)} MB` : "Estimate unavailable"}
          </Typography>
          <LinearProgress
            variant={memory ? "determinate" : "indeterminate"}
            value={memory ? Math.min(100, (memory.used / memory.limit) * 100) : undefined}
            color={memory ? ragColor((memory.used / memory.limit) * 100) : "warning"}
            sx={{ mt: "auto", height: 3, borderRadius: 5 }}
          />
        </Box>
      </Box>
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
