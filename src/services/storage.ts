import { DayRecord, Task, AppState } from '../types';

const STORAGE_KEY = 'memo_app_data';

// Create a new day record
const createNewDay = (date: string): DayRecord => ({
  date,
  tasks: [],
  inbox: [],
  isStarted: false,
});

// Check if we need to switch to a new day
// Modified: Always move currentDay to history when date changes, to ensure rollover of unfinished tasks
const checkAndSwitchDay = (currentDay: DayRecord, history: DayRecord[]): { currentDay: DayRecord; history: DayRecord[] } => {
  const today = new Date().toISOString().split('T')[0];

  if (currentDay.date !== today) {
    // Always move currentDay to history when switching to a new day (even if not started)
    const newHistory = [currentDay, ...history];

    // 从最后一条历史记录中获取未完成的小事，流转到下一天
    const lastDayRecord = currentDay;
    const undoneSmallTasks: Task[] = [];

    // 从 tasks 中获取未完成的小事
    if (lastDayRecord.tasks) {
      lastDayRecord.tasks.forEach((t: Task) => {
        if (t.size === 'small' && !t.isDone) {
          undoneSmallTasks.push({
            ...t,
            isDone: false,
            reflection: '',
            doneAt: undefined,
            encouragement: undefined,
          });
        }
      });
    }

    // 从 inbox 中获取未完成的小事
    if (lastDayRecord.inbox) {
      lastDayRecord.inbox.forEach((t: Task) => {
        if (t.size === 'small' && !t.isDone) {
          undoneSmallTasks.push({
            ...t,
            isDone: false,
            reflection: '',
            doneAt: undefined,
            encouragement: undefined,
          });
        }
      });
    }

    const newToday = createNewDay(today);

    // 如果有未完成的小事，添加到今天的 inbox
    if (undoneSmallTasks.length > 0) {
      newToday.inbox = undoneSmallTasks;
    }

    return {
      currentDay: newToday,
      history: newHistory,
    };
  }

  return { currentDay, history };
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const loadState = (): AppState => {
  const data = localStorage.getItem(STORAGE_KEY);
  const today = new Date().toISOString().split('T')[0];

  if (!data) {
    return {
      currentDay: createNewDay(today),
      history: [],
      currentView: 'planning'
    };
  }

  const parsed = JSON.parse(data);

  // Apply day switch and rollover
  const { currentDay, history } = checkAndSwitchDay(parsed.currentDay, parsed.history || []);
  parsed.currentDay = currentDay;
  parsed.history = history;

  // Reset dayRating and journalEntry when starting a new session on the same day
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

  // If all tasks are completed and rated, auto-navigate to history
  const allDone = parsed.currentDay.isStarted && parsed.currentDay.tasks.length > 0 && parsed.currentDay.tasks.every((t: any) => t.isDone);
  if (allDone && parsed.currentDay.dayRating !== undefined) {
    parsed.currentView = 'history';
  } else if (!parsed.currentView) {
    parsed.currentView = 'planning';
  }

  return parsed;
};
