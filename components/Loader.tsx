
import React, { useEffect, useRef } from 'react';
import { LoadingSpinner } from './icons';

interface LoaderProps {
  message: string;
  streamingContent?: string;
}

const Loader: React.FC<LoaderProps> = ({ message, streamingContent }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamingContent]);

  return (
    <div className="flex flex-col items-center justify-center p-8 border border-gray-300 bg-gray-50">
      <LoadingSpinner className="w-8 h-8 text-gray-600 animate-spin" />
      <p className="mt-4 text-xs text-gray-600 font-mono uppercase tracking-wide">{message}</p>
      
      {streamingContent && (
        <div className="mt-8 w-full max-w-3xl">
          <div className="flex items-center justify-between mb-3 border-b border-gray-300 pb-2">
            <p className="text-xs text-gray-600 font-mono uppercase tracking-wide flex items-center">
              <span className="inline-block w-1 h-1 bg-gray-600 mr-2 animate-pulse"></span>
              AI Processing
            </p>
            <p className="text-xs text-gray-500 font-mono tabular-nums">
              {streamingContent.length.toLocaleString()} chars
            </p>
          </div>
          
          <div 
            ref={scrollRef}
            className="bg-white border border-gray-300 p-4 max-h-64 overflow-y-auto font-mono text-xs leading-relaxed"
          >
            <pre className="text-gray-700 whitespace-pre-wrap break-words">
              {streamingContent}
              <span className="inline-block w-1 h-3 bg-gray-600 ml-1 animate-pulse"></span>
            </pre>
          </div>
          
          <div className="mt-3 pt-2 border-t border-gray-300">
            <div className="flex items-center justify-center space-x-6 text-xs font-mono uppercase tracking-wide">
              {streamingContent.includes('{') && (
                <span className="text-gray-600">■ Structure</span>
              )}
              {streamingContent.includes('"panels"') && (
                <span className="text-gray-600">■ Panels</span>
              )}
              {streamingContent.includes('"characters"') && (
                <span className="text-gray-600">■ Characters</span>
              )}
              {streamingContent.includes('"description"') && (
                <span className="text-gray-600">■ Descriptions</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loader;
