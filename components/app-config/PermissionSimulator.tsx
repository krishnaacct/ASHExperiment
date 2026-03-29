
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Permission, PermissionDefinition } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { usePermissions } from '../../hooks/usePermissions';
import { SurfaceLoader } from '../common/SurfaceLoader';

interface PermissionSimulatorProps {
    isOpen: boolean;
    onClose: () => void;
}

const PermissionSimulator: React.FC<PermissionSimulatorProps> = ({ isOpen, onClose }) => {
    const { user, simulatePermissions, resetPermissions, isSimulating } = useAuth();
    const { permissionDefinitions, loading } = usePermissions();

    const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(
        new Set(user?.permissions || [])
    );

    const groupedPermissions = useMemo(() => {
        return permissionDefinitions.reduce((acc, perm) => {
            const category = perm.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(perm);
            return acc;
        }, {} as Record<string, PermissionDefinition[]>);
    }, [permissionDefinitions]);

    const handlePermissionChange = (permissionName: string, checked: boolean) => {
        setSelectedPermissions(prev => {
            const newPerms = new Set(prev);
            if (checked) {
                newPerms.add(permissionName);
            } else {
                newPerms.delete(permissionName);
            }
            return newPerms;
        });
    };

    const handleApply = () => {
        simulatePermissions(Array.from(selectedPermissions));
        onClose();
    };

    const handleReset = () => {
        resetPermissions();
        onClose();
    };
    
    const handleSelectAll = () => {
        setSelectedPermissions(new Set(permissionDefinitions.map(p => p.permissionName)));
    };

    const handleClearAll = () => {
        setSelectedPermissions(new Set());
    };

    const renderFooter = () => (
        <div className="flex flex-col sm:flex-row justify-end items-center space-y-2 sm:space-y-0 sm:space-x-2">
            {isSimulating && (
                <Button variant="danger" onClick={handleReset} className="w-full sm:w-auto">
                    Exit Current Simulation
                </Button>
            )}
            <Button onClick={handleApply} className="w-full sm:w-auto">
                Apply Simulation
            </Button>
        </div>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Permission Simulator"
            footer={renderFooter()}
        >
            <div className="space-y-4 min-h-[300px] relative">
                {loading ? (
                    <SurfaceLoader label="Loading permissions..." />
                ) : (
                    <>
                        <p className="text-sm text-[var(--foreground-muted)]">
                            Select the permissions you want to simulate for your current session. This will change the UI to show you exactly what a user with these permissions would see.
                        </p>

                        <div className="flex items-center space-x-2">
                            <Button variant="secondary" size="sm" onClick={handleSelectAll} disabled={loading}>Select All</Button>
                            <Button variant="secondary" size="sm" onClick={handleClearAll} disabled={loading}>Clear All</Button>
                        </div>

                        <div className="space-y-4 p-4 border-2 border-[var(--border)] rounded-lg bg-[var(--card-inset-background)]">
                            {Object.keys(groupedPermissions).sort().map(category => (
                                <div key={category}>
                                    <p className="font-bold text-[var(--foreground)]">{category}</p>
                                    <div className="mt-2 space-y-2 pl-2">
                                        {groupedPermissions[category].map(permission => (
                                            <div key={permission.permissionId}>
                                                <Checkbox
                                                    id={`sim-${permission.permissionName}`}
                                                    checked={selectedPermissions.has(permission.permissionName)}
                                                    onChange={(e) => handlePermissionChange(permission.permissionName, e.target.checked)}
                                                    label={(
                                                        <span className="text-sm text-[var(--foreground)]">
                                                            {permission.description}
                                                            <span className="block text-xs text-[var(--foreground-muted)] font-mono">({permission.permissionName})</span>
                                                        </span>
                                                    )}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default PermissionSimulator;
