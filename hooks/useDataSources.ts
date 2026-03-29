
import { useState, useCallback, useEffect } from 'react';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';
import { toast } from '../components/ui/Toast';

export const useDataSources = () => {
    const { user: currentUser } = useAuth();
    const [sources, setSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchDataSources = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const data = await api.getDataSources(getAuthHeader());
            setSources(data);
        } catch (error) {
            console.error("Failed to fetch data sources:", error);
            setSources([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    const saveSource = useCallback(async (sourceData: any) => {
        setIsSaving(true);
        try {
            if (sourceData.sourceId) {
                await api.updateDataSource(getAuthHeader(), sourceData);
            } else {
                await api.createDataSource(getAuthHeader(), sourceData);
            }
            await fetchDataSources();
            toast("Data source saved successfully", "success");
            return true;
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to save data source", "error");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader, fetchDataSources]);
    
    const deleteSource = useCallback(async (sourceId: string) => {
        setIsSaving(true);
        try {
            await api.deleteDataSource(getAuthHeader(), sourceId);
            setSources(prev => prev.filter(s => s.sourceId !== sourceId));
            toast("Data source deleted successfully", "success");
            return true;
        } catch (error) {
             toast(error instanceof Error ? error.message : "Failed to delete data source", "error");
             return false;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const syncSource = useCallback(async (sourceId: string) => {
        setIsSyncing(true);
        try {
            const result = await api.syncDataSource(getAuthHeader(), sourceId);
            toast(result.message, "success");
            // Return the full result so the UI can check for 'SCHEMA_GENERATED' status
            return result;
        } catch (error) {
            toast(error instanceof Error ? error.message : "Sync failed", "error");
            return { success: false };
        } finally {
            setIsSyncing(false);
        }
    }, [getAuthHeader]);

    const getSourceSchema = useCallback(async (sourceId: string) => {
        try {
            return await api.getDataSourceSchema(getAuthHeader(), sourceId);
        } catch (error) {
            console.error("Failed to fetch schema:", error);
            return [];
        }
    }, [getAuthHeader]);

    const saveSchema = useCallback(async (sourceId: string, schemaRows: any[]) => {
         setIsSaving(true);
         try {
             await api.saveDataSourceSchema(getAuthHeader(), sourceId, schemaRows);
             toast("Schema mapping saved.", "success");
             return true;
         } catch (error) {
             toast("Failed to save schema.", "error");
             return false;
         } finally {
             setIsSaving(false);
         }
    }, [getAuthHeader]);

    return {
        sources,
        loading,
        isSaving,
        isSyncing,
        fetchDataSources,
        saveSource,
        deleteSource,
        syncSource,
        getSourceSchema,
        saveSchema
    };
};
