import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from '../ui/Toast';
import { RefreshCw, Save, ShieldCheck, Database, Settings, FileText } from 'lucide-react';
import * as api from '../../services/apiService';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';

type Tab = 'status' | 'config';

const AuditDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('status');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [settings, setSettings] = useState<any>({});
    
    const canEdit = user?.permissions.includes('audit_manager_edit');

    const getAuthHeader = () => {
        if (!user?.sessionId) throw new Error("Not authenticated");
        return user.sessionId;
    };

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const data = await api.getAuditSettings(getAuthHeader());
                setSettings(data);
            } catch (error) {
                console.error("Failed to fetch audit settings:", error);
                toast("Failed to load settings.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [user]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await api.syncAuditData(getAuthHeader());
            if (result.synced) {
                toast("Data synchronized successfully!", "success");
                setSettings(prev => ({ ...prev, lastSyncTimestamp: new Date().toISOString() }));
            } else {
                toast(result.message, "info");
            }
        } catch (error) {
            toast(error instanceof Error ? error.message : "Sync failed", "error");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSaveSettings = async () => {
        setIsLoading(true);
        try {
            await api.updateAuditSettings(getAuthHeader(), settings);
            toast("Settings saved.", "success");
        } catch (error) {
            toast("Failed to save settings.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (isLoading && !settings.sourceExcelFileId) {
        return <WorkstationSkeleton type="grid" />;
    }

    const lastSyncDate = settings.lastSyncTimestamp ? new Date(settings.lastSyncTimestamp).toLocaleString() : 'Never';

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Audit Manager</h1>
            </div>

            <div className="mb-6">
                <div className="inline-flex rounded-lg bg-[var(--tab-background)] p-1 space-x-1">
                    <button onClick={() => setActiveTab('status')} className={`${activeTab === 'status' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}>
                        <Database className="w-4 h-4 mr-2" /> Status & Sync
                    </button>
                    <button onClick={() => setActiveTab('config')} className={`${activeTab === 'config' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}>
                        <Settings className="w-4 h-4 mr-2" /> Configuration
                    </button>
                </div>
            </div>

            {activeTab === 'status' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Data Synchronization">
                        <div className="flex flex-col items-center justify-center p-8 space-y-6">
                            <div className={`p-4 rounded-full ${settings.sourceExcelFileId ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                <FileText className="w-12 h-12" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-semibold text-[var(--foreground)]">Source Excel File</p>
                                <p className="text-sm text-[var(--foreground-muted)] font-mono mt-1">{settings.sourceExcelFileId || 'Not Configured'}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-[var(--foreground-muted)]">Last Synced</p>
                                <p className="text-xl font-bold text-[var(--foreground)]">{lastSyncDate}</p>
                            </div>
                            {canEdit && (
                                <Button onClick={handleSync} isLoading={isSyncing} disabled={!settings.sourceExcelFileId || isSyncing}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Sync Now
                                </Button>
                            )}
                        </div>
                    </Card>
                    <Card title="Audit Operations">
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-[var(--card-inset-background)] rounded-lg border border-[var(--border)]">
                                <h3 className="font-semibold text-[var(--foreground)] flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-blue-500" />Testing Mode</h3>
                                <p className="text-sm text-[var(--foreground-muted)] mt-2">When a <strong>Test Group ID</strong> is configured, all audit reports and alerts will be routed to that group instead of real recipients.</p>
                                <div className="mt-4"><span className={`px-2 py-1 rounded text-xs font-bold ${settings.auditTestGroupId ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'}`}>{settings.auditTestGroupId ? 'TEST MODE ACTIVE' : 'TEST MODE INACTIVE'}</span></div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'config' && (
                <Card title="Audit Configuration">
                    <div className="p-6 space-y-6">
                        <Input label="Source Excel File ID" value={settings.sourceExcelFileId || ''} onChange={(e) => handleChange('sourceExcelFileId', e.target.value)} placeholder="Enter Google Drive File ID" disabled={!canEdit || isLoading} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Test Group ID (Override)" value={settings.auditTestGroupId || ''} onChange={(e) => handleChange('auditTestGroupId', e.target.value)} placeholder="-100..." disabled={!canEdit || isLoading} />
                            <Input label="Audit Log Group ID" value={settings.auditLogGroupId || ''} onChange={(e) => handleChange('auditLogGroupId', e.target.value)} placeholder="-100..." disabled={!canEdit || isLoading} />
                        </div>
                        {canEdit && <div className="flex justify-end pt-4 border-t border-[var(--border)]"><Button onClick={handleSaveSettings} isLoading={isLoading}><Save className="w-4 h-4 mr-2" /> Save Configuration</Button></div>}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default AuditDashboard;