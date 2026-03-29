

import { useState, useCallback, useEffect, useRef } from 'react';
import { AuditRecord, AIResult, MasterDataItem, BatchLogEntry, BatchProgress, BatchResult, LogicOutcome } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';
import { toast } from '../components/ui/Toast';

export const useAIAC = () => {
    const { user: currentUser } = useAuth();
    const [worklist, setWorklist] = useState<AuditRecord[]>([]);
    const [failureReasons, setFailureReasons] = useState<MasterDataItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingMap, setProcessingMap] = useState<Set<string>>(new Set());
    
    // Batch Processing State
    const [isBatchRunning, setIsBatchRunning] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false); // NEW: Track cancellation intent
    const [batchProgress, setBatchProgress] = useState<BatchProgress>({ current: 0, total: 0, completed: 0, failed: 0 });
    const [batchLog, setBatchLog] = useState<BatchLogEntry[]>([]);
    const [batchError, setBatchError] = useState<string | null>(null);
    const [batchStartTime, setBatchStartTime] = useState<number | null>(null);
    const [batchSummary, setBatchSummary] = useState<BatchProgress | null>(null);
    
    const isBatchCancelled = useRef(false);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchWorklist = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const { worklist: data, failureReasons: reasons } = await api.getAIACConfig(getAuthHeader());
            setWorklist(data);
            setFailureReasons(reasons);
        } catch (error) {
            console.error("Failed to fetch audit worklist:", error);
            toast("Failed to load audit worklist.", "error");
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    const runAIAnalysis = useCallback(async (recId: string) => {
        setProcessingMap(prev => new Set(prev).add(recId));
        try {
            const response = await api.processDocument(getAuthHeader(), recId);
            toast("Analysis complete.", "success");
            setWorklist(prev => prev.map(item => {
                if (item.recId === recId) {
                    return {
                        ...item,
                        status: 'ANALYSED',
                        aiResult: response.aiResult,
                        aiLogicOutcome: response.logicOutcome
                    };
                }
                return item;
            }));
        } catch (error) {
            console.error("AI Processing failed:", error);
            toast(error instanceof Error ? error.message : "AI Processing failed", "error");
        } finally {
            setProcessingMap(prev => {
                const next = new Set(prev);
                next.delete(recId);
                return next;
            });
        }
    }, [getAuthHeader]);

    const runReLogic = useCallback(async (recId: string) => {
        setProcessingMap(prev => new Set(prev).add(recId));
        try {
            const response = await api.recalculateLogic(getAuthHeader(), recId);
            toast("Logic recalculated.", "success");
            setWorklist(prev => prev.map(item => {
                if (item.recId === recId) {
                    return {
                        ...item,
                        aiLogicOutcome: response.logicOutcome
                    };
                }
                return item;
            }));
        } catch (error) {
            console.error("Logic update failed:", error);
            toast(error instanceof Error ? error.message : "Logic update failed", "error");
        } finally {
            setProcessingMap(prev => {
                const next = new Set(prev);
                next.delete(recId);
                return next;
            });
        }
    }, [getAuthHeader]);

    const saveVerdict = useCallback(async (record: AuditRecord, status: string, data: AIResult, remarks: string) => {
        setProcessingMap(prev => new Set(prev).add(record.recId));
        try {
            await api.saveExaminerVerdict(getAuthHeader(), { 
                recId: record.recId,
                docName: record.docName,
                verdictStatus: status, 
                examinerJson: data, 
                examinerRemarks: remarks 
            });
            toast("Verdict saved.", "success");
             setWorklist(prev => prev.map(item => {
                if (item.recId === record.recId) {
                    return {
                        ...item,
                        status: status as any,
                        examinerResult: data,
                        examinerRemarks: remarks
                    };
                }
                return item;
            }));
        } catch (error) {
            toast("Failed to save verdict.", "error");
        } finally {
             setProcessingMap(prev => {
                const next = new Set(prev);
                next.delete(record.recId);
                return next;
            });
        }
    }, [getAuthHeader]);

    const stopBatchProcess = useCallback(() => {
        isBatchCancelled.current = true;
        setIsCancelling(true); // Provide immediate visual feedback
    }, []);
    
    const closeBatchSummary = useCallback(() => {
        setBatchSummary(null);
    }, []);

    // Generic Batch Runner (Used for both AI and Sanitize)
    const runBatchLoop = useCallback(async (recIds: string[], parallelSize: number, apiAction: (ids: string[]) => Promise<BatchResult[]>) => {
        isBatchCancelled.current = false;
        setIsBatchRunning(true);
        setIsCancelling(false);
        setBatchError(null);
        setBatchSummary(null);
        
        const startTime = Date.now();
        setBatchStartTime(startTime);
        setBatchProgress({ current: 0, total: 0, completed: 0, failed: 0 });
        setBatchLog([]);
        
        let finalProgressState = { current: 0, total: 0, completed: 0, failed: 0 };

        try {
            const candidateIds = recIds;
            if (candidateIds.length === 0) {
                toast("No matching documents found to process.", "info");
                setIsBatchRunning(false);
                return;
            }

            finalProgressState = { current: 0, total: candidateIds.length, completed: 0, failed: 0 };
            setBatchProgress(finalProgressState);
            
            const initialLog: BatchLogEntry[] = candidateIds.map(id => ({ recId: id, status: 'QUEUED' }));
            setBatchLog(initialLog);

            for (let i = 0; i < candidateIds.length; i += parallelSize) {
                if (isBatchCancelled.current) {
                    setBatchLog(prev => prev.map(entry => 
                        entry.status === 'PROCESSING' ? { ...entry, status: 'FAIL_SCRIPT', error: 'Cancelled by user' } : entry
                    ));
                    break;
                }

                const chunk = candidateIds.slice(i, i + parallelSize);
                
                setBatchLog(prev => prev.map(entry => {
                    if (chunk.includes(entry.recId)) {
                        return { ...entry, status: 'PROCESSING', startTime: Date.now() };
                    }
                    return entry;
                }));

                try {
                    const chunkResults = await apiAction(chunk);
                    
                    setBatchLog(prev => prev.map(entry => {
                        const result = chunkResults.find(r => r.recId === entry.recId);
                        if (result) {
                            return {
                                ...entry,
                                status: result.status,
                                duration: result.timeTaken,
                                error: result.error
                            };
                        }
                        return entry;
                    }));
                    
                    const successCount = chunkResults.filter(r => r.status === 'SUCCESS').length;
                    const failCount = chunkResults.filter(r => r.status !== 'SUCCESS').length;
                    
                    finalProgressState = {
                        ...finalProgressState,
                        current: Math.min(finalProgressState.total, finalProgressState.current + chunk.length),
                        completed: finalProgressState.completed + successCount,
                        failed: finalProgressState.failed + failCount
                    };
                    
                    setBatchProgress(finalProgressState);

                } catch (error) {
                    if (error instanceof Error && error.message.includes("RATE_LIMIT")) {
                        setBatchError("The AI service has temporarily blocked requests due to high volume. Please wait a few moments and try again.");
                        break;
                    } else {
                         setBatchLog(prev => prev.map(entry => {
                            if (chunk.includes(entry.recId) && entry.status === 'PROCESSING') {
                                return { ...entry, status: 'FAIL_SCRIPT', error: 'Batch Network Error' };
                            }
                            return entry;
                        }));
                         finalProgressState = {
                            ...finalProgressState,
                            current: Math.min(finalProgressState.total, finalProgressState.current + chunk.length),
                            failed: finalProgressState.failed + chunk.length
                        };
                        setBatchProgress(finalProgressState);
                    }
                }
            }
        } catch (error) {
             console.error("Batch process failed:", error);
             setBatchError("An unexpected error occurred while starting the batch.");
        } finally {
            setIsBatchRunning(false);
            setIsCancelling(false); // Reset state
            setBatchStartTime(null);
            
            if (!batchError) {
                setBatchSummary({
                    ...finalProgressState,
                    duration: Date.now() - startTime
                });
            }
            if (!isBatchCancelled.current) {
                fetchWorklist();
            } else {
                fetchWorklist(); 
            }
        }
    }, [fetchWorklist]);

    const startBatchProcess = useCallback(async (recIds: string[], parallelSize: number) => {
        const processAction = (chunk: string[]) => api.processBatch(getAuthHeader(), chunk);
        return runBatchLoop(recIds, parallelSize, processAction);
    }, [getAuthHeader, runBatchLoop]);

    const startSanitization = useCallback(async (recIds: string[], parallelSize: number) => {
        const sanitizeAction = (chunk: string[]) => api.sanitizeBatch(getAuthHeader(), chunk);
        return runBatchLoop(recIds, parallelSize, sanitizeAction);
    }, [getAuthHeader, runBatchLoop]);


    useEffect(() => {
        fetchWorklist();
    }, [fetchWorklist]);

    return {
        worklist,
        failureReasons,
        loading,
        processingMap,
        fetchWorklist,
        runAIAnalysis,
        runReLogic,
        saveVerdict,
        startBatchProcess,
        startSanitization,
        stopBatchProcess,
        isBatchRunning,
        isCancelling, // Exposed to UI
        batchProgress,
        batchLog,
        batchError,
        batchStartTime,
        batchSummary,
        closeBatchSummary,
        clearBatchError: () => setBatchError(null),
    };
};
