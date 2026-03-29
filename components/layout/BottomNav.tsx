
import React, { useMemo } from 'react';
import { AppModuleConfig } from '../../types';
import { ICONS } from '../dashboard/modules';
import { useAuth } from '../../hooks/useAuth';

interface BottomNavProps {
    activeModuleId: string;
    onModuleSelect: (id: string) => void;
    accessibleModules: AppModuleConfig[];
}

const BottomNav: React.FC<BottomNavProps> = ({ activeModuleId, onModuleSelect, accessibleModules }) => {
    const { user } = useAuth();

    const navItems = useMemo(() => {
        let favoriteModuleIds: string[] = [];
        try {
            if (user?.mobileFavorites) {
                const parsed = JSON.parse(user.mobileFavorites);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    favoriteModuleIds = parsed;
                }
            }
        } catch (e) {
            console.error("Failed to parse mobile favorites", e);
        }
        
        const accessibleModuleMap = new Map(accessibleModules.map(m => [m.moduleId, m]));

        if (favoriteModuleIds.length > 0) {
            return favoriteModuleIds
                .map(id => accessibleModuleMap.get(id))
                .filter((m): m is AppModuleConfig => !!m) // Filter out undefined/inaccessible modules
                .slice(0, 5);
        } else {
            // Fallback to default "Core Modules"
            const coreModules = accessibleModules
                .filter(m => m.parentModuleId === 'cat_core' && m.moduleType === 'MODULE')
                .sort((a, b) => a.sortOrder - b.sortOrder);
            
            return coreModules.length > 2 ? coreModules.slice(0, 5) : accessibleModules.filter(m => m.moduleType === 'MODULE').slice(0, 5);
        }
    }, [user, accessibleModules]);


    return (
        <div className="bg-[var(--card-background)] border-t border-[var(--border)] shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)] w-full">
            <div className={`grid grid-cols-${navItems.length || 1}`}>
                {navItems.map((item) => (
                    <button
                        key={item.moduleId}
                        onClick={() => onModuleSelect(item.moduleId)}
                        className={`flex flex-col items-center justify-center text-center py-2 px-1 transition-colors duration-200 ${
                            activeModuleId === item.moduleId 
                                ? 'text-[var(--primary-color)]' 
                                : 'text-[var(--foreground-muted)] hover:text-[var(--primary-color)]'
                        }`}
                        aria-current={activeModuleId === item.moduleId}
                    >
                        {/* FIX: Cast icon to React.ReactElement<any> to allow passing size prop in cloneElement */}
                        {ICONS[item.iconName] ? React.cloneElement(ICONS[item.iconName] as React.ReactElement<any>, { size: 24 }) : null}
                        <span className="text-xs mt-1 w-full truncate">{item.displayName}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default BottomNav;
