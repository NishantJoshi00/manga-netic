
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
        <div className="bg-white border border-gray-300 p-4 flex items-center gap-4">
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
                id={`upload-${character.name}`}
            />
            {character.previewUrl ? (
                <div className="relative w-16 h-16">
                    <img src={character.previewUrl} alt={character.name} className="w-full h-full object-cover border border-gray-300" />
                    <button onClick={onImageRemove} className="absolute -top-1 -right-1 bg-gray-900 p-1 text-white hover:bg-gray-700 text-xs">
                        <TrashIcon className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <label htmlFor={`upload-${character.name}`} className="w-16 h-16 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-400 cursor-pointer hover:border-gray-600 hover:bg-gray-200">
                    <UploadIcon className="w-6 h-6 text-gray-500" />
                </label>
            )}
            <div className="font-bold text-sm uppercase tracking-wide text-gray-900">{character.name}</div>
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
        <div className="w-full max-w-4xl mx-auto border border-gray-300 bg-gray-50">
            <div className="border-b border-gray-300 px-6 py-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    02. Character Setup (Optional)
                </h3>
                <p className="text-xs text-gray-600 mt-1 uppercase tracking-wide">Upload reference images or let AI design characters</p>
            </div>
            
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {characters.map((char) => (
                        <CharacterCard
                            key={char.name}
                            character={char}
                            onImageUpload={(file) => handleImageUpload(file, char.name)}
                            onImageRemove={() => handleImageRemove(char.name)}
                        />
                    ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-600 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back
                    </button>
                    <button
                        onClick={onGenerate}
                        disabled={isLoading}
                        className="px-6 py-2 text-xs font-bold uppercase tracking-wide bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Generating...' : 'Generate Manga'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CharacterImageUploader;
