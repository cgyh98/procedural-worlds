import { initializeApp, type FirebaseApp } from 'firebase/app'

// Firebase setup (class module 4: backend).
//
// The config values come from .env.local (gitignored), never from the code.
// Vite replaces each import.meta.env.VITE_* with its value at build time.
//
// Note: a Firebase *web* config is not truly secret (it ends up in the browser
// bundle anyway). What actually protects the data are Firebase Security Rules,
// which we'll write when we add the database. We still keep it out of git so the
// public repo stays clean and each person can point at their own project.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// If .env.local is missing, the app still runs; backend features just stay off.
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId)

// The single Firebase app instance. Services (auth, firestore, storage) are
// created from it later, in their own files, only when a feature needs them.
export const firebaseApp: FirebaseApp | null = isFirebaseConfigured ? initializeApp(config) : null
