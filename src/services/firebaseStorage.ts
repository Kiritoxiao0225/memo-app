
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { AppState, DayRecord } from '../types';

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

  // If the current day is not today, archive it and create a new day
  if (currentDay.date !== today) {
    // Only archive if the day had started (had tasks or was started)
    if (currentDay.isStarted || currentDay.tasks.length > 0 || currentDay.inbox.length > 0) {
      const newHistory = [currentDay, ...history];
      return {
        currentDay: createNewDay(today),
        history: newHistory,
      };
    }
    // If no data was recorded, just update the date
    return {
      currentDay: createNewDay(today),
      history,
    };
  }

  return { currentDay, history };
};

export const subscribeToData = (callback: (state: AppState) => void) => {
  const docRef = doc(db, 'appData', DATA_DOC_ID);

  return onSnapshot(docRef, async (docSnap) => {
    if (docSnap.exists()) {
      let data = docSnap.data() as AppState;

      // Ensure currentView exists
      if (!data.currentView) {
        data = { ...data, currentView: 'planning' };
      }

      // Check if we need to switch to a new day
      const { currentDay, history } = checkAndSwitchDay(data.currentDay, data.history || []);
      data = { ...data, currentDay, history };

      await setDoc(docRef, data);
      callback(data);
    } else {
      // Create default data if not exists
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
  const docRef = doc(db, 'appData', DATA_DOC_ID);
  await setDoc(docRef, state);
};

export const loadState = async (): Promise<AppState> => {
  const docRef = doc(db, 'appData', DATA_DOC_ID);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    let data = docSnap.data() as AppState;

    // Ensure currentView exists
    if (!data.currentView) {
      data = { ...data, currentView: 'planning' };
    }

    // Check if we need to switch to a new day
    const { currentDay, history } = checkAndSwitchDay(data.currentDay, data.history || []);
    data = { ...data, currentDay, history };

    await setDoc(docRef, data);
    return data;
  }

  // Create default data
  const today = new Date().toISOString().split('T')[0];
  const defaultState: AppState = {
    currentDay: createNewDay(today),
    history: [],
    currentView: 'planning',
  };

  await setDoc(docRef, defaultState);
  return defaultState;
};
