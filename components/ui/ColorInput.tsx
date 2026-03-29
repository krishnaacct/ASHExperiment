import React from 'react';
import { applyTheme } from '../../utils/theme';

interface ColorInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export const ColorInput: React.FC<ColorInputProps> = ({ id, label, value, onChange, disabled }) => {

    const handleColorChange = (color: string) => {
        onChange(color);
        applyTheme(color); // Apply theme live as the color changes
    };

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">{label}</label>
            <div className="relative flex items-center w-full h-12 px-4 py-3 text-base bg-[var(--card-background)] border border-[var(--input)] rounded-lg shadow-sm focus-within:outline-none focus-within:ring-4 focus-within:ring-[var(--primary-color-focus-ring)] focus-within:border-[var(--primary-color)] transition-all duration-300">
                <div className="relative w-8 h-8 mr-3">
                    <input
                        id={`${id}-picker`}
                        type="color"
                        value={value}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={disabled}
                    />
                    <div 
                        className="w-full h-full rounded-md border-2 border-[var(--border)] cursor-pointer" 
                        style={{ backgroundColor: value }}
                        onClick={() => document.getElementById(`${id}-picker`)?.click()}
                    ></div>
                </div>
                <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={(e) => handleColorChange(e.target.value)}
                    disabled={disabled}
                    className="font-mono bg-transparent border-0 focus:ring-0 p-0 w-full text-[var(--foreground)]"
                />
            </div>
        </div>
    );
};