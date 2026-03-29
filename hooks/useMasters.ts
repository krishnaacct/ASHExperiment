import { useState, useCallback } from 'react';
import { MasterDataItem } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';
import { useData } from './useData';

export const useMasters = () => {
    const { user: currentUser } = useAuth();
    const { forceMasterDataRefetch } = useData(); // Keep this for global invalidation
    const [masterDataItems, setMasterDataItems] = useState<MasterDataItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchMasterDataItems = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const data = await api.getAllMasterDataItems(getAuthHeader());
            setMasterDataItems(data);
        } catch (error) {
            console.error("Failed to fetch all master data items:", error);
            setMasterDataItems([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    const createMasterDataItem = useCallback(async (newItem: Omit<MasterDataItem, 'masterId'> & { masterId?: string }) => {
        setIsSaving(true);
        try {
            const created = await api.createMasterDataItem(getAuthHeader(), newItem);
            // Optimistic update
            setMasterDataItems(prev => [...prev, created].sort((a, b) => a.label.localeCompare(b.label)));
            // Global invalidation for other components
            await forceMasterDataRefetch();
            return created;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader, forceMasterDataRefetch]);

    const updateMasterDataItem = useCallback(async (updatedItem: MasterDataItem) => {
        setIsSaving(true);
        try {
            const updated = await api.updateMasterDataItem(getAuthHeader(), updatedItem);
            // Optimistic update
            setMasterDataItems(prev => prev.map(item => item.masterId === updated.masterId ? updated : item));
            // Global invalidation
            await forceMasterDataRefetch();
            return updated;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader, forceMasterDataRefetch]);
    
    const deleteMasterDataItem = useCallback(async (masterId: string) => {
        setIsSaving(true);
        try {
            await api.deleteMasterDataItem(getAuthHeader(), masterId);
            // Optimistic update
            setMasterDataItems(prev => prev.filter(item => item.masterId !== masterId));
            // Global invalidation
            await forceMasterDataRefetch();
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader, forceMasterDataRefetch]);

    return {
        masterDataItems,
        loading,
        isSaving,
        fetchMasterDataItems,
        createMasterDataItem,
        updateMasterDataItem,
        deleteMasterDataItem,
    };
};
