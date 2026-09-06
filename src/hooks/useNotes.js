import { useCallback, useEffect, useState } from "react";
import { dbGetAll, dbPut, dbDelete } from "../lib/db.js";

export function useNotes() {
  const [notes, setNotes] = useState([]);

  const refresh = useCallback(async () => {
    const all = await dbGetAll();
    setNotes(all.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveNote = useCallback(
    async (note) => {
      await dbPut(note);
      await refresh();
    },
    [refresh]
  );

  const deleteNote = useCallback(
    async (id) => {
      await dbDelete(id);
      await refresh();
    },
    [refresh]
  );

  return { notes, refresh, saveNote, deleteNote };
}
