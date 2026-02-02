import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { AppState } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Document ID for the app data (using a fixed ID so all users share data)
const DATA_DOC_ID = 'user-data';

export const subscribeToData = (callback: (state: AppState) => void) => {
  const docRef = doc(db, 'appData', DATA_DOC_ID);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as AppState);
    } else {
      // Create default data if not exists
      const today = new Date().toISOString().split('T')[0];
      const defaultState: AppState = {
        currentDay: {
          date: today,
          tasks: [],
          inbox: [],
          isStarted: false,
        },
        history: [],
      };
      setDoc(docRef, defaultState);
      callback(defaultState);
    }
  });
};

export const saveState = async (state: AppState): Promise<void> => {
  const docRef = doc(db, 'appData', DATA_DOC_ID);
  await setDoc(docRef, state);
};

export const loadState = async (): Promise<AppState> => {
  const docRef = doc(db, 'appData', DATA_DOC_ID);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as AppState;
  }

  // Create default data
  const today = new Date().toISOString().split('T')[0];
  const defaultState: AppState = {
    currentDay: {
      date: today,
      tasks: [],
      inbox: [],
      isStarted: false,
    },
    history: [],
  };

  await setDoc(docRef, defaultState);
  return defaultState;
};
