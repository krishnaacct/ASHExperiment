
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSMR } from '../../hooks/useSMR';
import { usePeople } from '../../hooks/usePeople';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from '../ui/Toast';
import { RefreshCw, Save, Database, Settings, FileSpreadsheet, Play, Bell, Users, Plus, Edit, Trash2 } from 'lucide-react';
import * as api from '../../services/apiService';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';
import { Modal } from '../ui/Modal';
import { DynamicFormEngine } from '../common/DynamicFormEngine';
import { ConfirmModal } from '../ui/ConfirmModal';
import { SurfaceLoader } from '../common/SurfaceLoader';

type Tab = 'status' | 'config' | 'ownership';

const VouchingStatsDashboard: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { superMasterRecord } = useSMR();
    const { getAllPeople } = usePeople();

    const [activeTab, setActiveTab] = useState<Tab>('status');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isCheckingAutoSync, setIsCheckingAutoSync] = useState(false);
    const [settings, setSettings] = useState<any>({});
    
    // Ownership State
    const [ownershipMaps, setOwnershipMaps] = useState<any[]>([]);
    const [isOwnershipLoading, setIsOwnershipLoading] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMap, setEditingMap] = useState<any>(null);
    const [mapToDelete, setMapToDelete] = useState<any>(null);
    const [isSavingMap, setIsSavingMap] = useState(false);
    const [mapFormData, setMapFormData] = useState<any>({});
    const [peopleOptions, setPeopleOptions] = useState<{value: string, label: string}[]>([]);

    const canEdit = hasPermission('vouching_stats_edit');

    const getAuthHeader = () => {
        if (!user?.sessionId) throw new Error("Not authenticated");
        return user.sessionId;
    };

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const data = await api.getVouchingStatsSettings(getAuthHeader());
            setSettings(data);
        } catch (error) {
            console.error("Failed to fetch vouching settings:", error);
            toast("Failed to load settings.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPeopleData = async () => {
        try {
            const people = await getAllPeople();
            setPeopleOptions(people.map(p => ({ value: p.personId, label: p.name || 'Unknown' })).sort((a,b) => a.label.localeCompare(b.label)));
        } catch (error) {
            console.error("Failed to fetch people for ownership:", error);
        }
    };

    const fetchOwnership = async (showToast = false) => {
        setIsOwnershipLoading(true);
        try {
            const data = await api.getVouchingOwnershipMaps(getAuthHeader());
            setOwnershipMaps(data);
            if (showToast) toast("Ownership rules refreshed.", "success");
        } catch (error) {
            console.error(error);
            toast("Failed to load ownership rules.", "error");
        } finally {
            setIsOwnershipLoading(false);
        }
    };

    const handleRefreshOwnership = async () => {
        await Promise.all([
            fetchOwnership(true),
            fetchPeopleData()
        ]);
    };

    useEffect(() => {
        fetchSettings();
        if (canEdit) {
            fetchPeopleData();
        }
    }, [user, canEdit]);

    // Lazy load ownership data when tab is active
    useEffect(() => {
        if (activeTab === 'ownership' && ownershipMaps.length === 0) {
            fetchOwnership();
        }
    }, [activeTab]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await api.syncVouchingStats(getAuthHeader());
            if (result.synced) {
                toast("Data synchronized successfully!", "success");
                setSettings((prev: any) => ({ 
                    ...prev, 
                    lastSyncTimestamp: new Date().toISOString() 
                }));
            } else {
                toast(result.message, "info");
            }
        } catch (error) {
            toast(error instanceof Error ? error.message : "Sync failed", "error");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAutoSyncCheck = async () => {
        setIsCheckingAutoSync(true);
        try {
            const result = await api.triggerVouchingAutoSyncCheck(getAuthHeader());
            toast(result.message, "success");
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to trigger auto-sync check", "error");
        } finally {
            setIsCheckingAutoSync(false);
        }
    };

    const handleSaveSettings = async () => {
        setIsLoading(true);
        try {
            await api.updateVouchingStatsSettings(getAuthHeader(), settings);
            toast("Settings saved.", "success");
            fetchSettings();
        } catch (error) {
            toast("Failed to save settings.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setSettings((prev: any) => ({ ...prev, [key]: value }));
    };

    // --- Ownership Handlers ---
    
    const handleAddRule = () => {
        setEditingMap(null);
        setMapFormData({ category: 'ALL' });
        setIsFormOpen(true);
    };

    const handleEditRule = (map: any) => {
        setEditingMap(map);
        setMapFormData(map);
        setIsFormOpen(true);
    };

    const handleMapFormChange = (field: string, value: any) => {
        setMapFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveRule = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingMap(true);
        try {
            const saved = await api.saveVouchingOwnershipMap(getAuthHeader(), mapFormData);
            if (editingMap) {
                setOwnershipMaps(prev => prev.map(m => m.mapId === saved.mapId ? saved : m));
                toast("Rule updated.", "success");
            } else {
                setOwnershipMaps(prev => [...prev, saved]);
                toast("Rule created.", "success");
            }
            setIsFormOpen(false);
        } catch (error) {
            toast("Failed to save rule.", "error");
        } finally {
            setIsSavingMap(false);
        }
    };

    const handleDeleteRule = async () => {
        if (!mapToDelete) return;
        setIsSavingMap(true);
        try {
            await api.deleteVouchingOwnershipMap(getAuthHeader(), mapToDelete.mapId);
            setOwnershipMaps(prev => prev.filter(m => m.mapId !== mapToDelete.mapId));
            toast("Rule deleted.", "success");
            setMapToDelete(null);
        } catch (error) {
            toast("Failed to delete rule.", "error");
        } finally {
            setIsSavingMap(false);
        }
    };


    const formatDate = (dateStr?: string, includeTime = false) => {
        if (!dateStr) return 'Never';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
            if (includeTime) {
                const timePart = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                return `${datePart} ${timePart}`;
            }
            return datePart;
        } catch (e) {
            return dateStr;
        }
    };

    const getSafeTimeValue = (val: any) => {
        if (!val) return '10:00';
        if (typeof val === 'string' && /^\d{2}:\d{2}$/.test(val)) return val;
        return '10:00';
    };

    // SMR Fields for Ownership Form
    const ownershipFields = useMemo(() => {
        return superMasterRecord.filter(f => {
            try { return JSON.parse(f.modules).includes("VouchingOwnership"); } catch { return false; }
        }).filter(f => !f.isPrimaryKey).map(f => f.fieldName);
    }, [superMasterRecord]);


    if (isLoading && !settings.sourceExcelFileId) {
        return <WorkstationSkeleton type="grid" />;
    }

    const lastSyncDate = formatDate(settings.lastSyncTimestamp, true);
    const lastReportDate = formatDate(settings.lastReportSentTime, true);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Vouching Statistics</h1>
            </div>

            <div className="inline-flex rounded-lg bg-[var(--tab-background)] p-1 space-x-1">
                <button onClick={() => setActiveTab('status')} className={`${activeTab === 'status' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}>
                    <Database className="w-4 h-4 mr-2" /> Status & Sync
                </button>
                <button onClick={() => setActiveTab('ownership')} className={`${activeTab === 'ownership' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}>
                    <Users className="w-4 h-4 mr-2" /> Ownership Rules
                </button>
                <button onClick={() => setActiveTab('config')} className={`${activeTab === 'config' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}>
                    <Settings className="w-4 h-4 mr-2" /> Configuration
                </button>
            </div>

            {activeTab === 'status' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Data Synchronization">
                        <div className="flex flex-col items-center justify-center p-6 space-y-4">
                            <div className={`p-4 rounded-full ${settings.sourceExcelFileId ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                <FileSpreadsheet className="w-10 h-10" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-[var(--foreground-muted)]">Source Excel File</p>
                                <p className="text-xs text-[var(--foreground)] font-mono mt-1 truncate max-w-[200px]" title={settings.sourceExcelFileId}>
                                    {settings.sourceExcelFileId || 'Not Configured'}
                                </p>
                            </div>
                            <div className="flex justify-between w-full pt-4 border-t border-[var(--border)]">
                                <div className="text-center">
                                    <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">Last Sync</p>
                                    <p className="text-sm font-bold text-[var(--foreground)]">{lastSyncDate}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">Last Report</p>
                                    <p className="text-sm font-bold text-[var(--foreground)]">{lastReportDate}</p>
                                </div>
                            </div>
                            
                            {canEdit && (
                                <Button onClick={handleSync} isLoading={isSyncing} disabled={!settings.sourceExcelFileId || isSyncing} className="w-full">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Sync Now
                                </Button>
                            )}
                        </div>
                    </Card>
                    <Card title="Smart Reporting Status">
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-[var(--card-inset-background)] rounded-lg border border-[var(--border)]">
                                <h3 className="font-semibold text-[var(--foreground)] flex items-center">
                                    <Bell className="w-4 h-4 mr-2 text-blue-500" />
                                    Freshness Logic
                                </h3>
                                <p className="text-sm text-[var(--foreground-muted)] mt-2">
                                    Automated reports are sent <strong>only if</strong> new data has been ingested since the last report.
                                </p>
                                <div className="mt-3 flex items-center gap-2 text-xs">
                                     <span className={`w-2 h-2 rounded-full ${new Date(settings.lastSyncTimestamp) > new Date(settings.lastReportSentTime) ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                     <span>{new Date(settings.lastSyncTimestamp) > new Date(settings.lastReportSentTime) ? 'Fresh Data Available (Report Pending)' : 'Up to Date'}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'ownership' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={handleRefreshOwnership} isLoading={isOwnershipLoading} title="Refresh Data">
                            <RefreshCw className={`w-4 h-4 ${isOwnershipLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button onClick={handleAddRule} size="sm"><Plus className="w-4 h-4 mr-2" /> Add Rule</Button>
                    </div>
                    <Card className="relative min-h-[300px]">
                        {isOwnershipLoading && <SurfaceLoader label="Loading Ownership Rules..." />}
                        <ScrollableTableContainer>
                            <table className="min-w-full divide-y divide-[var(--border)]">
                                <thead className="bg-[var(--card-inset-background)]">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Institute</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Responsible Person</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)] bg-[var(--card-background)]">
                                    {ownershipMaps.map(map => (
                                        <tr key={map.mapId}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--foreground)]">{map.institute}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--foreground)]">{map.category}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--foreground)]">{map.responsiblePersonName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEditRule(map)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"><Edit size={16}/></button>
                                                    <button onClick={() => setMapToDelete(map)} className="p-1.5 hover:bg-red-50 text-red-600 rounded"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {ownershipMaps.length === 0 && !isOwnershipLoading && (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">No ownership rules defined. Reports will use fallback routing.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </ScrollableTableContainer>
                    </Card>
                </div>
            )}

            {activeTab === 'config' && (
                <Card title="Module Configuration">
                    <div className="p-6 space-y-6">
                        <Input label="Source Excel File ID" value={settings.sourceExcelFileId || ''} onChange={(e) => handleChange('sourceExcelFileId', e.target.value)} placeholder="Enter Google Drive File ID" disabled={!canEdit || isLoading} />
                        <div className="p-4 rounded-lg bg-[var(--card-inset-background)] border border-[var(--border)] space-y-4">
                            <h3 className="font-semibold text-[var(--foreground)]">Automated Sync</h3>
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <div className="flex items-center space-x-2">
                                    <input type="checkbox" id="enableAutoSync" checked={String(settings.enableAutoSync).toLowerCase() === 'true'} onChange={(e) => handleChange('enableAutoSync', String(e.target.checked))} disabled={!canEdit || isLoading} className="w-5 h-5 text-[var(--primary-color)] rounded border-gray-300 focus:ring-[var(--primary-color)]" />
                                    <label htmlFor="enableAutoSync" className="text-sm font-medium text-[var(--foreground)]">Enable Daily Auto-Sync</label>
                                </div>
                                {String(settings.enableAutoSync).toLowerCase() === 'true' && (
                                    <>
                                        <div className="w-full sm:w-48"><Input label="Daily Sync Time" type="time" value={getSafeTimeValue(settings.autoSyncTime)} onChange={(e) => handleChange('autoSyncTime', e.target.value)} disabled={!canEdit || isLoading} /></div>
                                        <div className="pt-6"><Button variant="secondary" size="sm" onClick={handleAutoSyncCheck} isLoading={isCheckingAutoSync}><Play className="h-4 w-4 mr-2" /> Test Logic</Button></div>
                                    </>
                                )}
                            </div>
                        </div>
                        {canEdit && <div className="flex justify-end pt-4 border-t border-[var(--border)]"><Button onClick={handleSaveSettings} isLoading={isLoading}><Save className="w-4 h-4 mr-2" /> Save Configuration</Button></div>}
                    </div>
                </Card>
            )}

            {/* Ownership Modal */}
            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingMap ? 'Edit Ownership Rule' : 'Add New Rule'}>
                <form onSubmit={handleSaveRule} className="space-y-4">
                    <DynamicFormEngine
                        moduleName="VouchingOwnership"
                        fieldNames={ownershipFields}
                        formData={mapFormData}
                        onFormChange={handleMapFormChange}
                        lookupData={{ 'People': peopleOptions }}
                        disabled={isSavingMap}
                    />
                    <div className="flex justify-end pt-4 gap-2">
                        <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSavingMap}>Cancel</Button>
                        <Button type="submit" isLoading={isSavingMap}>Save Rule</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal 
                isOpen={!!mapToDelete}
                onClose={() => setMapToDelete(null)}
                onConfirm={handleDeleteRule}
                title="Delete Rule"
                message={`Are you sure you want to delete the ownership rule for "${mapToDelete?.institute} - ${mapToDelete?.category}"?`}
                isLoading={isSavingMap}
                confirmText="Delete"
            />
        </div>
    );
};

export default VouchingStatsDashboard;
