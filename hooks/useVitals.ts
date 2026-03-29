
import { useState, useCallback, useEffect } from 'react';
import { VitalsRecord, VitalsQueueItem, VitalsReportData, VitalsAnalyticsResponse } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';
import { toast } from '../components/ui/Toast';

export const useVitals = () => {
    const { user: currentUser } = useAuth();
    const [worklist, setWorklist] = useState<VitalsQueueItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Analytics State
    const [reportData, setReportData] = useState<VitalsReportData | null>(null);
    const [reportsLoading, setReportsLoading] = useState(false);

    // Matrix State
    const [matrixData, setMatrixData] = useState<VitalsAnalyticsResponse | null>(null);
    const [matrixLoading, setMatrixLoading] = useState(false);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchWorklist = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const data = await api.getVitalsWorklist(getAuthHeader());
            setWorklist(data);
        } catch (error) {
            console.error("Failed to fetch vitals worklist:", error);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    useEffect(() => {
        if (currentUser) {
            fetchWorklist();
        }
    }, [currentUser, fetchWorklist]);

    const getPatientHistory = useCallback(async (personId: string) => {
        return await api.getVitalsLastSession(getAuthHeader(), personId);
    }, [getAuthHeader]);

    const saveVitals = useCallback(async (vitals: Partial<VitalsRecord>) => {
        setIsSaving(true);
        try {
            await api.logVitalsSession(getAuthHeader(), vitals);
            toast("Vitals recorded successfully", "success");
            
            // OPTIMISTIC UPDATE LOGIC FIX:
            // Calculate today in LOCAL timezone to match form input
            const d = new Date();
            const offset = d.getTimezoneOffset() * 60000;
            const todayStr = new Date(d.getTime() - offset).toISOString().slice(0, 10);
            
            const recordDateStr = vitals.visitDate ? String(vitals.visitDate).substring(0, 10) : todayStr;

            if (recordDateStr === todayStr) {
                const isPartial = vitals.isPartial;
                setWorklist(prev => prev.map(item => 
                    item.personId === vitals.personId ? { ...item, status: isPartial ? 'PARTIAL' : 'COMPLETE' } : item
                ));
            }
            
            return true;
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to save vitals", "error");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);
    
    const deleteVitals = useCallback(async (vitalsId: string) => {
        try {
             // Correctly call the exported function
             await api.deleteVitalsSession(getAuthHeader(), vitalsId);
             toast("Record deleted", "success");
             return true;
        } catch (error) {
             toast(error instanceof Error ? error.message : "Failed to delete record", "error");
             return false;
        }
    }, [getAuthHeader]);

    const fetchReports = useCallback(async (period: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'All') => {
        setReportsLoading(true);
        try {
            const data = await api.getVitalsReports(getAuthHeader(), period);
            setReportData(data);
        } catch (error) {
            console.error("Failed to fetch vitals reports:", error);
            toast("Failed to load reports", "error");
        } finally {
            setReportsLoading(false);
        }
    }, [getAuthHeader]);

    const fetchAnalytics = useCallback(async (filters: any) => {
        setMatrixLoading(true);
        try {
            const data = await api.getVitalsAnalytics(getAuthHeader(), filters);
            setMatrixData(data);
        } catch (error) {
            console.error("Failed to fetch vitals analytics:", error);
            toast("Failed to load analytics", "error");
        } finally {
            setMatrixLoading(false);
        }
    }, [getAuthHeader]);

    const fetchPatientFullHistory = useCallback(async (personId: string) => {
        try {
            return await api.getPatientVitalsHistory(getAuthHeader(), personId);
        } catch (error) {
            console.error("Failed to fetch patient history:", error);
            return [];
        }
    }, [getAuthHeader]);

    return {
        worklist,
        loading,
        isSaving,
        fetchWorklist,
        getPatientHistory,
        saveVitals,
        deleteVitals,
        reportData,
        reportsLoading,
        fetchReports,
        matrixData,
        matrixLoading,
        fetchAnalytics,
        fetchPatientFullHistory
    };
};
