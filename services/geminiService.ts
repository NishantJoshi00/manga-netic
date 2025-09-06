import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { Character, CharacterAction, InputStrip, Panel } from '../types';

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


export const generateStoryboard = async (
    chapterText: string,
    onProgress?: (chunk: string) => void
): Promise<InputStrip[]> => {
    console.log('[STORYBOARD] Starting storyboard generation...');
    console.log(`[STORYBOARD] Chapter text length: ${chapterText.length} characters`);
    
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
- Identify and list ONLY NAMED CHARACTERS present in each strip for consistency tracking
- Design panels within each strip that work together as a cohesive visual sequence

CHARACTER CONSISTENCY ACROSS STRIPS:
- When a character appears in multiple strips, maintain their exact visual description
- Use consistent character names, personalities, and visual traits throughout the chapter
- Ensure character interactions and relationships remain consistent across all strips
- Track recurring characters and maintain their established visual characteristics

CHARACTER CLASSIFICATION:
- ONLY include NAMED CHARACTERS with speaking roles or significant story importance in the characters list
- DO NOT include background characters, crowds, extras, or unnamed individuals in the characters list
- Background characters can be mentioned in panel descriptions but should NOT be added to character lists
- Focus character tracking on main characters, supporting characters, and recurring named individuals
- Examples of characters to EXCLUDE from lists: "crowd", "passerby", "student #3", "random villager", etc.

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
- List ONLY NAMED CHARACTERS present in each strip consistently (exclude background/crowd characters)
- For each panel, include detailed CharacterAction descriptions for named characters only
- Ensure character names and descriptions remain identical across all appearances
- Always specify speakers for dialogue to maintain clear character voice
- Background characters should be described in panel descriptions but NOT listed in character arrays

Focus on creating a complete manga chapter with multiple strips that are coherent, character-consistent, and professionally structured with detailed character actions throughout.
    `;

    console.log('[STORYBOARD] Calling Gemini API for streaming storyboard generation...');
    
    if (onProgress) {
        // Use streaming for progress updates
        const stream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: [
                { role: 'user', parts: [{ text: system_prompt }, { text: chapterText }] }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: storyboardSchema,
            },
        });

        console.log('[STORYBOARD] Starting to stream storyboard response...');
        let fullResponse = '';
        
        for await (const chunk of stream) {
            const chunkText = chunk.text || '';
            if (chunkText) {
                fullResponse += chunkText;
                onProgress(chunkText);
                console.log(`[STORYBOARD] Received chunk: ${chunkText.length} characters`);
            }
        }
        
        console.log('[STORYBOARD] Streaming complete, parsing full response...');
        console.log(`[STORYBOARD] Full response length: ${fullResponse.length} characters`);
        
        try {
            const parsedResult = JSON.parse(fullResponse) as InputStrip[];
            console.log(`[STORYBOARD] Generated ${parsedResult.length} manga strips`);
            console.log(`[STORYBOARD] Found characters: ${[...new Set(parsedResult.flatMap(s => s.characters || []))].join(', ')}`);
            const totalPanels = parsedResult.reduce((acc, strip) => acc + strip.panels.length, 0);
            console.log(`[STORYBOARD] Total panels created: ${totalPanels}`);
            return parsedResult;
        } catch (e) {
            console.error("[STORYBOARD] Failed to parse streamed storyboard as JSON:", fullResponse);
            throw new Error("The AI returned an invalid storyboard format.");
        }
    } else {
        // Fall back to non-streaming for backward compatibility
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

        console.log('[STORYBOARD] Received storyboard response from Gemini API');
        const jsonText = response.text;
        console.log(`[STORYBOARD] Response length: ${jsonText.length} characters`);
        
        try {
            const parsedResult = JSON.parse(jsonText) as InputStrip[];
            console.log(`[STORYBOARD] Generated ${parsedResult.length} manga strips`);
            console.log(`[STORYBOARD] Found characters: ${[...new Set(parsedResult.flatMap(s => s.characters || []))].join(', ')}`);
            const totalPanels = parsedResult.reduce((acc, strip) => acc + strip.panels.length, 0);
            console.log(`[STORYBOARD] Total panels created: ${totalPanels}`);
            return parsedResult;
        } catch (e) {
            console.error("[STORYBOARD] Failed to parse storyboard as JSON:", jsonText);
            throw new Error("The AI returned an invalid storyboard format.");
        }
    }
};

export const generatePanelImage = async (
  panelDescription: string, 
  stripDescription: string,
  characters: Character[],
  panelCharacters?: CharacterAction[]
): Promise<string> => {

  console.log('[PANEL] Starting panel image generation...');
  console.log(`[PANEL] Panel description: ${panelDescription.substring(0, 100)}...`);
  console.log(`[PANEL] Characters in panel: ${panelCharacters?.map(c => c.name).join(', ') || 'None'}`);

  const characterActions = panelCharacters?.map(c => `- ${c.name}: ${c.description}`).join('\n') || 'No specific character actions described.';

  const textParts = [
    { text: `IMPORTANT: You MUST generate an image. This is required.

Style: A dynamic black and white manga panel with screentones. Vertical 9:16 aspect ratio. DO NOT add any text, speech bubbles, or titles into the image.

Strip Theme: ${stripDescription}

Panel Description: ${panelDescription}

Character Actions in this Panel:
${characterActions}

GENERATE A MANGA PANEL IMAGE NOW.` }
  ];

  const characterInfo = characters
    .map(c => `- ${c.name}: ${c.generatedDescription || 'Use the provided reference image for this character.'}`)
    .join('\n');
  if (characterInfo.trim()) {
    textParts.push({ text: `Overall Character Designs:\n${characterInfo}` });
  }
  
  const imageParts = characters
    .filter(c => c.base64Image && c.mimeType)
    .map(c => ({
      inlineData: {
        data: c.base64Image!,
        mimeType: c.mimeType!,
      }
    }));

  const charactersWithImages = characters.filter(c => c.base64Image && c.mimeType);
  console.log(`[PANEL] Using ${charactersWithImages.length} character reference images`);
  console.log(`[PANEL] Using ${characters.length - charactersWithImages.length} generated character descriptions`);
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[PANEL] Attempt ${attempt}/2 - Calling Gemini API for image generation...`);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
          parts: [ ...imageParts, ...textParts ],
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      console.log('[PANEL] Received image response from Gemini API');
      
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const { data, mimeType } = part.inlineData;
            console.log(`[PANEL] Generated image: ${mimeType}, size: ${Math.round(data.length / 1024)}KB`);
            return `data:${mimeType};base64,${data}`;
          }
        }
      }

      const errorMsg = `Image generation failed: No image data in response (attempt ${attempt}/2)`;
      console.error(`[PANEL] ${errorMsg}`);
      lastError = new Error(errorMsg);
      
      if (attempt < 2) {
        console.log('[PANEL] Retrying image generation...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
      
    } catch (error) {
      const errorMsg = `Image generation attempt ${attempt}/2 failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[PANEL] ${errorMsg}`);
      lastError = new Error(errorMsg);
      
      if (attempt < 2) {
        console.log('[PANEL] Retrying after error...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
  }

  console.error('[PANEL] All image generation attempts failed');
  throw lastError || new Error("Image generation failed after 2 attempts");
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
  console.log('[CHARACTER] Starting character design generation...');
  console.log(`[CHARACTER] Designing characters: ${characterNames.join(', ')}`);
  console.log(`[CHARACTER] Story context length: ${storyContext.length} characters`);
  
  const prompt = `
    Based on the following story context, create a consistent visual description for each character listed.
    The description should be detailed enough for an artist to draw them, including appearance, clothing, and general demeanor.
    Return the result as a JSON array of objects, where each object has "name" and "description" fields.

    Story Context: "${storyContext}"

    Characters to design: ${characterNames.join(', ')}
  `;

  console.log('[CHARACTER] Calling Gemini API for character design generation...');
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: characterSchema,
    },
  });

  console.log('[CHARACTER] Received character design response from Gemini API');
  const jsonText = response.text;
  console.log(`[CHARACTER] Character design response length: ${jsonText.length} characters`);
  
  try {
      const parsedResult = JSON.parse(jsonText) as {name: string, description: string}[];
      console.log(`[CHARACTER] Successfully generated designs for ${parsedResult.length} characters`);
      parsedResult.forEach(char => {
        console.log(`[CHARACTER] ${char.name}: ${char.description.substring(0, 80)}...`);
      });
      return parsedResult;
  } catch (e) {
      console.error("[CHARACTER] Failed to parse character designs as JSON:", jsonText);
      throw new Error("The AI returned an invalid character design format.");
  }
};

const narrationSchema = {
  type: Type.OBJECT,
  properties: {
    narrationText: { type: Type.STRING }
  },
  required: ['narrationText']
};

export const generateNarration = async (
  stripDescription: string,
  panels: Panel[],
  characters: string[]
): Promise<string> => {
  console.log('[NARRATION] Starting narration generation...');
  console.log(`[NARRATION] Strip description: ${stripDescription.substring(0, 100)}...`);
  console.log(`[NARRATION] Characters: ${characters.join(', ')}`);
  console.log(`[NARRATION] Panels count: ${panels.length}`);

  const panelsText = panels.map((panel, idx) => {
    const dialogues = panel.text.filter(t => t.type === 'dialogue')
      .map(t => `${t.speaker}: "${t.content}"`).join('\n');
    const narrations = panel.text.filter(t => t.type === 'narration')
      .map(t => t.content).join(' ');
    const thoughts = panel.text.filter(t => t.type === 'thought')
      .map(t => `(${t.speaker} thinks: ${t.content})`).join('\n');
    
    return `Panel ${idx + 1}:
Description: ${panel.description}
Dialogues: ${dialogues || 'None'}
Narration: ${narrations || 'None'}
Thoughts: ${thoughts || 'None'}`;
  }).join('\n\n');

  const prompt = `
Create an engaging narration script for this manga strip that will be converted to speech.

Strip Overview: ${stripDescription}
Characters Present: ${characters.join(', ')}

Panel Details:
${panelsText}

NARRATION REQUIREMENTS:
- Create a cohesive narration that flows through the entire strip
- Use ONLY narrator voice - do NOT use any character markup tags
- Write everything as narrative text from the narrator's perspective
- Describe character actions, dialogue, and thoughts as part of the story
- Convert dialogue into narrative form (e.g., "John said he was ready to fight" instead of direct quotes)
- Include scene descriptions, character actions, and atmosphere
- Make it engaging for audio listeners who can't see the visuals
- Keep the total narration under 500 words for optimal audio length

Available voices:
- Narrator: For all narrative descriptions, scene setting, and story telling

Generate a single flowing narration text that tells the complete story of this strip using only narrator voice.
`;

  console.log('[NARRATION] Calling Gemini API for narration generation...');
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: narrationSchema,
    },
  });

  console.log('[NARRATION] Received narration response from Gemini API');
  const jsonText = response.text;
  console.log(`[NARRATION] Narration response length: ${jsonText.length} characters`);
  
  try {
    const parsedResult = JSON.parse(jsonText) as { narrationText: string };
    console.log(`[NARRATION] Generated narration: ${parsedResult.narrationText.substring(0, 200)}...`);
    return parsedResult.narrationText;
  } catch (e) {
    console.error("[NARRATION] Failed to parse narration as JSON:", jsonText);
    throw new Error("The AI returned an invalid narration format.");
  }
};