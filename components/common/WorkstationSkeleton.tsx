import React from 'react';
import { Card } from '../ui/Card';
import { SkeletonLoader } from '../ui/SkeletonLoader';

interface WorkstationSkeletonProps {
    type?: 'list-detail' | 'grid' | 'form';
}

/**
 * Standardized skeleton shells for different workstation layouts.
 */
export const WorkstationSkeleton: React.FC<WorkstationSkeletonProps> = ({ type = 'list-detail' }) => {
    
    const renderListDetail = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {/* Left Pane (List) */}
            <Card className="lg:col-span-1 h-fit">
                <div className='p-4 border-b border-[var(--border)]'>
                    <SkeletonLoader className="h-10 w-full rounded-lg" />
                </div>
                <div className="divide-y divide-[var(--border)]">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="p-4 flex items-center space-x-4">
                            <SkeletonLoader className="h-10 w-10 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <SkeletonLoader className="h-4 w-3/4 rounded" />
                                <SkeletonLoader className="h-3 w-1/2 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            {/* Right Pane (Details) */}
            <div className="lg:col-span-2">
                <Card>
                    <div className="flex flex-col items-center justify-center h-full p-20 text-center bg-[var(--placeholder-background)] rounded-2xl">
                         <SkeletonLoader className="h-20 w-20 rounded-full mx-auto mb-6" />
                         <SkeletonLoader className="h-8 w-3/4 mb-4 rounded" />
                         <SkeletonLoader className="h-4 w-1/2 rounded" />
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderGrid = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-6 space-y-4">
                        <SkeletonLoader className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <SkeletonLoader className="h-4 w-1/2" />
                            <SkeletonLoader className="h-8 w-1/4" />
                        </div>
                    </Card>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 h-96">
                    <div className="p-4 border-b border-[var(--border)]">
                        <SkeletonLoader className="h-6 w-32" />
                    </div>
                    <div className="p-6 space-y-4">
                        <SkeletonLoader className="h-full w-full rounded-lg" />
                    </div>
                </Card>
                <Card className="md:col-span-1 h-96">
                    <div className="p-4 border-b border-[var(--border)]">
                        <SkeletonLoader className="h-6 w-32" />
                    </div>
                    <div className="p-6 space-y-6">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <SkeletonLoader className="h-8 w-8 rounded-full flex-shrink-0" />
                                <div className="space-y-2 flex-grow">
                                    <SkeletonLoader className="h-3 w-full" />
                                    <SkeletonLoader className="h-3 w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderForm = () => (
        <Card className="animate-in fade-in duration-500">
            <div className="p-6 space-y-8">
                <SkeletonLoader className="h-8 w-1/3 rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <SkeletonLoader className="h-4 w-1/4 rounded" />
                            <SkeletonLoader className="h-12 w-full rounded-lg" />
                        </div>
                    ))}
                </div>
                <div className="pt-6 border-t border-[var(--border)] flex justify-end space-x-2">
                    <SkeletonLoader className="h-10 w-24 rounded-lg" />
                    <SkeletonLoader className="h-10 w-32 rounded-lg" />
                </div>
            </div>
        </Card>
    );

    switch(type) {
        case 'grid': return renderGrid();
        case 'form': return renderForm();
        default: return renderListDetail();
    }
};