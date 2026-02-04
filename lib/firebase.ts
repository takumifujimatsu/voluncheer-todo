import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function getFirebaseConfig(): FirebaseConfig {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_CONFIG が設定されていません。.env.local を参照してください。"
    );
  }
  try {
    return JSON.parse(raw) as FirebaseConfig;
  } catch {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_CONFIG の形式が不正です。JSON で指定してください。"
    );
  }
}

function createFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApps()[0] as FirebaseApp;
  }
  const config = getFirebaseConfig();
  return initializeApp(config);
}

const app = createFirebaseApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
