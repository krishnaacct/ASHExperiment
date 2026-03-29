
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSMR } from '../../hooks/useSMR';
import { Card } from '../ui/Card';
import { Loader, Printer, Users, UserX, BedDouble, ArrowUpDown, Layers, XCircle, ChevronDown, ChevronRight, GripVertical, X, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox';
import { Badge } from '../ui/Badge';
import { useData } from '../../hooks/useData';
import * as api from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../ui/Toast';
import { TableColumnFilter } from './TableColumnFilter';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';

type SortCriterion = {
    key: string;
    direction: 'asc' | 'desc';
};

const EventOccupancyReport: React.FC = () => {
    const { user } = useAuth();
    const { superMasterRecord, loading: smrLoading } = useSMR();
    const { mastersData, globalRoomData, loading: dataLoading } = useData();

    // Track active tab to avoid unnecessary fetches if report is in background
    // (Note: activeTabId is handled by Dashboard, we assume we are visible if this useEffect runs in the keep-alive)
    const activeTabIdRef = useRef<string>('mod_rpt_event');

    // Configuration State
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([
        'name', 'primaryMobile', 'flatLabel', 'roomLabel', 'bedLabel', 'occupancyStatus'
    ]);
    
    // Data State
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    // Manipulation State
    const [filters, setFilters] = useState<Record<string, string[] | undefined>>({});
    const [sorts, setSorts] = useState<SortCriterion[]>([]);
    const [groupBy, setGroupBy] = useState<string[]>([]);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

    const eventOptions = useMemo(() => {
        const eventFields = superMasterRecord.filter(f => 
             f.dataType === 'lookup-multi' && f.lookupSource
        );
        const sources = new Set(eventFields.map(f => f.lookupSource));
        return mastersData
            .filter(m => sources.has(m.masterName) && m.isActive)
            .map(m => ({ value: String(m.value), label: String(m.label) }))
            .sort((a,b) => a.label.localeCompare(b.label));

    }, [superMasterRecord, mastersData]);

    const availableColumns = useMemo(() => {
        const moduleDataScope = "People";
        const smrOptions = superMasterRecord
            .filter(field => {
                try {
                    return JSON.parse(field.modules).includes(moduleDataScope);
                } catch { return false; }
            })
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .map(f => ({ value: f.fieldName, label: f.displayName }));

        const systemOptions = [
            { value: 'flatLabel', label: 'Flat' },
            { value: 'roomLabel', label: 'Room' },
            { value: 'bedLabel', label: 'Bed' },
            { value: 'occupancyStatus', label: 'Status' },
            { value: 'matchedEvents', label: 'Matched Events' }
        ];

        return [...smrOptions, ...systemOptions];
    }, [superMasterRecord]);

    const visibleColumns = useMemo(() => {
        return selectedColumnKeys
            .map(key => availableColumns.find(opt => opt.value === key))
            .filter(Boolean) as { value: string, label: string }[];
    }, [selectedColumnKeys, availableColumns]);

    const fetchReport = useCallback(async (isSilent = false) => {
        if (selectedEvents.length === 0) return;
        if (!isSilent) setLoading(true);
        try {
            if (!user?.sessionId) return;
            const result = await api.getReportData(user.sessionId, 'event_occupancy', selectedEvents);
            setReportData(result);
            setHasFetched(true);
            if (!isSilent) {
                // Reset manipulation state on manual fetch only
                setGroupBy([]);
                setFilters({});
                setSorts([]);
            }
        } catch (error) {
            console.error(error);
            setReportData([]);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [user?.sessionId, selectedEvents]);

    // WORKSTATION SYNC: Automatically re-fetch report if the Shared Data Backbone changes
    useEffect(() => {
        if (hasFetched && !loading && activeTabIdRef.current === 'mod_rpt_event') {
            fetchReport(true); // Silent refresh
        }
    }, [globalRoomData, hasFetched, loading, fetchReport]);


    // --- Processing Pipeline ---
    const processedData = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) return [];
        let data = [...reportData];

        // 1. Column Filtering
        data = data.filter(item => {
            return Object.keys(filters).every(key => {
                const allowedValues = filters[key];
                if (!allowedValues) return true;
                const itemVal = item[key] === null || item[key] === undefined ? '' : String(item[key]);
                return allowedValues.includes(itemVal);
            });
        });

        // 2. Multi-Sort
        if (sorts.length > 0) {
            data.sort((a, b) => {
                for (const criterion of sorts) {
                    const aVal = a[criterion.key] || '';
                    const bVal = b[criterion.key] || '';
                    
                    let comparison = 0;
                    if (['flatLabel', 'roomLabel', 'bedLabel'].includes(criterion.key)) {
                        comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
                    } else {
                        if (aVal < bVal) comparison = -1;
                        else if (aVal > bVal) comparison = 1;
                    }

                    if (comparison !== 0) {
                        return criterion.direction === 'asc' ? comparison : -comparison;
                    }
                }
                return 0;
            });
        }

        return data;
    }, [reportData, filters, sorts]);

    const stats = useMemo(() => {
        const total = processedData.length;
        const occupied = processedData.filter(r => r.occupancyStatus === 'Occupied').length;
        const reserved = processedData.filter(r => r.occupancyStatus === 'Reserved').length;
        const unallotted = total - occupied - reserved;
        return { total, occupied, reserved, unallotted };
    }, [processedData]);

    // --- Interaction Handlers ---
    const handleSort = (key: string) => {
        setSorts(prev => {
            const existing = prev.find(s => s.key === key);
            if (!existing) return [...prev, { key, direction: 'asc' }];
            if (existing.direction === 'asc') return prev.map(s => s.key === key ? { ...s, direction: 'desc' } : s);
            return prev.filter(s => s.key !== key);
        });
    };

    const handleFilterChange = (key: string, selectedValues: string[] | undefined) => {
        setFilters(prev => {
            const next = { ...prev };
            if (selectedValues === undefined) delete next[key];
            else next[key] = selectedValues;
            return next;
        });
    };

    const togglePath = (path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const handleDragStart = (e: React.DragEvent, columnKey: string) => {
        e.dataTransfer.setData("columnKey", columnKey);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const key = e.dataTransfer.getData("columnKey");
        if (key && !groupBy.includes(key)) {
            setGroupBy(prev => [...prev, key]);
        }
    };

    // --- Recursive Grouping Renderer ---
    const renderRecursiveGroups = (data: any[], depth: number, parentPath: string = '', startIndex: number = 0): { rows: React.ReactNode[], nextIndex: number } => {
        if (depth >= groupBy.length) {
            const rows = data.map((item, idx) => (
                <tr key={item.personId} className="hover:bg-[var(--list-item-hover-background)] border-b border-[var(--border)] group">
                    <td className="px-4 py-2 text-gray-500 font-mono text-xs">{startIndex + idx + 1}</td>
                    {visibleColumns.map(col => {
                        const val = item[col.value];
                        if (col.value === 'occupancyStatus') {
                            return (
                                <td key={col.value} className="px-4 py-2">
                                    <Badge variant={val === 'Occupied' ? 'danger' : (val === 'Reserved' ? 'warning' : 'secondary')}>
                                        {val}
                                    </Badge>
                                </td>
                            );
                        }
                        return <td key={col.value} className="px-4 py-2 text-[var(--foreground)]">{val || '-'}</td>;
                    })}
                </tr>
            ));
            return { rows, nextIndex: startIndex + data.length };
        }

        const groupKey = groupBy[depth];
        const colLabel = availableColumns.find(c => c.value === groupKey)?.label || groupKey;
        const groups = data.reduce((acc, item) => {
            const val = String(item[groupKey] || 'Unknown');
            if (!acc[val]) acc[val] = [];
            acc[val].push(item);
            return acc;
        }, {} as Record<string, any[]>);

        const sortedKeys = Object.keys(groups).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));

        let currentStartIndex = startIndex;
        const allRows: React.ReactNode[] = [];

        sortedKeys.forEach(keyVal => {
            const groupItems = groups[keyVal];
            const currentPath = parentPath ? `${parentPath}::${keyVal}` : keyVal;
            const isExpanded = expandedPaths.has(currentPath);
            const indent = depth * 20;

            allRows.push(
                <tr 
                    key={currentPath}
                    className="bg-[var(--accent-background)] cursor-pointer hover:bg-[var(--list-item-hover-background)] border-b border-[var(--border)]"
                    onClick={() => togglePath(currentPath)}
                >
                    <td colSpan={visibleColumns.length + 1} className="py-2 text-sm text-[var(--primary-color)]" style={{ paddingLeft: `${16 + indent}px` }}>
                        <div className="flex items-center gap-2 font-bold">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="text-[var(--foreground-muted)] font-normal">{colLabel}:</span>
                            {keyVal} 
                            <span className="text-xs font-normal text-[var(--foreground-muted)] ml-1">({groupItems.length})</span>
                        </div>
                    </td>
                </tr>
            );

            if (isExpanded) {
                const result = renderRecursiveGroups(groupItems, depth + 1, currentPath, currentStartIndex);
                allRows.push(...result.rows);
                currentStartIndex = result.nextIndex;
            } else {
                currentStartIndex += groupItems.length;
            }
        });

        return { rows: allRows, nextIndex: currentStartIndex };
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast("Popups blocked. Please allow popups to print.", "error");
            return;
        }

        const eventLabels = selectedEvents.map(e => eventOptions.find(opt => opt.value === e)?.label || e).join(', ');
        const tableBodyHtml = document.getElementById('report-table-body')?.innerHTML || '';
        const tableHeadHtml = document.getElementById('report-table-head')?.innerHTML || '';

        const content = `
            <html>
            <head>
                <title>Event Occupancy Tracker</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #111; }
                    h1 { margin: 0 0 5px 0; font-size: 24px; }
                    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
                    .stats { display: flex; gap: 20px; margin-bottom: 30px; }
                    .stat-card { border: 1px solid #e5e7eb; padding: 15px 25px; border-radius: 8px; background: #f9fafb; min-width: 120px; }
                    .stat-label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
                    .stat-value { font-size: 24px; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
                    th { background-color: #f9fafb; font-weight: 600; }
                    .no-print { display: none !important; }
                    @media print {
                        th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <h1>Event Occupancy Tracker</h1>
                <div class="meta"><strong>Events:</strong> ${eventLabels} | <strong>Generated:</strong> ${new Date().toLocaleDateString()}</div>
                <div class="stats">
                    <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${stats.total}</div></div>
                    <div class="stat-card"><div class="stat-label">Occupied</div><div class="stat-value" style="color:#dc2626">${stats.occupied}</div></div>
                    <div class="stat-card"><div class="stat-label">Reserved</div><div class="stat-value" style="color:#d97706">${stats.reserved}</div></div>
                    <div class="stat-card"><div class="stat-label">Unallotted</div><div class="stat-value" style="color:#6b7280">${stats.unallotted}</div></div>
                </div>
                <table>
                    <thead>${tableHeadHtml.replace(/<button.*?<\/button>/g, '').replace(/<svg.*?<\/svg>/g, '')}</thead>
                    <tbody>${tableBodyHtml}</tbody>
                </table>
                <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
            </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Event Occupancy Tracker</h1>
                <Button variant="secondary" size="sm" onClick={() => fetchReport()} isLoading={loading} disabled={selectedEvents.length === 0}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
            <Card className="print:hidden">
                <div className="p-6 space-y-4">
                    <h2 className="text-xl font-bold text-[var(--foreground)]">Report Configuration</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MultiSelectCombobox 
                            label="Select Events"
                            options={eventOptions}
                            selectedValues={selectedEvents}
                            onChange={setSelectedEvents}
                            loading={smrLoading || dataLoading}
                        />
                        <MultiSelectCombobox 
                            label="Select Columns"
                            options={availableColumns}
                            selectedValues={selectedColumnKeys}
                            onChange={setSelectedColumnKeys}
                            loading={smrLoading}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => fetchReport()} disabled={loading || selectedEvents.length === 0} isLoading={loading}>
                            Generate Report
                        </Button>
                    </div>
                </div>
            </Card>

            {hasFetched && (
                <div className="space-y-6 animate-fade-in">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
                        <Card className="p-4 border-l-4 border-blue-500">
                            <p className="text-xs text-gray-500 uppercase font-bold">Total</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-red-500">
                            <p className="text-xs text-gray-500 uppercase font-bold">Occupied</p>
                            <p className="text-2xl font-bold text-red-600">{stats.occupied}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-orange-500">
                            <p className="text-xs text-gray-500 uppercase font-bold">Reserved</p>
                            <p className="text-2xl font-bold text-orange-600">{stats.reserved}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-gray-400">
                            <p className="text-xs text-gray-500 uppercase font-bold">Unallotted</p>
                            <p className="text-2xl font-bold text-gray-600">{stats.unallotted}</p>
                        </Card>
                    </div>

                    {/* Group By Drop Zone */}
                    <div 
                        className={`p-3 rounded-lg border-2 border-dashed transition-all flex flex-wrap items-center gap-2 min-h-[60px] print:hidden ${groupBy.length > 0 ? 'bg-[var(--card-inset-background)]' : 'bg-transparent border-[var(--border)]'}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <div className="flex items-center text-sm text-[var(--foreground-muted)] mr-2">
                            <Layers className="w-4 h-4 mr-2" />
                            <span className="font-semibold">Group By:</span>
                        </div>
                        {groupBy.length === 0 && <span className="text-sm text-gray-400 italic">Drag column headers here</span>}
                        {groupBy.map((key) => (
                            <Badge key={key} variant="primary" className="pl-3 pr-1 py-1.5 flex items-center gap-2">
                                {availableColumns.find(c => c.value === key)?.label || key}
                                <button onClick={() => setGroupBy(prev => prev.filter(k => k !== key))} className="p-0.5 hover:bg-black/10 rounded-full"><X className="w-3 h-3" /></button>
                            </Badge>
                        ))}
                        {groupBy.length > 0 && (
                            <button onClick={() => setGroupBy([])} className="ml-auto text-xs text-red-500 hover:underline flex items-center">
                                <XCircle className="w-3 h-3 mr-1" /> Clear Groups
                            </button>
                        )}
                    </div>

                    <Card className="relative overflow-hidden">
                        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card-inset-background)] print:hidden">
                            <div className="flex items-center gap-4">
                                <h3 className="font-bold text-[var(--foreground)]">Report Data</h3>
                                {loading && <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary-color)]" />}
                            </div>
                            <div className="flex gap-2">
                                {(sorts.length > 0 || Object.keys(filters).length > 0) && (
                                    <Button variant="secondary" size="sm" onClick={() => { setSorts([]); setFilters({}); }}>Reset View</Button>
                                )}
                                <Button variant="secondary" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print / Save PDF</Button>
                            </div>
                        </div>

                        <ScrollableTableContainer>
                            <table className="min-w-full divide-y divide-[var(--border)] text-sm">
                                <thead id="report-table-head" className="bg-[var(--card-inset-background)]">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500 w-10">#</th>
                                        {visibleColumns.map(col => {
                                            const sort = sorts.find(s => s.key === col.value);
                                            return (
                                                <th 
                                                    key={col.value} 
                                                    className="px-4 py-3 text-left font-bold text-gray-500 whitespace-nowrap cursor-grab active:cursor-grabbing group"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, col.value)}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1 hover:text-blue-500 transition-colors" onClick={() => handleSort(col.value)}>
                                                            <GripVertical className="w-3 h-3 text-gray-300 mr-1" />
                                                            {col.label}
                                                            {sort && <ArrowUpDown className={`w-3 h-3 ${sort.direction === 'asc' ? 'rotate-0' : 'rotate-180'} text-blue-500 transition-transform`} />}
                                                        </div>
                                                        <TableColumnFilter
                                                            columnKey={col.value}
                                                            data={reportData}
                                                            currentFilter={filters[col.value]}
                                                            onFilterChange={handleFilterChange}
                                                        />
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody id="report-table-body" className="bg-[var(--card-background)]">
                                    {groupBy.length > 0 ? (
                                        renderRecursiveGroups(processedData, 0).rows
                                    ) : (
                                        processedData.map((row, idx) => (
                                            <tr key={row.personId} className="hover:bg-[var(--list-item-hover-background)] border-b border-[var(--border)]">
                                                <td className="px-4 py-2 text-gray-500 font-mono text-xs">{idx + 1}</td>
                                                {visibleColumns.map(col => {
                                                    const val = row[col.value];
                                                    if (col.value === 'occupancyStatus') {
                                                        return (
                                                            <td key={col.value} className="px-4 py-2">
                                                                <Badge variant={val === 'Occupied' ? 'danger' : (val === 'Reserved' ? 'warning' : 'secondary')}>
                                                                    {val}
                                                                </Badge>
                                                            </td>
                                                        );
                                                    }
                                                    return <td key={col.value} className="px-4 py-2 text-[var(--foreground)]">{val || '-'}</td>;
                                                })}
                                            </tr>
                                        ))
                                    )}
                                    {processedData.length === 0 && (
                                        <tr><td colSpan={visibleColumns.length + 1} className="p-12 text-center text-gray-500">No records found matching criteria.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </ScrollableTableContainer>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default EventOccupancyReport;
