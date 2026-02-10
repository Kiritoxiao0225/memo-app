
import React, { useState } from 'react';
import { DayRecord, Task } from '../types';

interface HistoryPageProps {
  history: DayRecord[];
  onBack: () => void;
  onUpdateTask?: (date: string, taskId: string, updates: Partial<Task>) => void;
  onUpdateJournal?: (date: string, journalEntry: string) => void;
  onDeleteDay?: (date: string) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ history, onBack, onUpdateTask, onUpdateJournal, onDeleteDay }) => {
  // 使用 Set 存储多个展开的日期
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const isExpanded = (date: string) => expandedDays.has(date);

  const toggleExpanded = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    // 直接解析 YYYY-MM-DD 格式，避免时区问题
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  // 合并 tasks 和 inbox 中的任务（兼容旧数据）
  const getAllTasks = (day: DayRecord): Task[] => {
    const allTasks = [...day.tasks, ...day.inbox];
    // 去重
    const seen = new Set<string>();
    return allTasks.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  };

  const getBigCompletionRate = (day: DayRecord) => {
    const allTasks = getAllTasks(day);
    const bigTasks = allTasks.filter(t => t.size === 'big');
    if (bigTasks.length === 0) return null;
    const completed = bigTasks.filter(t => t.isDone).length;
    return Math.round((completed / bigTasks.length) * 100);
  };

  const getSmallCompletionRate = (day: DayRecord) => {
    const allTasks = getAllTasks(day);
    const smallTasks = allTasks.filter(t => t.size === 'small');
    if (smallTasks.length === 0) return null;
    const completed = smallTasks.filter(t => t.isDone).length;
    return Math.round((completed / smallTasks.length) * 100);
  };

  const getOverallCompletionRate = (day: DayRecord) => {
    const allTasks = getAllTasks(day);
    if (allTasks.length === 0) return 0;
    const completed = allTasks.filter(t => t.isDone).length;
    return Math.round((completed / allTasks.length) * 100);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-zinc-900 flex flex-col items-center">
      <main className="w-full max-w-4xl px-6 py-12 md:py-20 flex flex-col gap-12">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-100 pb-10">
          <div>
            <div className="text-xs font-black tracking-[0.4em] uppercase text-zinc-300 mb-2">
              历史记录
            </div>
            <h1 className="text-4xl font-bold seriftitle tracking-tight text-zinc-800">
              过往的日子
            </h1>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <span className="text-sm font-medium">返回</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </header>

        {/* History List */}
        <div className="flex flex-col gap-4 animate-in fade-in duration-700">
          {history.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <p className="text-zinc-400 font-medium">还没有历史记录</p>
              <p className="text-zinc-300 text-sm mt-2">开始记录你的第一天吧</p>
            </div>
          ) : (
            history.map((day) => {
              const overallRate = getOverallCompletionRate(day);
              const bigRate = getBigCompletionRate(day);
              const smallRate = getSmallCompletionRate(day);
              const dayExpanded = isExpanded(day.date);
              const allTasks = getAllTasks(day);
              const bigTasks = allTasks.filter(t => t.size === 'big');
              const smallTasks = allTasks.filter(t => t.size === 'small');

              return (
                <div
                  key={day.date}
                  className="bg-white border border-zinc-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Day Header - 整个头部可点击 */}
                  <button
                    onClick={() => toggleExpanded(day.date)}
                    className="w-full p-6 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg seriftitle ${
                        overallRate === 100
                          ? 'bg-emerald-100 text-emerald-600'
                          : overallRate >= 50
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-zinc-100 text-zinc-400'
                      }`}>
                        {overallRate}%
                      </div>
                      <div>
                        <div className="font-bold seriftitle text-lg text-zinc-800">
                          {formatDate(day.date)}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1 flex gap-3">
                          {bigRate !== null && (
                            <span>大事: {bigTasks.filter(t => t.isDone).length}/{bigTasks.length}</span>
                          )}
                          {smallRate !== null && smallTasks.length > 0 && (
                            <span>小事: {smallTasks.filter(t => t.isDone).length}/{smallTasks.length}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-zinc-300 transition-transform ${dayExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>

                  {/* Expanded Content */}
                  {dayExpanded && (
                    <div className="px-6 pb-6 border-t border-zinc-50 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Big Tasks */}
                      {bigTasks.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                            今日大事
                          </h4>
                          <div className="flex flex-col gap-2">
                            {bigTasks.map((task, idx) => (
                              <button
                                key={task.id}
                                onClick={() => {
                                  if (onUpdateTask) {
                                    onUpdateTask(day.date, task.id, { isDone: !task.isDone });
                                  }
                                }}
                                className={`flex items-start gap-3 p-4 rounded-xl transition-all text-left ${
                                  task.isDone ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-zinc-50 hover:bg-zinc-100'
                                }`}
                              >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  task.isDone
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-zinc-200 text-zinc-400'
                                }`}>
                                  {task.isDone ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                    </svg>
                                  ) : (
                                    idx + 1
                                  )}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <span className={`font-bold seriftitle block ${
                                    task.isDone ? 'text-zinc-700 line-through' : 'text-zinc-600'
                                  }`}>
                                    {task.title}
                                  </span>
                                  {task.isDone && task.encouragement && (
                                    <div className="mt-2 text-sm text-zinc-900 flex items-center gap-2">
                                      <span className="w-1 h-1 bg-emerald-400 rounded-full"></span>
                                      {task.encouragement}
                                    </div>
                                  )}
                                  {task.isDone && task.reflection && (
                                    <div className="mt-2 text-xs text-zinc-400 italic">
                                      "{task.reflection}"
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Small Tasks */}
                      {smallTasks.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-zinc-300 rounded-full"></span>
                            后续小事
                          </h4>
                          <div className="flex flex-col gap-2">
                            {smallTasks.map((task, idx) => (
                              <button
                                key={task.id}
                                onClick={() => {
                                  if (onUpdateTask) {
                                    onUpdateTask(day.date, task.id, { isDone: !task.isDone });
                                  }
                                }}
                                className={`flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
                                  task.isDone ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-zinc-50 hover:bg-zinc-100'
                                }`}
                              >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  task.isDone
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-zinc-200 text-zinc-400'
                                }`}>
                                  {task.isDone ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                    </svg>
                                  ) : (
                                    idx + 1
                                  )}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <span className={`font-medium block ${
                                    task.isDone ? 'text-zinc-600 line-through' : 'text-zinc-500'
                                  }`}>
                                    {task.title}
                                  </span>
                                  {task.isDone && task.encouragement && (
                                    <div className="mt-1 text-sm text-zinc-900 flex items-center gap-2">
                                      <span className="w-1 h-1 bg-emerald-400 rounded-full"></span>
                                      {task.encouragement}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Journal */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">日记</h4>
                          {onUpdateJournal && (
                            <button
                              onClick={() => {
                                const newEntry = window.prompt('编辑日记:', day.journalEntry || '');
                                if (newEntry !== null) {
                                  onUpdateJournal(day.date, newEntry);
                                }
                              }}
                              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                              编辑
                            </button>
                          )}
                        </div>
                        {day.journalEntry ? (
                          <div className="p-5 bg-zinc-900 rounded-2xl text-white">
                            <p className="text-sm leading-relaxed font-medium italic">
                              {day.journalEntry}
                            </p>
                          </div>
                        ) : (
                          <div className="p-5 bg-zinc-50 rounded-2xl text-zinc-400 italic text-sm">
                            暂无日记
                          </div>
                        )}
                      </div>

                      {/* Delete Button */}
                      {onDeleteDay && (
                        <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-center">
                          <button
                            onClick={() => {
                              if (window.confirm('确定要删除这一天的记录吗？此操作不可恢复。')) {
                                onDeleteDay(day.date);
                              }
                            }}
                            className="text-xs text-zinc-300 hover:text-rose-500 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            删除记录
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl px-6 py-10 flex justify-between items-center text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] border-t border-zinc-50">
        <div>STABLE RELATIONS</div>
        <div>V2.0</div>
      </footer>
    </div>
  );
};

export default HistoryPage;
