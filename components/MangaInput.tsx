import React, { useState, useRef, useEffect } from 'react';
import { ShiftEnterIcon } from './icons';

interface MangaInputProps {
  onConfirm: (chapterText: string) => void;
  isLoading: boolean;
}


const MangaInput: React.FC<MangaInputProps> = ({ onConfirm, isLoading }) => {
  const [textInput, setTextInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 60; // Compact starting height
      const maxHeight = 300; // Maximum height before scrolling
      textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [textInput]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey && !isLoading && textInput.trim()) {
      e.preventDefault();
      onConfirm(textInput);
    }
  };
  
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!textInput.trim() || isLoading) return;
    onConfirm(textInput);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-center text-sm text-gray-600 uppercase tracking-wide font-mono mb-4">Tell me a story</p>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative bg-white border border-gray-300 shadow-sm">
          <textarea
            ref={textareaRef}
            id="manga-prompt"
            value={textInput}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter your story or chapter text..."
            className="w-full p-4 bg-transparent text-gray-900 placeholder-gray-400 border-none focus:outline-none resize-none font-mono text-sm leading-relaxed overflow-hidden"
            disabled={isLoading}
            style={{ minHeight: '60px' }}
          />
          
          <div className="absolute right-3 bottom-3">
            <button
              type="submit"
              disabled={isLoading || !textInput.trim()}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wide bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
            >
              Imagine
              <ShiftEnterIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MangaInput;