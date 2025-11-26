import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

const COLLECTION = 'prompt_specs';

export const fetchPromptSpecs = async (db) => {
  if (!db) throw new Error('Database instance is required to fetch prompt specs');
  const snapshot = await getDocs(collection(db, COLLECTION));
  const specs = {};
  snapshot.forEach((docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    specs[docSnap.id] = { id: docSnap.id, ...data };
  });
  return specs;
};

export const savePromptSpecDoc = async (db, specId, payload) => {
  if (!db) throw new Error('Database instance is required to save prompt specs');
  if (!specId) throw new Error('Spec ID is required');
  const docRef = doc(db, COLLECTION, specId);
  await setDoc(docRef, { ...payload, id: specId }, { merge: false });
};

export const deletePromptSpecDoc = async (db, specId) => {
  if (!db) throw new Error('Database instance is required to delete prompt specs');
  if (!specId) throw new Error('Spec ID is required');
  await deleteDoc(doc(db, COLLECTION, specId));
};
