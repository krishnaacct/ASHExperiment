import React, { useEffect } from 'react';
import { useData } from '../../../hooks/useData';
import { useAuth } from '../../../hooks/useAuth';
import { Card } from '../../ui/Card';
import { SkeletonLoader } from '../../ui/SkeletonLoader';
import { Users, ShieldCheck, FileText, ArrowRight } from 'lucide-react';

interface KeyMetricsWidgetProps {
    onModuleSelect?: (id: string) => void;
}

const KeyMetricsWidget: React.FC<KeyMetricsWidgetProps> = ({ onModuleSelect }) => {
    const { keyMetrics, fetchKeyMetrics } = useData();
    const { user } = useAuth();
    const { appModules = [] } = user || {};

    useEffect(() => {
        fetchKeyMetrics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleNavigation = (componentKey: string) => {
        if (!onModuleSelect) return;
        const targetModule = appModules.find(m => m.componentKey === componentKey);
        if (targetModule) {
            onModuleSelect(targetModule.moduleId);
        }
    };

    const metrics = [
        {
            label: 'Total Users',
            value: keyMetrics?.totalUsers,
            icon: <Users className="h-8 w-8 text-[var(--metric-icon-info)]" />,
            componentKey: 'users'
        },
        {
            label: 'Account Submissions',
            value: 'Open', 
            icon: <ShieldCheck className="h-8 w-8 text-[var(--metric-icon-success)]" />,
            componentKey: 'account-submissions'
        },
        {
            label: 'AIAC Audit',
            value: 'View',
            icon: <FileText className="h-8 w-8 text-[var(--metric-icon-warning)]" />,
            componentKey: 'audit-collection-box'
        }
    ];

    if (!keyMetrics) {
        return (
            <Card title="Key Metrics">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                         <div key={i} className="p-4 bg-[var(--metric-card-background)] rounded-lg">
                            <SkeletonLoader className="h-6 w-1/2 mb-2 rounded" />
                            <SkeletonLoader className="h-8 w-1/4 rounded" />
                        </div>
                    ))}
                </div>
            </Card>
        );
    }
    
    return (
        <Card title="Audit Operations">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {metrics.map(metric => (
                    <button
                        key={metric.label}
                        onClick={() => handleNavigation(metric.componentKey)}
                        className="p-4 bg-[var(--metric-card-background)] rounded-lg text-left hover:bg-[var(--metric-card-hover-background)] transition-colors group disabled:pointer-events-none disabled:opacity-50"
                        disabled={!onModuleSelect}
                    >
                        <div className="flex items-start justify-between">
                            {metric.icon}
                            <ArrowRight className="h-5 w-5 text-[var(--metric-card-arrow-color)] group-hover:text-[var(--foreground-muted)] transition-transform group-hover:translate-x-1" />
                        </div>
                        <p className="mt-2 text-sm font-medium text-[var(--foreground-muted)]">{metric.label}</p>
                        <p className="text-3xl font-bold text-[var(--foreground)]">{metric.value}</p>
                    </button>
                ))}
            </div>
        </Card>
    );
};

export default KeyMetricsWidget;
