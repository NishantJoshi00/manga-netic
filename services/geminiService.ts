import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { Character, CharacterAction, InputStrip } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const textTypeSchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, enum: ["narration", "dialogue", "thought", "action"] },
        content: { type: Type.STRING },
        speaker: { type: Type.STRING, nullable: true },
    },
    required: ['type', 'content']
};

const characterActionSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
    },
    required: ['name', 'description']
};

const panelSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, nullable: true },
        description: { type: Type.STRING },
        characters: { type: Type.ARRAY, items: characterActionSchema, nullable: true },
        text: { type: Type.ARRAY, items: textTypeSchema }
    },
    required: ['description', 'text']
};

const stripSchema = {
    type: Type.OBJECT,
    properties: {
        description: { type: Type.STRING },
        panels: { type: Type.ARRAY, items: panelSchema },
        characters: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
    },
    required: ['description', 'panels']
};

const storyboardSchema = {
    type: Type.ARRAY,
    items: stripSchema
};


export const generateStoryboard = async (chapterText: string): Promise<InputStrip[]> => {
    const system_prompt = `
You are an expert manga creator. Transform the provided chapter text into multiple appealing and creative manga strips with consistent characters and visual flow across the entire chapter.

CHAPTER-WIDE CONSISTENCY:
- Maintain consistent character descriptions and personalities throughout ALL strips in the chapter
- Use the same character names and visual descriptions across all strips
- Ensure character development and story progression flows naturally from strip to strip
- Create a coherent visual narrative that spans multiple strips

STRIP STRUCTURE REQUIREMENTS:
- Break the chapter into multiple strips, each containing 3-6 panels for optimal pacing
- Write a clear strip description for each strip that establishes the scene, setting, and mood
- Identify and list ALL characters present in each strip for consistency tracking
- Design panels within each strip that work together as a cohesive visual sequence

CHARACTER CONSISTENCY ACROSS STRIPS:
- When a character appears in multiple strips, maintain their exact visual description
- Use consistent character names, personalities, and visual traits throughout the chapter
- Ensure character interactions and relationships remain consistent across all strips
- Track recurring characters and maintain their established visual characteristics

INDIVIDUAL STRIP COHERENCE:
- Each panel description should reference the strip's overall context and setting
- Maintain visual continuity between panels within each strip
- Create smooth narrative flow where each panel builds naturally from the previous one
- Use the strip description as context for all individual panel descriptions

VISUAL STORYTELLING:
- Design visually engaging panel compositions that tell the story effectively
- Balance action scenes with dialogue and emotional moments across strips
- Vary panel descriptions to create visual interest (close-ups, wide shots, dramatic angles)
- Use creative panel layouts while maintaining narrative coherence across the chapter

TEXT CONSTRAINTS:
- Dialogue: Maximum 200 characters per panel (fits speech bubbles comfortably)
- Narration: Maximum 150 characters per panel (readable narrative boxes)
- Thought: Maximum 100 characters per panel (clear thought bubbles)
- Action: Maximum 50 characters per panel (impactful sound effects)

CHAPTER SEGMENTATION:
- Divide the chapter into logical story segments, each becoming a strip
- Ensure each strip has a clear beginning, development, and transition to the next
- Create natural breaking points between strips that maintain story flow
- End strips at compelling moments that encourage reading the next strip

DETAILED PANEL STRUCTURE:
- For each panel, provide a clear description of the visual scene and composition
- List all characters present in the panel using the CharacterAction structure
- For each character, specify their name and detailed description of their actions, pose, and expression
- Use these character actions to inform and enhance the panel description

TEXT AND DIALOGUE REQUIREMENTS:
- For all dialogue text, ALWAYS fill in the speaker field with the character's name
- Ensure speaker names match the character names used in CharacterAction lists
- Use consistent character names throughout all strips and panels
- For narration, thought, and action text types, leave speaker field empty

CHARACTER ACTION DETAILS:
- Describe character poses, expressions, and body language precisely
- Include emotional states and reactions in character descriptions
- Specify character positioning and interaction with environment
- Maintain character appearance consistency across all panels

OUTPUT REQUIREMENTS:
- Generate multiple strips that collectively tell the complete chapter story
- Provide descriptive strip descriptions that capture each scene's essence
- List all characters present in each strip consistently
- For each panel, include detailed CharacterAction descriptions for all characters
- Ensure character names and descriptions remain identical across all appearances
- Always specify speakers for dialogue to maintain clear character voice

Focus on creating a complete manga chapter with multiple strips that are coherent, character-consistent, and professionally structured with detailed character actions throughout.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            { role: 'user', parts: [{ text: system_prompt }, { text: chapterText }] }
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: storyboardSchema,
        },
    });

    const jsonText = response.text;
    try {
        return JSON.parse(jsonText) as InputStrip[];
    } catch (e) {
        console.error("Failed to parse storyboard as JSON:", jsonText);
        throw new Error("The AI returned an invalid storyboard format.");
    }
};

export const generatePanelImage = async (
  panelDescription: string, 
  stripDescription: string,
  characters: Character[],
  panelCharacters?: CharacterAction[]
): Promise<string> => {

  const characterActions = panelCharacters?.map(c => `- ${c.name}: ${c.description}`).join('\n') || 'No specific character actions described.';

  const textParts = [
    { text: `Style: A dynamic black and white manga panel with screentones. Vertical 9:16 aspect ratio. DO NOT add any text, speech bubbles, or titles into the image.` },
    { text: `Strip Theme: ${stripDescription}` },
    { text: `Panel Description: ${panelDescription}` },
    { text: `Character Actions in this Panel:\n${characterActions}` }
  ];

  const characterInfo = characters
    .map(c => `- ${c.name}: ${c.generatedDescription || 'Use the provided reference image for this character.'}`)
    .join('\n');
  textParts.push({ text: `Overall Character Designs:\n${characterInfo}` });
  
  const imageParts = characters
    .filter(c => c.base64Image && c.mimeType)
    .map(c => ({
      inlineData: {
        data: c.base64Image!,
        mimeType: c.mimeType!,
      }
    }));

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [ ...imageParts, ...textParts ],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const { data, mimeType } = part.inlineData;
      return `data:${mimeType};base64,${data}`;
    }
  }

  throw new Error("Image generation failed: The AI did not return an image.");
};

const characterSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING }
    },
    required: ['name', 'description']
  }
};

export const generateCharacterDesigns = async (
  characterNames: string[],
  storyContext: string
): Promise<{name: string, description: string}[]> => {
  const prompt = `
    Based on the following story context, create a consistent visual description for each character listed.
    The description should be detailed enough for an artist to draw them, including appearance, clothing, and general demeanor.
    Return the result as a JSON array of objects, where each object has "name" and "description" fields.

    Story Context: "${storyContext}"

    Characters to design: ${characterNames.join(', ')}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: characterSchema,
    },
  });

  const jsonText = response.text;
  try {
      return JSON.parse(jsonText) as {name: string, description: string}[];
  } catch (e) {
      console.error("Failed to parse character designs as JSON:", jsonText);
      throw new Error("The AI returned an invalid character design format.");
  }
};