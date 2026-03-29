import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBn2jG-T2SesKFr0TsfeQa04wlBmDeEoG4",
  authDomain: "clarity-311c3.firebaseapp.com",
  projectId: "clarity-311c3",
  storageBucket: "clarity-311c3.firebasestorage.app",
  messagingSenderId: "459484415688",
  appId: "1:459484415688:web:bac719ee243bbd9821c7fd",
  measurementId: "G-WWY36GZ05D",
};

// Prevent re-initialization
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Use AsyncStorage for auth persistence on mobile (replaces localStorage)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
// Note: Firestore offline persistence is enabled by default on React Native - no extra config needed.
// The web app's enableIndexedDbPersistence() is removed here intentionally.

export const functions = getFunctions(app, 'us-central1');

export default app;
