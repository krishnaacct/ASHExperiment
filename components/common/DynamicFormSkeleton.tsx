import React from 'react';
import { SkeletonLoader } from '../ui/SkeletonLoader';

const DynamicFormSkeleton: React.FC = () => {
    return (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <SkeletonLoader className="h-4 w-1/3 rounded" />
                    <SkeletonLoader className="h-10 w-full rounded-lg" />
                </div>
            ))}
        </div>
    );
};

export default DynamicFormSkeleton;
