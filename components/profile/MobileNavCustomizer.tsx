
import React, { useState, useMemo, useEffect } from 'react';
import { AppModuleConfig } from '../../types';
import { GripVertical, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { ICONS } from '../dashboard/modules';
import { Button } from '../ui/Button';

interface MobileNavCustomizerProps {
    accessibleModules: AppModuleConfig[];
    favoriteModuleIds: string[];
    onFavoritesChange: (newFavorites: string[]) => void;
}

const MobileNavCustomizer: React.FC<MobileNavCustomizerProps> = ({ accessibleModules, favoriteModuleIds, onFavoritesChange }) => {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);

    useEffect(() => {
        // BUG FIX: Sanitize the incoming favorites list to remove any modules
        // that the user may no longer have access to. This prevents "ghost"
        // items from counting towards the 5-item limit.
        const accessibleModuleIds = new Set(accessibleModules.map(m => m.moduleId));
        const sanitizedFavorites = favoriteModuleIds.filter(id => accessibleModuleIds.has(id));
        setFavorites(sanitizedFavorites);
    }, [favoriteModuleIds, accessibleModules]);

    const { available, favoriteDetails } = useMemo(() => {
        const favSet = new Set(favorites);
        const avail = accessibleModules
            .filter(m => m.moduleType === 'MODULE' && !favSet.has(m.moduleId))
            .sort((a, b) => a.displayName.localeCompare(b.displayName));
        
        const favMap = new Map(accessibleModules.map(m => [m.moduleId, m]));
        const favDetails = favorites
            .map(id => favMap.get(id))
            .filter((m): m is AppModuleConfig => !!m);

        return { available: avail, favoriteDetails: favDetails };
    }, [accessibleModules, favorites]);
    
    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, moduleId: string) => {
        setDraggedItem(moduleId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDropOnFavorites = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedItem && !favorites.includes(draggedItem) && favorites.length < 5) {
            const newFavorites = [...favorites, draggedItem];
            setFavorites(newFavorites);
            onFavoritesChange(newFavorites);
        }
        setDraggedItem(null);
    };

    const handleDropOnAvailable = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedItem && favorites.includes(draggedItem)) {
            const newFavorites = favorites.filter(id => id !== draggedItem);
            setFavorites(newFavorites);
            onFavoritesChange(newFavorites);
        }
        setDraggedItem(null);
    };
    
    const handleDropOnItem = (e: React.DragEvent<HTMLLIElement>, targetId: string) => {
        e.stopPropagation();
        if (draggedItem && draggedItem !== targetId && favorites.includes(draggedItem)) {
            const newFavorites = [...favorites];
            const draggedIndex = newFavorites.indexOf(draggedItem);
            const targetIndex = newFavorites.indexOf(targetId);
            
            newFavorites.splice(draggedIndex, 1);
            newFavorites.splice(targetIndex, 0, draggedItem);
            
            setFavorites(newFavorites);
            onFavoritesChange(newFavorites);
        }
        setDraggedItem(null);
    };
    
    const addFavorite = (moduleId: string) => {
        if (favorites.length < 5) {
            const newFavorites = [...favorites, moduleId];
            setFavorites(newFavorites);
            onFavoritesChange(newFavorites);
        }
    };
    
    const removeFavorite = (moduleId: string) => {
        const newFavorites = favorites.filter(id => id !== moduleId);
        setFavorites(newFavorites);
        onFavoritesChange(newFavorites);
    };

    const resetToDefault = () => {
        setFavorites([]);
        onFavoritesChange([]);
    };

    const renderModuleItem = (module: AppModuleConfig, isFavorite: boolean) => (
         <li
            key={module.moduleId}
            draggable
            onDragStart={(e) => handleDragStart(e, module.moduleId)}
            onDragOver={handleDragOver}
            onDrop={(e) => isFavorite && handleDropOnItem(e, module.moduleId)}
            className={`flex items-center p-3 rounded-lg bg-[var(--card-background)] border border-[var(--border)] group cursor-move ${draggedItem === module.moduleId ? 'opacity-50' : ''}`}
        >
            <GripVertical className="h-5 w-5 text-gray-400 mr-3" />
            {/* FIX: Cast icon element to React.ReactElement<any> to allow passing className prop in cloneElement */}
            {ICONS[module.iconName] ? React.cloneElement(ICONS[module.iconName] as React.ReactElement<any>, { className: 'h-5 w-5 text-gray-500 mr-3' }) : <div className="h-5 w-5 mr-3" />}
            <span className="font-medium text-[var(--foreground)] flex-grow">{module.displayName}</span>
            <Button variant="secondary" size="sm" className="p-1 h-auto" onClick={() => isFavorite ? removeFavorite(module.moduleId) : addFavorite(module.moduleId)}>
                {isFavorite ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
        </li>
    );

    return (
        <div>
             <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-[var(--foreground-muted)]">
                    Drag and drop to customize the 5 icons on your mobile bottom navigation bar.
                </p>
                <Button variant="secondary" size="sm" onClick={resetToDefault}>
                    Reset to Default
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Available Modules */}
                <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnAvailable}
                    className="p-4 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--card-inset-background)] min-h-[200px]"
                >
                    <h3 className="font-semibold text-[var(--foreground)] mb-4">Available Modules</h3>
                    <ul className="space-y-2">
                        {available.map(mod => renderModuleItem(mod, false))}
                    </ul>
                </div>

                {/* Pinned Favorites */}
                <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnFavorites}
                    className="p-4 rounded-lg border-2 border-dashed border-[var(--primary-color)] bg-[var(--accent-background)] min-h-[200px]"
                >
                    <h3 className="font-semibold text-[var(--primary-color)] mb-4">Your Pinned Favorites (Max 5)</h3>
                     {favorites.length >= 5 && <p className="text-xs text-orange-600 mb-2">Maximum of 5 favorites reached.</p>}
                    <ul className="space-y-2">
                        {favoriteDetails.map(mod => renderModuleItem(mod, true))}
                         {favorites.length === 0 && (
                            <div className="text-center py-10 text-[var(--foreground-muted)]">
                                <Plus className="mx-auto h-8 w-8" />
                                <p>Drag modules here to pin them</p>
                            </div>
                         )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default MobileNavCustomizer;
