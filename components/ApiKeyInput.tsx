import React, { useState, useEffect } from 'react';

interface ApiKeyInputProps {
  onApiKeySet: (apiKey: string) => void;
}

const API_KEY_STORAGE = 'gemini_api_key';

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE);
    if (storedKey) {
      setApiKey(storedKey);
      onApiKeySet(storedKey);
    }
  }, [onApiKeySet]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('AI')) {
      setError('Invalid API key format. Gemini API keys start with "AI"');
      return;
    }

    if (apiKey.length < 30) {
      setError('API key appears too short. Please check your key');
      return;
    }

    try {
      localStorage.setItem(API_KEY_STORAGE, apiKey);
      onApiKeySet(apiKey);
    } catch (err) {
      setError('Failed to save API key to local storage');
    }
  };

  const handleClear = () => {
    localStorage.removeItem(API_KEY_STORAGE);
    setApiKey('');
    onApiKeySet('');
    setError('');
  };

  return (
    <div className="bg-gray-50 border border-gray-300 p-6 max-w-md w-full">
      <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide mb-4">
        API Key Required
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Enter your Google Gemini API key to generate manga. Your key will be stored securely in your browser.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type={isVisible ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AI..."
            className="w-full px-3 py-3 border border-gray-300 focus:border-gray-600 focus:outline-none text-sm font-mono bg-white"
          />
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 text-xs font-mono uppercase"
          >
            {isVisible ? 'Hide' : 'Show'}
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-xs font-mono">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 text-xs font-mono uppercase tracking-wide"
          >
            Save API Key
          </button>
          {apiKey && (
            <button
              type="button"
              onClick={handleClear}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 text-xs font-mono uppercase tracking-wide"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 text-xs text-gray-500">
        <p className="mb-2">Get your API key from:</p>
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 underline font-mono"
        >
          aistudio.google.com/apikey
        </a>
      </div>
    </div>
  );
};

export default ApiKeyInput;
export { API_KEY_STORAGE };