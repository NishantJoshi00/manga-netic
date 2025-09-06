import React, { useState, useCallback } from 'react';
import MangaInput from './components/MangaInput';
import MangaPage from './components/MangaPage';
import Loader from './components/Loader';
import CharacterImageUploader from './components/CharacterImageUploader';
import { generateCharacterDesigns, generatePanelImage, generateStoryboard, generateNarration } from './services/geminiService';
import { elevenLabsService } from './services/elevenlabsService';
import type { MangaStripData, Character, InputStrip } from './types';
import { GenerationState } from './types';

const App: React.FC = () => {
  const [generationState, setGenerationState] = useState<GenerationState>(GenerationState.INPUT);
  const [chapterText, setChapterText] = useState('');
  const [inputStrips, setInputStrips] = useState<InputStrip[]>([]);
  const [generatedStrips, setGeneratedStrips] = useState<MangaStripData[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [retryContext, setRetryContext] = useState<{
    stripIndex: number;
    panelIndex: number;
    stripsToRender: MangaStripData[];
    finalCharacters: Character[];
  } | null>(null);
  
  const isLoading = generationState === GenerationState.GENERATING || generationState === GenerationState.GENERATING_STORYBOARD;

  const handleChapterSubmit = useCallback(async (text: string) => {
    console.log('[APP] Chapter submitted, starting storyboard generation');
    setChapterText(text);
    setGenerationState(GenerationState.GENERATING_STORYBOARD);
    setLoadingMessage('Creating storyboard from your chapter...');
    setStreamingContent('');
    setError(null);
    setGeneratedStrips([]);

    try {
      const strips = await generateStoryboard(text, (chunk: string) => {
        setStreamingContent(prev => prev + chunk);
      });
      setInputStrips(strips);
      const allCharacterNames = new Set(strips.flatMap(s => s.characters || []));
      const characterData = Array.from(allCharacterNames).map(name => ({ name }));
      setCharacters(characterData);
      console.log(`[APP] Storyboard complete. Moving to character setup with ${characterData.length} characters`);
      setGenerationState(GenerationState.CHARACTER_SETUP);
    } catch (err) {
      console.error('[APP] Storyboard generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate storyboard.');
      setGenerationState(GenerationState.INPUT);
    } finally {
        setLoadingMessage('');
        setStreamingContent('');
    }
  }, []);

  const handleCharacterChange = (updatedCharacter: Character) => {
    setCharacters(prev => prev.map(c => c.name === updatedCharacter.name ? {...c, ...updatedCharacter} : c));
  };
  
  const handleBackToInput = () => {
    setGenerationState(GenerationState.INPUT);
  };

  const handleGenerateManga = useCallback(async () => {
    console.log('[APP] Starting manga generation process');
    setGenerationState(GenerationState.GENERATING);
    setError(null);
    
    try {
      let finalCharacters = [...characters];
      const charsToDesign = characters.filter(c => !c.base64Image);
      
      if (charsToDesign.length > 0) {
        console.log(`[APP] Need to generate designs for ${charsToDesign.length} characters`);
        setLoadingMessage(`Designing ${charsToDesign.length} character(s)...`);
        const designs = await generateCharacterDesigns(charsToDesign.map(c => c.name), chapterText);
        
        finalCharacters = finalCharacters.map(c => {
          const foundDesign = designs.find(d => d.name === c.name);
          return foundDesign ? { ...c, generatedDescription: foundDesign.description } : c;
        });
        console.log('[APP] Character designs complete');
        setCharacters(finalCharacters);
      }

      console.log(`[APP] Starting panel generation for ${inputStrips.length} strips`);
      const stripsToRender: MangaStripData[] = [];
      for (let i = 0; i < inputStrips.length; i++) {
        const strip = inputStrips[i];
        console.log(`[APP] Processing strip ${i + 1}/${inputStrips.length}: ${strip.description.substring(0, 50)}...`);
        const initialStripData: MangaStripData = {
          description: strip.description,
          panels: strip.panels.map((p, idx) => ({ ...p, panelNumber: idx + 1 }))
        };
        stripsToRender.push(initialStripData);
        setGeneratedStrips([...stripsToRender]);

        for (let j = 0; j < strip.panels.length; j++) {
          const panel = strip.panels[j];
          console.log(`[APP] Generating panel ${j + 1}/${strip.panels.length} for strip ${i + 1}`);
          setLoadingMessage(`Drawing strip ${i + 1}, panel ${j + 1}...`);

          try {
            const imageUrl = await generatePanelImage(panel.description, strip.description, finalCharacters, panel.characters);
            stripsToRender[i].panels[j].imageUrl = imageUrl;
            console.log(`[APP] Panel ${j + 1} of strip ${i + 1} complete`);
            setGeneratedStrips([...stripsToRender]);
          } catch (panelError) {
            console.error(`[APP] Panel generation failed at strip ${i + 1}, panel ${j + 1}:`, panelError);
            setRetryContext({
              stripIndex: i,
              panelIndex: j,
              stripsToRender: [...stripsToRender],
              finalCharacters: [...finalCharacters]
            });
            throw new Error(`Panel generation failed at strip ${i + 1}, panel ${j + 1}: ${panelError instanceof Error ? panelError.message : 'Unknown error'}`);
          }
        }

        console.log(`[APP] Generating narration for strip ${i + 1}...`);
        setLoadingMessage(`Creating narration for strip ${i + 1}...`);
        
        try {
          const narrationText = await generateNarration(
            strip.description,
            strip.panels,
            strip.characters || []
          );
          console.log(`[APP] Narration generated for strip ${i + 1}, creating audio...`);
          const audioUrl = await elevenLabsService.generateTTS(narrationText);
          
          stripsToRender[i].narrationText = narrationText;
          stripsToRender[i].audioUrl = audioUrl;
          console.log(`[APP] Strip ${i + 1} narration complete`);
          setGeneratedStrips([...stripsToRender]);
        } catch (narrationError) {
          console.error(`[APP] Failed to generate narration for strip ${i + 1}:`, narrationError);
        }
      }
      console.log('[APP] All panels generated successfully. Moving to viewing state');
      setGenerationState(GenerationState.VIEWING);
    } catch (err) {
      console.error('[APP] Manga generation failed:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setGenerationState(GenerationState.VIEWING); // Stay in viewing mode to show retry option
    } finally {
      setLoadingMessage('');
    }
  }, [characters, inputStrips, chapterText]);

  const handleRetry = useCallback(async () => {
    if (!retryContext) return;
    
    console.log(`[APP] Retrying from strip ${retryContext.stripIndex + 1}, panel ${retryContext.panelIndex + 1}`);
    setGenerationState(GenerationState.GENERATING);
    setError(null);
    
    try {
      const { stripIndex: startStripIndex, panelIndex: startPanelIndex, stripsToRender, finalCharacters } = retryContext;
      
      for (let i = startStripIndex; i < inputStrips.length; i++) {
        const strip = inputStrips[i];
        const startPanel = i === startStripIndex ? startPanelIndex : 0;
        
        console.log(`[APP] Processing strip ${i + 1}/${inputStrips.length}: ${strip.description.substring(0, 50)}...`);
        
        for (let j = startPanel; j < strip.panels.length; j++) {
          const panel = strip.panels[j];
          console.log(`[APP] Generating panel ${j + 1}/${strip.panels.length} for strip ${i + 1}`);
          setLoadingMessage(`Drawing strip ${i + 1}, panel ${j + 1}...`);

          try {
            const imageUrl = await generatePanelImage(panel.description, strip.description, finalCharacters, panel.characters);
            stripsToRender[i].panels[j].imageUrl = imageUrl;
            console.log(`[APP] Panel ${j + 1} of strip ${i + 1} complete`);
            setGeneratedStrips([...stripsToRender]);
          } catch (panelError) {
            console.error(`[APP] Panel generation failed at strip ${i + 1}, panel ${j + 1}:`, panelError);
            setRetryContext({
              stripIndex: i,
              panelIndex: j,
              stripsToRender: [...stripsToRender],
              finalCharacters: [...finalCharacters]
            });
            throw new Error(`Panel generation failed at strip ${i + 1}, panel ${j + 1}: ${panelError instanceof Error ? panelError.message : 'Unknown error'}`);
          }
        }

        // Generate narration for completed strips
        if (i >= startStripIndex) {
          console.log(`[APP] Generating narration for strip ${i + 1}...`);
          setLoadingMessage(`Creating narration for strip ${i + 1}...`);
          
          try {
            const narrationText = await generateNarration(
              strip.description,
              strip.panels,
              strip.characters || []
            );
            console.log(`[APP] Narration generated for strip ${i + 1}, creating audio...`);
            const audioUrl = await elevenLabsService.generateTTS(narrationText);
            
            stripsToRender[i].narrationText = narrationText;
            stripsToRender[i].audioUrl = audioUrl;
            console.log(`[APP] Strip ${i + 1} narration complete`);
            setGeneratedStrips([...stripsToRender]);
          } catch (narrationError) {
            console.error(`[APP] Failed to generate narration for strip ${i + 1}:`, narrationError);
          }
        }
      }
      
      setRetryContext(null);
      console.log('[APP] Retry completed successfully. Moving to viewing state');
      setGenerationState(GenerationState.VIEWING);
    } catch (err) {
      console.error('[APP] Retry failed:', err);
      setError(err instanceof Error ? err.message : 'Retry failed with unknown error.');
      setGenerationState(GenerationState.VIEWING);
    } finally {
      setLoadingMessage('');
    }
  }, [retryContext, inputStrips]);

  const renderContent = () => {
    switch (generationState) {
      case GenerationState.INPUT:
        return <MangaInput onConfirm={handleChapterSubmit} isLoading={false} />;
      
      case GenerationState.GENERATING_STORYBOARD:
        return <Loader message={loadingMessage} streamingContent={streamingContent} />;

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
              <div className="bg-gray-100 border-l-4 border-gray-600 p-4 max-w-2xl w-full my-4">
                <p className="font-bold text-gray-900 text-sm uppercase tracking-wide">Error</p>
                <p className="text-gray-700 text-sm mt-1 mb-3">{error}</p>
                {retryContext && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleRetry}
                      disabled={isLoading}
                      className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 text-xs font-mono uppercase tracking-wide"
                    >
                      Retry from Strip {retryContext.stripIndex + 1}, Panel {retryContext.panelIndex + 1}
                    </button>
                    <button
                      onClick={() => {
                        setError(null);
                        setRetryContext(null);
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 text-xs font-mono uppercase tracking-wide"
                    >
                      Clear Error
                    </button>
                  </div>
                )}
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
    <div className="bg-white min-h-screen text-gray-900 font-mono">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="border-b border-gray-300 pb-8 mb-12">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight uppercase">
            AI Manga Creator
          </h1>
          <p className="text-gray-600 mt-3 text-sm uppercase tracking-wide">
            Transform text into visual narratives
          </p>
        </header>
        <main className="space-y-8">
          {renderContent()}
        </main>
        <footer className="border-t border-gray-300 pt-8 mt-16 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Powered by Google Gemini API</p>
        </footer>
      </div>
    </div>
  );
};

export default App;