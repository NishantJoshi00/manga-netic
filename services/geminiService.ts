import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { Character, CharacterAction, InputStrip, Panel } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

// Initialize AI client
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

CRITICAL STORY FIDELITY REQUIREMENTS:
- You MUST accurately adapt the entire input story without skipping important events, dialogue, or character moments
- Every significant plot point, character interaction, and story beat from the input text MUST be included in the manga adaptation
- Preserve the exact sequence of events as they occur in the original story - do not reorder or restructure narrative elements
- Include ALL meaningful dialogue from the story, ensuring character voices and conversations are faithfully represented
- Capture the specific emotions, reactions, and character development moments described in the input text
- If the story describes specific actions, settings, or visual details, these MUST be reflected accurately in panel descriptions
- Do not add invented scenes, characters, or plot elements that don't exist in the original story
- Do not omit or compress important story moments - ensure comprehensive coverage of the input narrative
- The manga adaptation should tell the complete story from beginning to end with full narrative integrity

CHAPTER-WIDE CONSISTENCY:
- Maintain consistent character descriptions and personalities throughout ALL strips in the chapter
- Use the same character names and visual descriptions across all strips
- Ensure character development and story progression flows naturally from strip to strip
- Create a coherent visual narrative that spans multiple strips

STRIP STRUCTURE REQUIREMENTS:
- Break the chapter into multiple strips, each containing 3-6 panels for optimal pacing
- Each strip must cover a specific section of the input story chronologically - do not skip ahead or jump around
- Write a clear strip description for each strip that directly corresponds to the events in that story section
- Identify and list ONLY NAMED CHARACTERS present in each strip for consistency tracking
- Design panels within each strip that work together as a cohesive visual sequence
- Ensure complete coverage: the sum of all strips must tell the entire input story without gaps

PANEL-BY-PANEL STORY ACCURACY:
- Each panel must represent specific moments, actions, or dialogue from the input story
- Panel descriptions should directly reflect what is happening in the corresponding part of the story text
- When dialogue occurs in the story, create panels that show the characters speaking with appropriate context
- When actions occur in the story, create panels that visually depict those specific actions
- Maintain temporal flow - panels should follow the story's timeline exactly as written
- Do not create "filler" panels that don't correspond to actual story content

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
- For each panel, provide a comprehensive description that includes:
  * Overall scene composition and camera angle (close-up, medium shot, wide shot, bird's eye view, etc.)
  * Environmental details and background elements that set the scene
  * Precise character positioning within the panel (foreground, background, left, right, center)
  * Spatial relationships between characters and their environment
  * Visual flow and focal points that guide the reader's eye
- List all characters present in the panel using the CharacterAction structure
- For each character, specify their name and detailed description including:
  * Exact positioning and orientation within the panel space
  * Body pose, stance, and posture details
  * Facial expressions and emotional state
  * Hand gestures and arm positions
  * Eye direction and what they're looking at
  * Interaction with props, environment, or other characters
- Panel descriptions should reference how characters with uploaded reference images should be drawn:
  * If a character has a reference image, mention "draw [character name] matching their reference image" 
  * Specify how the reference image character should be positioned and posed in the current scene
  * Describe any modifications needed (different clothes, expressions, etc.) while maintaining core appearance
- Use these character actions and positioning details to create rich, cinematically detailed panel descriptions

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

CHARACTER REFERENCE IMAGE INTEGRATION:
- When describing panels, assume some characters may have uploaded reference images
- In panel descriptions, explicitly mention "draw [character name] matching their reference image" for consistency
- Describe how reference image characters should be positioned, posed, and styled in each specific scene
- For characters without reference images, provide detailed visual descriptions in CharacterAction
- Ensure panel descriptions account for both reference image characters and generated character descriptions
- Reference image characters should maintain their core appearance while adapting to scene requirements

OUTPUT REQUIREMENTS:
- Generate multiple strips that collectively tell the complete chapter story
- Provide descriptive strip descriptions that capture each scene's essence
- List ONLY NAMED CHARACTERS present in each strip consistently (exclude background/crowd characters)
- For each panel, include comprehensive descriptions with:
  * Detailed scene composition and camera work
  * Precise character positioning and spatial relationships
  * Rich environmental and background details
  * Clear visual flow and focal points
- For each panel, include detailed CharacterAction descriptions for named characters only with:
  * Exact positioning within the panel space
  * Complete body language, pose, and expression details
  * Specific interactions with environment and other characters
- Ensure character names and descriptions remain identical across all appearances
- Always specify speakers for dialogue to maintain clear character voice
- Background characters should be described in panel descriptions but NOT listed in character arrays
- Panel descriptions should be detailed enough for an artist to visualize the exact scene composition

Focus on creating a complete manga chapter with multiple strips that are coherent, character-consistent, and professionally structured with detailed character actions throughout.

FINAL VERIFICATION REQUIREMENTS:
- Before generating the JSON, ensure every important element of the input story has been included
- Verify that the manga adaptation tells the complete story from start to finish
- Check that all key characters, dialogue, actions, and plot points are represented
- Confirm that the narrative flow matches the original story's sequence and pacing
- The final manga should be a faithful visual adaptation that captures the full essence and content of the input story
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
            }
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
            }
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

  // Aggressive content sanitization
  const sanitizeText = (text: string) => {
    return text
      .replace(/fight|fighting|battle|battling|attack|attacking|kill|killing|murder|die|dying|death|dead|violence|violent|blood|bloody|gore|weapon|weapons|sword|swords|gun|guns|knife|knives|stab|stabbing|shoot|shooting|hit|hitting|punch|punching|kick|kicking|hurt|hurting|wound|wounded|injury|injured|harm|harming/gi, 'encounter')
      .replace(/monster|demon|devil|evil|dark|scary|horror|terror|nightmare/gi, 'character')
      .replace(/angry|furious|rage|enraged|mad|hatred|hate/gi, 'determined')
      .replace(/scream|screaming|shout|shouting|yell|yelling/gi, 'speak')
      .replace(/threat|threatening|danger|dangerous|risk|risky/gi, 'challenge');
  };

  const textParts = [
    { text: `CRITICAL REQUIREMENT: You MUST generate an image. This is required.

ABSOLUTELY NO TEXT ALLOWED: 
- DO NOT include ANY text, letters, words, or writing of any kind in the image
- DO NOT add speech bubbles, dialogue bubbles, thought bubbles, or text balloons
- DO NOT include sound effects, onomatopoeia, or action words (like "BANG", "POW", etc.)
- DO NOT add titles, captions, labels, or any written content
- DO NOT include signs, posters, books, or any readable text elements
- The image must be purely visual storytelling without any textual elements whatsoever

Style: A dynamic black and white manga panel with screentones. Vertical 9:16 aspect ratio. Focus entirely on visual composition, character expressions, body language, and environmental details to convey the story.

Strip Theme: ${stripDescription}

Panel Description: ${panelDescription}

Character Actions in this Panel:
${characterActions}

GENERATE A COMPLETELY TEXT-FREE MANGA PANEL IMAGE NOW.` }
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
        contents: [
          { role: 'user', parts: [ ...imageParts, ...textParts ] }
        ],
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      console.log('[PANEL] Received image response from Gemini API');
      
      if (!response.candidates || !response.candidates[0]) {
        console.error('[PANEL] No candidates in response:', response);
        throw new Error('Invalid response from Gemini API - no candidates');
      }
      
      const candidate = response.candidates[0];
      
      // Handle content policy violations
      if (candidate.finishReason === 'PROHIBITED_CONTENT') {
        console.warn('[PANEL] Content was flagged as prohibited. Trying with modified prompt...');
        
        // Try again with a more conservative prompt
        const conservativeTextParts = [
          { text: `ABSOLUTELY NO TEXT ALLOWED: 
- DO NOT include ANY text, letters, words, or writing of any kind in the image
- DO NOT add speech bubbles, dialogue bubbles, thought bubbles, or text balloons
- DO NOT include sound effects, onomatopoeia, or action words
- DO NOT add titles, captions, labels, or any written content
- DO NOT include signs, posters, books, or any readable text elements
- The image must be purely visual storytelling without any textual elements whatsoever

Style: A completely wholesome, safe black and white manga panel with screentones. Vertical 9:16 aspect ratio. Show only positive, friendly interactions between characters.` },
          { text: `Scene: Characters having a calm, friendly conversation or meeting` },
          { text: `Content: A peaceful indoor or outdoor scene with characters talking or interacting positively` },
          { text: `Character Actions: All characters are smiling, talking calmly, or standing peacefully together` }
        ];
        
        // Retry with conservative prompt
        const retryResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image-preview',
          contents: [
            { role: 'user', parts: [ ...imageParts, ...conservativeTextParts ] }
          ],
          config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
        });
        
        if (retryResponse.candidates?.[0]?.content?.parts) {
          for (const part of retryResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              const { data, mimeType } = part.inlineData;
              console.log(`[PANEL] Generated image: ${mimeType}, size: ${Math.round(data.length / 1024)}KB`);
              return `data:${mimeType};base64,${data}`;
            }
          }
        } else {
          throw new Error('Content repeatedly flagged as prohibited. Please try with different story content.');
        }
      }
      
      if (!candidate.content || !candidate.content.parts) {
        console.error('[PANEL] Invalid candidate structure:', candidate);
        throw new Error('Invalid response from Gemini API - missing content or parts');
      }
      
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

