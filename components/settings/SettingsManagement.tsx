import React, { useEffect, useState, useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useAuth } from '../../hooks/useAuth';
import { useSMR } from '../../hooks/useSMR';
import { Setting } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { DynamicFormEngine } from '../common/DynamicFormEngine';
import { Send, AlertTriangle } from 'lucide-react';
import { Input } from '../ui/Input';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';

type Tab = 'branding' | 'backend';

interface SettingsManagementProps {
    defaultTab?: Tab;
}

const SettingsManagement: React.FC<SettingsManagementProps> = ({ defaultTab = 'branding' }) => {
    const { settings, loading: settingsLoading, updateSettings, testTelegramGroup } = useSettings();
    const { hasPermission } = useAuth();
    const { superMasterRecord, loading: smrLoading } = useSMR();

    const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
    const [localSettings, setLocalSettings] = useState<Record<string, string | boolean>>({});
    const [testingId, setTestingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        const settingsObject = settings.reduce((acc, setting) => {
            acc[setting.settingName] = setting.settingValue;
            return acc;
        }, {} as Record<string, string>);
        setLocalSettings(settingsObject);
        setIsDirty(false); 
    }, [settings]);

    const loading = settingsLoading || smrLoading;
    const canEditSettings = hasPermission('settings_edit');

    // --- DYNAMIC FIELD & GROUPING LOGIC ---
    const { brandingFields, backendFields } = useMemo(() => {
        const moduleDataScope = "Settings";
        const sortedFields = superMasterRecord
            .filter(field => {
                try {
                    const modules = JSON.parse(field.modules);
                    return Array.isArray(modules) && modules.includes(moduleDataScope);
                } catch { return false; }
            })
            .sort((a, b) => {
                let orderA = Infinity, orderB = Infinity;
                try {
                    if (a.sortOrders) orderA = JSON.parse(a.sortOrders)[moduleDataScope] ?? Infinity;
                } catch {}
                try {
                    if (b.sortOrders) orderB = JSON.parse(b.sortOrders)[moduleDataScope] ?? Infinity;
                } catch {}
                if (orderA !== Infinity || orderB !== Infinity) return orderA - orderB;
                return a.displayName.localeCompare(b.displayName);
            });

        const branding = sortedFields.filter(f => f.groupName === 'App Branding');
        
        let backend = sortedFields.filter(f => f.groupName === 'Backend Configuration');
        backend = backend.filter(f => f.fieldName !== 'telegramModuleGroupIds');

        return { brandingFields: branding, backendFields: backend };
    }, [superMasterRecord]);

    const handleFormChange = (name: string, value: string | boolean) => {
        setLocalSettings(prev => ({ ...prev, [name]: value }));
        setIsDirty(true); 
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const settingsArray = Object.entries(localSettings).map(([settingName, settingValue]) => ({ 
                settingName, 
                settingValue: String(settingValue) 
            }));
            await updateSettings(settingsArray);
            if (localSettings.primaryColor) {
                localStorage.setItem('primaryColor', String(localSettings.primaryColor));
            }
            toast('Settings saved successfully!', 'success');
            setIsDirty(false); 
        } catch(e) {
            toast('Failed to save settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleTestGroupId = async (groupId: string, moduleName: string) => {
        if (!groupId) {
            toast('Please enter a Group ID to test.', 'error');
            return;
        }
        setTestingId(moduleName);
        try {
            const result = await testTelegramGroup(groupId);
            if (result.success) {
                toast('Test message sent successfully!', 'success');
            } else {
                toast(`Failed: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (e) {
            toast(e instanceof Error ? e.message : 'An unexpected error occurred.', 'error');
        } finally {
            setTestingId(null);
        }
    };

    const renderTabContent = () => {
        const fields = activeTab === 'branding' ? brandingFields : backendFields;
        const fieldNames = fields.map(f => f.fieldName);
        
        return (
            <div>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <DynamicFormEngine
                            moduleName="Settings"
                            fieldNames={fieldNames}
                            formData={localSettings}
                            onFormChange={handleFormChange}
                            disabled={!canEditSettings || loading}
                        />
                         {activeTab === 'backend' && canEditSettings && (
                            <div className="p-4 border border-dashed rounded-lg">
                                <h4 className="text-lg font-semibold mb-2 text-[var(--foreground)]">Test a Group ID</h4>
                                <div className="flex items-end space-x-2">
                                    <div className="flex-grow">
                                        <Input
                                            id="test-group-id"
                                            label="Paste Group ID to test..."
                                            placeholder="-100123456789"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => handleTestGroupId((document.getElementById('test-group-id') as HTMLInputElement)?.value || '', 'test')}
                                        isLoading={testingId === 'test'}
                                        size="md"
                                        className="h-[52px]"
                                    >
                                        <Send className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-8 pt-4 border-t border-[var(--border)]">
                     {canEditSettings && <Button onClick={handleSave} isLoading={isSaving} disabled={!isDirty}>Save {activeTab === 'branding' ? 'Branding' : 'Backend'} Config</Button>}
                </div>
            </div>
        );
    };
    
    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Settings</h1>
            </div>
             {isDirty && (
                <div className="mb-4 p-4 bg-[var(--toast-warning-background)] text-[var(--toast-warning-foreground)] rounded-lg flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-3" />
                    You have unsaved changes. Click the "Save" button at the bottom of the form to apply them.
                </div>
            )}
            <div className="mb-6">
                <div className="sm:hidden">
                    <label htmlFor="tabs" className="sr-only">Select a tab</label>
                    <select
                        id="tabs"
                        name="tabs"
                        className="block w-full rounded-md border-[var(--border)] bg-[var(--card-background)] text-[var(--foreground)] focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                        onChange={(e) => setActiveTab(e.target.value as Tab)}
                        value={activeTab}
                    >
                        <option value="branding">App Branding</option>
                        <option value="backend">Backend Configuration</option>
                    </select>
                </div>
                <div className="hidden sm:block">
                     <div className="inline-flex rounded-lg bg-[var(--tab-background)] p-1 space-x-1">
                        <button onClick={() => setActiveTab('branding')} className={`${activeTab === 'branding' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all`}>
                            App Branding
                        </button>
                        <button onClick={() => setActiveTab('backend')} className={`${activeTab === 'backend' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all`}>
                            Backend Configuration
                        </button>
                    </div>
                </div>
            </div>
            
            {(loading && !settings.length) ? (
                <WorkstationSkeleton type="form" />
            ) : (
                <Card>
                    {renderTabContent()}
                </Card>
            )}
        </div>
    );
};

export default SettingsManagement;