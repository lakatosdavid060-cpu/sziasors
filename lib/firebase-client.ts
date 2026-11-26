import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function getFirebaseApp() {
  if (!config.apiKey || !config.databaseURL || !config.projectId || !config.appId) throw new Error('Firebase nincs konfigurálva. Töltsd ki a NEXT_PUBLIC_FIREBASE_* változókat.');
  return getApps().length ? getApps()[0] : initializeApp(config);
}
export function getFirebaseAuth() { return getAuth(getFirebaseApp()); }
export function getFirebaseDb() {
  if (!config.apiKey || !config.databaseURL || !config.projectId || !config.appId) {
    throw new Error('Firebase nincs konfigurálva. Töltsd ki a NEXT_PUBLIC_FIREBASE_* változókat.');
  }
  return getDatabase(getFirebaseApp());
}
