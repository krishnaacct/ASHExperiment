import React from 'react';

interface ProgressBarProps {
    value: number; // 0 to 100
    label?: string;
    isAnimated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
    value, 
    label, 
    isAnimated = false 
}) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
        <div className="w-full space-y-2">
            {(label || value !== undefined) && (
                <div className="flex justify-between items-end">
                    {label && <span className="text-sm font-medium text-[var(--foreground-muted)]">{label}</span>}
                    <span className="text-xs font-bold font-mono text-[var(--primary-color)]">{Math.round(clampedValue)}%</span>
                </div>
            )}
            <div className="h-1.5 w-full bg-[var(--card-inset-background)] rounded-full overflow-hidden border border-[var(--border)]">
                <div 
                    className={`h-full bg-[var(--primary-color)] rounded-full transition-all duration-500 ease-out relative ${isAnimated ? 'animate-progress-stripe' : ''}`}
                    style={{ 
                        width: `${clampedValue}%`,
                        backgroundImage: isAnimated ? 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)' : 'none',
                        backgroundSize: '1rem 1rem'
                    }}
                />
            </div>
        </div>
    );
};