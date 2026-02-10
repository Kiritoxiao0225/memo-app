
import { DayRecord, Task, AppState } from '../types';

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

    // 从最后一条历史记录中获取未完成的小事，流转到下一天
    const lastDayRecord = parsed.currentDay;
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

  // If all tasks are completed and rated, auto-navigate to history
  const allDone = parsed.currentDay.isStarted && parsed.currentDay.tasks.length > 0 && parsed.currentDay.tasks.every((t: any) => t.isDone);
  if (allDone && parsed.currentDay.dayRating !== undefined) {
    parsed.currentView = 'history';
  } else if (!parsed.currentView) {
    parsed.currentView = 'planning';
  }

  return parsed;
};
