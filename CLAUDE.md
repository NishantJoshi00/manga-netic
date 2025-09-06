# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Starts Vite dev server on localhost
- **Build**: `npm run build` - Creates production build
- **Preview**: `npm run preview` - Previews production build locally

## Environment Setup

This app requires a Gemini API key:
- Set `GEMINI_API_KEY` in `.env.local` file
- The key is accessed via `process.env.API_KEY` in the code (configured in vite.config.ts)

## Architecture Overview

This is a React-based AI manga generator that transforms text stories into visual manga panels using Google's Gemini API.

### Core Application Flow
1. **Text Input** (`GenerationState.INPUT`) - User submits chapter text
2. **Storyboard Generation** (`GenerationState.GENERATING_STORYBOARD`) - AI creates structured story breakdown
3. **Character Setup** (`GenerationState.CHARACTER_SETUP`) - User configures character appearances
4. **Manga Generation** (`GenerationState.GENERATING`) - AI generates manga panel images
5. **Viewing** (`GenerationState.VIEWING`) - Display completed manga strips

### Key Components Structure
- **App.tsx** - Main application state and flow management
- **MangaInput** - Initial text input interface
- **CharacterImageUploader** - Character configuration UI
- **MangaPage/MangaPanel** - Display generated manga content
- **services/geminiService.ts** - All AI API interactions

### Data Flow & State Management
The application uses a state machine pattern with `GenerationState` enum. Core data structures:
- `InputStrip[]` - AI-generated story structure from text
- `Character[]` - Character data with optional uploaded images or AI descriptions  
- `MangaStripData[]` - Final manga with generated panel images

### AI Service Integration
The `geminiService.ts` handles three main AI operations:
- `generateStoryboard()` - Converts text to structured manga format using JSON schema
- `generateCharacterDesigns()` - Creates character descriptions for those without uploaded images
- `generatePanelImage()` - Generates manga panel images using multimodal Gemini API

### Tech Stack
- React 19 with TypeScript
- Vite for build tooling  
- Google Gemini API (@google/genai) for AI generation
- Tailwind CSS for styling (classes present in components)

## Important Implementation Details

- Character consistency across panels is maintained through structured prompts and character reference images
- Image generation uses multimodal prompts combining text descriptions and reference images
- All AI responses use structured JSON schemas for reliability
- Error handling preserves user progress by reverting to previous valid states