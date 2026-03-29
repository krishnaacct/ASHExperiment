import React, { useEffect } from 'react';
import { useData } from '../../../hooks/useData';
import { Card } from '../../ui/Card';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { ActivityLog } from '../../../types';
import { formatDistanceToNow } from 'date-fns';
import { FilePlus, Edit, Trash2, LogIn } from 'lucide-react';

const ActivityWidget: React.FC = () => {
    const { recentActivity, fetchRecentActivity } = useData();

    useEffect(() => {
        fetchRecentActivity();
        const interval = setInterval(fetchRecentActivity, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [fetchRecentActivity]);
    
    const getIconForAction = (actionType: ActivityLog['actionType']) => {
        switch(actionType) {
            case 'CREATE': return <FilePlus className="h-5 w-5 text-[var(--metric-icon-success)]" />;
            case 'UPDATE': return <Edit className="h-5 w-5 text-[var(--metric-icon-info)]" />;
            case 'DELETE': return <Trash2 className="h-5 w-5 text-[var(--destructive-foreground)]" />;
            case 'LOGIN': return <LogIn className="h-5 w-5 text-[var(--foreground-muted)]" />;
            default: return null;
        }
    };

    const renderSkeleton = () => (
        <Card title="Recent Activity">
            <ul className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <li key={i} className="flex items-start space-x-3">
                        <SkeletonLoader className="h-8 w-8 rounded-full flex-shrink-0" />
                        <div className="flex-grow space-y-2">
                            <SkeletonLoader className="h-4 w-full rounded" />
                            <SkeletonLoader className="h-4 w-1/4 rounded" />
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
    );

    if (recentActivity.length === 0) {
        return renderSkeleton();
    }

    return (
        <Card title="Recent Activity">
            <ul className="space-y-4 -mb-2">
                {recentActivity.map(activity => (
                    <li key={activity.logId} className="flex items-start space-x-3 pb-2">
                        <div className="h-8 w-8 rounded-full bg-[var(--card-footer-background)] flex items-center justify-center flex-shrink-0">
                           {getIconForAction(activity.actionType)}
                        </div>
                        <div className="flex-grow">
                            <p className="text-sm text-[var(--foreground-muted)]">
                                <span className="font-semibold text-[var(--foreground)]">{activity.userName}</span> {activity.description}
                            </p>
                            <p className="text-xs text-[var(--foreground-muted)]">
                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })} in <span className="font-medium">{activity.module}</span>
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
    );
};

export default ActivityWidget;
