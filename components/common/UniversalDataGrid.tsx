import React, { useMemo, useState } from 'react';
import { GridConfig, GridColumnDef, PivotConfig } from '../../types';
import { ScrollableTableContainer } from './ScrollableTableContainer';
import { ChevronRight, ChevronDown, Layers, Download, Printer, Hash } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { TableColumnFilter } from '../reports/TableColumnFilter';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';

interface UniversalDataGridProps {
    data: any[];
    config: GridConfig;
    loading?: boolean;
}

interface GroupNode {
    key: string;
    value: string; 
    level: number;
    children: GroupNode[]; 
    leafRows: any[]; 
}

/**
 * Universal Data Grid with Pivot Table support.
 */
export const UniversalDataGrid: React.FC<UniversalDataGridProps> = ({ data, config, loading }) => {
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [filters, setFilters] = useState<Record<string, string[] | undefined>>({});

    // --- SMART KEY RESOLVER ---
    // Analyzes the first row of data to find the actual key that matches the requested config key.
    // Handles 'VOUCHING_CATEGORY' vs 'vouchingCategory' mismatches robustly.
    const resolvedKeys = useMemo(() => {
        if (!data || data.length === 0) return { pivotRow: '', pivotCol: '', pivotVal: '' };
        
        const sampleRow = data[0];
        const availableKeys = Object.keys(sampleRow);
        
        const findBestMatch = (requestedKey: string | undefined) => {
            if (!requestedKey) return '';
            // 1. Exact Match
            if (sampleRow[requestedKey] !== undefined) return requestedKey;
            
            // 2. Fuzzy Match (strip non-alphanumeric, lowercase)
            const cleanReq = requestedKey.toLowerCase().replace(/[^a-z0-9]/g, '');
            const match = availableKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanReq);
            
            return match || requestedKey; // Fallback to requested if no match found
        };

        return {
            pivotRow: findBestMatch(config.pivotConfig?.rowKey),
            pivotCol: findBestMatch(config.pivotConfig?.columnKey),
            pivotVal: findBestMatch(config.pivotConfig?.valueKey),
        };
    }, [data, config.pivotConfig]);

    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter(item => {
            return Object.keys(filters).every(key => {
                const allowedValues = filters[key];
                if (!allowedValues) return true;
                const itemVal = item[key] === null || item[key] === undefined ? '' : String(item[key]);
                return allowedValues.includes(itemVal);
            });
        });
    }, [data, filters]);

    // Helper to safely get value using the resolved keys or direct lookup
    const getValue = (row: any, key: string, isPivotLookup = false) => {
        // If we are in pivot mode, use the resolved keys for accuracy
        let targetKey = key;
        if (isPivotLookup) {
            if (key === config.pivotConfig?.rowKey) targetKey = resolvedKeys.pivotRow;
            else if (key === config.pivotConfig?.columnKey) targetKey = resolvedKeys.pivotCol;
            else if (key === config.pivotConfig?.valueKey) targetKey = resolvedKeys.pivotVal;
        }
        
        return row[targetKey];
    };

    // --- PIVOT LOGIC ---
    const pivotTable = useMemo(() => {
        const pc = config.pivotConfig;
        if (!pc || !pc.enabled || !pc.rowKey || !pc.columnKey) return null;

        // Use resolved keys to extract data
        const rKey = resolvedKeys.pivotRow;
        const cKey = resolvedKeys.pivotCol;
        const vKey = resolvedKeys.pivotVal;

        // Extract unique values for rows and columns
        const rowValues = [...new Set(filteredData.map(item => String(item[rKey] !== undefined && item[rKey] !== null ? item[rKey] : 'N/A')))].sort();
        const colValues = [...new Set(filteredData.map(item => String(item[cKey] !== undefined && item[cKey] !== null ? item[cKey] : 'N/A')))].sort();

        const matrix: Record<string, Record<string, number>> = {};
        const colTotals: Record<string, number> = {};
        let grandTotal = 0;

        rowValues.forEach((rv: string) => {
            matrix[rv] = {};
            let rowTotal = 0;
            colValues.forEach((cv: string) => {
                const cellRows = filteredData.filter(item => 
                    String(item[rKey] !== undefined && item[rKey] !== null ? item[rKey] : 'N/A') === rv && 
                    String(item[cKey] !== undefined && item[cKey] !== null ? item[cKey] : 'N/A') === cv
                );
                
                let val = 0;
                if (pc.aggregation === 'count') {
                    val = cellRows.length;
                } else {
                    const numbers = cellRows.map(r => {
                        const raw = r[vKey];
                        return parseFloat(String(raw || '0').replace(/[^0-9.-]+/g, ""));
                    }).filter(n => !isNaN(n));

                    if (pc.aggregation === 'sum') {
                        val = numbers.reduce((a, b) => a + b, 0);
                    } else if (pc.aggregation === 'avg') {
                        val = numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
                    }
                }

                matrix[rv][cv] = val;
                rowTotal += val;
                colTotals[cv] = (colTotals[cv] || 0) + val;
            });
            matrix[rv]['__total__'] = rowTotal;
            grandTotal += rowTotal;
        });

        return { rowValues, colValues, matrix, colTotals, grandTotal };
    }, [filteredData, config.pivotConfig, resolvedKeys]);

    const tree = useMemo(() => {
        if (config.pivotConfig?.enabled) return [];
        
        const buildGroups = (rows: any[], depth: number): GroupNode[] => {
            if (depth >= config.groupBy.length) return [];

            const groupKey = config.groupBy[depth];
            const groups: Record<string, any[]> = {};

            rows.forEach(row => {
                const val = String(row[groupKey] || 'UNKNOWN');
                if (!groups[val]) groups[val] = [];
                groups[val].push(row);
            });

            return Object.keys(groups).sort().map(val => ({
                key: groupKey,
                value: val,
                level: depth,
                children: buildGroups(groups[val], depth + 1),
                leafRows: groups[val]
            }));
        };

        return buildGroups(filteredData, 0);
    }, [filteredData, config.groupBy, config.pivotConfig]);

    const getAggregatedContent = (col: GridColumnDef, rows: any[]) => {
        if (col.aggregator) return col.aggregator(rows);
        
        const aggregationType = col.aggregation || 'none';
        if (aggregationType === 'none') return '-';

        if (aggregationType === 'count') {
            const count = rows.filter(r => r[col.key] !== undefined && r[col.key] !== null && String(r[col.key]).trim() !== '').length;
            return <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-tighter">Ct: {count}</span>;
        }

        const numericValues = rows
            .map(r => parseFloat(String(r[col.key] || '0').replace(/[^0-9.-]+/g, "")))
            .filter(v => !isNaN(v));

        if (aggregationType === 'sum') {
            const sum = numericValues.reduce((a, b) => a + b, 0);
            return <span className="font-mono font-bold text-[var(--primary-color)]">{sum.toLocaleString()}</span>;
        }

        if (aggregationType === 'avg') {
            if (numericValues.length === 0) return '-';
            const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            return <span className="font-mono font-bold text-[var(--primary-color)]">{avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>;
        }

        return '-';
    };

    const togglePath = (path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
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

    const handleDownloadCSV = () => {
        if (!filteredData || filteredData.length === 0) {
            toast('No data to export', 'info');
            return;
        }
        let headers: string[] = [];
        let rows: string[][] = [];

        if (pivotTable) {
            headers = [config.pivotConfig!.rowKey, ...pivotTable.colValues, 'Grand Total'];
            rows = pivotTable.rowValues.map((rv: string) => [
                rv, 
                ...pivotTable.colValues.map((cv: string) => String(pivotTable.matrix[rv][cv])),
                String(pivotTable.matrix[rv]['__total__'])
            ]);
            rows.push(['Grand Total', ...pivotTable.colValues.map((cv: string) => String(pivotTable.colTotals[cv])), String(pivotTable.grandTotal)]);
        } else {
            headers = config.columns.map(c => c.header);
            rows = filteredData.map(row => config.columns.map(col => String(row[col.key] || '')));
        }

        const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${config.title || 'report'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    const renderHeader = () => (
        <thead className="bg-[var(--card-inset-background)] sticky top-0 z-10 shadow-sm">
            <tr>
                <th className="w-10"></th>
                {config.columns.map(col => (
                    <th 
                        key={col.key} 
                        className="px-4 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider whitespace-nowrap border-b border-[var(--border)]"
                        style={{ width: col.width }}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span>{col.header}</span>
                            <TableColumnFilter 
                                columnKey={col.key} 
                                data={data} 
                                currentFilter={filters[col.key]} 
                                onFilterChange={handleFilterChange} 
                            />
                        </div>
                    </th>
                ))}
            </tr>
        </thead>
    );

    const renderGroupRow = (node: GroupNode, parentPath: string): React.ReactNode => {
        const currentPath = parentPath ? `${parentPath}::${node.value}` : node.value;
        const isExpanded = expandedPaths.has(currentPath);
        const indent = node.level * 24;

        return (
            <React.Fragment key={currentPath}>
                <tr 
                    className="bg-[var(--accent-background)] cursor-pointer hover:bg-black/5 border-b border-[var(--border)]"
                    onClick={() => togglePath(currentPath)}
                >
                    <td colSpan={config.columns.length + 1} className="py-2.5 text-sm text-[var(--primary-color)] font-bold" style={{ paddingLeft: `${16 + indent}px` }}>
                        <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="text-[var(--foreground-muted)] font-medium uppercase text-xs tracking-wider">{node.key}:</span>
                            {node.value} 
                            <Badge variant="primary" className="ml-2 text-[10px]">{node.leafRows.length}</Badge>
                        </div>
                    </td>
                </tr>
                {isExpanded && (
                    node.children.length > 0 
                        ? node.children.map(child => renderGroupRow(child, currentPath))
                        : node.leafRows.map((row, idx) => (
                            <tr key={`${currentPath}-${idx}`} className="hover:bg-[var(--list-item-hover-background)] border-b border-[var(--border)]">
                                <td className="px-4 py-2"></td>
                                {config.columns.map(col => (
                                    <td key={col.key} className="px-4 py-3 whitespace-nowrap text-sm text-[var(--foreground)]" style={{ textAlign: col.align || 'left' }}>
                                        {col.accessor ? col.accessor(row) : (row[col.key] || '-')}
                                    </td>
                                ))}
                            </tr>
                        ))
                )}
                {isExpanded && node.children.length > 0 && (
                    <tr className="bg-[var(--card-inset-background)]/50 font-bold border-b border-[var(--border)]">
                        <td className="px-4 py-2" style={{ paddingLeft: `${indent + 40}px` }}>Total {node.value}</td>
                        {config.columns.map(col => (
                            <td key={col.key} className="px-4 py-2 text-sm" style={{ textAlign: col.align || 'left' }}>
                                {getAggregatedContent(col, node.leafRows)}
                            </td>
                        ))}
                    </tr>
                )}
            </React.Fragment>
        );
    };

    const renderGrandTotal = () => (
        <tr className="bg-[var(--card-footer-background)] border-t-2 border-[var(--primary-color)] font-bold">
            <td className="px-4 py-3 text-sm uppercase text-[var(--foreground)]">Grand Total</td>
            {config.columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-sm" style={{ textAlign: col.align || 'left' }}>
                    {getAggregatedContent(col, filteredData)}
                </td>
            ))}
        </tr>
    );

    if (loading) return <div className="p-8 text-center text-gray-400">Loading Grid...</div>;

    if (pivotTable && config.pivotConfig) {
        // Find the column definition for the row header to get its pretty name
        const rowColDef = config.columns.find(c => c.key === config.pivotConfig?.rowKey);
        const rowHeaderLabel = rowColDef?.header || config.pivotConfig.rowKey;

        return (
            <div className="flex flex-col h-full animate-fade-in">
                <div className="flex justify-between items-center mb-4 px-1">
                    <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-[var(--primary-color)]" />
                        <span className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                            Pivot: {rowHeaderLabel} vs {config.pivotConfig.columnKey}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={handleDownloadCSV}><Download size={16} className="mr-2"/>Export</Button>
                        <Button variant="secondary" size="sm" onClick={handlePrint}><Printer size={16} className="mr-2"/>Print</Button>
                    </div>
                </div>
                <ScrollableTableContainer>
                    <table className="min-w-full border-collapse">
                        <thead className="bg-[var(--card-inset-background)] sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-black text-[var(--primary-color)] uppercase tracking-wider sticky left-0 z-30 bg-[var(--card-inset-background)] border-b border-r border-[var(--border)]">
                                    {rowHeaderLabel}
                                </th>
                                {pivotTable.colValues.map(cv => (
                                    <th key={cv} className="px-4 py-3 text-center text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider border-b border-r border-[var(--border)] whitespace-nowrap min-w-[120px]">
                                        {cv}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center text-xs font-black text-[var(--primary-color)] uppercase tracking-wider border-b border-[var(--border)] bg-blue-50 dark:bg-blue-900/10">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--card-background)]">
                            {pivotTable.rowValues.map((rv: string) => (
                                <tr key={rv} className="hover:bg-[var(--list-item-hover-background)] border-b border-[var(--border)]">
                                    <td className="px-4 py-2 text-sm font-bold text-[var(--foreground)] sticky left-0 z-10 bg-inherit border-r border-[var(--border)] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        {rv}
                                    </td>
                                    {pivotTable.colValues.map((cv: string) => (
                                        <td key={cv} className="px-4 py-2 text-center text-sm font-mono text-[var(--foreground)] border-r border-[var(--border)]">
                                            {pivotTable.matrix[rv][cv] === 0 ? <span className="opacity-20">-</span> : pivotTable.matrix[rv][cv].toLocaleString()}
                                        </td>
                                    ))}
                                    <td className="px-4 py-2 text-center text-sm font-black text-[var(--primary-color)] bg-blue-50/50 dark:bg-blue-900/5">
                                        {pivotTable.matrix[rv]['__total__'].toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-[var(--card-footer-background)] border-t-2 border-[var(--primary-color)] font-bold">
                                <td className="px-4 py-3 text-sm uppercase text-[var(--foreground)] sticky left-0 z-10 bg-inherit border-r border-[var(--border)] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    Grand Total
                                </td>
                                {pivotTable.colValues.map((cv: string) => (
                                    <td key={cv} className="px-4 py-3 text-center text-sm font-black text-[var(--foreground)] border-r border-[var(--border)]">
                                        {pivotTable.colTotals[cv].toLocaleString()}
                                    </td>
                                ))}
                                <td className="px-4 py-3 text-center text-sm font-black text-[var(--primary-color)]">
                                    {pivotTable.grandTotal.toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </ScrollableTableContainer>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 px-1">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--primary-color)]" />
                    <div className="flex gap-2">
                        {config.groupBy.length > 0 ? config.groupBy.map((g, i) => {
                            const colDef = config.columns.find(c => c.key === g);
                            return (
                                <div key={g} className="flex items-center">
                                    {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300 mx-1" />}
                                    <Badge variant="primary" className="uppercase text-[10px]">{colDef?.header || g}</Badge>
                                </div>
                            );
                        }) : (
                            <span className="text-xs text-[var(--foreground-muted)]">Flat View</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleDownloadCSV} title="Export to CSV">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                     <Button variant="secondary" size="sm" onClick={handlePrint} title="Print Report">
                        <Printer className="w-4 h-4 mr-2" /> Print
                    </Button>
                </div>
            </div>
            
            <ScrollableTableContainer>
                <table className="min-w-full divide-y divide-[var(--border)] border-collapse">
                    {renderHeader()}
                    <tbody className="bg-[var(--card-background)]">
                        {tree.map(node => renderGroupRow(node, ''))}
                        {tree.length > 0 && renderGrandTotal()}
                        {tree.length === 0 && (
                            <tr><td colSpan={config.columns.length + 1} className="p-8 text-center text-gray-400">No data found.</td></tr>
                        )}
                    </tbody>
                </table>
            </ScrollableTableContainer>
        </div>
    );
};