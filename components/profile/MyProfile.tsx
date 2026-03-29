import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUsers } from '../../hooks/useUsers';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { DynamicFormEngine } from '../common/DynamicFormEngine';
import { AlertTriangle, User, SlidersHorizontal } from 'lucide-react';
import MobileNavCustomizer from './MobileNavCustomizer';
import { SuperMasterRecord } from '../../types';

type Tab = 'profile' | 'navigation';

const MyProfile: React.FC = () => {
    const { user, updateSession, hasPermission } = useAuth();
    const { updateMyProfile } = useUsers();
    
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                telegramId: user.telegramId,
                primaryMobile: user.primaryMobile, // This is read-only, but needed for display
                roleLabel: user.roleLabel,
                mobileFavorites: user.mobileFavorites || '[]'
            });
            setIsDirty(false);
        }
    }, [user]);
    
    const accessibleModules = useMemo(() => {
        return (user?.appModules || []).filter(module => 
            !module.permission || hasPermission(module.permission)
        );
    }, [user?.appModules, hasPermission]);


    const handleFormChange = (fieldName: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        setIsDirty(true);
    };
    
    const handleNavChange = (favorites: string[]) => {
        setFormData(prev => ({ ...prev, mobileFavorites: JSON.stringify(favorites) }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const profileDataToSave = {
                name: formData.name,
                telegramId: formData.telegramId,
                mobileFavorites: formData.mobileFavorites
            };
            await updateMyProfile(profileDataToSave);
            // Instantly update the global session state with the new data
            updateSession(profileDataToSave);
            toast('Profile updated successfully!', 'success');
            setIsDirty(false);
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to update profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const isFieldDisabled = (field: SuperMasterRecord): boolean => {
        // Role is managed by an admin.
        // Mobile number is the login credential and cannot be changed here.
        return ['primaryMobile', 'roleLabel'].includes(field.fieldName);
    };

    const profileFieldNames = useMemo(() => ['name', 'primaryMobile', 'telegramId', 'roleLabel'], []);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">My Profile</h1>
                {isDirty && <Button onClick={handleSave} isLoading={isSaving} disabled={!isDirty}>Save Changes</Button>}
            </div>

            {isDirty && (
                <div className="mb-4 p-4 bg-[var(--toast-warning-background)] text-[var(--toast-warning-foreground)] rounded-lg flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-3" />
                    You have unsaved changes. Click "Save Changes" to apply them.
                </div>
            )}

            <div className="mb-6">
                <div className="inline-flex rounded-lg bg-[var(--tab-background)] p-1 space-x-1">
                    <button onClick={() => setActiveTab('profile')} className={`${activeTab === 'profile' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}>
                        <User className="w-4 h-4 mr-2" /> Profile Details
                    </button>
                    <button onClick={() => setActiveTab('navigation')} className={`${activeTab === 'navigation' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}>
                        <SlidersHorizontal className="w-4 h-4 mr-2" /> Navigation
                    </button>
                </div>
            </div>

            <Card>
                {activeTab === 'profile' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DynamicFormEngine
                            moduleName="MyProfile"
                            fieldNames={profileFieldNames}
                            formData={formData}
                            onFormChange={handleFormChange}
                            isFieldDisabled={isFieldDisabled}
                        />
                    </div>
                )}
                {activeTab === 'navigation' && (
                    <MobileNavCustomizer
                        accessibleModules={accessibleModules}
                        favoriteModuleIds={JSON.parse(formData.mobileFavorites || '[]')}
                        onFavoritesChange={handleNavChange}
                    />
                )}
            </Card>
        </div>
    );
};

export default MyProfile;