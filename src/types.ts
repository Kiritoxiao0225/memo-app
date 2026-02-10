
export type TaskSize = 'big' | 'small';

export interface Task {
  id: string;
  title: string;
  size: TaskSize;
  isDone: boolean;
  reflection: string;
  doneAt?: string;
  encouragement?: string;
  isInitial?: boolean; // 标记是否为当天初始任务
}

export interface DayRecord {
  date: string;
  tasks: Task[];
  inbox: Task[];
  isStarted: boolean;
  dayReflection?: string;
  dayRating?: boolean;
  // 新增：日记相关字段
  journalEntry?: string;  // AI 生成的日记内容
  journalCreatedAt?: string;  // 日记创建时间
  isAllCompleted?: boolean;  // 是否全部完成
}

export interface AppState {
  currentDay: DayRecord;
  history: DayRecord[];
  currentView: 'planning' | 'working' | 'journal' | 'history';
  lastRolloverDate?: string; // 记录上次流转的日期，避免重复流转
}
