import { firestoreDb } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CLOUD_DOC_PATH = 'ita_ibate_system';
const CLOUD_DOC_ID = 'state';

export interface CloudSyncStatus {
  lastSynced: string | null;
  isOnline: boolean;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  message: string;
}

export const syncStateToFirestore = async (payload: Record<string, any>): Promise<boolean> => {
  if (!firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, CLOUD_DOC_PATH, CLOUD_DOC_ID);
    await setDoc(docRef, {
      ...payload,
      updatedAt: new Date().toISOString(),
      municipality: 'Municipalidad de Itá Ibaté - Corrientes'
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore cloud sync notice (local backup remains 100% active):', error);
    return false;
  }
};

export const loadStateFromFirestore = async (): Promise<Record<string, any> | null> => {
  if (!firestoreDb) return null;
  try {
    const docRef = doc(firestoreDb, CLOUD_DOC_PATH, CLOUD_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    console.warn('Firestore fetch notice (using robust local persistence):', error);
  }
  return null;
};
