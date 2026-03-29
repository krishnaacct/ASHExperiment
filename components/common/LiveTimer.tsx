import React from 'react';
import { Clock } from 'lucide-react';

interface LiveTimerProps {
    seconds: number;
    label?: string;
    className?: string;
}

/**
 * Standardized timer display component with high-contrast mono-font.
 */
export const LiveTimer: React.FC<LiveTimerProps> = ({ 
    seconds, 
    label = "Elapsed", 
    className 
}) => {
    const formatTime = (totalSeconds: number) => {
        // Handle edge cases like negative values or NaN
        const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
        const hrs = Math.floor(safeSeconds / 3600);
        const mins = Math.floor((safeSeconds % 3600) / 60);
        const secs = safeSeconds % 60;
        
        // Return HH:MM:SS or MM:SS if hours is zero
        const parts = [];
        if (hrs > 0) parts.push(hrs.toString().padStart(2, '0'));
        parts.push(mins.toString().padStart(2, '0'));
        parts.push(secs.toString().padStart(2, '0'));
        
        return parts.join(':');
    };

    return (
        <div className={`flex items-center space-x-2 text-[var(--foreground-muted)] ${className}`}>
            <Clock size={16} className="text-[var(--primary-color)]" />
            {label && <span className="text-xs font-bold uppercase tracking-wider">{label}</span>}
            <span className="font-mono text-base font-black bg-[var(--card-inset-background)] px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--foreground)] shadow-sm">
                {formatTime(seconds)}
            </span>
        </div>
    );
};