import React from 'react';
import { SkeletonLoader } from '../ui/SkeletonLoader';
import { Card } from '../ui/Card';

const UserManagementSkeleton: React.FC = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Pane Skeleton */}
            <Card className="lg:col-span-1 h-fit">
                <div className='p-4 border-b border-[var(--border)]'>
                    <SkeletonLoader className="h-10 w-full rounded-lg" />
                </div>
                <div className="divide-y divide-[var(--border)]">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-4 flex items-center space-x-4">
                            <SkeletonLoader className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <SkeletonLoader className="h-4 w-3/4 rounded" />
                                <SkeletonLoader className="h-4 w-1/2 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            {/* Right Pane Skeleton */}
            <div className="lg:col-span-2">
                <Card>
                    <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-[var(--placeholder-background)] rounded-2xl">
                         <SkeletonLoader className="h-16 w-16 rounded-full mx-auto mb-4" />
                         <SkeletonLoader className="h-6 w-3/4 mb-2 rounded" />
                         <SkeletonLoader className="h-4 w-1/2 rounded" />
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default UserManagementSkeleton;