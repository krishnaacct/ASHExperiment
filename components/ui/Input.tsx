
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: React.ReactNode; // Updated to support ReactNode for spans
}

export const Input: React.FC<InputProps> = ({ label, id, className, ...props }) => {
    return (
        <div>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                    {label}{props.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                </label>
            )}
            <input
                id={id}
                className={`block w-full px-4 py-3 text-base bg-[var(--card-background)] border border-[var(--input)] rounded-lg shadow-sm placeholder-[var(--placeholder-foreground)] text-[var(--foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--primary-color-focus-ring)] focus:border-[var(--primary-color)] transition-all duration-300 disabled:bg-[var(--input-disabled-background)] disabled:border-[var(--input-disabled-border)] disabled:text-[var(--input-disabled-foreground)] disabled:cursor-not-allowed ${className || ''}`}
                {...props}
            />
        </div>
    );
};
