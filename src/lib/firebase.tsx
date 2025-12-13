// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBzVPvi7P-ZPOciQNGx5H02AwkKF4iK4DA",
  authDomain: "rf-detector.firebaseapp.com",
  databaseURL: "https://rf-detector-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "rf-detector",
  storageBucket: "rf-detector.firebasestorage.app",
  messagingSenderId: "63743944283",
  appId: "1:63743944283:web:89d52923941b3b70dc817e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
