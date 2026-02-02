
export type TaskSize = 'big' | 'small';

export interface Task {
  id: string;
  title: string;
  size: TaskSize;
  isDone: boolean;
  reflection: string;
  doneAt?: string;
  encouragement?: string;
}

export interface DayRecord {
  date: string;
  tasks: Task[]; // The active 3 tasks
  inbox: Task[]; // The pool of potential tasks
  isStarted: boolean; // Whether the user has confirmed their 3 things
  dayReflection?: string;
  dayRating?: boolean;
}

export interface AppState {
  currentDay: DayRecord;
  history: DayRecord[];
}
