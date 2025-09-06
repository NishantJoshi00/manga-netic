export enum GenerationState {
  INPUT,
  GENERATING_STORYBOARD,
  CHARACTER_SETUP,
  GENERATING,
  VIEWING,
}

// For user input JSON
export interface TextBlock {
  type: 'dialogue' | 'narration' | 'thought' | 'action';
  content: string;
  speaker?: string;
}

export interface CharacterAction {
  name: string;
  description: string;
}

export interface InputPanel {
  title: string | null;
  description: string;
  characters?: CharacterAction[];
  text: TextBlock[];
}

export interface InputStrip {
  description:string;
  panels: InputPanel[];
  characters?: string[];
}

// For application state
export interface Character {
  name: string;
  // For UI preview
  previewUrl?: string; 
  // For API
  base64Image?: string; 
  mimeType?: string;
  // AI-generated description if no image is provided
  generatedDescription?: string; 
}

export interface Panel extends InputPanel {
  panelNumber: number;
  imageUrl?: string;
}

export interface MangaStripData {
  description: string;
  panels: Panel[];
  narrationText?: string;
  audioUrl?: string;
}