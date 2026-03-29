import { useState, useCallback } from 'react';
import { User, Permission, Person } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';

export const useUsers = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(false);
    const [permissionsMap, setPermissionsMap] = useState<Record<string, Permission[]>>({});
    const [unassignedPeople, setUnassignedPeople] = useState<Person[]>([]);

    const getAuthHeader = useCallback(() => {
      if (!currentUser?.sessionId) throw new Error("Not authenticated");
      return currentUser.sessionId;
    }, [currentUser]);

    const fetchUsers = useCallback(async (page: number, pageSize: number) => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const { users: fetchedUsers, total } = await api.getUsers(getAuthHeader(), page, pageSize);
            setUsers(fetchedUsers);
            setTotalUsers(total);

            if (fetchedUsers.length > 0) {
                const userIds = fetchedUsers.map(u => u.userId);
                const permsMap = await api.getPermissionsForUsers(getAuthHeader(), userIds);
                setPermissionsMap(prev => ({ ...prev, ...permsMap }));
            }

        } catch (error) {
            console.error("Failed to fetch users:", error);
            setUsers([]);
            setTotalUsers(0);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);
    
    const fetchUnassignedPeople = useCallback(async () => {
        if (!currentUser) return;
        try {
            const people = await api.getUnassignedPeople(getAuthHeader());
            setUnassignedPeople(people);
        } catch (error) {
            console.error("Failed to fetch unassigned people:", error);
        }
    }, [currentUser, getAuthHeader]);

    const getAllUsers = useCallback(async (): Promise<User[]> => {
        if (!currentUser) return [];
        try {
            return await api.getAllUsers(getAuthHeader());
        } catch (error) {
            console.error("Failed to fetch all users:", error);
            return [];
        }
    }, [currentUser, getAuthHeader]);

    const addUser = useCallback(async (newUser: Omit<User, 'userId' | 'activeStatus'>): Promise<User> => {
        return await api.createUser(getAuthHeader(), newUser);
    }, [getAuthHeader]);

    const updateUser = useCallback(async (updatedUser: User) => {
        await api.updateUser(getAuthHeader(), updatedUser);
    }, [getAuthHeader]);

    const updateMyProfile = useCallback(async (profileData: Partial<User>) => {
        await api.updateMyProfile(getAuthHeader(), profileData);
    }, [getAuthHeader]);
    
    const deleteUser = useCallback(async (userId: string) => {
        await api.deleteUser(getAuthHeader(), userId);
    }, [getAuthHeader]);
    
    const updateUserPermissions = useCallback(async (userId: string, permissions: Permission[]) => {
        await api.updateUserPermissions(getAuthHeader(), userId, permissions);
        // Optimistically update the local map for immediate UI feedback
        setPermissionsMap(prev => ({ ...prev, [userId]: permissions }));
    }, [getAuthHeader]);
    
    const findUserPage = useCallback(async (userId: string, pageSize: number): Promise<{ page: number }> => {
        return api.findUserPage(getAuthHeader(), userId, pageSize);
    }, [getAuthHeader]);

    return {
        users,
        totalUsers,
        loading,
        permissionsMap,
        unassignedPeople,
        fetchUsers,
        fetchUnassignedPeople,
        getAllUsers,
        addUser,
        updateUser,
        updateMyProfile,
        deleteUser,
        updateUserPermissions,
        findUserPage
    };
};