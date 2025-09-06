import React, { useState, useCallback } from 'react';
import MangaInput from './components/MangaInput';
import MangaPage from './components/MangaPage';
import Loader from './components/Loader';
import CharacterImageUploader from './components/CharacterImageUploader';
import { generateCharacterDesigns, generatePanelImage, generateStoryboard } from './services/geminiService';
import type { MangaStripData, Character, InputStrip } from './types';
import { GenerationState } from './types';

const App: React.FC = () => {
  const [generationState, setGenerationState] = useState<GenerationState>(GenerationState.INPUT);
  const [chapterText, setChapterText] = useState('');
  const [inputStrips, setInputStrips] = useState<InputStrip[]>([]);
  const [generatedStrips, setGeneratedStrips] = useState<MangaStripData[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const isLoading = generationState === GenerationState.GENERATING || generationState === GenerationState.GENERATING_STORYBOARD;

  const handleChapterSubmit = useCallback(async (text: string) => {
    setChapterText(text);
    setGenerationState(GenerationState.GENERATING_STORYBOARD);
    setLoadingMessage('Creating storyboard from your chapter...');
    setError(null);
    setGeneratedStrips([]);

    try {
      const strips = await generateStoryboard(text);
      setInputStrips(strips);
      const allCharacterNames = new Set(strips.flatMap(s => s.characters || []));
      const characterData = Array.from(allCharacterNames).map(name => ({ name }));
      setCharacters(characterData);
      setGenerationState(GenerationState.CHARACTER_SETUP);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate storyboard.');
      setGenerationState(GenerationState.INPUT);
    } finally {
        setLoadingMessage('');
    }
  }, []);

  const handleCharacterChange = (updatedCharacter: Character) => {
    setCharacters(prev => prev.map(c => c.name === updatedCharacter.name ? {...c, ...updatedCharacter} : c));
  };
  
  const handleBackToInput = () => {
    setGenerationState(GenerationState.INPUT);
  };

  const handleGenerateManga = useCallback(async () => {
    setGenerationState(GenerationState.GENERATING);
    setError(null);
    
    try {
      let finalCharacters = [...characters];
      const charsToDesign = characters.filter(c => !c.base64Image);
      
      if (charsToDesign.length > 0) {
        setLoadingMessage(`Designing ${charsToDesign.length} character(s)...`);
        const designs = await generateCharacterDesigns(charsToDesign.map(c => c.name), chapterText);
        
        finalCharacters = finalCharacters.map(c => {
          const foundDesign = designs.find(d => d.name === c.name);
          return foundDesign ? { ...c, generatedDescription: foundDesign.description } : c;
        });
        setCharacters(finalCharacters);
      }

      const stripsToRender: MangaStripData[] = [];
      for (let i = 0; i < inputStrips.length; i++) {
        const strip = inputStrips[i];
        const initialStripData: MangaStripData = {
          description: strip.description,
          panels: strip.panels.map((p, idx) => ({ ...p, panelNumber: idx + 1 }))
        };
        stripsToRender.push(initialStripData);
        setGeneratedStrips([...stripsToRender]);

        for (let j = 0; j < strip.panels.length; j++) {
          const panel = strip.panels[j];
          setLoadingMessage(`Drawing strip ${i + 1}, panel ${j + 1}...`);

          const imageUrl = await generatePanelImage(panel.description, strip.description, finalCharacters, panel.characters);

          stripsToRender[i].panels[j].imageUrl = imageUrl;
          setGeneratedStrips([...stripsToRender]);
        }
      }
      setGenerationState(GenerationState.VIEWING);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setGenerationState(GenerationState.CHARACTER_SETUP); // Go back to setup on error
    } finally {
      setLoadingMessage('');
    }
  }, [characters, inputStrips, chapterText]);

  const renderContent = () => {
    switch (generationState) {
      case GenerationState.INPUT:
        return <MangaInput onConfirm={handleChapterSubmit} isLoading={false} />;
      
      case GenerationState.GENERATING_STORYBOARD:
        return <Loader message={loadingMessage} />;

      case GenerationState.CHARACTER_SETUP:
      case GenerationState.GENERATING:
      case GenerationState.VIEWING:
        return (
          <>
            <CharacterImageUploader 
              characters={characters}
              onCharacterChange={handleCharacterChange}
              onGenerate={handleGenerateManga}
              onBack={handleBackToInput}
              isLoading={isLoading}
            />
            {generationState === GenerationState.GENERATING && <Loader message={loadingMessage} />}
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg max-w-2xl w-full my-4">
                <p className="font-bold">Oh no, something went wrong!</p>
                <p>{error}</p>
              </div>
            )}
            {generatedStrips.map((data, index) => (
              <MangaPage key={index} data={data} stripNumber={index + 1} />
            ))}
          </>
        );
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 sm:p-8 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-5xl sm:text-6xl font-bangers text-cyan-400 tracking-wider [text-shadow:_3px_3px_0_rgb(0_0_0)]">
          AI Manga Creator
        </h1>
        <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
          Turn your story into a manga. Just paste your chapter, setup your characters, and let the AI do the rest.
        </p>
      </header>
      <main className="flex flex-col items-center gap-8">
        {renderContent()}
      </main>
      <footer className="text-center mt-12 text-gray-500 text-sm">
        <p>Powered by Google Gemini API</p>
      </footer>
    </div>
  );
};

export default App;