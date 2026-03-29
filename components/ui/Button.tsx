import React from 'react';
import { Loader } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    isLoading?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', isLoading = false, size = 'md', ...props }) => {
    const baseClasses = 'relative rounded-lg font-semibold focus:outline-none focus:ring-4 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center shadow-sm';

    const variantClasses = {
        primary: 'bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color-hover)] focus:ring-[var(--primary-color-focus-ring)] hover:shadow-lg hover:shadow-[var(--primary-color-focus-ring)]',
        secondary: 'bg-[var(--secondary-background)] text-[var(--secondary-foreground)] border border-[var(--secondary-border)] hover:bg-[var(--secondary-hover-background)] focus:ring-gray-300 dark:focus:ring-slate-500',
        danger: 'bg-[var(--danger-background)] text-[var(--danger-foreground)] hover:bg-[var(--danger-background-hover)] focus:ring-[var(--danger-focus-ring)]',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 hover:shadow-lg hover:shadow-emerald-500/30',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm min-h-[36px]',
        md: 'px-4 py-2 text-base min-h-[44px]',
        lg: 'px-6 py-3 text-lg min-h-[52px]',
    };

    const iconSize = size === 'sm' ? 18 : 24;

    return (
        <button
            className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {/* 
              FIX: Maintain the button's content visibility state correctly. 
              When loading, the text is hidden (opacity-0) but still takes up space to prevent width flickering,
              while the spinner is centered in the middle of that space.
            */}
            <span className={`flex items-center justify-center transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                {children}
            </span>
            
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader className="animate-spin text-current" size={iconSize} strokeWidth={2.5} />
                </div>
            )}
        </button>
    );
};