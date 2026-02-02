
import React, { useState, useEffect } from 'react';
import { Task } from '../types';

interface EditModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newTitle: string) => void;
}

const EditModal: React.FC<EditModalProps> = ({ task, isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (task) setTitle(task.title);
  }, [task]);

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 animate-in fade-in zoom-in duration-300">
        <h3 className="text-2xl font-bold mb-2 seriftitle">修正这一条</h3>
        <p className="text-zinc-400 text-sm mb-8">文字是诚实的，如果刚才写得不准，现在改掉它。</p>

        <input
          autoFocus
          className="w-full p-5 bg-zinc-50 border border-zinc-100 rounded-2xl text-lg font-medium outline-none focus:ring-2 focus:ring-zinc-900 transition-all mb-8"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && title.trim() && onSave(title)}
        />

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-zinc-400 font-bold hover:bg-zinc-50 rounded-2xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => title.trim() && onSave(title)}
            disabled={!title.trim() || title === task.title}
            className="flex-1 py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-colors disabled:opacity-30"
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
