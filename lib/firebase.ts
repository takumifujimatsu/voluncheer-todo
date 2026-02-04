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
      "NEXT_PUBLIC_FIREBASE_CONFIG が設定されていません。Vercel の Environment Variables に追加してください。"
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

let app: FirebaseApp | null = null;
let _auth: ReturnType<typeof getAuth> | null = null;
let _db: ReturnType<typeof getFirestore> | null = null;

function getApp(): FirebaseApp {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0] as FirebaseApp;
    return app;
  }
  const config = getFirebaseConfig();
  app = initializeApp(config);
  return app;
}

/** Firestore は本物のインスタンスが必要なため、遅延取得用の関数を export。collection(getDb(), "tasks") のように使用 */
export function getDb(): ReturnType<typeof getFirestore> {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

/** Auth も遅延取得。onAuthStateChanged(getAuth(), ...) のように使用 */
export function getAuthInstance(): ReturnType<typeof getAuth> {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

export const googleProvider = new GoogleAuthProvider();
