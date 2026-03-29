import React from 'react';
import { Loader } from 'lucide-react';

interface SurfaceLoaderProps {
    label?: string;
    className?: string;
}

/**
 * A reusable overlay loader that blurs the content behind it.
 * Used for background refreshes (like changing pages in a list).
 */
export const SurfaceLoader: React.FC<SurfaceLoaderProps> = ({ 
    label = "Updating data...", 
    className 
}) => {
    return (
        <div className={`absolute inset-0 z-30 bg-[var(--card-background)]/40 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all animate-in fade-in duration-300 ${className}`}>
            <div className="bg-[var(--popover-background)] p-6 rounded-2xl shadow-xl border border-[var(--border)] flex flex-col items-center space-y-3">
                <Loader className="animate-spin text-[var(--primary-color)]" size={32} />
                {label && (
                    <span className="text-sm font-semibold text-[var(--foreground-muted)] animate-pulse">
                        {label}
                    </span>
                )}
            </div>
        </div>
    );
};