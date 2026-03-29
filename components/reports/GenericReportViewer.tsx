import React, { useEffect, useState } from 'react';
import { useReportBuilder } from '../../hooks/useReportBuilder';
import { UniversalDataGrid } from '../common/UniversalDataGrid';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RefreshCw, Send, AlertTriangle } from 'lucide-react';
import * as api from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../ui/Toast';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';

interface GenericReportViewerProps {
    reportId: string;
    title?: string;
}

const GenericReportViewer: React.FC<GenericReportViewerProps> = ({ reportId, title }) => {
    const { executeReport, executing } = useReportBuilder();
    const { user } = useAuth();
    const [reportResult, setReportResult] = useState<{ data: any[], config: any } | null>(null);
    const [isSending, setIsSending] = useState(false);

    const loadReport = () => {
        executeReport(reportId).then(setReportResult).catch(() => setReportResult(null));
    };

    useEffect(() => {
        loadReport();
    }, [reportId]);
    
    const handleSendPdf = async () => {
        if (!user?.sessionId) return;
        setIsSending(true);
        try {
            await api.sendReportPdfToUser(user.sessionId, reportId);
            toast("PDF Report sent to your Telegram.", "success");
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to send PDF", "error");
        } finally {
            setIsSending(false);
        }
    };

    if (!reportResult && executing) {
        return <WorkstationSkeleton type="grid" />;
    }

    if (!reportResult) {
        return (
            <div className="p-12 text-center border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--card-inset-background)] mt-8">
                <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
                <p className="text-[var(--foreground)] font-bold">Failed to load report</p>
                <p className="text-sm text-[var(--foreground-muted)] mt-2">The report configuration might be invalid or the data source is empty.</p>
                <Button variant="secondary" onClick={loadReport} className="mt-6">Retry</Button>
            </div>
        );
    }

    const { data, config } = reportResult;

    // Helper to transform technical keys to readable headers
    const formatHeader = (key: string) => {
        return key
            .replace(/([A-Z])/g, ' $1') 
            .replace(/^./, (str) => str.toUpperCase()) 
            .trim();
    };

    // Convert saved config to UniversalDataGrid format
    const gridConfig = {
        title: title || config.title || 'Report',
        groupBy: config.groupBy || [],
        columns: (config.columns || []).map((col: any) => {
            // Handle both legacy string arrays and new object arrays
            const key = typeof col === 'string' ? col : col.key;
            const aggregation = typeof col === 'string' ? 'none' : col.aggregation;
            
            return {
                key: key,
                header: formatHeader(key),
                aggregation: aggregation || 'none',
                align: 'left' as const
            };
        }),
        showLeafNodes: true 
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-[var(--foreground)]">{gridConfig.title}</h1>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleSendPdf} isLoading={isSending} title="Send PDF to Telegram">
                        <Send className="w-4 h-4 mr-2" /> Telegram PDF
                    </Button>
                    <Button variant="secondary" size="sm" onClick={loadReport} isLoading={executing}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${executing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                </div>
            </div>
            
            <Card className="relative min-h-[500px]">
                <UniversalDataGrid data={data} config={gridConfig} loading={executing} />
            </Card>
        </div>
    );
};

export default GenericReportViewer;