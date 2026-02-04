
import { DayRecord, AppState } from '../types';

const STORAGE_KEY = 'memo_app_data';

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const loadState = (): AppState => {
  const data = localStorage.getItem(STORAGE_KEY);
  const today = new Date().toISOString().split('T')[0];

  const createNewDay = (date: string): DayRecord => ({
    date,
    tasks: [],
    inbox: [],
    isStarted: false,
  });

  if (!data) {
    return {
      currentDay: createNewDay(today),
      history: [],
      currentView: 'planning'
    };
  }

  const parsed = JSON.parse(data);

  // If it's a new day, move current to history
  if (parsed.currentDay.date !== today) {
    const newHistory = [parsed.currentDay, ...parsed.history];
    return {
      currentDay: createNewDay(today),
      history: newHistory,
      currentView: 'planning'
    };
  }

  // Reset dayRating and journalEntry when starting a new session on the same day
  // This allows users to re-do their day evaluation if they haven't switched days
  if (parsed.currentDay.dayRating !== undefined) {
    delete parsed.currentDay.dayRating;
  }
  if (parsed.currentDay.journalEntry !== undefined) {
    delete parsed.currentDay.journalEntry;
  }

  // Migration for old data structures
  if (parsed.currentDay.inbox === undefined) {
    parsed.currentDay.inbox = [];
    parsed.currentDay.isStarted = parsed.currentDay.tasks.length === 3;
  }

  // Ensure currentView exists
  if (!parsed.currentView) {
    parsed.currentView = 'planning';
  }

  return parsed;
};
