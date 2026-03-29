
import React, { useState, useEffect, useMemo } from 'react';
// FIX: Removed ALL_PERMISSIONS as it is not exported from types.ts and permissions are now dynamic.
import { AppModuleConfig, Permission } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { ICONS } from '../dashboard/modules';
// FIX: Imported usePermissions hook to get the list of available permissions dynamically.
import { usePermissions } from '../../hooks/usePermissions';

interface AppConfigFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (module: AppModuleConfig) => void;
    existingModule: AppModuleConfig | null;
    allModules: AppModuleConfig[];
}

const AppConfigForm: React.FC<AppConfigFormProps> = ({ isOpen, onClose, onSave, existingModule, allModules }) => {
    const [formData, setFormData] = useState<Partial<AppModuleConfig>>({});
    // FIX: Get dynamic permissions from the backend via the usePermissions hook.
    const { permissionDefinitions } = usePermissions();

    useEffect(() => {
        if (existingModule) {
            setFormData(existingModule);
        } else {
            // Defaults for new item
            setFormData({
                moduleType: 'MODULE',
                isActive: true,
                sortOrder: (allModules.length + 1) * 10,
            });
        }
    }, [existingModule, allModules, isOpen]);

    const handleChange = (field: keyof AppModuleConfig, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalModule: AppModuleConfig = {
            moduleId: formData.moduleId || `${formData.moduleType === 'CATEGORY' ? 'cat' : 'mod'}_${formData.displayName?.toLowerCase().replace(/\s+/g, '-')}`,
            displayName: formData.displayName || '',
            parentModuleId: formData.parentModuleId || null,
            moduleType: formData.moduleType || 'MODULE',
            iconName: formData.iconName || '',
            componentKey: formData.componentKey || 'placeholder',
            permission: formData.permission || null,
            isActive: formData.isActive !== undefined ? formData.isActive : true,
            sortOrder: formData.sortOrder || 999,
        };
        onSave(finalModule);
    };
    
    const categoryOptions = useMemo(() => {
        return allModules
            .filter(m => m.moduleType === 'CATEGORY')
            .map(m => ({ value: m.moduleId, label: m.displayName }));
    }, [allModules]);

    const iconOptions = useMemo(() => {
        return Object.keys(ICONS).map(key => ({ value: key, label: key }));
    }, []);

    const permissionOptions = useMemo(() => {
        // FIX: Use permissionDefinitions from the hook instead of the non-existent ALL_PERMISSIONS.
        // This makes the form aware of all permissions defined in the system.
        // Also, it provides a more user-friendly label with the permission description.
        const sortedPermissions = [...permissionDefinitions].sort((a, b) => a.description.localeCompare(b.description));
        return sortedPermissions.map(p => ({ value: p.permissionName, label: `${p.description} (${p.permissionName})` }));
    }, [permissionDefinitions]);

    const SelectedIcon = formData.iconName ? ICONS[formData.iconName] : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingModule ? 'Edit Item' : 'Add New Item'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Display Name"
                    value={formData.displayName || ''}
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    required
                />
                 {!existingModule && (
                     <p className="text-xs text-gray-500 -mt-2">Module ID will be generated automatically from the display name.</p>
                 )}

                <Select
                    label="Type"
                    value={formData.moduleType || ''}
                    onChange={(value) => handleChange('moduleType', value)}
                    options={[
                        { value: 'MODULE', label: 'Module (Link to a page)' },
                        { value: 'CATEGORY', label: 'Category (A group heading)' },
                    ]}
                    required
                />

                {formData.moduleType === 'MODULE' && (
                    <>
                        <Select
                            label="Parent Category"
                            value={formData.parentModuleId || ''}
                            onChange={(value) => handleChange('parentModuleId', value)}
                            options={categoryOptions}
                            required
                        />
                        <div className="flex items-end space-x-2">
                            <div className="flex-grow">
                                <Select
                                    label="Icon"
                                    value={formData.iconName || ''}
                                    onChange={(value) => handleChange('iconName', value)}
                                    options={iconOptions}
                                />
                            </div>
                            {SelectedIcon && (
                                <div className="p-3 mb-1 border border-[var(--border)] rounded-lg bg-[var(--card-inset-background)]">
                                    {/* FIX: Cast SelectedIcon to React.ReactElement<any> to allow passing className prop in cloneElement */}
                                    {React.cloneElement(SelectedIcon as React.ReactElement<any>, { className: 'h-6 w-6 text-[var(--foreground-muted)]' })}
                                </div>
                            )}
                        </div>
                        <Input
                            label="Component Key"
                            value={formData.componentKey || ''}
                            onChange={(e) => handleChange('componentKey', e.target.value)}
                            placeholder="e.g., 'users' or 'placeholder'"
                            required
                        />
                         <Select
                            label="Required Permission"
                            value={formData.permission || ''}
                            onChange={(value) => handleChange('permission', value as Permission)}
                            options={permissionOptions}
                        />
                    </>
                )}


                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save</Button>
                </div>
            </form>
        </Modal>
    );
};

export default AppConfigForm;
