import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import PROMPT_SPECS from '../src/lib/promptSpecs.js';
import { savePromptSpecDoc } from '../src/lib/promptSpecService.js';

const requiredEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length) {
  console.error('Missing Firebase env vars:', missingEnv.join(', '));
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const spec = PROMPT_SPECS.doc;

try {
  await savePromptSpecDoc(db, spec.id, spec);
  console.log(`Seeded doc spec (${spec.id}) to Firestore`);
  process.exit(0);
} catch (error) {
  console.error('Failed to seed doc spec:', error);
  process.exit(1);
}
