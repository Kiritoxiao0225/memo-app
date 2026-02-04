import React, { useState, useEffect } from 'react';
import { Task } from '../types';

interface JournalPageProps {
  tasks: Task[];
  rating: boolean;
  journalEntry: string;
  onSaveJournal: (entry: string) => void;
  onBack: () => void;
}

const JournalPage: React.FC<JournalPageProps> = ({
  tasks,
  rating,
  journalEntry: initialEntry,
  onSaveJournal,
  onBack,
}) => {
  const [entry, setEntry] = useState(initialEntry || '');
  const [isEditing, setIsEditing] = useState(!initialEntry);
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-generate journal when component mounts if no entry
  useEffect(() => {
    if (!initialEntry && tasks.length > 0) {
      handleGenerate();
    }
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Call parent's generate function via callback
    onSaveJournal('__GENERATING__');
    setIsGenerating(false);
  };

  const handleSave = () => {
    if (entry.trim()) {
      onSaveJournal(entry);
    }
  };

  const completedTasks = tasks.filter(t => t.isDone);
  const incompleteTasks = tasks.filter(t => !t.isDone);

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-zinc-900 flex flex-col items-center">
      <main className="w-full max-w-6xl px-6 py-12 md:py-20 flex flex-col gap-12">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-100 pb-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <span className="text-sm font-medium">返回</span>
          </button>
        </header>

        {/* Today's Summary */}
        <section className="animate-in fade-in duration-700">
          <div className="flex items-center gap-3 mb-8">
            <div className={`w-3 h-3 rounded-full ${rating ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></div>
            <span className="text-xs font-black tracking-[0.4em] uppercase text-zinc-300">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </div>

          {/* Task Summary */}
          <div className="bg-white border border-zinc-100 rounded-[3rem] p-10 mb-8">
            <h2 className="text-2xl font-bold seriftitle mb-6 text-zinc-800">今日日程回顾</h2>

            {completedTasks.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">
                  已完成 ({completedTasks.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 text-zinc-600">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                      </span>
                      <span className="font-medium">{task.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {incompleteTasks.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
                  未完成 ({incompleteTasks.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {incompleteTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 text-zinc-400">
                      <span className="w-6 h-6 rounded-full border-2 border-zinc-200"></span>
                      <span className="font-medium">{task.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Journal Section */}
          <div className="bg-zinc-900 rounded-[3rem] p-10 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold seriftitle">今日日记</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-zinc-400 uppercase tracking-widest hover:text-white transition-colors"
                >
                  编辑
                </button>
              )}
            </div>

            {isGenerating ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-zinc-700 border-t-white rounded-full animate-spin"></div>
                <span className="ml-4 text-zinc-400">正在生成日记...</span>
              </div>
            ) : isEditing ? (
              <div>
                <textarea
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  placeholder="写下今天的感受..."
                  className="w-full h-64 p-6 bg-zinc-800 rounded-2xl text-white text-lg font-medium leading-relaxed outline-none focus:ring-2 focus:ring-zinc-700 resize-none"
                />
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleGenerate}
                    className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-bold rounded-2xl hover:bg-zinc-700 transition-colors"
                  >
                    AI 重新生成
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!entry.trim()}
                    className="flex-1 py-4 bg-white text-zinc-900 font-bold rounded-2xl hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    保存日记
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-lg leading-relaxed font-medium text-zinc-200 whitespace-pre-wrap">
                  {entry || '还没有日记，点击编辑开始写...'}
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-6 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors"
                >
                  继续编辑
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl px-6 py-10 flex justify-between items-center text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] border-t border-zinc-50">
        <div>STABLE RELATIONS</div>
        <div>V2.0</div>
      </footer>
    </div>
  );
};

export default JournalPage;
