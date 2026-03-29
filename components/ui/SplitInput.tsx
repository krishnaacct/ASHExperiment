import React, { useRef, createRef, useEffect } from 'react';

interface SplitInputProps {
    length: number;
    value: string;
    onChange: (value: string) => void;
    colorize?: boolean;
    label: string;
    variant?: 'split' | 'unified';
    autoFocus?: boolean;
}

// Define accent colors for the colorize feature, used for OTP inputs.
const accentColors = [
    'text-[var(--accent-1)]', 'text-[var(--accent-2)]', 'text-[var(--accent-3)]',
    'text-[var(--accent-4)]', 'text-[var(--accent-5)]', 'text-[var(--accent-6)]',
];

export const SplitInput: React.FC<SplitInputProps> = ({ length, value, onChange, colorize = false, label, variant = 'split', autoFocus = false }) => {
    const inputRefs = useRef<React.RefObject<HTMLInputElement>[]>(
        Array.from({ length }, () => createRef<HTMLInputElement>())
    );

    useEffect(() => {
        if (autoFocus && inputRefs.current[0]?.current) {
            inputRefs.current[0].current.focus();
        }
    }, [autoFocus]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const digit = e.target.value.replace(/[^0-9]/g, '').slice(-1);
        
        if (digit !== value[index]) {
            const newValueArr = value.split('');
            newValueArr[index] = digit;
            const newValue = newValueArr.join('');
            onChange(newValue);

            if (digit && index < length - 1) {
                inputRefs.current[index + 1].current?.focus();
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputRefs.current[index - 1].current?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
        onChange(pastedData);
        if (pastedData.length >= length) {
            inputRefs.current[length - 1].current?.focus();
        } else {
             inputRefs.current[pastedData.length].current?.focus();
        }
    };

    const isUnified = variant === 'unified';

    const handleContainerClick = () => {
        if (!isUnified) return;
        // Find the first empty input to focus on. `value.length` gives the index of the first empty slot.
        const firstEmptyIndex = value.length;
        // Clamp the index to the valid range of inputs.
        const focusIndex = Math.min(firstEmptyIndex, length - 1);
        inputRefs.current[focusIndex]?.current?.focus();
    };

    const containerClasses = isUnified
        ? `flex items-center justify-center px-2 h-16 border-2 border-[var(--input)] rounded-lg shadow-sm focus-within:ring-4 focus-within:ring-[var(--primary-color-focus-ring)] focus-within:border-[var(--primary-color)] transition-shadow bg-[var(--card-background)] cursor-text`
        : `flex justify-center gap-1 sm:gap-2`;

    // Refactored to remove color logic, making it cleaner.
    const getInputBaseClasses = () => {
        if (isUnified) {
            return `flex-1 min-w-0 h-full text-center text-2xl sm:text-3xl font-bold bg-transparent border-0 focus:ring-0 p-0 outline-none`;
        }
        // Split variant
        return `w-9 h-12 sm:w-11 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-[var(--primary-color-focus-ring)] focus:border-[var(--primary-color)] transition-shadow bg-[var(--card-background)]`;
    };

    return (
        <div>
            <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">{label}</label>
            <div 
                className={containerClasses} 
                onPaste={handlePaste}
                onClick={handleContainerClick}
            >
                {Array.from({ length }).map((_, index) => {
                    // Color logic is now handled here, cleanly separated from base styles.
                    const colorClass = isUnified || !colorize || !value[index]
                        ? 'text-[var(--foreground)]'
                        : accentColors[index % accentColors.length];

                    return (
                        <input
                            key={index}
                            ref={inputRefs.current[index]}
                            type="tel"
                            maxLength={1}
                            value={value[index] || ''}
                            onChange={(e) => handleChange(e, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            className={`${getInputBaseClasses()} ${colorClass}`}
                        />
                    );
                })}
            </div>
        </div>
    );
};
