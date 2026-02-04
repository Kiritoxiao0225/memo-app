import React, { useState } from 'react';
import { DayRecord } from '../types';

interface HistoryPageProps {
  history: DayRecord[];
  onBack: () => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ history, onBack }) => {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const getCompletionRate = (day: DayRecord) => {
    if (day.tasks.length === 0) return 0;
    const completed = day.tasks.filter(t => t.isDone).length;
    return Math.round((completed / day.tasks.length) * 100);
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
              const completionRate = getCompletionRate(day);
              const isExpanded = expandedDay === day.date;

              return (
                <div
                  key={day.date}
                  className="bg-white border border-zinc-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Day Header */}
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                    className="w-full p-6 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg seriftitle ${
                        completionRate === 100
                          ? 'bg-emerald-100 text-emerald-600'
                          : completionRate >= 50
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-zinc-100 text-zinc-400'
                      }`}>
                        {completionRate}%
                      </div>
                      <div>
                        <div className="font-bold seriftitle text-lg text-zinc-800">
                          {formatDate(day.date)}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {day.tasks.filter(t => t.isDone).length} / {day.tasks.length} 件事完成
                        </div>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-zinc-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-zinc-50 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Tasks */}
                      <div className="mt-4">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">日程</h4>
                        <div className="flex flex-col gap-2">
                          {day.tasks.map((task, idx) => (
                            <div
                              key={task.id}
                              className={`flex items-center gap-3 p-3 rounded-xl ${
                                task.isDone ? 'bg-emerald-50' : 'bg-zinc-50'
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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
                              <span className={`flex-1 font-medium ${
                                task.isDone ? 'text-zinc-600 line-through' : 'text-zinc-500'
                              }`}>
                                {task.title}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                                task.size === 'big' ? 'bg-rose-100 text-rose-500' : 'bg-zinc-100 text-zinc-400'
                              }`}>
                                {task.size === 'big' ? '大事' : '小事'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Journal */}
                      {day.journalEntry && (
                        <div className="mt-6">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">日记</h4>
                          <div className="p-4 bg-zinc-50 rounded-xl italic text-zinc-600 text-sm leading-relaxed">
                            "{day.journalEntry}"
                          </div>
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
