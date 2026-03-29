
import React, { useEffect, useMemo, useState } from 'react';
import { useReports } from '../../hooks/useReports';
import { useSMR } from '../../hooks/useSMR';
import { Card } from '../ui/Card';
import { Loader, ChevronDown, ChevronRight, MapPin, User, Calendar, RefreshCw } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox';
import { Button } from '../ui/Button';

const DuplicateOccupancyReport: React.FC = () => {
    const { reportData, loading, fetchReportData } = useReports();
    const { superMasterRecord } = useSMR();

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([
        'name', 'primaryMobile', 'personType', 'conflictCount' 
    ]);

    useEffect(() => {
        fetchReportData('duplicate_occupancy');
    }, [fetchReportData]);

    const toggleRow = (personId: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(personId)) next.delete(personId);
            else next.add(personId);
            return next;
        });
    };

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

        return [...smrOptions, { value: 'conflictCount', label: 'Total Count' }];
    }, [superMasterRecord]);

    if (loading && !reportData) return <div className="flex justify-center p-12"><Loader className="animate-spin text-[var(--primary-color)]" /></div>;

    return (
        <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Duplicate Occupancy Audit</h1>
                <Button variant="secondary" size="sm" onClick={() => fetchReportData('duplicate_occupancy')} isLoading={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
            <Card className="overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card-inset-background)]">
                    <p className="text-sm text-[var(--foreground-muted)] italic">Identify individuals with multiple active commitments.</p>
                    <div className="w-64">
                        <MultiSelectCombobox label="Columns" options={availableColumns} selectedValues={selectedColumnKeys} onChange={setSelectedColumnKeys} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border)]">
                        <thead className="bg-[var(--card-inset-background)]">
                            <tr>
                                <th className="w-10"></th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase">#</th>
                                {selectedColumnKeys.map(k => <th key={k} className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase">{availableColumns.find(c=>c.value===k)?.label || k}</th>)}
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--card-background)]">
                            {reportData?.map((row: any, idx: number) => (
                                <React.Fragment key={row.personId}>
                                    <tr className="hover:bg-[var(--list-item-hover-background)] cursor-pointer" onClick={() => toggleRow(row.personId)}>
                                        <td className="px-4">{expandedIds.has(row.personId) ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}</td>
                                        <td className="px-6 py-4 text-xs font-mono">{idx + 1}</td>
                                        {selectedColumnKeys.map(k => <td key={k} className="px-6 py-4 text-sm">{k === 'conflictCount' ? <Badge variant="danger">{row.conflictCount} Beds</Badge> : (row[k] || '-') }</td>)}
                                    </tr>
                                    {expandedIds.has(row.personId) && (
                                        <tr className="bg-[var(--card-inset-background)]">
                                            <td colSpan={selectedColumnKeys.length + 2} className="p-4">
                                                <div className="border rounded-lg bg-[var(--card-background)] p-4 space-y-2">
                                                    {row.rawConflicts.map((c: any, i: number) => (
                                                        <div key={i} className="flex gap-4 text-sm items-center">
                                                            <Badge variant={c.type === 'Active' ? 'danger' : 'warning'}>{c.type}</Badge>
                                                            <MapPin className="w-4 h-4 text-gray-400" /> <span>{c.location}</span>
                                                            <Calendar className="w-4 h-4 text-gray-400" /> <span>{c.date}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                             {!reportData || reportData.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={selectedColumnKeys.length + 2} className="p-12 text-center text-[var(--foreground-muted)]">No duplicate occupancies found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default DuplicateOccupancyReport;
