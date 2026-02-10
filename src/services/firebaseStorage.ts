
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
// 简化：只执行日期切换，不执行流转
// 流转逻辑由 App.tsx 中的 startDay() 统一处理
const checkAndSwitchDay = (currentDay: DayRecord, history: DayRecord[]): { currentDay: DayRecord; history: DayRecord[] } => {
  // 使用本地时区日期，避免时区问题
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (currentDay.date !== todayStr) {
    // 切换到新的一天，将当前天归档到历史
    const newHistory = [currentDay, ...history];
    // 创建一个新的空记录（不流转任何任务）
    const newToday = createNewDay(todayStr);
    return {
      currentDay: newToday,
      history: newHistory,
    };
  }

  return { currentDay, history };
};

// Use localStorage fallback
const useLocalStorage = () => !db;

// Flag to indicate initial load
let isInitialLoad = true;

export const subscribeToData = (callback: (state: AppState) => void) => {
  isInitialLoad = true;
  if (useLocalStorage()) {
    // Use localStorage
    const data = loadFromLocal();
    callback(data);
    isInitialLoad = false;
    return () => {};
  }

  const docRef = doc(db!, 'appData', DATA_DOC_ID);

  return onSnapshot(docRef, async (docSnap) => {
    if (docSnap.exists()) {
      let data = docSnap.data() as AppState;

      if (!data.currentView) {
        data = { ...data, currentView: 'planning' };
      }

      // 获取今天的日期字符串
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      // 检查是否需要执行流转（只有日期变化且今天还没流转过才执行）
      const needsRollover = data.currentDay.date !== todayStr && data.lastRolloverDate !== todayStr;

      const { currentDay, history } = checkAndSwitchDay(data.currentDay, data.history || []);

      if (needsRollover) {
        // 执行流转
        data = { ...data, currentDay, history, currentView: 'planning', lastRolloverDate: todayStr };

        // Reset dayRating and journalEntry when starting a new session on the same day
        if (data.currentDay.dayRating !== undefined) {
          delete data.currentDay.dayRating;
        }
        if (data.currentDay.journalEntry !== undefined) {
          delete data.currentDay.journalEntry;
        }

        // Add a timestamp to force Firebase to recognize data has changed
        (data as any)._updatedAt = Date.now();

        await setDoc(docRef, data);
      } else {
        // 如果今天已经流转过，直接更新数据（不重复流转）
        data = { ...data, currentDay, history };
      }

      callback(data);
      isInitialLoad = false;
    } else {
      // 使用本地时区日期
      const t = new Date();
      const y = t.getFullYear();
      const m = String(t.getMonth() + 1).padStart(2, '0');
      const d = String(t.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${d}`;
      const defaultState: AppState = {
        currentDay: createNewDay(todayStr),
        history: [],
        currentView: 'planning',
      };
      await setDoc(docRef, defaultState);
      callback(defaultState);
      isInitialLoad = false;
    }
  });
};

export const saveState = async (state: AppState): Promise<void> => {
  if (useLocalStorage()) {
    saveToLocal(state);
    return;
  }

  // Don't save during initial load - let subscribeToData handle the initial save with day rollover
  if (isInitialLoad) {
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

    // 获取今天的日期字符串
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // 检查是否需要执行流转
    const needsRollover = data.currentDay.date !== todayStr && data.lastRolloverDate !== todayStr;

    const { currentDay, history } = checkAndSwitchDay(data.currentDay, data.history || []);

    if (needsRollover) {
      data = { ...data, currentDay, history, currentView: 'planning', lastRolloverDate: todayStr };

      // Reset dayRating and journalEntry when starting a new session on the same day
      if (data.currentDay.dayRating !== undefined) {
        delete data.currentDay.dayRating;
      }
      if (data.currentDay.journalEntry !== undefined) {
        delete data.currentDay.journalEntry;
      }

      // Add a timestamp to force Firebase to recognize data has changed
      (data as any)._updatedAt = Date.now();

      await setDoc(docRef, data);
    } else {
      data = { ...data, currentDay, history };
    }

    return data;
  }

  // 使用本地时区日期，避免时区问题
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const defaultState: AppState = {
    currentDay: createNewDay(todayStr),
    history: [],
    currentView: 'planning',
  };

  await setDoc(docRef, defaultState);
  return defaultState;
};
