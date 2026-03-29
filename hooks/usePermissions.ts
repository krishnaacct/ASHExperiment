import { useState, useCallback, useEffect } from 'react';
import { PermissionDefinition } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';

// A simple in-memory cache to hold permissions for the duration of the session.
let cachedPermissions: PermissionDefinition[] | null = null;

export const usePermissions = () => {
    const { user: currentUser } = useAuth();
    const [permissionDefinitions, setPermissionDefinitions] = useState<PermissionDefinition[]>(cachedPermissions || []);
    const [loading, setLoading] = useState(false);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchPermissionDefinitions = useCallback(async () => {
        if (!currentUser || (cachedPermissions && cachedPermissions.length > 0)) {
            // If we have cached data, use it and don't re-fetch.
            if (cachedPermissions) setPermissionDefinitions(cachedPermissions);
            return;
        }

        setLoading(true);
        try {
            const definitions = await api.getPermissionDefinitions(getAuthHeader());
            cachedPermissions = definitions; // Store in cache
            setPermissionDefinitions(definitions);
        } catch (error) {
            console.error("Failed to fetch permission definitions:", error);
            setPermissionDefinitions([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    // Effect to clear the cache on logout
    useEffect(() => {
        if (!currentUser) {
            cachedPermissions = null;
            setPermissionDefinitions([]);
        }
    }, [currentUser]);

    // Automatically fetch when the hook is first used
    useEffect(() => {
        if (currentUser) {
            fetchPermissionDefinitions();
        }
    }, [currentUser, fetchPermissionDefinitions]);

    return {
        permissionDefinitions,
        loading,
        fetchPermissionDefinitions,
    };
};
