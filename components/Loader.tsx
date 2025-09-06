
import React from 'react';
import { LoadingSpinner } from './icons';

interface LoaderProps {
  message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 border border-gray-300 bg-gray-50">
      <LoadingSpinner className="w-8 h-8 text-gray-600 animate-spin" />
      <p className="mt-4 text-xs text-gray-600 font-mono uppercase tracking-wide">{message}</p>
    </div>
  );
};

export default Loader;
