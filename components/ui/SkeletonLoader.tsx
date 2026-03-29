import React from 'react';

interface SkeletonLoaderProps {
    className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className }) => {
    return (
        <span 
            className={`block bg-[var(--skeleton-background)] rounded animate-pulse ${className}`} 
            style={{ animationDuration: '1.5s' }}
        />
    );
};