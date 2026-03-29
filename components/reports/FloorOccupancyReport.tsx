
import React, { useEffect } from 'react';
import { useReports } from '../../hooks/useReports';
import { Card } from '../ui/Card';
import { Loader, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';

const FloorOccupancyReport: React.FC = () => {
    const { reportData, loading, fetchReportData } = useReports();

    useEffect(() => {
        fetchReportData('floor_occupancy');
    }, [fetchReportData]);

    if (loading && !reportData) {
        return <div className="flex justify-center p-12"><Loader className="w-8 h-8 animate-spin text-[var(--primary-color)]" /></div>;
    }

    if (!reportData || reportData.length === 0) {
        return (
            <div className="animate-fade-in">
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-[var(--foreground)]">Floor Occupancy Summary</h1>
                    <Button variant="secondary" size="sm" onClick={() => fetchReportData('floor_occupancy')} isLoading={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                <div className="text-center p-8 text-[var(--foreground-muted)] border-2 border-dashed rounded-xl">No data available.</div>
            </div>
        );
    }

    const totals = {
        Total: reportData.reduce((acc: number, curr: any) => acc + (curr.Total || 0), 0),
        Free: reportData.reduce((acc: number, curr: any) => acc + (curr.Free || 0), 0),
        Active: reportData.reduce((acc: number, curr: any) => acc + (curr.Active || 0), 0),
        Reserved: reportData.reduce((acc: number, curr: any) => acc + (curr.Reserved || 0), 0),
        Blocked: reportData.reduce((acc: number, curr: any) => acc + (curr.Blocked || 0), 0),
        Maint: reportData.reduce((acc: number, curr: any) => acc + (curr.Maint || 0), 0),
        Admin: reportData.reduce((acc: number, curr: any) => acc + (curr.Admin || 0), 0),
    };

    const getPercentage = (val: number, total: number) => {
        if (!total) return 0;
        return (val / total) * 100;
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Floor Occupancy Summary</h1>
                <Button variant="secondary" size="sm" onClick={() => fetchReportData('floor_occupancy')} isLoading={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
            <Card className="relative overflow-hidden">
                <ScrollableTableContainer>
                    <table className="min-w-full divide-y divide-[var(--border)]">
                        <thead className="bg-[var(--card-inset-background)]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Floor</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider w-full">Distribution</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-[var(--foreground-muted)] uppercase">Total</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-green-600 uppercase">Free</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-red-600 uppercase">Active</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-orange-600 uppercase">Res</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Other</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--card-background)] divide-y divide-[var(--border)]">
                            {reportData.map((row: any) => (
                                <tr key={row.floor}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-[var(--foreground)]">
                                        {row.floor === 'G' ? 'Ground' : (row.floor === 'B' ? 'Basement' : `Floor ${row.floor}`)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex h-4 rounded-full overflow-hidden w-full bg-gray-100 dark:bg-gray-800">
                                            {row.Free > 0 && <div style={{ width: `${getPercentage(row.Free, row.Total)}%` }} className="bg-green-400" title={`Free: ${row.Free}`}></div>}
                                            {row.Active > 0 && <div style={{ width: `${getPercentage(row.Active, row.Total)}%` }} className="bg-red-400" title={`Active: ${row.Active}`}></div>}
                                            {row.Reserved > 0 && <div style={{ width: `${getPercentage(row.Reserved, row.Total)}%` }} className="bg-orange-400" title={`Reserved: ${row.Reserved}`}></div>}
                                            {(row.Blocked + row.Maint + row.Admin) > 0 && <div style={{ width: `${getPercentage(row.Blocked + row.Maint + row.Admin, row.Total)}%` }} className="bg-gray-400" title={`Other: ${row.Blocked + row.Maint + row.Admin}`}></div>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono text-[var(--foreground)]">{row.Total}</td>
                                    <td className="px-4 py-4 text-right font-mono text-green-600 font-bold">{row.Free}</td>
                                    <td className="px-4 py-4 text-right font-mono text-red-600 font-bold">{row.Active}</td>
                                    <td className="px-4 py-4 text-right font-mono text-orange-600">{row.Reserved}</td>
                                    <td className="px-4 py-4 text-right font-mono text-gray-500">{row.Blocked + row.Maint + row.Admin}</td>
                                </tr>
                            ))}
                             <tr className="bg-[var(--card-inset-background)] font-bold">
                                <td className="px-6 py-4 text-[var(--foreground)]">Total</td>
                                <td className="px-6 py-4">
                                     <div className="flex h-4 rounded-full overflow-hidden w-full bg-gray-200 dark:bg-gray-700">
                                        {totals.Free > 0 && <div style={{ width: `${getPercentage(totals.Free, totals.Total)}%` }} className="bg-green-500"></div>}
                                        {totals.Active > 0 && <div style={{ width: `${getPercentage(totals.Active, totals.Total)}%` }} className="bg-red-500"></div>}
                                        {totals.Reserved > 0 && <div style={{ width: `${getPercentage(totals.Reserved, totals.Total)}%` }} className="bg-orange-500"></div>}
                                        {(totals.Blocked + totals.Maint + totals.Admin) > 0 && <div style={{ width: `${getPercentage(totals.Blocked + totals.Maint + totals.Admin, totals.Total)}%` }} className="bg-gray-500"></div>}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right">{totals.Total}</td>
                                <td className="px-4 py-4 text-right text-green-700">{totals.Free}</td>
                                <td className="px-4 py-4 text-right text-red-700">{totals.Active}</td>
                                <td className="px-4 py-4 text-right text-orange-700">{totals.Reserved}</td>
                                <td className="px-4 py-4 text-right text-gray-600">{totals.Blocked + totals.Maint + totals.Admin}</td>
                            </tr>
                        </tbody>
                    </table>
                </ScrollableTableContainer>
                 <div className="p-4 flex gap-4 text-sm text-[var(--foreground-muted)] justify-end">
                    <div className="flex items-center"><div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div> Free</div>
                    <div className="flex items-center"><div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div> Active</div>
                    <div className="flex items-center"><div className="w-3 h-3 bg-orange-400 rounded-full mr-2"></div> Reserved</div>
                    <div className="flex items-center"><div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div> Other (Admin/Maint/Blocked)</div>
                </div>
            </Card>
        </div>
    );
};

export default FloorOccupancyReport;
