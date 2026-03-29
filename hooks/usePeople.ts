
import { useState, useCallback } from 'react';
import { Person } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';

export const usePeople = () => {
    const { user: currentUser } = useAuth();
    const [people, setPeople] = useState<Person[]>([]);
    const [totalPeople, setTotalPeople] = useState(0);
    const [loading, setLoading] = useState(false);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchPeople = useCallback(async (page: number, pageSize: number) => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const { people: fetchedPeople, total } = await api.getPeople(getAuthHeader(), page, pageSize);
            setPeople(fetchedPeople);
            setTotalPeople(total);
        } catch (error) {
            console.error("Failed to fetch people:", error);
            setPeople([]);
            setTotalPeople(0);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    const getAllPeople = useCallback(async (): Promise<Person[]> => {
        if (!currentUser) return [];
        try {
            return await api.getAllPeople(getAuthHeader());
        } catch (error) {
            console.error("Failed to fetch all people:", error);
            return [];
        }
    }, [currentUser, getAuthHeader]);

    const getUnassignedPeople = useCallback(async (): Promise<Person[]> => {
        if (!currentUser) return [];
        try {
            return await api.getUnassignedPeople(getAuthHeader());
        } catch (error) {
            console.error("Failed to fetch unassigned people:", error);
            return [];
        }
    }, [currentUser, getAuthHeader]);


    const addPerson = useCallback(async (newPerson: Partial<Person>): Promise<Person> => {
        return await api.createPerson(getAuthHeader(), newPerson);
    }, [getAuthHeader]);

    const updatePerson = useCallback(async (updatedPerson: Person) => {
        await api.updatePerson(getAuthHeader(), updatedPerson);
    }, [getAuthHeader]);

    const deletePerson = useCallback(async (personId: string) => {
        await api.deletePerson(getAuthHeader(), personId);
    }, [getAuthHeader]);
    
    const findPersonPage = useCallback(async (personId: string, pageSize: number): Promise<{ page: number }> => {
        return api.findPersonPage(getAuthHeader(), personId, pageSize);
    }, [getAuthHeader]);

    const bulkUpdate = useCallback(async (personIds: string[], fieldName: string, value: any): Promise<{ success: boolean, count: number }> => {
        return api.bulkUpdatePeople(getAuthHeader(), personIds, fieldName, value);
    }, [getAuthHeader]);

    return {
        people,
        totalPeople,
        loading,
        fetchPeople,
        getAllPeople,
        getUnassignedPeople,
        addPerson,
        updatePerson,
        deletePerson,
        findPersonPage,
        bulkUpdate
    };
};
