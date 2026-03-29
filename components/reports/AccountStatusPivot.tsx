
import React, { useEffect, useState, useMemo } from 'react';
import { UniversalDataGrid } from '../common/UniversalDataGrid';
import { getAllAccountSubmissions } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RefreshCw } from 'lucide-react';
import { GridConfig } from '../../types';

const AccountStatusPivot: React.FC = () => {
    const { user } = useAuth();
    const [rawData, setRawData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        if (!user?.sessionId) return;
        setLoading(true);
        try {
            const data = await getAllAccountSubmissions(user.sessionId);
            setRawData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const config: GridConfig = useMemo(() => {
        const months = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march'];
        
        const countPending = (rows: any[], monthKey: string) => {
            const pendingCount = rows.filter(r => {
                const val = String(r[monthKey] || '').trim().toLowerCase();
                return val === '' || val === 'not submitted' || val === 'ns' || val === 'pending';
            }).length;

            if (pendingCount === 0) return <span className="text-green-500 font-bold">✓</span>;
            return <span className="text-red-600 font-bold bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">{pendingCount}</span>;
        };

        return {
            title: "Zone-wise Pending Status",
            groupBy: ['zone', 'subZone'],
            showLeafNodes: false,
            columns: [
                { 
                    key: 'uid', 
                    header: 'Total Units', 
                    aggregator: (rows) => <span className="font-mono font-bold">{rows.length}</span>,
                    align: 'center',
                    width: '100px'
                },
                ...months.map(m => ({
                    key: m,
                    header: m.substring(0, 3), // Apr, May...
                    aggregator: (rows: any[]) => countPending(rows, m),
                    align: 'center' as const,
                    width: '80px'
                }))
            ]
        };
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Pending Accounts Status</h1>
                <Button variant="secondary" size="sm" onClick={fetchData} isLoading={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Data
                </Button>
            </div>

            <Card className="relative min-h-[500px]">
                <UniversalDataGrid data={rawData} config={config} loading={loading} />
            </Card>
        </div>
    );
};

export default AccountStatusPivot;
