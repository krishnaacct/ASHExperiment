import { useState, useCallback } from 'react';
import { SuperMasterRecord } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';

export const useSMREditor = () => {
    const { user: currentUser } = useAuth();
    const [smrData, setSmrData] = useState<SuperMasterRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchSMR = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const data = await api.getSuperMasterRecord(getAuthHeader());
            setSmrData(data);
        } catch (error) {
            console.error("Failed to fetch SMR:", error);
            setSmrData([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    const createField = useCallback(async (newField: Omit<SuperMasterRecord, 'fieldId'>) => {
        const created = await api.createSmrField(getAuthHeader(), newField);
        setSmrData(prev => [...prev, created]);
        return created;
    }, [getAuthHeader]);

    const updateField = useCallback(async (updatedField: SuperMasterRecord) => {
        const updated = await api.updateSmrField(getAuthHeader(), updatedField);
        setSmrData(prev => prev.map(field => field.fieldId === updated.fieldId ? updated : field));
        return updated;
    }, [getAuthHeader]);
    
    const deleteField = useCallback(async (fieldId: string) => {
        await api.deleteSmrField(getAuthHeader(), fieldId);
        setSmrData(prev => prev.filter(field => field.fieldId !== fieldId));
    }, [getAuthHeader]);

    return {
        smrData,
        loading,
        fetchSMR,
        createField,
        updateField,
        deleteField,
    };
};