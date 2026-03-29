
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from '../ui/Toast';
import { RefreshCw, Save, ShieldCheck, Database, Settings, FileText, CalendarCheck, CalendarX, AlertCircle, Phone, MapPin, User, Play } from 'lucide-react';
import * as api from '../../services/apiService';
import { PaginationControls } from '../common/PaginationControls';
import { Badge } from '../ui/Badge';
import { useData } from '../../hooks/useData';
import { SurfaceLoader } from '../common/SurfaceLoader';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';

type Tab = 'status' | 'config';

const AccountSubmissionsDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('status');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isCheckingAutoSync, setIsCheckingAutoSync] = useState(false);
    const [settings, setSettings] = useState<any>({});
    const [stats, setStats] = useState<any>(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    
    // Data Explorer State
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED'>('PENDING');
    const [records, setRecords] = useState<any[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    
    // Permission: account_submissions_edit is needed for syncing and saving settings
    const canEdit = user?.permissions.includes('account_submissions_edit');

    const getAuthHeader = () => {
        if (!user?.sessionId) throw new Error("Not authenticated");
        return user.sessionId;
    };

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const data = await api.getAccountSubmissionSettings(getAuthHeader());
            setSettings(data);
        } catch (error) {
            console.error("Failed to fetch account submission settings:", error);
            toast("Failed to load settings.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        
        const fetchStats = async () => {
            setIsStatsLoading(true);
            try {
                const statsData = await api.getAccountSubmissionStats(getAuthHeader());
                setStats(statsData);
                if (statsData.completedMonths && statsData.completedMonths.length > 0) {
                    setSelectedMonth(statsData.completedMonths[statsData.completedMonths.length - 1]);
                }
            } catch (error) {
                 console.error("Failed to fetch account submission stats:", error);
            } finally {
                setIsStatsLoading(false);
            }
        };
        fetchStats();
    }, [user]);

    useEffect(() => {
        if (!selectedMonth) return;

        const fetchRecords = async () => {
            setRecordsLoading(true);
            try {
                const result = await api.getAccountSubmissionRecords(getAuthHeader(), page, pageSize, selectedMonth, statusFilter);
                setRecords(result.records);
                setTotalRecords(result.total);
            } catch (error) {
                console.error("Failed to fetch records:", error);
                toast("Failed to load records.", "error");
            } finally {
                setRecordsLoading(false);
            }
        };
        fetchRecords();
    }, [selectedMonth, statusFilter, page, pageSize]);


    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await api.syncAccountSubmissions(getAuthHeader());
            if (result.synced) {
                toast("Data synchronized successfully!", "success");
                setSettings((prev: any) => ({ ...prev, lastSyncTimestamp: new Date().toISOString() }));
                const statsData = await api.getAccountSubmissionStats(getAuthHeader());
                setStats(statsData);
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
            const result = await api.triggerAutoSyncCheck(getAuthHeader());
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
            await api.updateAccountSubmissionSettings(getAuthHeader(), settings);
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
    
    const getProgressColor = (count: number, total: number) => {
        if (total === 0) return 'bg-gray-100 text-gray-500 border-gray-200';
        const percentage = (count / total) * 100;
        if (percentage >= 90) return 'bg-green-100 text-green-700 border-green-200 ring-green-300';
        if (percentage >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-200 ring-yellow-300';
        return 'bg-orange-100 text-orange-700 border-orange-200 ring-orange-300';
    };

    const getPendingColor = (count: number) => {
        if (count === 0) return 'bg-gray-50 text-gray-400 border-gray-100';
        if (count < 10) return 'bg-red-50 text-red-600 border-red-100 ring-red-200';
        if (count < 50) return 'bg-red-100 text-red-700 border-red-200 ring-red-300';
        return 'bg-red-200 text-red-800 border-red-300 ring-red-400';
    };
    
    const getSafeTimeValue = (val: any) => {
        if (!val) return '10:00';
        if (typeof val === 'string' && /^\d{2}:\d{2}$/.test(val)) return val;
        return '10:00';
    };

    // Helper to format dates to dd-mmm-yy
    const formatDate = (dateStr?: string, includeTime = false) => {
        if (!dateStr) return '';
        if (dateStr === 'Never') return 'Never';
        try {
            const date = new Date(dateStr);
            // Check for invalid date
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

    if (isLoading && !settings.sourceExcelFileId) {
        return <WorkstationSkeleton type="grid" />;
    }

    const lastSyncDate = settings.lastSyncTimestamp ? formatDate(settings.lastSyncTimestamp, true) : 'Never';
    const visibleMonths = stats?.completedMonths || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Account Submissions</h1>
            </div>

            <div className="inline-flex rounded-lg bg-[var(--tab-background)] p-1 space-x-1">
                <button onClick={() => setActiveTab('status')} className={`${activeTab === 'status' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}>
                    <Database className="w-4 h-4 mr-2" /> Status & Sync
                </button>
                <button onClick={() => setActiveTab('config')} className={`${activeTab === 'config' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}>
                    <Settings className="w-4 h-4 mr-2" /> Configuration
                </button>
            </div>

            {activeTab === 'status' && (
                <>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card title="Data Synchronization" className="md:col-span-1">
                            <div className="flex flex-col items-center justify-center p-6 space-y-4">
                                <div className={`p-4 rounded-full ${settings.sourceExcelFileId ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    <FileText className="w-10 h-10" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-[var(--foreground-muted)]">Source Excel File</p>
                                    <p className="text-xs text-[var(--foreground)] font-mono mt-1 truncate max-w-[200px]" title={settings.sourceExcelFileId}>
                                        {settings.sourceExcelFileId || 'Not Configured'}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-[var(--foreground-muted)]">Last Synced</p>
                                    <p className="text-lg font-bold text-[var(--foreground)]">{lastSyncDate}</p>
                                </div>
                                {canEdit && (
                                    <Button onClick={handleSync} isLoading={isSyncing} disabled={!settings.sourceExcelFileId || isSyncing}>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Sync Now
                                    </Button>
                                )}
                            </div>
                        </Card>
                        <Card title="Operations" className="md:col-span-2">
                             <div className="p-6">
                                <div className="p-4 bg-[var(--card-inset-background)] rounded-lg border border-[var(--border)] mb-4">
                                    <h3 className="font-semibold text-[var(--foreground)] flex items-center">
                                        <ShieldCheck className="w-4 h-4 mr-2 text-blue-500" />
                                        Routing Awareness
                                    </h3>
                                    <p className="text-sm text-[var(--foreground-muted)] mt-2">
                                        Both the <strong>Sending Bot</strong> and <strong>Target Groups</strong> are now managed in the <strong>Notification Templates</strong> module. Edit the <code>account_autosync_...</code> templates to customize delivery agents and destinations.
                                    </p>
                                </div>
                                <div className="text-sm text-[var(--foreground-muted)]">
                                    <strong>Total Units Monitored:</strong> {isStatsLoading ? '...' : (stats?.totalUnits || 0)}
                                </div>
                            </div>
                        </Card>
                    </div>

                    <Card title="Submission Performance Heatmap">
                        {isStatsLoading ? (
                             <div className="p-8 flex justify-center"><WorkstationSkeleton type="grid" /></div>
                        ) : stats ? (
                            <div className="p-6 space-y-8">
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--foreground-muted)] mb-3 uppercase tracking-wider">Submission Progress (% Submitted)</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {visibleMonths.map(month => {
                                            const sCount = stats.monthCounts[month]?.submitted || 0;
                                            const total = stats.totalUnits || 0;
                                            const colorClass = getProgressColor(sCount, total);
                                            const isSelected = selectedMonth === month;
                                            return (
                                                <button 
                                                    key={month} 
                                                    onClick={() => setSelectedMonth(month)}
                                                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${colorClass} ${isSelected ? 'ring-2 ring-offset-2 scale-105 shadow-md' : 'opacity-90 hover:opacity-100'}`}
                                                >
                                                    <p className="uppercase text-xs font-bold tracking-wider mb-1">{month}</p>
                                                    <div className="flex items-center gap-2">
                                                         <CalendarCheck className="w-5 h-5"/>
                                                         <span className="text-2xl font-bold">{total > 0 ? Math.round((sCount/total)*100) : 0}%</span>
                                                    </div>
                                                    <p className="text-xs opacity-80 mt-1">{sCount} / {total}</p>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--foreground-muted)] mb-3 uppercase tracking-wider flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                        Pending Action Items (Count Not Submitted)
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {visibleMonths.map(month => {
                                            const pCount = stats.monthCounts[month]?.pending || 0;
                                            const colorClass = getPendingColor(pCount);
                                            const isSelected = selectedMonth === month;
                                            return (
                                                <button 
                                                    key={month}
                                                    onClick={() => { setSelectedMonth(month); setStatusFilter('PENDING'); }}
                                                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${colorClass} ${isSelected ? 'ring-2 ring-offset-2 scale-105 shadow-md' : 'opacity-90 hover:opacity-100'}`}
                                                >
                                                    <p className="uppercase text-xs font-bold tracking-wider mb-1">{month}</p>
                                                    <div className="flex items-center gap-2">
                                                         <CalendarX className="w-5 h-5"/>
                                                         <span className="text-2xl font-bold">{pCount}</span>
                                                    </div>
                                                    <p className="text-xs opacity-80 mt-1">Pending</p>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-[var(--foreground-muted)]">No statistics available. Please sync data.</div>
                        )}
                    </Card>

                    {selectedMonth && (
                        <div id="data-explorer" className="scroll-mt-20">
                            <Card className="overflow-hidden relative">
                                {recordsLoading && <SurfaceLoader label="Fetching records..." />}
                                <div className="p-4 border-b border-[var(--border)] bg-[var(--card-inset-background)] flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center">
                                        Details for <span className="ml-1 uppercase text-[var(--primary-color)]">{selectedMonth}</span>
                                    </h2>
                                    <div className="flex bg-[var(--card-background)] rounded-lg p-1 border border-[var(--border)]">
                                        <button onClick={() => { setStatusFilter('PENDING'); setPage(1); }} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === 'PENDING' ? 'bg-red-100 text-red-700' : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'}`}>Pending Only</button>
                                        <button onClick={() => { setStatusFilter('ALL'); setPage(1); }} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === 'ALL' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'}`}>Show All</button>
                                        <button onClick={() => { setStatusFilter('SUBMITTED'); setPage(1); }} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'}`}>Submitted Only</button>
                                    </div>
                                </div>
                                <ScrollableTableContainer>
                                    <table className="min-w-full divide-y divide-[var(--border)]">
                                        <thead className="bg-[var(--card-inset-background)]">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Unit Details</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Contact Person</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Mobile</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Status ({selectedMonth})</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-[var(--card-background)] divide-y divide-[var(--border)]">
                                            {records.map((rec, i) => (
                                                <tr key={i} className="hover:bg-[var(--list-item-hover-background)]">
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-[var(--foreground)]">{rec.unitName}</div>
                                                        <div className="text-xs text-[var(--foreground-muted)] flex gap-2 mt-1">
                                                            <Badge variant="secondary">{rec.uid}</Badge>
                                                            <span className="flex items-center"><MapPin className="w-3 h-3 mr-1"/> {rec.zone}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-[var(--foreground)]"><div className="flex items-center"><User className="w-4 h-4 mr-2 text-[var(--foreground-muted)]"/>{rec.incharge || 'N/A'}</div></td>
                                                    <td className="px-6 py-4 text-sm font-mono">{rec.mobile ? <a href={`https://wa.me/${rec.mobile.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 hover:text-green-800 hover:underline"><Phone className="w-3 h-3 mr-1" />{rec.mobile}</a> : <span className="text-gray-400">-</span>}</td>
                                                    <td className="px-6 py-4">{rec.monthStatus === 'Pending' || rec.monthStatus === 'Not Submitted' || rec.monthStatus === 'NS' || rec.monthStatus === '' ? <Badge variant="danger">Pending</Badge> : <div className="flex flex-col"><Badge variant="success">Submitted</Badge><span className="text-xs text-[var(--foreground-muted)] mt-1">{formatDate(rec.monthStatus)}</span></div>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </ScrollableTableContainer>
                                <PaginationControls currentPage={page} pageSize={pageSize} totalItems={totalRecords} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s === 'all' ? 1000 : s); setPage(1); }} showAll={pageSize > 100} />
                            </Card>
                        </div>
                    )}
                </>
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
                                        <div className="pt-6"><Button variant="secondary" size="sm" onClick={handleAutoSyncCheck} isLoading={isCheckingAutoSync}><Play className="h-4 w-4 mr-2" /> Test Auto-Sync Logic</Button></div>
                                    </>
                                )}
                            </div>
                        </div>
                        {canEdit && <div className="flex justify-end pt-4 border-t border-[var(--border)]"><Button onClick={handleSaveSettings} isLoading={isLoading}><Save className="w-4 h-4 mr-2" /> Save Configuration</Button></div>}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default AccountSubmissionsDashboard;
