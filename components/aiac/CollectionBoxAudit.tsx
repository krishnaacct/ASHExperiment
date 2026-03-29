
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAIAC } from '../../hooks/useAIAC';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AuditRecord, AIResult, LogicOutcome, BatchLogEntry, BatchProgress } from '../../types';
import { CheckCircle2, XCircle, RefreshCw, Calculator, Eye, ZoomIn, ZoomOut, RotateCw, RotateCcw, Maximize, Move, FileText, FileWarning, Clock, CheckCircle, AlertOctagon, UserCheck, UserX, Hourglass, ExternalLink, Play, Loader, Eraser, Layers, ArrowUpDown, GripVertical, ChevronDown, ChevronUp, ListFilter, CheckSquare, FileX, ShieldAlert, BadgeCheck, AlertTriangle, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';
import { Input } from '../ui/Input';
import { SkeletonLoader } from '../ui/SkeletonLoader';
import { Checkbox } from '../ui/Checkbox';
import { Modal } from '../ui/Modal';
import { ProgressBar } from '../common/ProgressBar';
import { LiveTimer } from '../common/LiveTimer';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';
import { SurfaceLoader } from '../common/SurfaceLoader';
import { PaginationControls } from '../common/PaginationControls';
import { ScrollableXContainer } from '../common/ScrollableXContainer';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox'; 

// Date format helper
const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
};

const LOGIC_CHECK_LABELS: Record<keyof LogicOutcome, string> = {
    date_match: "Date Mismatch",
    amount_match: "Amount Mismatch",
    party_match: "Party Mismatch",
    denom_match: "Denomination Mismatch",
    math_integrity: "Math Error",
    signature_check: "Signature Count Fail",
    signature_match: "Signature Name Mismatch",
    declaration_check: "Declaration Fail",
    no_anomalies: "Anomalies Found"
};

type SortCriterion = {
    key: string;
    direction: 'asc' | 'desc';
};

const BatchConfigurationModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onStart: (ids: string[], parallel: number) => void,
    selectedIds: string[],
    allMatchingRecords: AuditRecord[],
    title?: string,
    actionLabel?: string
}> = ({ isOpen, onClose, onStart, selectedIds, allMatchingRecords, title = "Configure AI Batch Process", actionLabel = "Start Processing" }) => {
    const [parallelSize, setParallelSize] = useState(4);
    const [mode, setMode] = useState<'SELECTED' | 'QUERY'>(selectedIds.length > 0 ? 'SELECTED' : 'QUERY');
    
    // Query Mode States
    const [limit, setLimit] = useState<number>(1000);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    
    const [targetStatuses, setTargetStatuses] = useState<string[]>(['PENDING', 'AI_TIMEOUT']);

    const statusOptions = [
        { value: 'PENDING', label: 'Pending AI' },
        { value: 'AI_TIMEOUT', label: 'System Busy (Retry)' },
        { value: 'AI_FAIL', label: 'AI Failed Logic' },
        { value: 'REJECTED', label: 'Rejected' }
    ];

    const effectiveRecords = useMemo(() => {
        if (mode === 'SELECTED') {
            return selectedIds; // Just the IDs
        }
        
        let filtered = [...allMatchingRecords];
        
        if (targetStatuses.length > 0) {
             filtered = filtered.filter(r => {
                 const isPass = (r.aiLogicOutcome && Object.values(r.aiLogicOutcome).every(v => v === true));
                 
                 if (targetStatuses.includes('PENDING') && r.status === 'PENDING' && !!r.docLink) return true;
                 if (targetStatuses.includes('AI_TIMEOUT') && r.status === 'AI_TIMEOUT') return true;
                 if (targetStatuses.includes('AI_FAIL') && r.status !== 'FATAL_ERROR' && r.status !== 'PENDING' && r.status !== 'AI_TIMEOUT' && isPass === false) return true;
                 if (targetStatuses.includes('REJECTED') && r.status === 'REJECTED') return true;
                 
                 return false;
             });
        }

        if (dateFrom || dateTo) {
            filtered = filtered.filter(r => {
                if (!r.ledgerDate) return false;
                const d = new Date(r.ledgerDate).getTime();
                const from = dateFrom ? new Date(dateFrom).getTime() : -Infinity;
                const to = dateTo ? new Date(dateTo).getTime() : Infinity;
                return d >= from && d <= to;
            });
        }

        return filtered.slice(0, limit).map(r => r.recId);
    }, [mode, selectedIds, allMatchingRecords, limit, dateFrom, dateTo, targetStatuses]);

    const totalBatches = parallelSize > 0 ? Math.ceil(effectiveRecords.length / parallelSize) : 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <div className="flex p-1 bg-[var(--card-inset-background)] rounded-lg border border-[var(--border)]">
                    <button onClick={() => setMode('SELECTED')} disabled={selectedIds.length === 0} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'SELECTED' ? 'bg-[var(--card-background)] text-[var(--primary-color)] shadow-sm' : 'text-[var(--foreground-muted)] disabled:opacity-50'}`}><CheckSquare className="w-4 h-4" /> Selected ({selectedIds.length})</button>
                    <button onClick={() => setMode('QUERY')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'QUERY' ? 'bg-[var(--card-background)] text-[var(--primary-color)] shadow-sm' : 'text-[var(--foreground-muted)]'}`}><ListFilter className="w-4 h-4" /> Query / Filter</button>
                </div>

                {mode === 'QUERY' && (
                    <div className="space-y-4 p-4 border border-[var(--border)] rounded-lg bg-[var(--card-inset-background)] animate-in fade-in slide-in-from-top-2">
                        <h4 className="text-xs font-bold uppercase text-[var(--foreground-muted)] tracking-wider mb-2">Filter Targets</h4>
                        <div className="mb-4"><MultiSelectCombobox label="Target Statuses" options={statusOptions} selectedValues={targetStatuses} onChange={setTargetStatuses} placeholder="Select statuses to process..." /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="From Date" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="!bg-[var(--card-background)]"/>
                            <Input label="To Date" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="!bg-[var(--card-background)]"/>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">Process Limit (First N)</label>
                             <div className="flex items-center gap-4">
                                <input type="number" min="1" max={allMatchingRecords.length} value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="w-full px-4 py-2 bg-[var(--card-background)] border border-[var(--input)] rounded-lg text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary-color)] outline-none" />
                                <span className="text-xs text-[var(--foreground-muted)] whitespace-nowrap">records</span>
                             </div>
                        </div>
                    </div>
                )}
                <div>
                    <div className="flex justify-between mb-2"><label className="font-medium text-[var(--foreground)]">Parallel Lot Size</label><span className="font-bold text-[var(--primary-color)]">{parallelSize}</span></div>
                    <input type="range" min="1" max="150" value={parallelSize} onChange={(e) => setParallelSize(parseInt(e.target.value))} className="w-full accent-[var(--primary-color)]" />
                    <p className="text-xs text-[var(--foreground-muted)] mt-1">Higher = Faster but higher risk of API limits.</p>
                </div>
                <div className="bg-[var(--accent-background)] p-4 rounded-lg border border-[var(--primary-color)]/20">
                    <p className="text-sm text-[var(--foreground)] text-center">Ready to process <strong>{effectiveRecords.length}</strong> documents in <strong>{totalBatches}</strong> sequential batches.</p>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onStart(effectiveRecords, parallelSize)} disabled={effectiveRecords.length === 0}><Play className="w-4 h-4 mr-2" /> {actionLabel}</Button>
                </div>
            </div>
        </Modal>
    );
};


const BatchProgressModal: React.FC<{ isOpen: boolean, onClose: () => void, onStop: () => void, progress: BatchProgress, log: BatchLogEntry[], isRunning: boolean, isCancelling: boolean, error: string | null, onClearError: () => void, startTime: number | null, batchType: 'ANALYSIS' | 'SANITIZATION' }> = ({ isOpen, onClose, onStop, progress, log, isRunning, isCancelling, error, onClearError, startTime, batchType }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [elapsed, setElapsed] = useState(0);
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
    
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
        setIsAutoScrollEnabled(isNearBottom);
    }, []);

    useEffect(() => {
        if (isAutoScrollEnabled && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [log, isAutoScrollEnabled]);
    
    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    
    useEffect(() => {
        let interval: any;
        if (isRunning && startTime && !error) {
            const updateTimer = () => { const now = Date.now(); setElapsed(Math.floor((now - startTime) / 1000)); };
            updateTimer(); 
            interval = setInterval(updateTimer, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, error, startTime]);
    
    const getStatusDisplay = (entry: BatchLogEntry) => {
        switch (entry.status) {
            case 'QUEUED': return <span className="text-gray-400 text-xs">Queued</span>;
            case 'PROCESSING': return (<div className="flex items-center gap-1" title="Processing..."><Loader className="w-4 h-4 text-[var(--primary-color)] animate-spin" /><Loader className="w-4 h-4 text-[var(--primary-color)] animate-spin" style={{ animationDelay: '150ms' }} /><Loader className="w-4 h-4 text-[var(--primary-color)] animate-spin" style={{ animationDelay: '300ms' }} /></div>);
            case 'SUCCESS': return (<div className="flex items-center text-green-600"><CheckCircle2 className="w-4 h-4 mr-1"/><span className="text-xs font-mono">{entry.duration}s</span></div>);
            case 'FAIL_IMAGE': case 'FAIL_GEMINI': case 'FAIL_SCRIPT': return (<div className="flex items-center text-red-600" title={entry.error}><XCircle className="w-4 h-4 mr-1"/><span className="text-xs">Fail</span></div>);
            case 'FAIL_PERMANENT': return (<div className="flex items-center text-gray-500" title={entry.error}><FileX className="w-4 h-4 mr-1"/><span className="text-xs font-medium">Skipped</span></div>);
            case 'FAIL_TIMEOUT': return (<div className="flex items-center text-orange-500" title={entry.error}><Clock className="w-4 h-4 mr-1"/><span className="text-xs font-medium">Timeout</span></div>);
            default: return null;
        }
    };

    const modalTitle = batchType === 'SANITIZATION' ? 'Data Sanitization' : 'AI Analysis Mission Control';
    const queueHeader = batchType === 'SANITIZATION' ? 'Sanitization Queue' : 'Analysis Queue';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <div className="space-y-6 relative">
                <div className="flex justify-between items-end">
                    <div><p className="text-sm text-[var(--foreground-muted)] font-medium">Progress Tracker</p><p className="text-2xl font-bold text-[var(--foreground)]">{progress.current} <span className="text-sm text-[var(--foreground-muted)] font-normal">/ {progress.total} Docs</span></p></div>
                    <LiveTimer seconds={elapsed} label={isRunning ? (isCancelling ? "Stopping..." : "Running") : "Duration"} />
                </div>
                <ProgressBar value={percentage} isAnimated={isRunning && !isCancelling} />
                <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card-background)] flex flex-col h-72 shadow-inner">
                    <div className="bg-[var(--card-inset-background)] px-4 py-2 border-b border-[var(--border)] flex justify-between text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest"><span>{queueHeader}</span><span>Status</span></div>
                    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-2 space-y-1 scroll-smooth">{log.map(entry => (<div key={entry.recId} className={`flex justify-between items-center p-2 rounded-lg text-sm border border-transparent transition-colors ${entry.status === 'PROCESSING' ? 'bg-[var(--accent-background)] border-[var(--primary-color)]/20' : ''}`}><span className="font-mono text-[var(--foreground)]">{entry.recId}</span>{getStatusDisplay(entry)}</div>))}</div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    {isRunning ? (<><Button onClick={onStop} variant="danger" size="sm" disabled={isCancelling} isLoading={isCancelling}>{isCancelling ? "Stopping..." : "Stop Batch"}</Button><Button onClick={onClose} variant="secondary" size="sm" disabled={isCancelling}>Background Mode</Button></>) : (<Button onClick={onClose} variant="secondary" size="sm">Close Mission Control</Button>)}
                </div>
                {error && (<div className="absolute inset-0 bg-[var(--modal-overlay-background)] flex items-center justify-center rounded-2xl z-10 p-4"><div className="bg-[var(--popover-background)] p-6 rounded-2xl shadow-2xl max-w-xs text-center border border-[var(--border)] animate-in zoom-in-95 duration-300"><AlertOctagon className="w-12 h-12 text-orange-500 mx-auto mb-4" /><h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Processing Paused</h3><p className="text-sm text-[var(--foreground-muted)] mb-6 leading-relaxed">{error}</p><Button onClick={onClearError} className="w-full">Resume Loop</Button></div></div>)}
            </div>
        </Modal>
    );
}

const BatchSummaryModal: React.FC<{ summary: BatchProgress, onClose: () => void }> = ({ summary, onClose }) => {
    const formatDuration = (ms: number) => {
        if (!ms) return '0s';
        const seconds = Math.floor(ms / 1000);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };
    const successPercent = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
    const failPercent = summary.total > 0 ? Math.round((summary.failed / summary.total) * 100) : 0;

    return (
        <Modal isOpen={true} onClose={onClose} title="Batch Process Complete">
            <div className="space-y-6 p-4">
                <div className="flex flex-col items-center justify-center mb-6">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4"><CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" /></div>
                    <h3 className="text-xl font-bold text-[var(--foreground)]">Job Done</h3>
                    <p className="text-[var(--foreground-muted)]">All documents in the queue have been processed.</p>
                    {summary.duration && (<p className="text-sm font-mono mt-2 font-bold text-[var(--primary-color)]">Total Time: {formatDuration(summary.duration)}</p>)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[var(--card-inset-background)] rounded-xl border border-[var(--border)] text-center"><p className="text-xs text-[var(--foreground-muted)] uppercase font-bold tracking-wider mb-1">Success</p><p className="text-2xl font-black text-green-600">{summary.completed} <span className="text-sm font-medium text-green-500">({successPercent}%)</span></p></div>
                    <div className="p-4 bg-[var(--card-inset-background)] rounded-xl border border-[var(--border)] text-center"><p className="text-xs text-[var(--foreground-muted)] uppercase font-bold tracking-wider mb-1">Failed</p><p className="text-2xl font-black text-red-600">{summary.failed} <span className="text-sm font-medium text-red-500">({failPercent}%)</span></p></div>
                </div>
                <div className="p-4 bg-[var(--accent-background)] rounded-xl border border-[var(--primary-color)]/20 text-center"><p className="text-sm font-medium text-[var(--foreground)]">Total Processed: <strong>{summary.current}</strong></p></div>
                <div className="flex justify-center pt-2"><Button onClick={onClose} className="w-full">Close Summary</Button></div>
            </div>
        </Modal>
    );
};

// ... ImageViewer remains the same ...
const ImageViewer: React.FC<{ docLink: string; rotation: number; onRotate: (newRotation: number) => void }> = ({ docLink, rotation, onRotate }) => {
    // ... logic remains ...
    const [zoom, setZoom] = useState(1);
    const [imgLoading, setImgLoading] = useState(true);
    const [error, setError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    useEffect(() => { setZoom(1); setPosition({ x: 0, y: 0 }); setImgLoading(true); setError(false); }, [docLink]);
    const handleMouseDown = (e: React.MouseEvent) => { if (zoom > 1) { setIsDragging(true); setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y }); } };
    const handleMouseMove = (e: React.MouseEvent) => { if (isDragging) { setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y }); } };
    const handleMouseUp = () => setIsDragging(false);
    const cleanLink = docLink?.includes('href="') ? docLink.match(/href="(.*?)"/)?.[1] : docLink;
    const filename = cleanLink ? cleanLink.substring(cleanLink.lastIndexOf('/') + 1) : 'No document';
    const isPdf = cleanLink && cleanLink.toLowerCase().endsWith('.pdf');

    return (
        <Card className="flex flex-col overflow-hidden h-full relative bg-[var(--card-inset-background)] select-none">
            <div className="p-2 border-b border-[var(--border)] bg-[var(--card-footer-background)] flex justify-between items-center z-10">
                <div className="flex items-center gap-2 truncate"><span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider flex-shrink-0">Document:</span><span className="text-xs font-mono text-[var(--foreground)] truncate" title={filename}>{filename}</span></div>
                {cleanLink && <a href={cleanLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center flex-shrink-0"><Eye className="w-3 h-3 mr-1"/> Original</a>}
            </div>
            <div ref={containerRef} className="flex-1 relative overflow-hidden flex items-center justify-center" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                {imgLoading && !error && cleanLink && !isPdf && <SkeletonLoader className="absolute inset-0 w-full h-full" />}
                {!cleanLink && <p className="text-[var(--destructive-foreground)] animate-pulse font-medium">No document attached</p>}
                {error && (<div className="text-[var(--foreground-muted)] text-center p-4"><AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400"/><p>Preview failed to load.</p><p className="text-xs">The URL may be invalid or the file type is not supported for preview.</p></div>)}
                {cleanLink && !error && (isPdf ? (<div className="flex flex-col items-center justify-center h-full text-center p-4"><FileText className="w-16 h-16 text-gray-400 mb-4" /><h3 className="font-semibold text-[var(--foreground)]">PDF Document</h3><p className="text-sm text-[var(--foreground-muted)] mb-4">Browser security prevents embedding this PDF. Please open it in a new tab to view.</p><Button onClick={() => window.open(cleanLink, '_blank')}><ExternalLink className="w-4 h-4 mr-2" />View PDF in New Tab</Button></div>) : (<div className={`transition-transform duration-75 ease-linear origin-center ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)` }}><img src={cleanLink} alt="Voucher" className={`max-w-full max-h-[70vh] object-contain shadow-lg pointer-events-none transition-opacity duration-300 ${imgLoading ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setImgLoading(false)} onError={() => { setImgLoading(false); setError(true); }}/></div>))}
            </div>
            {!isPdf && cleanLink && !error && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[var(--popover-background)]/90 backdrop-blur rounded-full px-4 py-2 flex items-center gap-4 shadow-xl border border-[var(--border)] z-20">
                    {zoom > 1 && <Move className="w-4 h-4 text-[var(--primary-color)] animate-pulse mr-2" />}
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"><ZoomOut className="w-5 h-5"/></button><span className="text-xs font-mono text-[var(--foreground-muted)] w-8 text-center">{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"><ZoomIn className="w-5 h-5"/></button><div className="w-px h-4 bg-gray-600"></div><button onClick={() => onRotate(rotation - 90)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"><RotateCcw className="w-5 h-5"/></button><button onClick={() => onRotate(rotation + 90)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"><RotateCw className="w-5 h-5"/></button><div className="w-px h-4 bg-gray-600"></div><button onClick={() => { setZoom(1); onRotate(0); setPosition({x:0, y:0}); }} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]" title="Reset"><Maximize className="w-4 h-4"/></button>
                </div>
            )}
        </Card>
    );
};

// ... ReconciliationMatrix remains the same ...
interface ReconciliationMatrixProps {
    record: AuditRecord;
    onSaveVerdict: (record: AuditRecord, status: string, data: AIResult, remarks: string) => void;
    onReRunAI: (recId: string) => void;
    onReRunLogic: (recId: string) => void;
    isProcessing: boolean;
    examinerData: AIResult;
    setExaminerData: React.Dispatch<React.SetStateAction<AIResult | null>>;
    remarks: string;
    setRemarks: React.Dispatch<React.SetStateAction<string>>;
    logicOverrides: Partial<LogicOutcome>;
    setLogicOverrides: React.Dispatch<React.SetStateAction<Partial<LogicOutcome>>>;
}

const ReconciliationMatrix: React.FC<ReconciliationMatrixProps> = ({ record, onSaveVerdict, onReRunAI, onReRunLogic, isProcessing, examinerData, setExaminerData, remarks, setRemarks, logicOverrides, setLogicOverrides }) => {
    // ... logic remains ...
    const aiData = record.aiResult || {} as AIResult;
    const logic = record.aiLogicOutcome || {} as LogicOutcome;
    const getFinalLogicState = (key: keyof LogicOutcome) => logicOverrides[key] !== undefined ? logicOverrides[key] : logic[key];
    const systemPassed = useMemo(() => {
        if (!logic) return false;
        const keys: (keyof LogicOutcome)[] = ['date_match', 'amount_match', 'signature_check', 'declaration_check', 'math_integrity', 'no_anomalies', 'party_match', 'denom_match', 'signature_match'];
        return keys.every(key => getFinalLogicState(key) === true);
    }, [logic, logicOverrides]);
    const renderRow = (label: string, ledgerVal: any, aiVal: any, match: boolean, fieldKey: keyof AIResult) => (
        <tr className={match ? '' : 'bg-red-50 dark:bg-red-900/10'}><td className="px-4 py-3 text-sm font-medium text-[var(--foreground-muted)]">{label}</td><td className="px-4 py-3 text-sm font-mono text-[var(--foreground)] truncate max-w-[150px]" title={String(ledgerVal)}>{ledgerVal}</td><td className="px-4 py-3 text-sm font-mono text-[var(--foreground)] truncate max-w-[150px]" title={String(aiVal)}>{aiVal}</td><td className="px-4 py-3 text-sm text-center">{match ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-red-500 mx-auto" />}</td><td className="px-4 py-1"><Input value={String(examinerData[fieldKey] || '')} onChange={(e) => setExaminerData(p => p ? ({...p, [fieldKey]: e.target.value}) : null)} className="!h-8 !text-sm !bg-[var(--card-background)] !text-[var(--foreground)] border-2 !border-[var(--border)] focus:!border-[var(--primary-color)]" /></td></tr>
    );
    const parseDenoms = (str: string) => { const map = new Map<number, number>(); if (!str) return map; const regex = /(\d+)\s*[xX*]\s*(\d+)/g; let match; while ((match = regex.exec(str)) !== null) { map.set(parseInt(match[1]), parseInt(match[2])); } return map; };
    const ledgerDenomMap = parseDenoms(record.ledgerNarration);
    const aiDenomMap = parseDenoms(aiData.denominations);
    const allDenoms = Array.from(new Set([...ledgerDenomMap.keys(), ...aiDenomMap.keys()])).sort((a, b) => b - a);
    const handleVerify = (status: string) => onSaveVerdict(record, status, examinerData, remarks);
    const toggleLogic = (key: keyof LogicOutcome, current: boolean) => setLogicOverrides(prev => ({ ...prev, [key]: !current }));
    const renderLogicToggle = (label: string, logicKey: keyof LogicOutcome, failureReason?: string) => { const isPass = getFinalLogicState(logicKey); return (<div className="flex flex-col py-1"><div className="flex items-center justify-between"><span className="text-sm text-[var(--foreground)]">{label}</span><div className="flex items-center space-x-2"><Checkbox checked={!!isPass} onChange={() => toggleLogic(logicKey, !!isPass)} /><span className={`text-xs font-bold ${isPass ? 'text-green-600' : 'text-red-600'}`}>{isPass ? 'Pass' : 'Fail'}</span></div></div>{!isPass && failureReason && (<span className="text-[10px] text-red-500 font-medium pl-1">{failureReason}</span>)}</div>); };
    const getCurrencyFailReason = () => { if (!aiData) return ''; if (getFinalLogicState('no_anomalies') === false) { const aiDenoms = parseDenoms(aiData.denominations); if (aiDenoms.size === 0) return '(No denominations found)'; if (aiData.invalid_currency_found) return '(Invalid notes found)'; const anomaliesStr = String(aiData.visual_anomalies || '').toLowerCase().trim(); if (anomaliesStr && !['none', 'n/a', 'no', 'null', ''].includes(anomaliesStr)) return '(Visual anomalies detected)'; return '(Check details)'; } return ''; };

    return (
        <Card className="flex flex-col overflow-hidden h-full border-none shadow-none">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--card-inset-background)] flex justify-between items-center"><div className="flex items-center gap-4"><h3 className="font-semibold text-[var(--foreground)]">Reconciliation Matrix</h3><div className="flex items-center gap-2">{record.aiDocType && <Badge variant="secondary">Type: {record.aiDocType}</Badge>}{record.aiQuality && <Badge variant="secondary">Quality: {record.aiQuality}</Badge>}</div></div><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => onReRunLogic(record.recId)} isLoading={isProcessing} title="Re-calculate logic"><Calculator className="w-4 h-4 mr-2" /> Re-Run Logic</Button><Button variant="secondary" size="sm" onClick={() => onReRunAI(record.recId)} isLoading={isProcessing} title="Re-run AI"><RefreshCw className="w-4 h-4 mr-2" /> Re-Run AI</Button></div></div>
            <div className="flex-1 overflow-auto p-4"><table className="min-w-full divide-y divide-[var(--border)] mb-4"><thead><tr><th className="px-4 py-2 text-left text-xs font-medium text-[var(--foreground-muted)]">Check</th><th className="px-4 py-2 text-left text-xs font-medium text-[var(--foreground-muted)]">Ledger</th><th className="px-4 py-2 text-left text-xs font-medium text-[var(--foreground-muted)]">AI Found</th><th className="px-4 py-2 text-center text-xs font-medium text-[var(--foreground-muted)]">Status</th><th className="px-4 py-2 text-left text-xs font-medium text-[var(--foreground-muted)]">Correction</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{renderRow('Date', formatDate(record.ledgerDate), aiData.doc_date, logic.date_match, 'doc_date')}{renderRow('Amount', record.ledgerAmount, aiData.amount_fig, logic.amount_match, 'amount_fig')}{renderRow('Unit ID', record.ledgerUid, aiData.unit_id, true, 'unit_id')}{renderRow('Party', record.ledgerParty, aiData.party_name, logic.party_match ?? true, 'party_name')}<tr className={logic.denom_match ? '' : 'bg-red-50 dark:bg-red-900/10'}><td className="px-4 py-3 text-sm font-medium text-[var(--foreground-muted)]">Denominations</td><td colSpan={2} className="px-4 py-2"><div className="text-xs text-[var(--foreground-muted)] bg-[var(--card-background)] rounded border border-[var(--border)] p-2">{allDenoms.map(d => (<div key={d} className="flex justify-between"><span>₹{d}:</span><span className={ledgerDenomMap.get(d) === aiDenomMap.get(d) ? 'text-green-600' : 'text-red-600 font-bold'}>{ledgerDenomMap.get(d) || 0} vs {aiDenomMap.get(d) || 0}</span></div>))}</div></td><td className="px-4 py-3 text-center">{logic.denom_match ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-red-500 mx-auto" />}</td><td className="px-4 py-1"><input value={String(examinerData.denominations || '')} onChange={(e) => setExaminerData(p => p ? ({...p, denominations: e.target.value}) : null)} className="w-full px-3 py-1.5 text-sm bg-[var(--card-background)] text-[var(--foreground)] border-2 border-[var(--border)] rounded-md focus:border-[var(--primary-color)] outline-none transition-colors" /></td></tr></tbody></table><div className="grid grid-cols-2 gap-4 mb-4"><div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--card-background)]"><p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wide mb-2">Math & Currency</p><div className="space-y-1">{renderLogicToggle("Words vs Figures", 'amount_match')}{renderLogicToggle("Math Integrity", 'math_integrity')}{renderLogicToggle("Currency Valid", 'no_anomalies', getCurrencyFailReason())} </div></div><div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--card-background)]"><p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wide mb-2">Auth & Security</p><div className="space-y-1">{renderLogicToggle(`Signatures (Found: ${aiData.signature_count})`, 'signature_check')}{renderLogicToggle("Signature Match", 'signature_match')}{renderLogicToggle("Declaration", 'declaration_check')}{renderLogicToggle("Anomalies", 'no_anomalies')}</div></div></div>{(aiData.visual_anomalies || aiData.other_observations) && (<div className="mt-4 mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800"><strong>AI Observation:</strong> {aiData.visual_anomalies} {aiData.other_observations}</div>)}<div className="space-y-2 mt-4"><label className="text-sm font-medium text-[var(--foreground)]">Examiner Remarks</label><textarea className="w-full p-2 border border-[var(--input)] rounded-md bg-[var(--card-background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary-color-focus-ring)] focus:border-[var(--primary-color)] outline-none" rows={3} placeholder="Enter remarks if rejecting or correcting..." value={remarks} onChange={e => setRemarks(e.target.value)}/></div></div><div className="p-4 border-t border-[var(--border)] bg-[var(--card-footer-background)] flex justify-between items-center space-x-3"><div className="flex items-center"><span className="text-xs text-[var(--foreground-muted)] mr-2 uppercase tracking-wide">System Result:</span>{systemPassed ? <Badge variant="success">Accepted</Badge> : <Badge variant="danger">Failed</Badge>}</div><div className="flex space-x-2"><Button variant="danger" onClick={() => handleVerify('REJECTED')} isLoading={isProcessing} disabled={!remarks}>Reject</Button><Button variant="primary" onClick={() => handleVerify('VERIFIED_OK')} isLoading={isProcessing}>Verify & Accept</Button></div></div></Card>
    );
}

const CollectionBoxAudit: React.FC = () => {
    const { worklist, failureReasons, loading, processingMap, fetchWorklist, runAIAnalysis, runReLogic, saveVerdict, startBatchProcess, startSanitization, stopBatchProcess, isBatchRunning, isCancelling, batchProgress, batchLog, batchError, batchStartTime, batchSummary, closeBatchSummary, clearBatchError } = useAIAC();
    
    // Grid State
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
    const [activeFilters, setActiveFilters] = useState<Record<string, string | null>>({});
    const [activeAiFailures, setActiveAiFailures] = useState<string[]>([]);
    const [selectedIds, setSelectedIds] = useState(new Set<string>());
    const [lastClickedId, setLastClickedId] = useState<string | null>(null);
    
    // Pagination & Sort State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);
    const [sorts, setSorts] = useState<SortCriterion[]>([]);
    const [groupBy, setGroupBy] = useState<string[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    
    // UI State
    const [dividerPosition, setDividerPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isSanitizeOpen, setIsSanitizeOpen] = useState(false);
    const [isProgressOpen, setIsProgressOpen] = useState(false);
    
    // NEW: Batch Type state
    const [batchType, setBatchType] = useState<'ANALYSIS' | 'SANITIZATION'>('ANALYSIS');

    
    // Detail View State
    const [examinerData, setExaminerData] = useState<AIResult | null>(null);
    const [remarks, setRemarks] = useState('');
    const [logicOverrides, setLogicOverrides] = useState<Partial<LogicOutcome>>({});

    const getAiPassStatus = (record: AuditRecord): boolean | null => {
        if (record.status === 'FATAL_ERROR' || record.status === 'AI_TIMEOUT') return null; // Skipped / System Fail
        if (!record.aiLogicOutcome) return null;
        const values = Object.values(record.aiLogicOutcome);
        if (values.length === 0) return null; // Handle empty
        return values.every(v => v === true);
    };

    // --- Performance Optimization: Multi-Stage Data Processing ---
    
    // 1. Filtering
    const filteredList = useMemo(() => {
        let list = [...worklist];
        if (activeFilters.source === 'NO_DOC') list = list.filter(r => !r.docLink);
        if (activeFilters.ai) {
            switch (activeFilters.ai) {
                case 'PENDING': list = list.filter(r => r.status === 'PENDING' && !!r.docLink); break; // Strict PENDING
                case 'READY': list = list.filter(r => r.status === 'SANITIZED'); break; // New READY (Sanitized) state
                case 'AI_PASS': list = list.filter(r => getAiPassStatus(r) === true); break;
                case 'AI_FAIL': list = list.filter(r => getAiPassStatus(r) === false); break;
                case 'AI_TIMEOUT': list = list.filter(r => r.status === 'AI_TIMEOUT'); break; // NEW: Timeout filter
                case 'NO_FILE': list = list.filter(r => r.status === 'FATAL_ERROR' && (
                    (r.aiResult?.visual_anomalies || '').includes('404') ||
                    (r.aiResult?.visual_anomalies || '').includes('403') ||
                    (r.aiResult?.visual_anomalies || '').includes('File Access Error')
                )); break;
                case 'BAD_TYPE': list = list.filter(r => r.status === 'FATAL_ERROR' && (
                    (r.aiResult?.visual_anomalies || '').includes('MIME') || 
                    (r.aiResult?.visual_anomalies || '').includes('[EXT]') || 
                    (r.aiResult?.visual_anomalies || '').includes('Unsupported')
                )); break;
            }
        }
        if (activeFilters.examiner) {
            switch (activeFilters.examiner) {
                case 'PENDING': list = list.filter(r => r.status === 'ANALYSED' || r.status === 'SANITIZED'); break; // SANITIZED is visually pending AI
                case 'VERIFIED': list = list.filter(r => ['VERIFIED_OK', 'VERIFIED_CORRECTED'].includes(r.status)); break;
                case 'REJECTED': list = list.filter(r => r.status === 'REJECTED'); break;
            }
        }
        if (activeAiFailures.length > 0) {
            list = list.filter(r => r.aiLogicOutcome && activeAiFailures.some(key => r.aiLogicOutcome![key as keyof LogicOutcome] === false));
        }
        return list;
    }, [worklist, activeFilters, activeAiFailures]);

    // 2. Sorting
    const sortedList = useMemo(() => {
        if (sorts.length === 0) return filteredList;
        return [...filteredList].sort((a, b) => {
             // New Sort logic for 'file_size_bytes' (hidden numeric sort for File Spec column)
             const sortKey = sorts[0].key;
             if (sortKey === 'file_size_bytes') {
                 // Extract numeric bytes from aiResult
                 const getBytes = (r: AuditRecord) => {
                     if (!r.aiResult) return 0;
                     // We stored bytes in aiResult during sanitization or analysis
                     // But types say aiResult is AIResult interface, we might need to cast or access raw
                     const raw = r.aiResult as any;
                     return Number(raw.file_size_bytes || 0);
                 };
                 const aVal = getBytes(a);
                 const bVal = getBytes(b);
                 return sorts[0].direction === 'asc' ? aVal - bVal : bVal - aVal;
             }
             
            for (const s of sorts) {
                const aVal = String(a[s.key as keyof AuditRecord] || '');
                const bVal = String(b[s.key as keyof AuditRecord] || '');
                const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
                if (cmp !== 0) return s.direction === 'asc' ? cmp : -cmp;
            }
            return 0;
        });
    }, [filteredList, sorts]);

    // 3. Pagination
    const paginatedList = useMemo(() => {
        if (groupBy.length > 0) return sortedList; // Disable pagination if grouped
        const start = (page - 1) * pageSize;
        return sortedList.slice(start, start + pageSize);
    }, [sortedList, page, pageSize, groupBy]);

    // 4. Counts & Failure Reason Logic
    const counts = useMemo(() => ({
        total: worklist.length,
        noDoc: worklist.filter(r => !r.docLink).length,
        aiPending: worklist.filter(r => r.status === 'PENDING' && !!r.docLink).length, // Strict Pending
        aiReady: worklist.filter(r => r.status === 'SANITIZED').length, // New Ready Count
        aiPassed: worklist.filter(r => getAiPassStatus(r) === true).length,
        aiFailed: worklist.filter(r => getAiPassStatus(r) === false).length,
        aiTimeout: worklist.filter(r => r.status === 'AI_TIMEOUT').length, // NEW: Timeout count
        noFile: worklist.filter(r => r.status === 'FATAL_ERROR' && (
            (r.aiResult?.visual_anomalies || '').includes('404') ||
            (r.aiResult?.visual_anomalies || '').includes('403') ||
            (r.aiResult?.visual_anomalies || '').includes('File Access Error')
        )).length,
        badType: worklist.filter(r => r.status === 'FATAL_ERROR' && (
            (r.aiResult?.visual_anomalies || '').includes('MIME') || 
            (r.aiResult?.visual_anomalies || '').includes('[EXT]') || 
            (r.aiResult?.visual_anomalies || '').includes('Unsupported')
        )).length,
        humanPending: worklist.filter(r => r.status === 'ANALYSED').length,
        verified: worklist.filter(r => ['VERIFIED_OK', 'VERIFIED_CORRECTED'].includes(r.status)).length,
        rejected: worklist.filter(r => r.status === 'REJECTED').length,
    }), [worklist]);

    const failureCounts = useMemo(() => {
        const c: Record<string, number> = {};
        failureReasons.forEach(r => c[r.value] = 0);
        filteredList.forEach(r => {
            if (r.aiLogicOutcome) {
                failureReasons.forEach(fr => {
                    if (r.aiLogicOutcome![fr.value as keyof LogicOutcome] === false) c[fr.value]++;
                });
            }
        });
        return c;
    }, [filteredList, failureReasons]);

    // --- Range Selection (Shift + Click) ---
    const handleSelect = (recId: string, isChecked: boolean, shiftKey: boolean) => {
        if (shiftKey && lastClickedId) {
            const currentList = paginatedList;
            const startIdx = currentList.findIndex(r => r.recId === lastClickedId);
            const endIdx = currentList.findIndex(r => r.recId === recId);
            if (startIdx !== -1 && endIdx !== -1) {
                const range = currentList.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    range.forEach(r => isChecked ? next.add(r.recId) : next.delete(r.recId));
                    return next;
                });
                setLastClickedId(recId);
                return;
            }
        }

        setSelectedIds(prev => {
            const next = new Set(prev);
            if (isChecked) next.add(recId);
            else next.delete(recId);
            return next;
        });
        setLastClickedId(recId);
    };

    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) setSelectedIds(new Set(paginatedList.map(r => r.recId)));
        else setSelectedIds(new Set());
    };

    const areAllSelected = useMemo(() => 
        paginatedList.length > 0 && paginatedList.every(r => selectedIds.has(r.recId)),
    [paginatedList, selectedIds]);

    const handleSortClick = (key: string) => {
        setSorts(prev => {
            const existing = prev.find(s => s.key === key);
            if (!existing) return [...prev, { key, direction: 'asc' }];
            if (existing.direction === 'asc') return prev.map(s => s.key === key ? { ...s, direction: 'desc' } : s);
            return prev.filter(s => s.key !== key);
        });
    };

    const handleFilterClick = (key: string, value: string | null) => {
        setActiveFilters(prev => {
            if (prev[key] === value) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return { ...prev, [key]: value };
        });
    };

    const handleFailureFilterClick = (value: string) => {
        setActiveAiFailures(prev => 
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
    };

    const handleStartBatch = (ids: string[], parallel: number) => {
        setBatchType('ANALYSIS');
        startBatchProcess(ids, parallel);
        setIsConfigOpen(false);
        setIsProgressOpen(true);
    };
    
    const handleStartSanitization = (ids: string[], parallel: number) => {
        setBatchType('SANITIZATION');
        startSanitization(ids, parallel);
        setIsSanitizeOpen(false);
        setIsProgressOpen(true);
    };

    // --- Resizer & Navigation ---
    const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleMouseUp = useCallback(() => setIsDragging(false), []);
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const newPercentage = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100));
        setDividerPosition(newPercentage);
    }, [isDragging]);

    useEffect(() => {
        if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
        else { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleNavigate = (direction: 'prev' | 'next') => {
        const idx = sortedList.findIndex(r => r.recId === selectedRecordId);
        const newIdx = direction === 'prev' ? idx - 1 : idx + 1;
        if (newIdx >= 0 && newIdx < sortedList.length) setSelectedRecordId(sortedList[newIdx].recId);
    };
    
    // --- Vertical Scroll Helper ---
    const handleTableScroll = (direction: 'up' | 'down') => {
        const container = document.getElementById('audit-table-scroll-area');
        if (container) {
            const scrollAmount = container.clientHeight * 0.7;
            container.scrollBy({ top: direction === 'up' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };


    const selectedRecord = useMemo(() => worklist.find(r => r.recId === selectedRecordId), [worklist, selectedRecordId]);
    
    const currentIndex = useMemo(() => 
        sortedList.findIndex(r => r.recId === selectedRecordId),
    [sortedList, selectedRecordId]);

    useEffect(() => {
        if (selectedRecord) {
            setExaminerData(selectedRecord.examinerResult || selectedRecord.aiResult || {} as AIResult);
            setRemarks(selectedRecord.examinerRemarks || '');
            setLogicOverrides({});
        } else {
            setExaminerData(null); setRemarks(''); setLogicOverrides({});
        }
    }, [selectedRecord]);

    const handleRotate = (newRotation: number) => {
        setExaminerData(prev => prev ? { ...prev, orientation_degrees: newRotation } : null);
    };

    const StatItem = ({ label, count, colorClass, isActive, onClick, icon: Icon }: any) => (
        <button onClick={onClick} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all text-sm font-medium border border-transparent whitespace-nowrap ${isActive ? `bg-[var(--card-background)] shadow-sm border-gray-300 dark:border-gray-600 ring-1 ${colorClass.replace('text-', 'ring-')}` : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
             <Icon className={`w-4 h-4 ${colorClass}`} />
             <span className={`${colorClass} font-bold`}>{count}</span>
             <span className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">{label}</span>
        </button>
    );
    
    // Helper to render file spec badge
    const renderFileSpec = (record: AuditRecord) => {
        const aiRes = record.aiResult as any;
        if (!aiRes) return <span className="text-[10px] text-gray-400">-</span>;
        
        const ext = aiRes.file_ext || 'UNK';
        const sizeStr = aiRes.file_size_fmt || '';
        const sizeBytes = Number(aiRes.file_size_bytes || 0);
        
        // Warning threshold: 10MB
        const isHeavy = sizeBytes > 10 * 1024 * 1024;
        
        let badgeColor = 'bg-gray-100 text-gray-600';
        if (ext === 'PDF') badgeColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200';
        else if (['JPG', 'PNG', 'WEBP'].includes(ext)) badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200';
        
        return (
            <div className="flex flex-col items-start gap-0.5">
                 <span className={`text-[9px] font-black px-1 rounded uppercase ${badgeColor}`}>{ext}</span>
                 <span className={`text-[10px] font-mono ${isHeavy ? 'text-orange-600 font-bold animate-pulse' : 'text-[var(--foreground-muted)]'}`}>{sizeStr}</span>
            </div>
        );
    };

    // --- Recursive Grouping ---
    const renderRecursiveGroups = (data: any[], depth: number, parentPath: string = ''): React.ReactNode[] => {
        if (depth >= groupBy.length) {
            return data.map((record) => (
                <tr key={record.recId} className="hover:bg-[var(--list-item-hover-background)] border-b border-[var(--border)] group">
                    <td className="px-4 py-2">
                         <Checkbox id={`sel-${record.recId}`} checked={selectedIds.has(record.recId)} onChange={(e) => handleSelect(record.recId, e.target.checked, (e.nativeEvent as any).shiftKey)} />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                        <button onClick={() => setSelectedRecordId(record.recId)} className="p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"><Eye size={18}/></button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--foreground)]">{formatDate(record.ledgerDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--foreground)]">{record.ledgerUid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-[var(--foreground)]">{record.ledgerAmount}</td>
                    <td className="px-6 py-4">{renderFileSpec(record)}</td>
                    <td className="px-6 py-4">{renderAiStatusBadges(record)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{renderExaminerStatusBadge(record)}</td>
                </tr>
            ));
        }

        const groupKey = groupBy[depth];
        const grouped = data.reduce((acc, r) => {
            const val = String(r[groupKey as keyof AuditRecord] || 'UNKNOWN');
            if (!acc[val]) acc[val] = [];
            acc[val].push(r);
            return acc;
        }, {} as Record<string, any[]>);

        return Object.keys(grouped).sort().map(keyVal => {
            const currentPath = parentPath ? `${parentPath}::${keyVal}` : keyVal;
            const isExpanded = expandedGroups.has(currentPath);
            return (
                <React.Fragment key={currentPath}>
                    <tr className="bg-[var(--accent-background)] cursor-pointer hover:bg-black/5 border-b border-[var(--border)]" onClick={() => {
                        setExpandedGroups(prev => { const n = new Set(prev); if (n.has(currentPath)) n.delete(currentPath); else n.add(currentPath); return n; });
                    }}>
                        <td colSpan={8} className="py-2.5 text-sm font-bold text-[var(--primary-color)]" style={{ paddingLeft: `${16 + depth * 24}px` }}>
                            <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                <span className="text-[var(--foreground-muted)] font-medium uppercase text-xs tracking-wider">{groupKey}:</span>
                                {keyVal} <Badge variant="primary" className="ml-2 text-[10px]">{grouped[keyVal].length}</Badge>
                            </div>
                        </td>
                    </tr>
                    {isExpanded && renderRecursiveGroups(grouped[keyVal], depth + 1, currentPath)}
                </React.Fragment>
            );
        });
    };

    const renderAiStatusBadges = (record: AuditRecord) => {
        if (record.status === 'AI_TIMEOUT') {
             return <Badge variant="warning"><RefreshCw className="w-3 h-3 mr-1 inline animate-pulse"/>System Busy</Badge>;
        }
        if (record.status === 'FATAL_ERROR') {
             if ((record.aiResult?.visual_anomalies || '').includes('404')) return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1 inline text-red-500"/>No File</Badge>;
             if ((record.aiResult?.visual_anomalies || '').includes('MIME')) return <Badge variant="secondary"><FileWarning className="w-3 h-3 mr-1 inline text-orange-500"/>Bad Type</Badge>;
             return <Badge variant="secondary"><FileX className="w-3 h-3 mr-1 inline"/>Skipped</Badge>;
        }
        if (record.status === 'SANITIZED') {
             return <Badge variant="primary"><BadgeCheck className="w-3 h-3 mr-1 inline"/>Ready</Badge>;
        }
        
        const isPass = getAiPassStatus(record);
        if (isPass === null) return <Badge variant="secondary">Pending AI</Badge>;
        if (isPass) return <Badge variant="success">Pass</Badge>;
        
        const failures = Object.keys(record.aiLogicOutcome || {}).filter(k => record.aiLogicOutcome![k as keyof LogicOutcome] === false).map(k => LOGIC_CHECK_LABELS[k as keyof LogicOutcome] || k);
        return <div className="flex flex-wrap gap-1">{failures.slice(0, 2).map(f => <Badge key={f} variant="danger">{f}</Badge>)}{failures.length > 2 && <Badge variant="danger">+{failures.length - 2}</Badge>}</div>;
    };

    const renderExaminerStatusBadge = (record: AuditRecord) => {
        if (record.status.startsWith('VERIFIED')) return <Badge variant="success">Verified</Badge>;
        if (record.status === 'REJECTED') return <Badge variant="danger">Rejected</Badge>;
        if (record.status === 'ANALYSED') return <Badge variant="primary">Review</Badge>;
        if (record.status === 'SANITIZED') return <Badge variant="secondary">Pending AI</Badge>;
        return <Badge variant="secondary">Pending AI</Badge>;
    };

    const columnOptions = [
        { value: 'ledgerDate', label: 'Date' },
        { value: 'ledgerUid', label: 'Unit' },
        { value: 'ledgerAmount', label: 'Amount' },
        { value: 'file_size_bytes', label: 'Doc Info' }, // Virtual sort key
        { value: 'status', label: 'Status' }
    ];

    if (!selectedRecord) {
        return (
            <div className="flex flex-col h-[calc(100%_+_2rem)] sm:h-[calc(100%_+_3rem)] w-[calc(100%_+_2rem)] sm:w-[calc(100%_+_3rem)] -mx-4 sm:-mx-6 -my-4 sm:-my-6 bg-[var(--background)] z-0">
                 {/* Main Header - Fixed */}
                 <div className="flex-shrink-0 px-4 sm:px-6 py-3 bg-[var(--background)] border-b border-[var(--border)] shadow-sm z-20">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <ScrollableXContainer className="w-full sm:w-auto flex-1">
                             <div className="flex items-center gap-1 px-2">
                                <StatItem label="Total" count={counts.total} colorClass="text-[var(--foreground)]" isActive={Object.keys(activeFilters).length === 0 && activeAiFailures.length === 0} onClick={() => { setActiveFilters({}); setActiveAiFailures([]); }} icon={FileText} />
                                <StatItem label="No Doc" count={counts.noDoc} colorClass="text-slate-500 dark:text-slate-400" isActive={activeFilters.source === 'NO_DOC'} onClick={() => handleFilterClick('source', 'NO_DOC')} icon={FileWarning} />
                                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2 flex-shrink-0"></div>
                                <StatItem label="No File" count={counts.noFile} colorClass="text-red-600 font-black" isActive={activeFilters.ai === 'NO_FILE'} onClick={() => handleFilterClick('ai', 'NO_FILE')} icon={AlertTriangle} />
                                <StatItem label="Timeouts" count={counts.aiTimeout} colorClass="text-amber-500 font-black" isActive={activeFilters.ai === 'AI_TIMEOUT'} onClick={() => handleFilterClick('ai', 'AI_TIMEOUT')} icon={AlertCircle} />
                                <StatItem label="Bad Type" count={counts.badType} colorClass="text-orange-600 font-black" isActive={activeFilters.ai === 'BAD_TYPE'} onClick={() => handleFilterClick('ai', 'BAD_TYPE')} icon={ShieldAlert} />
                                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2 flex-shrink-0"></div>
                                <StatItem label="Pending" count={counts.aiPending} colorClass="text-orange-600" isActive={activeFilters.ai === 'PENDING'} onClick={() => handleFilterClick('ai', 'PENDING')} icon={Clock} />
                                <StatItem label="Ready" count={counts.aiReady} colorClass="text-blue-600" isActive={activeFilters.ai === 'READY'} onClick={() => handleFilterClick('ai', 'READY')} icon={BadgeCheck} />
                                <StatItem label="AI Pass" count={counts.aiPassed} colorClass="text-green-600" isActive={activeFilters.ai === 'AI_PASS'} onClick={() => handleFilterClick('ai', 'AI_PASS')} icon={CheckCircle} />
                                <StatItem label="AI Fail" count={counts.aiFailed} colorClass="text-red-600" isActive={activeFilters.ai === 'AI_FAIL'} onClick={() => handleFilterClick('ai', 'AI_FAIL')} icon={XCircle} />
                                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2 flex-shrink-0"></div>
                                <StatItem label="Pending" count={counts.humanPending} colorClass="text-blue-600" isActive={activeFilters.examiner === 'PENDING'} onClick={() => handleFilterClick('examiner', 'PENDING')} icon={Hourglass} />
                                <StatItem label="Verified" count={counts.verified} colorClass="text-indigo-600" isActive={activeFilters.examiner === 'VERIFIED'} onClick={() => handleFilterClick('examiner', 'VERIFIED')} icon={UserCheck} />
                                <StatItem label="Rejected" count={counts.rejected} colorClass="text-gray-500 dark:text-gray-400" isActive={activeFilters.examiner === 'REJECTED'} onClick={() => handleFilterClick('examiner', 'REJECTED')} icon={UserX} />
                             </div>
                        </ScrollableXContainer>
                        <div className="flex gap-2 shrink-0">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => setIsSanitizeOpen(true)} 
                                disabled={isBatchRunning}
                                title="Sanitize Queue: Check for missing/bad files"
                            >
                                <Eraser className="w-4 h-4" />
                            </Button>
                             <Button onClick={() => isBatchRunning ? setIsProgressOpen(true) : setIsConfigOpen(true)} variant="secondary" size="sm" className={isBatchRunning ? 'animate-pulse' : ''} disabled={selectedIds.size === 0 && !isBatchRunning}>
                                {isBatchRunning ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                                {isBatchRunning ? `Batch: ${batchProgress.current}/${batchProgress.total}` : `Batch Process`}
                            </Button>
                            <Button onClick={fetchWorklist} variant="secondary" size="sm" isLoading={loading}><RefreshCw className="w-4 h-4"/></Button>
                        </div>
                    </div>
                </div>

                {/* Failure Reason Sticky Bar */}
                <div className="flex-shrink-0 bg-[var(--card-inset-background)] px-4 sm:px-6 py-2 border-b border-[var(--border)] shadow-sm z-10">
                    <ScrollableXContainer>
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider shrink-0 mr-2 whitespace-nowrap">Failure Filter:</span>
                        {failureReasons.map(r => (
                            <button key={r.value} onClick={() => handleFailureFilterClick(r.value)} className={`px-3 py-1 text-xs font-bold rounded-full border transition-all whitespace-nowrap mr-2 ${activeAiFailures.includes(r.value) ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]' : 'bg-[var(--card-background)] text-[var(--foreground-muted)] border-[var(--border)] hover:bg-[var(--list-item-hover-background)]'}`}>
                                {r.label} <span className="opacity-60 ml-1">({failureCounts[r.value]})</span>
                            </button>
                        ))}
                    </ScrollableXContainer>
                </div>

                {/* Group By Drop Zone */}
                <div className={`flex-shrink-0 p-3 bg-[var(--card-background)] border-b border-[var(--border)] flex flex-wrap items-center gap-2 transition-all px-4 sm:px-6 ${groupBy.length > 0 ? 'h-auto' : 'h-12'}`} onDragOver={e => e.preventDefault()} onDrop={e => {
                    const key = e.dataTransfer.getData("colKey");
                    if (key && !groupBy.includes(key)) setGroupBy(prev => [...prev, key]);
                }}>
                    <Layers className="w-4 h-4 text-gray-400 mr-2" />
                    {groupBy.length === 0 ? <span className="text-xs text-gray-400 italic">Drag column headers here to group results</span> : groupBy.map(g => (
                        <Badge key={g} variant="primary" className="flex items-center gap-1">
                            {columnOptions.find(o => o.value === g)?.label || g}
                            <X size={12} className="cursor-pointer" onClick={() => setGroupBy(prev => prev.filter(k => k !== g))} />
                        </Badge>
                    ))}
                </div>

                {/* Grid Wrapper with Padding */}
                <div className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col overflow-hidden">
                    {/* We replace the Card here with a manual div to control layout strictly */}
                    <div className="bg-[var(--card-background)] shadow-xl dark:shadow-none dark:border border-[var(--border)] rounded-none sm:rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden m-0">
                        {loading && <SurfaceLoader label="Refreshing..." />}
                        
                        {/* Top Pagination */}
                        <div className="flex-shrink-0 bg-[var(--card-inset-background)] border-b border-[var(--border)]">
                            {groupBy.length === 0 && (
                                <PaginationControls 
                                    currentPage={page} 
                                    pageSize={pageSize} 
                                    totalItems={sortedList.length} 
                                    onPageChange={setPage} 
                                    onPageSizeChange={s => { setPageSize(s === 'all' ? 1000 : s); setPage(1); }} 
                                    showAll={pageSize > 500} 
                                />
                            )}
                        </div>

                        {/* Scrollable Area */}
                        <div className="relative flex-1 min-h-0">
                             <div 
                                className="absolute inset-0 pb-12" // Fills the relative parent
                             >
                                <ScrollableTableContainer className="h-full" scrollableClassName="scrollbar-hide" innerId="audit-table-scroll-area">
                                    <table className="min-w-full divide-y divide-[var(--border)] border-collapse">
                                        <thead className="bg-[var(--card-inset-background)] sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-4 py-3 text-left w-10">
                                                    <Checkbox id="all" checked={areAllSelected} onChange={e => handleSelectAll(e.target.checked)} />
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-black text-[var(--foreground-muted)] uppercase tracking-widest">Action</th>
                                                {columnOptions.map(col => {
                                                    const sort = sorts.find(s => s.key === col.value);
                                                    return (
                                                        <th key={col.value} draggable onDragStart={e => e.dataTransfer.setData("colKey", col.value)} className="px-6 py-3 text-left text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-1 flex-1" onClick={() => handleSortClick(col.value)}>
                                                                    <GripVertical size={12} className="opacity-30"/> {col.label}
                                                                    {sort && <ArrowUpDown size={12} className={sort.direction === 'asc' ? 'text-[var(--primary-color)]' : 'text-orange-500 rotate-180'} />}
                                                                </div>
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                                <th className="px-6 py-3 text-left text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Doc Info</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">AI Status</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Examiner</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-[var(--card-background)] divide-y divide-[var(--border)]">
                                            {groupBy.length > 0 ? renderRecursiveGroups(sortedList, 0) : paginatedList.map((record) => (
                                                <tr key={record.recId} className="hover:bg-[var(--list-item-hover-background)] group">
                                                    <td className="px-4 py-2">
                                                        <Checkbox id={`rec-${record.recId}`} checked={selectedIds.has(record.recId)} onChange={(e) => handleSelect(record.recId, e.target.checked, (e.nativeEvent as any).shiftKey)} />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button onClick={() => setSelectedRecordId(record.recId)} className="p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-all active:scale-95"><Eye size={20}/></button>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--foreground)]">{formatDate(record.ledgerDate)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--foreground)]">{record.ledgerUid}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-[var(--foreground)]">{record.ledgerAmount}</td>
                                                    <td className="px-6 py-4">{renderFileSpec(record)}</td>
                                                    <td className="px-6 py-4">{renderAiStatusBadges(record)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{renderExaminerStatusBadge(record)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </ScrollableTableContainer>
                             </div>

                             {/* Floating Vertical Scroll Buttons */}
                             <div className="absolute right-6 bottom-1 flex flex-col gap-2 z-20">
                                <button 
                                    onClick={() => handleTableScroll('up')}
                                    className="p-3 rounded-full bg-[var(--popover-background)] shadow-lg border border-[var(--border)] text-[var(--primary-color)] hover:scale-110 transition-transform hover:bg-[var(--list-item-hover-background)]"
                                    title="Scroll Up"
                                >
                                    <ChevronUp className="w-6 h-6 stroke-[3px]" />
                                </button>
                                <button 
                                    onClick={() => handleTableScroll('down')}
                                    className="p-3 rounded-full bg-[var(--popover-background)] shadow-lg border border-[var(--border)] text-[var(--primary-color)] hover:scale-110 transition-transform hover:bg-[var(--list-item-hover-background)]"
                                    title="Scroll Down"
                                >
                                    <ChevronDown className="w-6 h-6 stroke-[3px]" />
                                </button>
                             </div>
                        </div>
                        
                    </div>
                </div>

                <BatchConfigurationModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} onStart={handleStartBatch} selectedIds={Array.from(selectedIds)} allMatchingRecords={sortedList} />
                <BatchConfigurationModal isOpen={isSanitizeOpen} onClose={() => setIsSanitizeOpen(false)} onStart={handleStartSanitization} selectedIds={Array.from(selectedIds)} allMatchingRecords={sortedList} title="Sanitize Data Queue" actionLabel="Start Cleaning" />
                <BatchProgressModal isOpen={isProgressOpen} onClose={() => setIsProgressOpen(false)} onStop={stopBatchProcess} progress={batchProgress} log={batchLog} isRunning={isBatchRunning} error={batchError} onClearError={clearBatchError} startTime={batchStartTime} isCancelling={isCancelling} batchType={batchType} />
                {batchSummary && <BatchSummaryModal summary={batchSummary} onClose={closeBatchSummary} />}
            </div>
        );
    }

    // Workbench View
    if (!examinerData) return <div className="h-96 flex items-center justify-center"><Loader className="animate-spin text-gray-400" /></div>;

    return (
        <div className="absolute -inset-4 sm:-inset-6 flex flex-col bg-[var(--background)] z-0">
            {/* Workbench Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--border)] bg-[var(--card-background)] shadow-sm z-20">
                 <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedRecordId(null)}><ChevronLeft className="mr-2 h-4 w-4"/> Exit</Button>
                    <h2 className="text-lg font-bold text-[var(--foreground)]">Voucher: <span className="font-mono">{selectedRecord.recId}</span></h2>
                </div>
                <div className="flex items-center bg-[var(--card-inset-background)] rounded-lg p-0.5 border border-[var(--border)]">
                    <button onClick={() => handleNavigate('prev')} disabled={currentIndex <= 0} className="p-1.5 hover:bg-[var(--card-background)] rounded disabled:opacity-30"><ChevronLeft size={18}/></button>
                    <span className="text-xs font-bold px-3 font-mono">{currentIndex + 1} / {sortedList.length}</span>
                    <button onClick={() => handleNavigate('next')} disabled={currentIndex >= sortedList.length - 1} className="p-1.5 hover:bg-[var(--card-background)] rounded disabled:opacity-30"><ChevronRight size={18}/></button>
                </div>
            </div>

            <div ref={containerRef} className="flex-1 flex flex-row items-stretch overflow-hidden h-full">
                <div className="h-full flex-shrink-0" style={{ width: `${dividerPosition}%` }}>
                    <ImageViewer docLink={selectedRecord.docLink} rotation={examinerData.orientation_degrees || 0} onRotate={handleRotate} />
                </div>
                <div className="w-2 flex-shrink-0 cursor-col-resize bg-gray-200 dark:bg-gray-700/50 hover:bg-blue-500 rounded-full transition-colors mx-1 flex items-center justify-center group" onMouseDown={handleMouseDown}>
                    <div className="w-0.5 h-8 bg-gray-400 dark:bg-gray-600 rounded-full group-hover:bg-white"></div>
                </div>
                <div className="flex-1 h-full min-w-0">
                    <ReconciliationMatrix 
                        record={selectedRecord} onSaveVerdict={saveVerdict} onReRunAI={runAIAnalysis} onReRunLogic={runReLogic} 
                        isProcessing={processingMap.has(selectedRecord.recId)} examinerData={examinerData} setExaminerData={setExaminerData} remarks={remarks} setRemarks={setRemarks} logicOverrides={logicOverrides} setLogicOverrides={setLogicOverrides} 
                    />
                </div>
            </div>
        </div>
    );
};

export default CollectionBoxAudit;
