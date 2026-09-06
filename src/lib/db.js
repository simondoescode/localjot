const DB_NAME = "local-transcriber";
const STORE = "recordings";

function withStore(mode, action) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE, mode);
      const result = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(result?.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}

export const dbPut = (note) => withStore("readwrite", (store) => store.put(note));
export const dbDelete = (id) => withStore("readwrite", (store) => store.delete(id));

export const dbGetAll = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const get = req.result.transaction(STORE, "readonly").objectStore(STORE).getAll();
      get.onsuccess = () => resolve(get.result || []);
      get.onerror = () => reject(get.error);
    };
  });
