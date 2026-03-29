
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface ScopeContextType {
    selectedBuildingId: string | null;
    selectedWingId: string | null;
    setScope: (buildingId: string | null, wingId: string | null) => void;
    clearScope: () => void;
}

export const ScopeContext = createContext<ScopeContextType | undefined>(undefined);

export const ScopeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(() => {
        return sessionStorage.getItem('scope_buildingId');
    });
    const [selectedWingId, setSelectedWingId] = useState<string | null>(() => {
        return sessionStorage.getItem('scope_wingId');
    });

    const setScope = useCallback((buildingId: string | null, wingId: string | null) => {
        setSelectedBuildingId(buildingId);
        setSelectedWingId(wingId);
        
        if (buildingId) sessionStorage.setItem('scope_buildingId', buildingId);
        else sessionStorage.removeItem('scope_buildingId');

        if (wingId) sessionStorage.setItem('scope_wingId', wingId);
        else sessionStorage.removeItem('scope_wingId');
    }, []);

    const clearScope = useCallback(() => {
        setScope(null, null);
    }, [setScope]);

    return (
        <ScopeContext.Provider value={{ selectedBuildingId, selectedWingId, setScope, clearScope }}>
            {children}
        </ScopeContext.Provider>
    );
};
