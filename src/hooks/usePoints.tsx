// src/hooks/usePoints.tsx
"use client";

import { useEffect } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useReadingsStore } from "@/store/useReadingsStore";
import type { DeviceReading } from "@/types";

const COLLECTION_NAME = "readings";

export function usePoints() {
  const { readings, add, remove, reset, subscribeBackend } = useReadingsStore();

  // Real-time sync
  useEffect(() => {
    // Subscribe when component mounts
    const unsubscribe = subscribeBackend();
    return () => unsubscribe();
  }, [subscribeBackend]);

  // Add new reading to Firestore
  const addPoint = async (reading: Omit<DeviceReading, "readingId">) => {
    await addDoc(collection(db, COLLECTION_NAME), reading);
  };

  // Delete a reading from Firestore
  const deletePoint = async (id: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  };

  // Reset readings from Firestore
  const resetPoints = async () => {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    const deletePromises = snapshot.docs.map((d) =>
      deleteDoc(doc(db, COLLECTION_NAME, d.id))
    );
    await Promise.all(deletePromises);
    reset(); // clear local store too
  };

  return {
    readings,
    addPoint,
    deletePoint,
    resetPoints,
  };
}
