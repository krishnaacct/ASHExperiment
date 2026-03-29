
import { useState, useCallback, useEffect } from 'react';
import { PermissionMatrixData, PermissionChange } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';
import { toast } from '../components/ui/Toast';

export const usePermissionMatrix = () => {
    const { user: currentUser } = useAuth();
    const [matrixData, setMatrixData] = useState<PermissionMatrixData | null>(null);
    const [localPermissions, setLocalPermissions] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Tracks pending changes: { "userId::permissionName": isGrant }
    const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchMatrix = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const data = await api.getAllUserPermissionsMatrix(getAuthHeader());
            setMatrixData(data);
            setLocalPermissions(data.userPermissions);
            setPendingChanges(new Map());
        } catch (error) {
            console.error("Failed to fetch permission matrix:", error);
            toast("Failed to load permission matrix", "error");
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    // Initial load
    useEffect(() => {
        fetchMatrix();
    }, [fetchMatrix]);

    const togglePermission = (userId: string, permissionName: string) => {
        const currentPerms = localPermissions[userId] || [];
        const hasPerm = currentPerms.includes(permissionName);
        
        // Update Local State
        const newPerms = hasPerm 
            ? currentPerms.filter(p => p !== permissionName)
            : [...currentPerms, permissionName];
            
        setLocalPermissions(prev => ({
            ...prev,
            [userId]: newPerms
        }));

        // Track Changes
        setPendingChanges(prev => {
            const next = new Map(prev);
            const key = `${userId}::${permissionName}`;
            
            // Check original state to see if we reverted a change
            const originalPerms = matrixData?.userPermissions[userId] || [];
            const originallyHasPerm = originalPerms.includes(permissionName);
            const newHasPerm = !hasPerm;

            if (newHasPerm === originallyHasPerm) {
                next.delete(key); // Reverted to original state
            } else {
                next.set(key, newHasPerm);
            }
            return next;
        });
    };
    
    const setBatchPermissions = (userIds: string[], permissionName: string, shouldGrant: boolean) => {
        // Optimistic update for multiple users
        setLocalPermissions(prev => {
            const next = { ...prev };
            userIds.forEach(uid => {
                const current = next[uid] || [];
                const has = current.includes(permissionName);
                if (shouldGrant && !has) {
                    next[uid] = [...current, permissionName];
                } else if (!shouldGrant && has) {
                    next[uid] = current.filter(p => p !== permissionName);
                }
            });
            return next;
        });

        // Track batch changes
        setPendingChanges(prev => {
            const next = new Map(prev);
            userIds.forEach(uid => {
                const key = `${uid}::${permissionName}`;
                const originalPerms = matrixData?.userPermissions[uid] || [];
                const originallyHasPerm = originalPerms.includes(permissionName);
                
                if (shouldGrant === originallyHasPerm) {
                    next.delete(key);
                } else {
                    next.set(key, shouldGrant);
                }
            });
            return next;
        });
    };
    
    const setBatchUserPermissions = (userId: string, permissionNames: string[], shouldGrant: boolean) => {
        setLocalPermissions(prev => {
            const current = prev[userId] || [];
            const currentSet = new Set(current);
            
            permissionNames.forEach(p => {
                if (shouldGrant) currentSet.add(p);
                else currentSet.delete(p);
            });
            
            return { ...prev, [userId]: Array.from(currentSet) };
        });
        
         setPendingChanges(prev => {
            const next = new Map(prev);
             const originalPerms = matrixData?.userPermissions[userId] || [];
             const originalSet = new Set(originalPerms);

             permissionNames.forEach(p => {
                 const key = `${userId}::${p}`;
                 const originallyHas = originalSet.has(p);
                 if (shouldGrant === originallyHas) {
                     next.delete(key);
                 } else {
                     next.set(key, shouldGrant);
                 }
             });
             return next;
         });
    };

    const saveChanges = async () => {
        if (pendingChanges.size === 0) return;
        setIsSaving(true);
        try {
            const changes: PermissionChange[] = [];
            pendingChanges.forEach((value, key) => {
                const [userId, permission] = key.split('::');
                changes.push({ userId, permission, action: value ? 'grant' : 'revoke' });
            });

            await api.bulkUpdatePermissionsMatrix(getAuthHeader(), changes);
            toast("Permissions updated successfully", "success");
            
            // Refresh original data to match current state
            // Instead of full refetch, we can just update matrixData reference if we trust the save
            // But a refetch is safer to ensure sync.
            await fetchMatrix(); 
            
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to save permissions", "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    const resetChanges = () => {
        if (matrixData) {
            setLocalPermissions(matrixData.userPermissions);
            setPendingChanges(new Map());
        }
    };

    return {
        matrixData,
        localPermissions,
        pendingChanges,
        loading,
        isSaving,
        togglePermission,
        saveChanges,
        resetChanges,
        setBatchPermissions,
        setBatchUserPermissions
    };
};
