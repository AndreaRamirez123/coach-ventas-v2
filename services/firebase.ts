import { initializeApp, getApps } from 'firebase/app';
import { doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { Company, Report, Theme, User } from '../types';

interface AppDataDoc {
  theme: Theme;
  companies: Company[];
  users: User[];
  reports: Report[];
  updatedAt: number;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

if (hasFirebaseConfig) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

export const signInWithGoogle = async (): Promise<{ email: string; name: string } | null> => {
  if (!auth) return null;
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return {
    email: result.user.email || '',
    name: result.user.displayName || '',
  };
};

export const signOutGoogle = async () => {
  if (auth) await signOut(auth);
};

export const getAppDataRef = () => {
  if (!db) return null;
  const dataDocId = import.meta.env.VITE_FIREBASE_DATA_DOC_ID || 'coach_ventas_data';
  return doc(db, 'app_data', dataDocId);
};

export const subscribeAppData = (cb: (data: Partial<AppDataDoc>) => void) => {
  const ref = getAppDataRef();
  if (!ref) return () => {};

  return onSnapshot(ref, (snap) => {
    // Always notify, even when the doc doesn't exist yet (first-ever run) —
    // callers use this to know the cloud state has been checked at least
    // once before they're allowed to write, so a stale local cache can't
    // stomp on real cloud data before it has loaded.
    cb(snap.exists() ? (snap.data() as Partial<AppDataDoc>) : {});
  });
};

export const saveAppData = async (data: Omit<AppDataDoc, 'updatedAt'>) => {
  const ref = getAppDataRef();
  if (!ref) return;

  const full: AppDataDoc = {
    theme: data.theme || 'light',
    companies: data.companies || [],
    users: data.users || [],
    reports: data.reports || [],
    updatedAt: Date.now(),
  };

  // Full overwrite (not a field merge): the app's local state, continuously
  // synced via subscribeAppData, is the source of truth — a merge would
  // resurrect deletions by re-unioning with the previous cloud snapshot.
  await setDoc(ref, full);
};
