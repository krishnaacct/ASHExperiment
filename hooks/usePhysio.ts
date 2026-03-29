
import { useState, useCallback, useEffect } from 'react';
import { PhysioSession, PhysioQueueItem, PhysioRegisterData, PhysioAnalyticsData } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';
import { useData } from './useData';
import { toast } from '../components/ui/Toast';

export const usePhysio = () => {
    const { user: currentUser } = useAuth();
    const [worklist, setWorklist] = useState<PhysioQueueItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Register (Ledger) State
    const [reportData, setReportData] = useState<PhysioRegisterData | null>(null);
    const [reportsLoading, setReportsLoading] = useState(false);

    // Analytics (Matrix/Pulse) State
    const [analyticsData, setAnalyticsData] = useState<PhysioAnalyticsData | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchWorklist = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const data = await api.getPhysioWorklist(getAuthHeader());
            setWorklist(data);
        } catch (error) {
            console.error("Failed to fetch physio worklist:", error);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    // Initial fetch only
    useEffect(() => {
        if (currentUser) {
            fetchWorklist();
        }
    }, [currentUser, fetchWorklist]);

    const getPatientHistory = useCallback(async (personId: string) => {
        return await api.getPhysioLastSession(getAuthHeader(), personId);
    }, [getAuthHeader]);

    const saveSession = useCallback(async (session: Partial<PhysioSession>) => {
        setIsSaving(true);
        try {
            await api.logPhysioSession(getAuthHeader(), session);
            toast("Session logged successfully", "success");
            // Optimistic UI: Mark treated in local list
            setWorklist(prev => prev.map(item => 
                item.personId === session.personId ? { ...item, treatedToday: true } : item
            ));
            return true;
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to log session", "error");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const deleteSession = useCallback(async (sessionId: string) => {
        try {
            await api.deletePhysioSession(getAuthHeader(), sessionId);
            toast("Session deleted", "success");
            return true;
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to delete session", "error");
            return false;
        }
    }, [getAuthHeader]);

    const fetchReports = useCallback(async (period: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'All') => {
        setReportsLoading(true);
        try {
            const data = await api.getPhysioRegister(getAuthHeader(), period);
            setReportData(data);
        } catch (error) {
            console.error("Failed to fetch physio register:", error);
            toast("Failed to load register", "error");
        } finally {
            setReportsLoading(false);
        }
    }, [getAuthHeader]);

    const fetchAnalytics = useCallback(async (month: number, year: number) => {
        setAnalyticsLoading(true);
        try {
            const data = await api.getPhysioAnalytics(getAuthHeader(), month, year);
            setAnalyticsData(data);
        } catch (error) {
            console.error("Failed to fetch physio analytics:", error);
            toast("Failed to load analytics", "error");
        } finally {
            setAnalyticsLoading(false);
        }
    }, [getAuthHeader]);

    return {
        worklist,
        loading,
        isSaving,
        fetchWorklist,
        getPatientHistory,
        saveSession,
        deleteSession,
        reportData,
        reportsLoading,
        fetchReports,
        analyticsData,
        analyticsLoading,
        fetchAnalytics
    };
};