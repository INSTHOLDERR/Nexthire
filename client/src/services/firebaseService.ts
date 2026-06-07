import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey:    import.meta.env.VITE_FIREBASE_API_KEY    as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  appId:     import.meta.env.VITE_FIREBASE_APP_ID     as string,
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<string> => {
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
};
