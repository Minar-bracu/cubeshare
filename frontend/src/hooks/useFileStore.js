import { useState, useEffect, useCallback, useRef } from "react";

const DB_NAME = "cubeshare-files";
const DB_VERSION = 1;
const STORE_NAME = "received";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("receivedAt", "receivedAt");
        store.createIndex("fromUser", "fromUser");
        store.createIndex("type", "type");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export default function useFileStore() {
  const [files, setFiles] = useState([]);
  const dbRef = useRef(null);

  const refreshFiles = useCallback(async () => {
    const db = dbRef.current || (await openDB());
    dbRef.current = db;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = req.result.sort((a, b) => b.receivedAt - a.receivedAt);
        setFiles(sorted);
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }, []);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  const saveFile = useCallback(
    async (blob, metadata) => {
      const db = dbRef.current || (await openDB());
      dbRef.current = db;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const record = {
          blob,
          fileName: metadata.fileName,
          fileSize: metadata.fileSize,
          mimeType: metadata.mimeType || "application/octet-stream",
          fromUser: metadata.fromUser || "Unknown",
          fromDevice: metadata.fromDevice || "Unknown",
          type: metadata.type || "file", // "file" | "text" | "link"
          textContent: metadata.textContent || null,
          receivedAt: Date.now(),
          direction: metadata.direction || "received",
        };
        const req = store.add(record);
        req.onsuccess = () => {
          refreshFiles();
          resolve(req.result);
        };
        req.onerror = () => reject(req.error);
      });
    },
    [refreshFiles],
  );

  const deleteFile = useCallback(
    async (id) => {
      const db = dbRef.current || (await openDB());
      dbRef.current = db;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => {
          refreshFiles();
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    },
    [refreshFiles],
  );

  const clearAll = useCallback(async () => {
    const db = dbRef.current || (await openDB());
    dbRef.current = db;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => {
        refreshFiles();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }, [refreshFiles]);

  return { files, saveFile, deleteFile, clearAll, refreshFiles };
}
