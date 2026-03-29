import React from 'react';
import { SkeletonLoader } from '../ui/SkeletonLoader';
import { Card } from '../ui/Card';

const SMREditorSkeleton: React.FC = () => {
    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <SkeletonLoader className="h-10 w-1/3 rounded-lg" />
                <SkeletonLoader className="h-12 w-48 rounded-lg" />
            </div>
            <Card>
                <div className="p-4 border-b border-[var(--border)] space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
                    <SkeletonLoader className="h-10 w-full md:w-1/3 rounded-lg" />
                    <div className="flex items-center gap-4 flex-wrap">
                        <SkeletonLoader className="h-10 w-40 rounded-lg" />
                        <SkeletonLoader className="h-10 w-40 rounded-lg" />
                        <SkeletonLoader className="h-6 w-32 rounded" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border)]">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-3"><SkeletonLoader className="h-4 w-24 rounded" /></th>
                                <th className="px-6 py-3"><SkeletonLoader className="h-4 w-24 rounded" /></th>
                                <th className="px-6 py-3"><SkeletonLoader className="h-4 w-24 rounded" /></th>
                                <th className="px-6 py-3"><SkeletonLoader className="h-4 w-24 rounded" /></th>
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--card-background)] divide-y divide-[var(--border)]">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4"><SkeletonLoader className="h-5 w-3/4 rounded" /></td>
                                    <td className="px-6 py-4"><SkeletonLoader className="h-5 w-1/2 rounded" /></td>
                                    <td className="px-6 py-4"><SkeletonLoader className="h-6 w-20 rounded-full" /></td>
                                    <td className="px-6 py-4"><SkeletonLoader className="h-8 w-24 rounded-lg" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default SMREditorSkeleton;
