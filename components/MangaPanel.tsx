import React from 'react';
import type { Panel, TextBlock } from '../types';
import { LoadingSpinner } from './icons';

interface MangaPanelProps {
  panel: Panel;
}

const TextBlockOverlay: React.FC<{ textBlock: TextBlock }> = ({ textBlock }) => {
  const { type, content, speaker } = textBlock;
  if (!content) return null;

  let baseClasses = 'p-2 text-black shadow-md w-fit max-w-[90%] pointer-events-auto';
  let innerContent = <>{content}</>;

  switch (type) {
    case 'dialogue':
      baseClasses += ' bg-white rounded-xl border-2 border-black font-comic';
      if (speaker) {
        innerContent = (
          <>
            <strong className="block text-sm font-bold">{speaker}</strong>
            {content}
          </>
        );
      }
      break;
    case 'narration':
      baseClasses += ' bg-amber-50 rounded border-2 border-black font-comic text-sm';
      break;
    case 'thought':
      baseClasses += ' bg-gray-200 rounded-xl border-2 border-dashed border-black font-comic italic';
      break;
    default:
      return null;
  }

  return <div className={baseClasses}>{innerContent}</div>;
};

const TextOverlays: React.FC<{ panel: Panel }> = ({ panel }) => {
  if (!panel.text || panel.text.length === 0) return null;

  const regularText = panel.text.filter(t => t.type !== 'action');
  const actionText = panel.text.filter(t => t.type === 'action');

  return (
    <>
      <div className="absolute bottom-2 left-2 right-2 flex flex-col items-start gap-1 pointer-events-none">
        {regularText.map((block, index) => (
          <TextBlockOverlay key={index} textBlock={block} />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {actionText.map((block, index) => (
          <div key={index} className="font-bangers text-6xl text-white [text-shadow:_2px_2px_0_rgb(0_0_0),_-2px_-2px_0_rgb(0_0_0),_2px_-2px_0_rgb(0_0_0),_-2px_2px_0_rgb(0_0_0),_2px_2px_5px_rgba(0,0,0,0.6)] -rotate-12 select-none p-4">
            {block.content}
          </div>
        ))}
      </div>
    </>
  );
};

const MangaPanel: React.FC<MangaPanelProps> = ({ panel }) => {
  return (
    <div className="relative w-full aspect-[9/16] bg-gray-800 border-2 border-gray-600 flex items-center justify-center overflow-hidden">
      {panel.imageUrl ? (
        <img src={panel.imageUrl} alt={panel.description} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" />
      ) : (
        <div className="flex flex-col items-center animate-pulse">
          <LoadingSpinner className="w-8 h-8 text-gray-500" />
          <p className="text-gray-400 mt-2 text-sm">Drawing...</p>
        </div>
      )}
      {panel.title && (
         <div className="absolute top-2 left-1/2 -translate-x-1/2 font-bangers text-3xl text-white text-center [text-shadow:_2px_2px_4px_rgba(0,0,0,0.9)] select-none pointer-events-none p-1">
            {panel.title}
         </div>
      )}
      <TextOverlays panel={panel} />
    </div>
  );
};

export default MangaPanel;