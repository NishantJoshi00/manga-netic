
import React from 'react';
import { LoadingSpinner } from './icons';

interface LoaderProps {
  message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-800/50 rounded-lg">
      <LoadingSpinner className="w-12 h-12 text-cyan-400" />
      <p className="mt-4 text-lg text-gray-300 font-semibold tracking-wide">{message}</p>
    </div>
  );
};

export default Loader;
