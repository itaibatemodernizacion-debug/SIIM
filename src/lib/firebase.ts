import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let firebaseApp: any = null;
let firebaseAuth: any = null;
let firestoreDb: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const firebaseApiKey: string = firebaseConfig.apiKey || '';

try {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  firebaseAuth = getAuth(firebaseApp);
  firestoreDb = getFirestore(firebaseApp);
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (e) {
  console.warn('Firebase initialization notice:', e);
}

export { firebaseApp, firebaseAuth, firestoreDb };

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!firebaseAuth) return () => {};
  return onAuthStateChanged(firebaseAuth, async (user: User | null) => {
    if (isSigningIn) return;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!firebaseAuth || !googleProvider) {
    throw new Error('Firebase Auth no está disponible en este entorno.');
  }
  isSigningIn = true;
  try {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const firebaseLogout = async () => {
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
  cachedAccessToken = null;
};
