import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';

let firebaseApp: any = null;
let firebaseAuth: any = null;
let googleProvider: GoogleAuthProvider | null = null;
let cachedAccessToken: string | null = null;

try {
  // Try importing or setting from config
  const config = {
    projectId: "ai-studio-applet-webapp-4c158",
    appId: "1:167330302600:web:22a486503e8d57fc0a6d3d",
    apiKey: "AIzaSyDroTwXoIz-a_u4-CWLR9Sx_U0Pxv7kv-E",
    authDomain: "ai-studio-applet-webapp-4c158.firebaseapp.com",
    storageBucket: "ai-studio-applet-webapp-4c158.firebasestorage.app",
    messagingSenderId: "167330302600"
  };

  if (!getApps().length) {
    firebaseApp = initializeApp(config);
  } else {
    firebaseApp = getApp();
  }

  firebaseAuth = getAuth(firebaseApp);
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
  googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
} catch (e) {
  console.warn('Firebase initialization notice:', e);
}

export { firebaseApp, firebaseAuth };

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!firebaseAuth) return () => {};
  return onAuthStateChanged(firebaseAuth, async (user: User | null) => {
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
  try {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
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
