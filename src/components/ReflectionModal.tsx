
import React, { useState, useEffect } from 'react';

interface ReflectionModalProps {
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reflection: string) => void;
}

const ReflectionModal: React.FC<ReflectionModalProps> = ({ taskTitle, isOpen, onClose, onSubmit }) => {
  const [text, setText] = useState('');

  // Reset text when modal opens
  useEffect(() => {
    if (isOpen) {
      setText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
        <h3 className="text-xl font-bold mb-4 seriftitle">诚实复盘：{taskTitle}</h3>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          既然完成了，听你说一句实话。刚才在这个过程中，你真实的感觉是什么？（哪怕是吐槽也可以）
        </p>
        <textarea
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full h-32 p-4 border border-gray-100 bg-gray-50 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all resize-none mb-6"
          placeholder="写在这里..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-gray-400 font-medium hover:bg-gray-50 rounded-xl transition-colors"
          >
            稍后再说
          </button>
          <button
            onClick={() => text.trim() && onSubmit(text)}
            disabled={!text.trim()}
            className="flex-1 py-3 bg-black text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-30"
          >
            说完了
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReflectionModal;
