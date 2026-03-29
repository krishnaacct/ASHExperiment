
import React, { useEffect, useMemo, useState } from 'react';
import { useReports } from '../../hooks/useReports';
import { useSMR } from '../../hooks/useSMR';
import { Card } from '../ui/Card';
import { Loader, ArrowUpDown, ChevronDown, ChevronRight, XCircle, GripVertical, Layers, X, RefreshCw } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { TableColumnFilter } from './TableColumnFilter';
import { Button } from '../ui/Button';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';

type SortConfig = {
    key: string;
    direction: 'ascending' | 'descending';
} | null;

interface Column {
    key: string;
    label: string;
    width?: string;
}

const OccupancyDetailsReport: React.FC = () => {
    const { reportData, loading, fetchReportData } = useReports();
    const [filters, setFilters] = useState<Record<string, string[] | undefined>>({});
    const [groupBy, setGroupBy] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchReportData('occupancy_details');
    }, [fetchReportData]);

    const columns: Column[] = [
        { key: 'floor', label: 'Floor' },
        { key: 'flat', label: 'Flat' },
        { key: 'room', label: 'Room' },
        { key: 'bed', label: 'Bed', width: '80px' },
        { key: 'status', label: 'Status' },
        { key: 'occupantName', label: 'Occupant' },
        { key: 'stayType', label: 'Stay Type' },
        { key: 'personType', label: 'Person Type' },
        { key: 'residencyType', label: 'Residency Type' },
        { key: 'checkInDate', label: 'Date' }
    ];

    const processedData = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) return [];
        let data = [...reportData];
        data = data.filter(item => {
            return Object.keys(filters).every(key => {
                const allowedValues = filters[key];
                if (!allowedValues) return true;
                const itemVal = item[key] === null || item[key] === undefined ? '' : String(item[key]);
                return allowedValues.includes(itemVal);
            });
        });
        if (sortConfig !== null) {
            data.sort((a, b) => {
                const aValue = String(a[sortConfig.key] || '');
                const bValue = String(b[sortConfig.key] || '');
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [reportData, filters, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
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

    const renderTableHead = () => (
        <thead className="bg-[var(--card-inset-background)] sticky top-0 z-10 shadow-sm">
            <tr>
                {columns.map(col => (
                    <th 
                        key={col.key} 
                        className="px-4 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider select-none whitespace-nowrap border-b border-[var(--border)] group cursor-grab active:cursor-grabbing"
                        style={{ width: col.width }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, col.key)}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 hover:text-[var(--foreground)]" onClick={() => requestSort(col.key)}>
                                <GripVertical className="w-3 h-3 text-[var(--foreground-muted)] cursor-move mr-1" />
                                {col.label} 
                                {sortConfig?.key === col.key && (
                                    <ArrowUpDown className={`w-3 h-3 ${sortConfig.direction === 'ascending' ? 'text-[var(--primary-color)]' : 'text-[var(--foreground-muted)]'}`} />
                                )}
                            </span>
                            <TableColumnFilter columnKey={col.key} data={reportData || []} currentFilter={filters[col.key]} onFilterChange={handleFilterChange} />
                        </div>
                    </th>
                ))}
            </tr>
        </thead>
    );

    const renderRow = (item: any, idx: number, isSub = false) => (
        <tr key={`${item.room}-${item.bed}-${idx}`} className="hover:bg-[var(--list-item-hover-background)] border-b border-[var(--border)] group">
             {columns.map((col, cIdx) => (
                 <td key={col.key} className={`${isSub && cIdx === 0 ? 'pl-8' : 'px-4'} py-3 whitespace-nowrap text-sm text-[var(--foreground)]`}>
                     {col.key === 'status' ? <Badge variant={item.status === 'Active' ? 'success' : 'primary'}>{item.status}</Badge> : item[col.key]}
                 </td>
             ))}
        </tr>
    );

    const renderRecursiveGroups = (data: any[], depth: number, parentPath: string = '') => {
        if (depth >= groupBy.length) return data.map((item, idx) => renderRow(item, idx, depth > 0));
        const groupKey = groupBy[depth];
        const groups = data.reduce((acc, item) => {
            const val = String(item[groupKey] || 'Unknown');
            if (!acc[val]) acc[val] = [];
            acc[val].push(item);
            return acc;
        }, {} as Record<string, any[]>);
        const sortedKeys = Object.keys(groups).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
        return sortedKeys.map(keyVal => {
            const currentPath = parentPath ? `${parentPath}::${keyVal}` : keyVal;
            const isExp = expandedPaths.has(currentPath);
            return (
                <React.Fragment key={currentPath}>
                    <tr className="bg-[var(--accent-background)] cursor-pointer hover:bg-black/5" onClick={() => togglePath(currentPath)}>
                        <td colSpan={columns.length} className="py-2 text-sm font-bold text-[var(--primary-color)]" style={{ paddingLeft: `${16 + depth * 20}px` }}>
                            {isExp ? <ChevronDown className="inline w-4 h-4 mr-1"/> : <ChevronRight className="inline w-4 h-4 mr-1"/>}
                            {keyVal} ({groups[keyVal].length})
                        </td>
                    </tr>
                    {isExp && renderRecursiveGroups(groups[keyVal], depth + 1, currentPath)}
                </React.Fragment>
            );
        });
    };

    if (loading && !reportData) return <div className="p-12 flex justify-center"><Loader className="animate-spin text-[var(--primary-color)]" /></div>;

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Occupancy Details Report</h1>
                <Button variant="secondary" size="sm" onClick={() => fetchReportData('occupancy_details')} isLoading={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
            {/* Removed overflow-hidden to allow sticky scroll arrows to track viewport */}
            <Card className="relative">
                <div className="p-4 border-b border-[var(--border)] bg-[var(--card-inset-background)]">
                    <div className="flex flex-wrap items-center gap-2 min-h-[60px]" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
                        <Layers className="w-4 h-4 text-[var(--foreground-muted)]" />
                        <span className="text-sm font-semibold text-[var(--foreground-muted)]">Group By:</span>
                        {groupBy.length === 0 && <span className="text-sm text-gray-400 italic">Drag column headers here</span>}
                        {groupBy.map(key => (
                            <Badge key={key} variant="primary" className="flex items-center gap-1">
                                {columns.find(c => c.key === key)?.label || key}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => setGroupBy(prev => prev.filter(k => k !== key))} />
                            </Badge>
                        ))}
                    </div>
                </div>
                <ScrollableTableContainer>
                    <table className="min-w-full divide-y divide-[var(--border)]">
                        {renderTableHead()}
                        <tbody className="bg-[var(--card-background)]">
                            {groupBy.length > 0 ? renderRecursiveGroups(processedData, 0) : processedData.map((item, idx) => renderRow(item, idx))}
                        </tbody>
                    </table>
                </ScrollableTableContainer>
            </Card>
        </div>
    );
};

export default OccupancyDetailsReport;
