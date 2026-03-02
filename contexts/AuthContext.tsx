"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getAuthInstance, googleProvider, getDb } from "@/lib/firebase";

export type UserProfile = {
  name: string;
};

type AuthContextValue = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  saveUserName: (name: string) => Promise<void>;
  saveUserProfile: (name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuthInstance();
    const db = getDb();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await setDoc(
            doc(db, "users", u.uid),
            {
              displayName: u.displayName ?? "",
              email: u.email ?? "",
            },
            { merge: true }
          );
          const snap = await getDoc(doc(db, "users", u.uid));
          const data = snap.data();
          const name = (data?.name as string)?.trim() ?? "";
          setUserProfile(name ? { name } : null);
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(getAuthInstance(), googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(getAuthInstance());
  };

  const saveUserName = async (name: string) => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    await setDoc(
      doc(getDb(), "users", user.uid),
      { name: trimmed },
      { merge: true }
    );
    setUserProfile((prev) => (prev ? { ...prev, name: trimmed } : { name: trimmed }));
  };

  const saveUserProfile = async (name: string) => {
    if (!user) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    await setDoc(
      doc(getDb(), "users", user.uid),
      { name: trimmedName },
      { merge: true }
    );
    setUserProfile({ name: trimmedName });
  };

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, signInWithGoogle, signOut, saveUserName, saveUserProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
