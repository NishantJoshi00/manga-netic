import React, { useState } from 'react';

interface MangaInputProps {
  onConfirm: (chapterText: string) => void;
  isLoading: boolean;
}

const sampleText = `Seong Jin-Woo stared at the rank E magic crystal in his hand. Everything depended on this decision. To his side, Yi Ju-Hui was shaking her head at him, deeply worried. "No, Jin-Woo, don't," she pleaded. He knew she was right. Normally, he'd never take unnecessary risks. He wasn't brave enough. But his sister was about to enter university, and he had no money saved up. He couldn't let her go through the same pain he did. Every cent was precious. He raised his hand. "I vote for going ahead." He heard a soft sigh of resignation coming from his side.`;

const MangaInput: React.FC<MangaInputProps> = ({ onConfirm, isLoading }) => {
  const [textInput, setTextInput] = useState('');
  
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!textInput.trim() || isLoading) return;
    onConfirm(textInput);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <label htmlFor="manga-prompt" className="block text-xl font-bold text-white mb-2 font-bangers tracking-wide">
          1. Paste Your Chapter Text
        </label>
        <textarea
          id="manga-prompt"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste your story or chapter here..."
          className="w-full h-64 p-3 bg-gray-900 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-y font-sans"
          disabled={isLoading}
        />
        <div className="flex justify-between items-center mt-4">
            <button
              type="button"
              onClick={() => setTextInput(sampleText)}
              className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded text-sm"
            >
              Load Sample Text
            </button>
            <button
              type="submit"
              disabled={isLoading || !textInput.trim()}
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 px-4 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Generate Storyboard
            </button>
        </div>
      </form>
    </div>
  );
};

export default MangaInput;