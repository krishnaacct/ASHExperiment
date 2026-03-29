
import { useState, useCallback, useEffect } from 'react';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';
import { toast } from '../components/ui/Toast';

export const useReportBuilder = () => {
    const { user: currentUser } = useAuth();
    const [savedReports, setSavedReports] = useState<any[]>([]);
    const [dataSources, setDataSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchData = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const [reports, sources] = await Promise.all([
                api.getSavedReports(getAuthHeader()),
                api.getDataSources(getAuthHeader())
            ]);
            setSavedReports(reports);
            setDataSources(sources);
        } catch (error) {
            console.error("Failed to fetch report builder data:", error);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    const saveReport = useCallback(async (config: any) => {
        try {
            const result = await api.saveReportConfig(getAuthHeader(), config);
            toast("Report configuration saved.", "success");
            await fetchData(); // Refresh list
            return result.reportId;
        } catch (error) {
            toast("Failed to save report.", "error");
            throw error;
        }
    }, [getAuthHeader, fetchData]);

    const deleteReport = useCallback(async (reportId: string) => {
        try {
            await api.deleteSavedReport(getAuthHeader(), reportId);
            toast("Report deleted.", "success");
            setSavedReports(prev => prev.filter(r => r.reportId !== reportId));
        } catch (error) {
            toast("Failed to delete report.", "error");
            throw error;
        }
    }, [getAuthHeader]);

    const executeReport = useCallback(async (reportId: string, runtimeFilters?: any[]) => {
        setExecuting(true);
        try {
            const result = await api.executeSavedReport(getAuthHeader(), reportId, runtimeFilters);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to execute report.";
            toast(message, "error");
            throw error;
        } finally {
            setExecuting(false);
        }
    }, [getAuthHeader]);
    
    // Helper to get schema for the builder UI
    const getSourceSchema = useCallback(async (sourceId: string) => {
        try {
             return await api.getDataSourceSchema(getAuthHeader(), sourceId);
        } catch (e) { return []; }
    }, [getAuthHeader]);

    return {
        savedReports,
        dataSources,
        loading,
        executing,
        fetchData,
        saveReport,
        deleteReport,
        executeReport,
        getSourceSchema
    };
};
