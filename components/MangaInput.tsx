import React, { useState } from 'react';

interface MangaInputProps {
  onConfirm: (chapterText: string) => void;
  isLoading: boolean;
}


const MangaInput: React.FC<MangaInputProps> = ({ onConfirm, isLoading }) => {
  const [textInput, setTextInput] = useState('');
  
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!textInput.trim() || isLoading) return;
    onConfirm(textInput);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="border border-gray-300 bg-gray-50">
        <div className="border-b border-gray-300 px-6 py-4">
          <label htmlFor="manga-prompt" className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
            01. Chapter Text Input
          </label>
        </div>
        <div className="p-6">
          <textarea
            id="manga-prompt"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter your story or chapter text..."
            className="w-full h-64 p-4 bg-white text-gray-900 border border-gray-300 focus:outline-none focus:border-gray-600 resize-y font-mono text-sm leading-relaxed"
            disabled={isLoading}
          />
          <div className="flex justify-end items-center mt-6 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading || !textInput.trim()}
                className="px-6 py-2 text-xs font-bold uppercase tracking-wide bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Generate Storyboard
              </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MangaInput;