
import React, { useRef } from 'react';
import type { Character } from '../types';
import { UploadIcon, TrashIcon, ArrowLeftIcon } from './icons';

interface CharacterImageUploaderProps {
    characters: Character[];
    onCharacterChange: (updatedCharacter: Character) => void;
    onGenerate: () => void;
    onBack: () => void;
    isLoading: boolean;
}

const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string, url: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve({ base64, mimeType: file.type, url: result });
        };
        reader.onerror = error => reject(error);
    });
};

const CharacterCard: React.FC<{
    character: Character;
    onImageUpload: (file: File) => void;
    onImageRemove: () => void;
}> = ({ character, onImageUpload, onImageRemove }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImageUpload(file);
        }
    };

    return (
        <div className="bg-gray-700 p-4 rounded-lg flex items-center gap-4">
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
                id={`upload-${character.name}`}
            />
            {character.previewUrl ? (
                <div className="relative w-20 h-20">
                    <img src={character.previewUrl} alt={character.name} className="w-full h-full object-cover rounded-full" />
                    <button onClick={onImageRemove} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 text-white hover:bg-red-700">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <label htmlFor={`upload-${character.name}`} className="w-20 h-20 flex items-center justify-center bg-gray-800 border-2 border-dashed border-gray-500 rounded-full cursor-pointer hover:border-cyan-400 hover:bg-gray-700">
                    <UploadIcon className="w-8 h-8 text-gray-400" />
                </label>
            )}
            <div className="font-bold text-lg">{character.name}</div>
        </div>
    );
};

const CharacterImageUploader: React.FC<CharacterImageUploaderProps> = ({ characters, onCharacterChange, onGenerate, onBack, isLoading }) => {
    
    const handleImageUpload = async (file: File, characterName: string) => {
        try {
            const { base64, mimeType, url } = await fileToBase64(file);
            onCharacterChange({
                name: characterName,
                base64Image: base64,
                mimeType,
                previewUrl: url,
            });
        } catch (error) {
            console.error("Error processing file:", error);
            alert("Failed to upload image.");
        }
    };

    const handleImageRemove = (characterName: string) => {
         onCharacterChange({
            name: characterName,
            base64Image: undefined,
            mimeType: undefined,
            previewUrl: undefined,
        });
    };

    return (
        <div className="w-full max-w-3xl mx-auto bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4 font-bangers tracking-wide">
                2. Setup Characters (Optional)
            </h3>
            <p className="text-gray-400 mb-4">Upload a reference image for each character. If you don't, the AI will design them based on the story.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {characters.map((char) => (
                    <CharacterCard
                        key={char.name}
                        character={char}
                        onImageUpload={(file) => handleImageUpload(file, char.name)}
                        onImageRemove={() => handleImageRemove(char.name)}
                    />
                ))}
            </div>

            <div className="flex justify-between items-center mt-4">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back
                </button>
                <button
                    onClick={onGenerate}
                    disabled={isLoading}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 px-4 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? 'Creating Your Manga...' : 'Generate Manga'}
                </button>
            </div>
        </div>
    );
};

export default CharacterImageUploader;
