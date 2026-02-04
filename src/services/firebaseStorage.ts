
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { AppState, DayRecord } from '../types';
import { saveState as saveToLocal, loadState as loadFromLocal } from './storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

try {
  if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
} catch (error) {
  console.warn('Firebase initialization failed, falling back to localStorage');
}

// Document ID for the app data
const DATA_DOC_ID = 'user-data';

// Create a new day record
const createNewDay = (date: string): DayRecord => ({
  date,
  tasks: [],
  inbox: [],
  isStarted: false,
});

// Check if we need to switch to a new day
const checkAndSwitchDay = (currentDay: DayRecord, history: DayRecord[]): { currentDay: DayRecord; history: DayRecord[] } => {
  const today = new Date().toISOString().split('T')[0];

  if (currentDay.date !== today) {
    if (currentDay.isStarted || currentDay.tasks.length > 0 || currentDay.inbox.length > 0) {
      const newHistory = [currentDay, ...history];
      return {
        currentDay: createNewDay(today),
        history: newHistory,
      };
    }
    return {
      currentDay: createNewDay(today),
      history,
    };
  }

  return { currentDay, history };
};

// Use localStorage fallback
const useLocalStorage = () => !db;

export const subscribeToData = (callback: (state: AppState) => void) => {
  if (useLocalStorage()) {
    // Use localStorage
    const data = loadFromLocal();
    callback(data);
    return () => {};
  }

  const docRef = doc(db!, 'appData', DATA_DOC_ID);

  return onSnapshot(docRef, async (docSnap) => {
    if (docSnap.exists()) {
      let data = docSnap.data() as AppState;

      if (!data.currentView) {
        data = { ...data, currentView: 'planning' };
      }

      const { currentDay, history } = checkAndSwitchDay(data.currentDay, data.history || []);
      data = { ...data, currentDay, history };

      // If all tasks are completed and rated, auto-navigate to history
      const allDone = currentDay.isStarted && currentDay.tasks.length > 0 && currentDay.tasks.every((t) => t.isDone);
      if (allDone && currentDay.dayRating !== undefined) {
        data.currentView = 'history';
      }

      // Reset dayRating and journalEntry when starting a new session on the same day
      if (data.currentDay.dayRating !== undefined) {
        delete data.currentDay.dayRating;
      }
      if (data.currentDay.journalEntry !== undefined) {
        delete data.currentDay.journalEntry;
      }

      await setDoc(docRef, data);
      callback(data);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const defaultState: AppState = {
        currentDay: createNewDay(today),
        history: [],
        currentView: 'planning',
      };
      await setDoc(docRef, defaultState);
      callback(defaultState);
    }
  });
};

export const saveState = async (state: AppState): Promise<void> => {
  if (useLocalStorage()) {
    saveToLocal(state);
    return;
  }

  const docRef = doc(db!, 'appData', DATA_DOC_ID);
  await setDoc(docRef, state);
};

export const loadState = async (): Promise<AppState> => {
  if (useLocalStorage()) {
    return loadFromLocal();
  }

  const docRef = doc(db!, 'appData', DATA_DOC_ID);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    let data = docSnap.data() as AppState;

    if (!data.currentView) {
      data = { ...data, currentView: 'planning' };
    }

    const { currentDay, history } = checkAndSwitchDay(data.currentDay, data.history || []);
    data = { ...data, currentDay, history };

    // Reset dayRating and journalEntry when starting a new session on the same day
    if (data.currentDay.dayRating !== undefined) {
      delete data.currentDay.dayRating;
    }
    if (data.currentDay.journalEntry !== undefined) {
      delete data.currentDay.journalEntry;
    }

    await setDoc(docRef, data);
    return data;
  }

  const today = new Date().toISOString().split('T')[0];
  const defaultState: AppState = {
    currentDay: createNewDay(today),
    history: [],
    currentView: 'planning',
  };

  await setDoc(docRef, defaultState);
  return defaultState;
};
