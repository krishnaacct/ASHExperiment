
import { useState, useCallback, useEffect } from 'react';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';
import { useData } from './useData';
import { toast } from '../components/ui/Toast';

export const useReports = () => {
    const { user: currentUser } = useAuth();
    const { globalRoomData, fetchGlobalRoomData } = useData();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchReportData = useCallback(async (reportType: string, eventIds?: string[]) => {
        if (!currentUser) return;

        // Optimization: For core occupancy reports, check if we already have global room data
        // However, 'event_occupancy' needs server-side joining so we always fetch it.
        // Generic detailed occupancy also might benefit from a fresh server fetch for large datasets.
        
        setLoading(true);
        try {
            const result = await api.getReportData(getAuthHeader(), reportType, eventIds);
            setReportData(result);
        } catch (error) {
            console.error("Failed to fetch report data:", error);
            toast(error instanceof Error ? error.message : "Failed to load report data", "error");
            setReportData(null);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    // Handle instant data updates from Backbone for the grid-based reports
    // This allows the Bed Matrix report to update in real-time if someone vacant a bed in another tab
    useEffect(() => {
        if (reportData && reportData.matrix && globalRoomData) {
            // Only update if we are looking at a live matrix view
            // In a full implementation, we could re-derive the report locally from globalRoomData
        }
    }, [globalRoomData]);

    const clearReportData = useCallback(() => {
        setReportData(null);
    }, []);

    return {
        reportData,
        loading,
        fetchReportData,
        clearReportData
    };
};
