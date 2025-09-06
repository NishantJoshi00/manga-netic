import React, { useState } from 'react';
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
      baseClasses += ' bg-white border border-gray-600 font-mono text-xs';
      if (speaker) {
        innerContent = (
          <>
            <strong className="block text-xs font-bold uppercase tracking-wide">{speaker}</strong>
            {content}
          </>
        );
      }
      break;
    case 'narration':
      baseClasses += ' bg-gray-100 border border-gray-600 font-mono text-xs';
      break;
    case 'thought':
      baseClasses += ' bg-gray-200 border-2 border-dashed border-gray-600 font-mono text-xs italic';
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
          <div key={index} className="font-mono text-2xl font-black text-white bg-gray-900/80 px-3 py-1 uppercase tracking-widest select-none border border-gray-600">
            {block.content}
          </div>
        ))}
      </div>
    </>
  );
};

const MangaPanel: React.FC<MangaPanelProps> = ({ panel }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isFirstPanelWithMotionPoster = panel.isFirstPanel && panel.motionPosterUrl;

  return (
    <div 
      className="relative w-full aspect-[9/16] bg-gray-200 border border-gray-400 flex items-center justify-center overflow-hidden"
      onMouseEnter={() => isFirstPanelWithMotionPoster && setIsHovered(true)}
      onMouseLeave={() => isFirstPanelWithMotionPoster && setIsHovered(false)}
    >
      {panel.imageUrl ? (
        <>
          {/* Static image - always visible */}
          <img 
            src={panel.imageUrl} 
            alt={panel.description} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isHovered && isFirstPanelWithMotionPoster ? 'opacity-0' : 'opacity-100'
            }`} 
          />
          {/* Motion poster video - only visible on hover for first panels */}
          {isFirstPanelWithMotionPoster && (
            <video
              src={panel.motionPosterUrl}
              autoPlay
              muted
              loop
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center animate-pulse">
          <LoadingSpinner className="w-6 h-6 text-gray-500" />
          <p className="text-gray-500 mt-2 text-xs font-mono uppercase tracking-wide">Generating...</p>
        </div>
      )}
      {panel.title && (
         <div className="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-lg font-bold text-white text-center bg-gray-900/80 px-2 py-1 select-none pointer-events-none uppercase tracking-wide">
            {panel.title}
         </div>
      )}
      <TextOverlays panel={panel} />
    </div>
  );
};

export default MangaPanel;