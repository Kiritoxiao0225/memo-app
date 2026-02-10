
import React, { useState, useEffect, useRef } from 'react';
import { Task, AppState, DayRecord } from './types';
import { subscribeToData, saveState } from './services/firebaseStorage';
import { generateEncouragement, generateJournalEntry } from './services/deepseekService';
import ReflectionModal from './components/ReflectionModal';
import EditModal from './components/EditModal';
import JournalPage from './components/JournalPage';
import HistoryPage from './components/HistoryPage';

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [inputTitle, setInputTitle] = useState('');
  const [reflectingTaskId, setReflectingTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [showEncouragement, setShowEncouragement] = useState<{title: string, msg: string} | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // 流转提示
  const [rolloverCount, setRolloverCount] = useState(0);

  // Inline editing state for the Thinking Pool
  const [editingInboxId, setEditingInboxId] = useState<string | null>(null);
  const [editingInboxValue, setEditingInboxValue] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to Firebase data
  useEffect(() => {
    const unsubscribe = subscribeToData((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  // Save to Firebase when state changes
  useEffect(() => {
    if (state) {
      saveState(state);
    }
  }, [state]);

  useEffect(() => {
    if (editingInboxId && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [editingInboxId]);

  // Show loading while fetching data
  if (!state) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 font-medium tracking-widest">加载中...</p>
        </div>
      </div>
    );
  }

  const { currentDay, currentView, history } = state;
  const isStarted = currentDay.isStarted;
  const isDayFinished = !!currentDay.dayRating || currentView === 'journal';

  const bigTasks = currentDay.tasks.filter((t: Task) => t.size === 'big');
  const smallTasks = currentDay.tasks.filter((t: Task) => t.size === 'small');
  const activeReflectingTask = currentDay.tasks.find((t: Task) => t.id === reflectingTaskId);

  const allBigDone = isStarted && bigTasks.length > 0 && bigTasks.every((t: Task) => t.isDone);
  const allDone = isStarted && currentDay.tasks.length > 0 && currentDay.tasks.every((t: Task) => t.isDone);
  const hasUndoneSmallTasks = isStarted && smallTasks.some((t: Task) => !t.isDone);

  // Navigation functions
  const navigateTo = (view: 'planning' | 'working' | 'journal' | 'history') => {
    setState((prev: AppState | null) => {
      if (!prev) return prev;
      return { ...prev, currentView: view };
    });
  };

  const handleGenerateJournal = async () => {
    if (!currentDay.tasks.length) return;

    const entry = await generateJournalEntry(currentDay.tasks, currentDay.dayRating || false);

    setState((prev: AppState | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentDay: {
          ...prev.currentDay,
          journalEntry: entry,
          journalCreatedAt: new Date().toISOString(),
        },
        currentView: 'journal',
      };
    });
  };

  const handleSaveJournal = (entry: string) => {
    if (entry === '__GENERATING__') {
      handleGenerateJournal();
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // 检查是否有未完成的小事需要流转到下一天（同时从 tasks 和 inbox 中获取）
    const undoneSmallTasks = currentDay.tasks.filter((t: Task) => t.size === 'small' && !t.isDone);
    const undoneSmallTasksFromInbox = currentDay.inbox.filter((t: Task) => t.size === 'small' && !t.isDone);
    const allUndoneSmallTasks = [...undoneSmallTasks, ...undoneSmallTasksFromInbox];

    setState((prev: AppState | null) => {
      if (!prev) return prev;

      // 检查历史中是否已有今天的记录
      const existingHistoryIndex = prev.history.findIndex(day => day.date === today);

      let newHistory = [...prev.history];
      const journalData = {
        journalEntry: entry,
        journalCreatedAt: new Date().toISOString(),
      };

      if (existingHistoryIndex >= 0) {
        // 更新已有的今天记录
        newHistory[existingHistoryIndex] = {
          ...prev.history[existingHistoryIndex],
          ...journalData,
        };
      } else {
        // 添加新记录
        newHistory = [{
          ...prev.currentDay,
          ...journalData,
        }, ...prev.history];
      }

      // 如果有未完成的小事，流转到下一天
      if (allUndoneSmallTasks.length > 0) {
        // 生成新的任务列表（清除完成状态和复盘，并生成新的 id）
        const rolloverTasks: Task[] = allUndoneSmallTasks.map((t: Task) => ({
          ...t,
          id: crypto.randomUUID(),
          isDone: false,
          reflection: '',
          doneAt: undefined,
          encouragement: undefined,
        }));

        setTimeout(() => setRolloverCount(allUndoneSmallTasks.length), 100);

        // 明天：直接使用与 checkAndSwitchDay 相同的方式计算
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        return {
          ...prev,
          history: newHistory,
          currentDay: {
            date: tomorrow,
            tasks: [],
            inbox: rolloverTasks,
            isStarted: false,
            dayRating: undefined,
            journalEntry: undefined,
            journalCreatedAt: undefined,
          },
          currentView: 'planning',
        };
      }

      return {
        ...prev,
        history: newHistory,
        currentDay: {
          ...prev.currentDay,
          ...journalData,
        },
        currentView: 'history',
      };
    });
  };

  // Task management functions
  const addToInbox = () => {
    if (!inputTitle.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: inputTitle.trim(),
      size: 'small',
      isDone: false,
      reflection: '',
    };
    setState((prev: AppState | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentDay: { ...prev.currentDay, inbox: [...prev.currentDay.inbox, newTask] }
      };
    });
    setInputTitle('');
  };

  const removeTaskFromInbox = (id: string) => {
    setState((prev: AppState | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentDay: {
          ...prev.currentDay,
          inbox: prev.currentDay.inbox.filter((t: Task) => t.id !== id),
          tasks: prev.currentDay.tasks.filter((t: Task) => t.id !== id)
        }
      };
    });
    if (editingInboxId === id) setEditingInboxId(null);
  };

  const startInlineEdit = (task: Task) => {
    setEditingInboxId(task.id);
    setEditingInboxValue(task.title);
  };

  const saveInlineEdit = () => {
    if (!editingInboxId) return;
    const trimmed = editingInboxValue.trim();
    if (trimmed) {
      const updater = (list: Task[]) => list.map((t: Task) => t.id === editingInboxId ? { ...t, title: trimmed } : t);
      setState((prev: AppState | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentDay: {
            ...prev.currentDay,
            inbox: updater(prev.currentDay.inbox),
            tasks: updater(prev.currentDay.tasks)
          }
        };
      });
    }
    setEditingInboxId(null);
  };

  const onDragStart = (idx: number) => {
    if (editingInboxId) setEditingInboxId(null);
    setDraggedIdx(idx);
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (targetIdx: number) => {
    if (draggedIdx === null) return;
    const newInbox = [...currentDay.inbox];
    const item = newInbox.splice(draggedIdx, 1)[0];
    newInbox.splice(targetIdx, 0, item);
    setState((prev: AppState | null) => {
      if (!prev) return prev;
      return { ...prev, currentDay: { ...prev.currentDay, inbox: newInbox } };
    });
    setDraggedIdx(null);
  };

  const startDay = () => {
    // Check if we need to roll over unfinished small tasks from the most recent incomplete day
    let tasksToUse = [...currentDay.inbox];

    // If inbox is empty, check the most recent day in history for unfinished small tasks
    if (tasksToUse.length === 0 && history.length > 0) {
      const mostRecentDay = history[0];
      const undoneSmallTasks: Task[] = [];

      // Check tasks
      mostRecentDay.tasks.forEach((t: Task) => {
        if (t.size === 'small' && !t.isDone) {
          undoneSmallTasks.push({ ...t, id: crypto.randomUUID(), isDone: false, reflection: '', doneAt: undefined, encouragement: undefined });
        }
      });

      // Check inbox
      mostRecentDay.inbox.forEach((t: Task) => {
        if (t.size === 'small' && !t.isDone) {
          undoneSmallTasks.push({ ...t, id: crypto.randomUUID(), isDone: false, reflection: '', doneAt: undefined, encouragement: undefined });
        }
      });

      if (undoneSmallTasks.length > 0) {
        tasksToUse = undoneSmallTasks;
        setRolloverCount(undoneSmallTasks.length);
      }
    }

    if (tasksToUse.length === 0) return;

    const tasks: Task[] = tasksToUse.map((task: Task, idx: number) => ({
      ...task,
      size: idx < 3 ? 'big' : 'small'
    }));

    // If we rolled over tasks, update the inbox first
    if (history.length > 0 && currentDay.inbox.length === 0) {
      setState((prev: AppState | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentDay: { ...prev.currentDay, tasks, inbox: tasksToUse, isStarted: true },
          currentView: 'working'
        };
      });
    } else {
      setState((prev: AppState | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentDay: { ...prev.currentDay, tasks, isStarted: true },
          currentView: 'working'
        };
      });
    }
  };

  const saveEditModal = (newTitle: string) => {
    if (!editingTask) return;
    const updater = (list: Task[]) => list.map((t: Task) => t.id === editingTask.id ? { ...t, title: newTitle } : t);
    setState((prev: AppState | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentDay: {
          ...prev.currentDay,
          inbox: updater(prev.currentDay.inbox),
          tasks: updater(prev.currentDay.tasks)
        }
      };
    });
    setEditingTask(null);
  };

  const handleCompleteTask = (id: string) => setReflectingTaskId(id);

  const handleReflectionSubmit = async (reflection: string) => {
    if (!reflectingTaskId) return;
    setLoadingMsg("正在思考如何鼓励你...");
    const taskToUpdate = currentDay.tasks.find((t: Task) => t.id === reflectingTaskId)!;
    const encouragement = await generateEncouragement(taskToUpdate.title, taskToUpdate.size, reflection);
    setLoadingMsg(null);

    const taskUpdater = (list: Task[]) => list.map((t: Task) =>
      t.id === reflectingTaskId
        ? { ...t, isDone: true, reflection, encouragement, doneAt: new Date().toISOString() }
        : t
    );

    setState((prev: AppState | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentDay: {
          ...prev.currentDay,
          tasks: taskUpdater(prev.currentDay.tasks),
          inbox: taskUpdater(prev.currentDay.inbox)
        }
      };
    });
    setShowEncouragement({ title: taskToUpdate.title, msg: encouragement });
    setReflectingTaskId(null);
  };

  const submitDayEnd = async (rating: boolean) => {
    setLoadingMsg("正在为你总结今日...");
    const summary = await generateJournalEntry(currentDay.tasks, rating);
    setLoadingMsg(null);

    // 先保存 dayRating 和 journalEntry，跳转到日记页面
    // 等待用户保存后才正式更新 history
    setState((prev: AppState | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentDay: {
          ...prev.currentDay,
          dayRating: rating,
          journalEntry: summary,
        },
        currentView: 'journal',
      };
    });
  };

  // Render different views
  if (currentView === 'journal') {
    return (
      <JournalPage
        tasks={currentDay.tasks}
        rating={currentDay.dayRating || false}
        journalEntry={currentDay.journalEntry || ''}
        onSaveJournal={handleSaveJournal}
        onBack={() => navigateTo('working')}
      />
    );
  }

  const handleUpdateHistoryTask = (date: string, taskId: string, updates: Partial<Task>) => {
    setState((prev: AppState | null) => {
      if (!prev) return prev;
      const newHistory = prev.history.map((day: DayRecord) => {
        if (day.date !== date) return day;
        // 查找任务是否在 tasks 或 inbox 中
        const taskInTasks = day.tasks.find(t => t.id === taskId);
        const taskInInbox = day.inbox.find(t => t.id === taskId);

        return {
          ...day,
          // 如果任务在 tasks 中，更新 tasks
          tasks: taskInTasks ? day.tasks.map((t: Task) => t.id === taskId ? { ...t, ...updates } : t) : day.tasks,
          // 如果任务在 inbox 中，更新 inbox
          inbox: taskInInbox ? day.inbox.map((t: Task) => t.id === taskId ? { ...t, ...updates } : t) : day.inbox,
        };
      });
      return { ...prev, history: newHistory };
    });
  };

  const handleUpdateHistoryJournal = (date: string, journalEntry: string) => {
    setState((prev: AppState | null) => {
      if (!prev) return prev;
      const newHistory = prev.history.map((day: DayRecord) => {
        if (day.date !== date) return day;
        return { ...day, journalEntry, journalCreatedAt: new Date().toISOString() };
      });
      return { ...prev, history: newHistory };
    });
  };

  const handleDeleteHistoryDay = (date: string) => {
    setState((prev: AppState | null) => {
      if (!prev) return prev;
      const newHistory = prev.history.filter((day: DayRecord) => day.date !== date);
      return { ...prev, history: newHistory };
    });
  };

  if (currentView === 'history') {
    return (
      <HistoryPage
        history={history}
        onBack={() => navigateTo(currentDay.isStarted ? 'working' : 'planning')}
        onUpdateTask={handleUpdateHistoryTask}
        onUpdateJournal={handleUpdateHistoryJournal}
        onDeleteDay={handleDeleteHistoryDay}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-zinc-900 flex flex-col items-center">
      {loadingMsg && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin mb-4"></div>
          <p className="text-zinc-500 font-medium tracking-widest">{loadingMsg}</p>
        </div>
      )}

      <main className="w-full max-w-6xl px-6 py-12 md:py-20 flex flex-col gap-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-100 pb-10">
          <div>
            <div className="text-zinc-400 text-xs tracking-[0.3em] uppercase mb-2 font-black">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold seriftitle tracking-tight text-zinc-800">
              {isDayFinished ? "今天已尘埃落定" : (isStarted ? "专注于当下的节奏" : "列出、排序、然后出发")}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* 历史记录按钮 */}
            {history.length > 0 && (
              <button
                onClick={() => navigateTo('history')}
                className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-400 text-[10px] font-black tracking-widest uppercase hover:bg-zinc-50 hover:text-zinc-600 transition-all flex items-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                历史 ({history.length})
              </button>
            )}
            {isStarted && (
              <>
                <button
                  onClick={() => navigateTo('planning')}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-400 text-[10px] font-black tracking-widest uppercase hover:bg-zinc-50 hover:text-zinc-600 transition-all flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 8.959 8.959 0 01-9 9 8.959 8.959 0 01-9-9z"></path></svg>
                  调整计划
                </button>
                {!isDayFinished && (
                  <div className="flex gap-2 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                    <span>PROGRESS: {currentDay.tasks.filter((t: Task) => t.isDone).length} / {currentDay.tasks.length}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </header>

        {currentView === 'planning' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* 返回按钮 - 只在已开始的日期显示 */}
            {isStarted && (
              <div className="lg:col-span-12 mb-4">
                <button
                  onClick={() => navigateTo('working')}
                  className="flex items-center gap-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                  <span className="text-sm font-medium">返回今日安排</span>
                </button>
              </div>
            )}
            <div className="lg:col-span-5 flex flex-col gap-8">
              <section className="bg-white border-2 border-zinc-900 p-2 rounded-[2rem] shadow-2xl flex items-center gap-2">
                <input
                  type="text"
                  placeholder="还有什么想做的？"
                  className="flex-1 bg-transparent p-4 text-xl font-medium outline-none seriftitle"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && addToInbox()}
                />
                <button onClick={addToInbox} disabled={!inputTitle.trim()} className="w-14 h-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-center transition-all hover:scale-95 active:scale-90 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                </button>
              </section>

              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-black text-zinc-300 uppercase tracking-[0.2em] px-2">想法池</h3>
                {currentDay.inbox.length === 0 && (
                  <div className="h-40 border-2 border-dashed border-zinc-100 rounded-[2.5rem] flex items-center justify-center text-zinc-300 italic text-sm">
                    万事开头难，写下第一件事
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {currentDay.inbox.map((task: Task, idx: number) => (
                    <div
                      key={task.id}
                      draggable={editingInboxId !== task.id}
                      onDragStart={() => onDragStart(idx)}
                      onDragOver={onDragOver}
                      onDrop={() => onDrop(idx)}
                      className={`group flex items-center gap-4 p-5 bg-white border border-zinc-100 rounded-3xl transition-all ${draggedIdx === idx ? 'opacity-20 scale-95' : 'hover:border-zinc-300 hover:shadow-sm'} ${editingInboxId === task.id ? 'ring-2 ring-zinc-900 border-transparent shadow-lg' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 font-black text-xs cursor-grab active:cursor-grabbing shrink-0 relative">
                        {task.isDone ? (
                          <div className="absolute inset-0 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                          </div>
                        ) : (idx + 1)}
                      </div>

                      {editingInboxId === task.id ? (
                        <input
                          ref={inlineInputRef}
                          className="flex-1 font-bold seriftitle text-lg outline-none bg-transparent"
                          value={editingInboxValue}
                          onChange={(e) => setEditingInboxValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveInlineEdit();
                            if (e.key === 'Escape') setEditingInboxId(null);
                          }}
                          onBlur={saveInlineEdit}
                        />
                      ) : (
                        <h4 className={`flex-1 font-bold seriftitle text-lg truncate ${task.isDone ? 'text-zinc-300 line-through' : 'text-zinc-700'}`}>{task.title}</h4>
                      )}

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {editingInboxId === task.id ? (
                          <button onClick={saveInlineEdit} className="p-2 text-emerald-500 hover:text-emerald-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                          </button>
                        ) : (
                          <>
                            <button onClick={() => startInlineEdit(task)} className="p-2 text-zinc-300 hover:text-zinc-600 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button onClick={() => removeTaskFromInbox(task.id)} className="p-2 text-zinc-300 hover:text-rose-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-6">
               <div className="bg-zinc-900 rounded-[3rem] p-10 text-white shadow-2xl sticky top-20 overflow-y-auto max-h-[80vh]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                  <h3 className="text-xl font-bold mb-8 seriftitle relative">确认今天的节奏</h3>

                  <div className="flex flex-col gap-6 mb-10 relative">
                     {currentDay.inbox.length > 0 ? (
                       <div className="flex flex-col gap-4">
                         {currentDay.inbox.map((t: Task, idx: number) => {
                           const isBig = idx < 3;
                           return (
                             <div
                               key={t.id}
                               className={`flex items-center gap-6 animate-in slide-in-from-right duration-500`}
                               style={{ transitionDelay: `${idx * 50}ms` }}
                             >
                                <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center font-black text-2xl seriftitle ${isBig ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-zinc-500'} relative`}>
                                  {t.isDone ? (
                                    <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                  ) : (idx + 1)}
                                </div>
                                <div className="flex-1 min-w-0">
                                   <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-1 ${isBig ? 'text-rose-500' : 'text-zinc-600'}`}>
                                     {isBig ? '今日大事 (Big Thing)' : `后续小事 (Small Thing ${idx + 1})`}
                                   </p>
                                   <p className={`font-bold truncate seriftitle ${isBig ? 'text-xl text-white' : 'text-lg text-zinc-400'} ${t.isDone ? 'opacity-30 line-through' : ''}`}>
                                     {t.title}
                                   </p>
                                </div>
                             </div>
                           );
                         })}
                       </div>
                     ) : (
                       <p className="text-zinc-500 italic">尚未选择任何任务...</p>
                     )}
                  </div>

                  <div className="sticky bottom-0 pt-6 bg-zinc-900/80 backdrop-blur-sm">
                    <button
                      onClick={startDay}
                      disabled={currentDay.inbox.length === 0}
                      className="w-full py-6 bg-white text-zinc-900 font-black rounded-3xl text-xl seriftitle hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-10 disabled:grayscale"
                    >
                      定好了，开启今天
                    </button>
                    <p className="mt-4 text-center text-[10px] text-zinc-500 tracking-widest font-bold uppercase">前 3 项将作为核心复盘目标</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Working 视图 */}
        {currentView === 'working' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-700">
            {/* 大事 */}
            <div className="flex flex-col gap-6">
              <h3 className="text-xs font-black text-rose-500 uppercase tracking-[0.3em] px-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                今日大事 (Big Three)
              </h3>
              {bigTasks.map((task: Task, idx: number) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  rank={idx + 1}
                  onComplete={() => handleCompleteTask(task.id)}
                  onEdit={() => setEditingTask(task)}
                />
              ))}
            </div>

            <div className="flex flex-col gap-6">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] px-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-zinc-200 rounded-full"></span>
                后续小事 (Small Things)
              </h3>
              {smallTasks.length === 0 && (
                <div className="h-32 border border-zinc-50 bg-zinc-50/30 rounded-[2.5rem] flex items-center justify-center text-zinc-300 italic text-sm">
                  今天没有额外的小事
                </div>
              )}
              {smallTasks.map((task: Task, idx: number) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  rank={idx + 4}
                  onComplete={() => handleCompleteTask(task.id)}
                  onEdit={() => setEditingTask(task)}
                />
              ))}

              {/* 评价按钮 - 只在未完成当天时显示 */}
              {!isDayFinished && allDone && (
                <div className="mt-6 bg-zinc-900 text-white p-10 rounded-[3.5rem] shadow-2xl animate-in zoom-in duration-700">
                  <h2 className="text-2xl font-bold mb-8 seriftitle text-center leading-tight">今天的仗打完了，<br/>感觉如何？</h2>
                  <div className="flex gap-4">
                    <button onClick={() => submitDayEnd(true)} className="flex-1 py-5 bg-white text-zinc-900 font-bold rounded-2xl hover:bg-emerald-50 transition-colors">过得去</button>
                    <button onClick={() => submitDayEnd(false)} className="flex-1 py-5 bg-white/10 text-white font-bold rounded-2xl hover:bg-rose-500 transition-colors">不尽兴</button>
                  </div>
                </div>
              )}

              {/* 进入总结按钮 - 大事完成但还有小事未完成时显示 */}
              {!isDayFinished && allBigDone && !allDone && hasUndoneSmallTasks && (
                <div className="mt-6 bg-white border border-zinc-200 p-6 rounded-[2.5rem] shadow-sm animate-in zoom-in duration-700">
                  <p className="text-center text-zinc-500 mb-4">所有大事已完成，小事还有 {smallTasks.filter(t => !t.isDone).length} 项未完成</p>
                  <button
                    onClick={() => submitDayEnd(true)}
                    className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-colors"
                  >
                    进入总结，结束今天
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-6xl px-6 py-10 flex justify-between items-center text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] border-t border-zinc-50">
        <div>STABLE RELATIONS</div>
        <div className="flex gap-10">
          <button onClick={() => navigateTo('history')} className="hover:text-zinc-500 transition-colors">
            PAST JOURNEYS ({history.length})
          </button>
          <span>V2.0</span>
        </div>
      </footer>

      <ReflectionModal
        isOpen={!!reflectingTaskId}
        taskTitle={activeReflectingTask?.title || ''}
        onClose={() => setReflectingTaskId(null)}
        onSubmit={handleReflectionSubmit}
      />

      <EditModal
        isOpen={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={saveEditModal}
      />

      {showEncouragement && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-zinc-900 text-white p-6 rounded-[2.5rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 z-[120] border border-white/10">
          <div className="bg-emerald-500 rounded-full p-2 flex-shrink-0 shadow-lg shadow-emerald-500/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-zinc-500 font-bold mb-0.5 truncate uppercase tracking-widest">{showEncouragement.title}</p>
            <p className="text-sm font-medium leading-snug">{showEncouragement.msg}</p>
          </div>
          <button onClick={() => setShowEncouragement(null)} className="text-zinc-700 hover:text-white transition-colors p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}

      {/* 流转提示 */}
      {rolloverCount > 0 && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-6 py-3 rounded-full shadow-xl animate-in fade-in slide-in-from-top-5 z-[120]">
          <p className="text-sm font-medium">
            提醒：有 {rolloverCount} 件未完成的小事已流转到下一天
          </p>
        </div>
      )}
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  rank: number;
  onComplete: () => void;
  onEdit: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, rank, onComplete, onEdit }) => {
  return (
    <div className={`group relative bg-white border border-zinc-100 p-8 rounded-[3rem] shadow-sm transition-all duration-500 ${task.isDone ? 'opacity-40 grayscale pointer-events-none' : 'hover:border-zinc-300 hover:shadow-md'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-zinc-200 font-black text-2xl seriftitle tracking-tighter shrink-0">0{rank}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${task.size === 'big' ? 'bg-rose-50 text-rose-500' : 'bg-zinc-50 text-zinc-400'}`}>
              {task.size === 'big' ? '大事' : '小事'}
            </span>
          </div>
          <h2 className={`text-2xl font-bold seriftitle leading-tight ${task.isDone ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
            {task.title}
          </h2>
        </div>
        <div className="flex gap-2 items-center shrink-0">
          {!task.isDone && (
            <button onClick={onEdit} className="p-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300 hover:text-zinc-600 hover:bg-zinc-50 rounded-2xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
          )}
          {!task.isDone ? (
            <button
              onClick={onComplete}
              className="group/btn w-16 h-16 border-2 border-zinc-100 bg-white text-zinc-400 rounded-[1.5rem] flex items-center justify-center hover:bg-zinc-900 hover:border-zinc-900 hover:text-white hover:scale-105 active:scale-90 transition-all shadow-sm hover:shadow-xl shadow-zinc-100"
              title="标记完成"
            >
              <svg className="w-8 h-8 opacity-20 group-hover/btn:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </button>
          ) : (
            <div className="text-emerald-500 p-4">
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
            </div>
          )}
        </div>
      </div>
      {task.reflection && (
        <div className="mt-6 pt-6 border-t border-zinc-50 italic text-zinc-400 text-sm leading-relaxed font-medium">
          "{task.reflection}"
        </div>
      )}
      {task.encouragement && (
        <div className="mt-3 text-zinc-900 text-sm font-bold flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          {task.encouragement}
        </div>
      )}
    </div>
  );
};

export default App;
