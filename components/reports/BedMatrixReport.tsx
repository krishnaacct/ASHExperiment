
import React, { useEffect } from 'react';
import { useReports } from '../../hooks/useReports';
import { Card } from '../ui/Card';
import { Loader, RefreshCw } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { Button } from '../ui/Button';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';

const BedMatrixReport: React.FC = () => {
    const { reportData, loading, fetchReportData } = useReports();

    useEffect(() => {
        fetchReportData('bed_matrix');
    }, [fetchReportData]);

    if (loading && !reportData) {
        return <div className="flex justify-center p-12"><Loader className="w-8 h-8 animate-spin text-[var(--primary-color)]" /></div>;
    }

    if (!reportData || !reportData.flatLabels) {
        return (
             <div className="animate-fade-in">
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-[var(--foreground)]">Bed Status Matrix</h1>
                    <Button variant="secondary" size="sm" onClick={() => fetchReportData('bed_matrix')} isLoading={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                <div className="text-center p-8 text-[var(--foreground-muted)] border-2 border-dashed rounded-xl">No data available.</div>
            </div>
        );
    }

    const { matrix, flatLabels, bedLabels } = reportData;

    const renderCell = (entry: any) => {
        if (!entry) return null;
        let shapeClass = '';
        let colorClass = '';
        let label = entry.text || '';
        const status = entry.status;

        switch (status) {
            case 'Free':
                shapeClass = 'rounded-md'; 
                colorClass = 'bg-green-200 border-2 border-green-600 text-green-900';
                break;
            case 'Active':
                shapeClass = 'rotate-45 scale-75'; 
                colorClass = 'bg-red-200 border-2 border-red-600 text-red-900';
                label = <span className="block -rotate-45 scale-125">{entry.text}</span>;
                break;
            case 'Reserved':
                shapeClass = 'rounded-t-full rounded-b-lg'; 
                colorClass = 'bg-orange-200 border-2 border-orange-600 text-orange-900';
                break;
            case 'Blocked':
                 shapeClass = 'rounded-full border-4 border-double'; 
                 colorClass = 'bg-pink-100 border-pink-500 text-pink-700';
                 break;
            case 'Maint':
                shapeClass = 'rounded-none';
                colorClass = 'bg-gray-200 border-2 border-gray-600 text-gray-800';
                label = 'X';
                break;
            case 'Admin':
                shapeClass = 'rounded-full';
                colorClass = 'bg-blue-200 border-2 border-blue-600 text-blue-900';
                break;
            default:
                return null;
        }

        return (
            <Tooltip text={`${status} ${entry.text ? `(${entry.text})` : ''}`}>
                <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold ${shapeClass} ${colorClass} transition-transform hover:scale-110`}>
                    {label}
                </div>
            </Tooltip>
        );
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Bed Status Matrix</h1>
                <Button variant="secondary" size="sm" onClick={() => fetchReportData('bed_matrix')} isLoading={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
            <Card className="relative overflow-hidden">
                <ScrollableTableContainer>
                    <table className="border-collapse w-full">
                        <thead>
                            <tr>
                                <th className="p-2 text-left sticky left-0 bg-[var(--card-background)] z-10"></th>
                                {bedLabels.map((bl: string) => (
                                    <th key={bl} className="p-2 text-xs font-bold text-[var(--foreground-muted)] w-10 text-center">{bl}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {flatLabels.map((flat: string) => (
                                <tr key={flat} className="hover:bg-[var(--card-inset-background)]">
                                    <td className="p-2 text-xs font-bold text-[var(--foreground)] sticky left-0 bg-[var(--card-background)] z-10 border-r border-[var(--border)] whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        {flat}
                                    </td>
                                    {bedLabels.map((bed: string) => (
                                        <td key={`${flat}-${bed}`} className="p-2">
                                            <div className="flex items-center justify-center">
                                                {renderCell(matrix[flat][bed])}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </ScrollableTableContainer>
                
                <div className="p-4 border-t border-[var(--border)] bg-[var(--card-footer-background)]">
                    <p className="text-xs font-bold text-[var(--foreground-muted)] mb-2 uppercase">Legend</p>
                    <div className="flex flex-wrap gap-4 text-xs">
                         <div className="flex items-center"><div className="w-4 h-4 mr-2 bg-green-200 border border-green-600 rounded"></div> Free</div>
                         <div className="flex items-center"><div className="w-4 h-4 mr-2 bg-red-200 border border-red-600 transform rotate-45 scale-75"></div> Active</div>
                         <div className="flex items-center"><div className="w-4 h-4 mr-2 bg-orange-200 border border-orange-600 rounded-t-full"></div> Reserved</div>
                         <div className="flex items-center"><div className="w-4 h-4 mr-2 bg-pink-100 border-2 border-double border-pink-500 rounded-full"></div> Blocked</div>
                         <div className="flex items-center"><div className="w-4 h-4 mr-2 bg-gray-200 border border-gray-600"></div> Maint</div>
                         <div className="flex items-center"><div className="w-4 h-4 mr-2 bg-blue-200 border border-blue-600 rounded-full"></div> Admin</div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default BedMatrixReport;
