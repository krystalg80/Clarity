import { db, auth } from './config';

export const testFirebaseConnection = () => {
  console.log('🔥 Firebase initialized successfully!');
  console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
  console.log('Auth:', auth);
  console.log('Firestore:', db);
};