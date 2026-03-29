
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Building, ArrowRight } from 'lucide-react';
import { useContext } from 'react';
import { ScopeContext } from '../../context/ScopeContext';

interface ScopeSelectorProps {
    onScopeSelected?: () => void;
    compact?: boolean;
}

export const ScopeSelector: React.FC<ScopeSelectorProps> = ({ onScopeSelected, compact = false }) => {
    const { mastersData } = useData();
    const { setScope, selectedBuildingId, selectedWingId } = useContext(ScopeContext)!;
    
    const [localBuildingId, setLocalBuildingId] = useState<string>(selectedBuildingId || '');
    const [localWingId, setLocalWingId] = useState<string>(selectedWingId || '');

    const buildings = useMemo(() => 
        mastersData.filter(m => m.masterName === 'Buildings' && m.isActive)
                   .map(m => ({ value: m.value, label: m.label })), 
    [mastersData]);

    const wings = useMemo(() => 
        mastersData.filter(m => m.masterName === 'Wings' && m.isActive)
                   .map(m => ({ value: m.value, label: m.label })), 
    [mastersData]);

    // If only one building exists, select it automatically
    useEffect(() => {
        if (buildings.length === 1 && !localBuildingId) {
            setLocalBuildingId(buildings[0].value);
        }
    }, [buildings, localBuildingId]);

    const handleApply = () => {
        if (!localBuildingId) return;
        setScope(localBuildingId, localWingId || null);
        if (onScopeSelected) onScopeSelected();
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                 <Select 
                    value={localBuildingId} 
                    onChange={setLocalBuildingId} 
                    options={buildings} 
                    placeholder="Building..."
                    className="w-40"
                />
                 {wings.length > 0 && (
                    <Select 
                        value={localWingId} 
                        onChange={setLocalWingId} 
                        options={[{value: '', label: 'All Wings'}, ...wings]} 
                        placeholder="Wing..."
                        className="w-32"
                    />
                )}
                <Button size="sm" onClick={handleApply} disabled={!localBuildingId}>Apply</Button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md p-8 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <Building size={32} />
                </div>
                
                <div>
                    <h2 className="text-2xl font-bold text-[var(--foreground)]">Select Facility Scope</h2>
                    <p className="text-[var(--foreground-muted)] mt-2">Please select the building you wish to manage.</p>
                </div>

                <div className="space-y-4 text-left">
                    <Select 
                        label="Building"
                        value={localBuildingId} 
                        onChange={setLocalBuildingId} 
                        options={buildings} 
                        required
                    />
                    
                    {wings.length > 0 && (
                        <Select 
                            label="Wing (Optional)"
                            value={localWingId} 
                            onChange={setLocalWingId} 
                            options={[{value: '', label: 'All Wings'}, ...wings]} 
                        />
                    )}
                </div>

                <Button onClick={handleApply} disabled={!localBuildingId} className="w-full h-12 text-lg">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </Card>
        </div>
    );
};
