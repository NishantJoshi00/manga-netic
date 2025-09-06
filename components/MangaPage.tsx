
import React from 'react';
import type { MangaStripData } from '../types';
import MangaPanel from './MangaPanel';

interface MangaPageProps {
  data: MangaStripData;
  stripNumber: number;
}

const MangaPage: React.FC<MangaPageProps> = ({ data, stripNumber }) => {
  return (
    <div className="w-full max-w-md mx-auto p-2">
      <div className="bg-white p-2 border-4 border-gray-700 shadow-2xl">
        <h1 className="font-bangers text-4xl text-black text-center mb-4 tracking-wider">
          {`Strip #${stripNumber}`}
        </h1>
        <div className="flex flex-col gap-2">
          {data.panels.sort((a, b) => a.panelNumber - b.panelNumber).map((panel) => (
            <MangaPanel key={panel.panelNumber} panel={panel} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MangaPage;