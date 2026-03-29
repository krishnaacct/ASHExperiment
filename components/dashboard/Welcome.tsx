import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';

const Welcome: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="flex flex-col h-full w-full">
            {/* Standardized title placement at the top */}
            <div className="flex flex-col justify-start pb-6 pt-2">
                <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight uppercase">
                    Welcome, {user?.name}!
                </h1>
            </div>
            <Card>
                <div className="p-4">
                    <h2 className="text-xl font-bold text-[var(--foreground)]">Dashboard Overview</h2>
                    <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                        You are logged in as a <span className="font-medium text-[var(--primary-color)]">{user?.roleLabel}</span>.
                    </p>
                    <p className="mt-4 text-sm text-[var(--foreground-muted)]">
                        Use the navigation on the left to manage the centre workstation. This is your central hub for administrative operations.
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Welcome;