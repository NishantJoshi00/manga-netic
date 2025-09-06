
import React from 'react';
import type { MangaStripData } from '../types';
import MangaPanel from './MangaPanel';

interface MangaPageProps {
  data: MangaStripData;
  stripNumber: number;
}

const MangaPage: React.FC<MangaPageProps> = ({ data, stripNumber }) => {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white border border-gray-400">
        <div className="border-b border-gray-300 px-4 py-3 bg-gray-100">
          <h1 className="font-mono text-sm font-bold text-gray-900 uppercase tracking-wide text-center">
            {`Strip ${stripNumber.toString().padStart(2, '0')}`}
          </h1>
        </div>
        <div className="p-2 space-y-2">
          {data.panels.sort((a, b) => a.panelNumber - b.panelNumber).map((panel) => (
            <MangaPanel key={panel.panelNumber} panel={panel} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MangaPage;