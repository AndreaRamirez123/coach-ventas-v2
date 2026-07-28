import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envRaw = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i === -1) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(cfg);
const db = getFirestore(app);
const docId = env.VITE_FIREBASE_DATA_DOC_ID || 'coach_ventas_data';
const ref = doc(db, 'app_data', docId);
const probe = `probe_${Date.now()}`;

await setDoc(ref, {
  healthcheck: { probe, writtenAt: Date.now(), by: 'openclaw-quick-test' },
  updatedAt: Date.now(),
  ts: serverTimestamp(),
}, { merge: true });

const snap = await getDoc(ref);
if (!snap.exists()) {
  console.log('ERROR: documento no existe tras escritura');
  process.exit(2);
}
const data = snap.data();
const ok = data?.healthcheck?.probe === probe;
console.log(JSON.stringify({ ok, docPath: `app_data/${docId}`, probeWritten: probe, probeRead: data?.healthcheck?.probe, updatedAt: data?.updatedAt ?? null }, null, 2));
if (!ok) process.exit(3);
