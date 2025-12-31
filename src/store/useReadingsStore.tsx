"use client";
import { create } from "zustand";
import { DeviceReading } from "@/types";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLLECTION_NAME = "readings";

interface ReadingsState {
  readings: DeviceReading[];
  add: (
    p: Omit<DeviceReading, "readingId" | "timestamp"> & { timestamp?: number }
  ) => void;
  remove: (readingId: string) => void;
  reset: () => void;

  // Firebase actions
  sendToBackend: (payload: Omit<DeviceReading, "readingId">) => Promise<void>;
  deleteFromBackend: (readingId: string) => Promise<void>;
  deleteAllFromBackend: () => Promise<void>;
  subscribeBackend: () => () => void; // returns unsubscribe function
}

export const useReadingsStore = create<ReadingsState>((set, get) => ({
  readings: [],

  // Local add
  add: (p) =>
    set((state) => {
      const reading: DeviceReading = {
        readingId:
          globalThis.crypto?.randomUUID?.() ||
          Math.random().toString(36).slice(2),
        timestamp: p.timestamp ?? Date.now(),
        ...p,
      };
      return { readings: [...state.readings, reading] };
    }),

  // Local remove
  remove: (readingId) =>
    set((state) => ({
      readings: state.readings.filter((r) => r.readingId !== readingId),
    })),

  // Local reset
  reset: () => set({ readings: [] }),

  // Add data to Firestore
  sendToBackend: async (payload) => {
    try {
      await addDoc(collection(db, COLLECTION_NAME), payload);
    } catch (err) {
      console.error("Failed to send to Firebase:", err);
    }
  },

  // Delete a single document from Firestore
  deleteFromBackend: async (readingId: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, readingId));
    } catch (err) {
      console.error("Failed to delete from Firebase:", err);
    }
  },

  // Delete all documents from Firestore (batch delete)
  deleteAllFromBackend: async () => {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(colRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(doc(db, COLLECTION_NAME, d.id));
      });
      await batch.commit();
      get().reset(); // clear local store after successful deletion
    } catch (err) {
      console.error("Failed to delete all from Firebase:", err);
    }
  },

  // Real-time Firestore
  subscribeBackend: () => {
    const colRef = collection(db, COLLECTION_NAME);
    const unsub = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(
        (d) =>
          ({
            readingId: d.id, // Firestore doc.id as readingId
            ...d.data(),
          } as DeviceReading)
      );
      set({ readings: data });
    });

    return unsub; // allow to stop listening
  },
}));
