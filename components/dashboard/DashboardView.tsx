import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import KeyMetricsWidget from './widgets/KeyMetricsWidget';
import ActivityWidget from './widgets/ActivityWidget';

interface DashboardViewProps {
    onModuleSelect?: (id: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onModuleSelect }) => {
    const { user } = useAuth();

    return (
        <div className="flex flex-col h-full">
            {/* Standardized title placement at the top */}
            <div className="flex flex-col justify-start pb-6 pt-2">
                <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight uppercase">
                    Welcome, {user?.name}!
                </h1>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content area */}
                <div className="lg:col-span-2 space-y-6">
                    <KeyMetricsWidget onModuleSelect={onModuleSelect} />
                </div>

                {/* Sidebar-like content area */}
                <div className="lg:col-span-1 space-y-6">
                    <ActivityWidget />
                </div>
            </div>
        </div>
    );
};

export default DashboardView;