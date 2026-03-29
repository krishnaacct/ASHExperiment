import { useCallback } from 'react';
import { Setting } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';
import { useData } from './useData';

export const useSettings = () => {
    const { user: currentUser } = useAuth();
    // Consume global state and fetch function from DataContext
    const { settings, fetchSettings, loading } = useData();

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const updateSettings = useCallback(async (newSettings: Setting[]) => {
        await api.updateSettings(getAuthHeader(), newSettings);
        // Trigger a global refetch to update all components that depend on settings
        await fetchSettings();
    }, [getAuthHeader, fetchSettings]);

    const testTelegramGroup = useCallback(async (groupId: string): Promise<{ success: boolean; error?: string }> => {
        return api.testTelegramGroup(getAuthHeader(), groupId);
    }, [getAuthHeader]);

    return {
        settings, // Pass through the globally fetched settings
        loading,  // Pass through the global loading state
        fetchSettings, // Pass through for completeness, though not actively called by component
        updateSettings,
        testTelegramGroup,
    };
};