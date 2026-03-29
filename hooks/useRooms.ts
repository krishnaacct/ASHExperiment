
import { useState, useCallback, useMemo } from 'react';
import { RoomDashboardData, Allotment, Reservation, Flat, Room, Bed } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';
import { useData } from './useData';
import { toast } from '../components/ui/Toast';

export const useRooms = () => {
    const { user: currentUser } = useAuth();
    const { globalRoomData, isRoomDataLoading: loading, fetchGlobalRoomData, setGlobalRoomData } = useData();

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    // Operational helpers for local updates
    const updateLocalState = useCallback((updateFn: (prev: RoomDashboardData) => RoomDashboardData) => {
        if (globalRoomData) {
            setGlobalRoomData(updateFn(globalRoomData));
        }
    }, [globalRoomData, setGlobalRoomData]);

    const allotBed = useCallback(async (allotmentData: Partial<Allotment>) => {
        const tempId = `temp-allot-${Date.now()}`;
        const optimisticAllotment: Allotment = {
            allotmentId: tempId,
            ...allotmentData,
            allotStatus: 'ACTIVE',
        } as Allotment;

        const originalData = globalRoomData;
        if (originalData) {
            updateLocalState(prev => ({ ...prev, allotments: [...prev.allotments, optimisticAllotment] }));
        }

        try {
            await api.createAllotment(getAuthHeader(), allotmentData);
            await fetchGlobalRoomData(); // Get definitive IDs
        } catch (error) {
            if (originalData) setGlobalRoomData(originalData); // Revert on failure
            throw error;
        }
    }, [getAuthHeader, globalRoomData, updateLocalState, fetchGlobalRoomData, setGlobalRoomData]);

    const vacateBed = useCallback(async (allotmentId: string, vacateDate: string) => {
        const originalData = globalRoomData;
        if (!originalData) return;

        updateLocalState(prev => ({ ...prev, allotments: prev.allotments.filter(a => a.allotmentId !== allotmentId) }));

        try {
            await api.vacateAllotment(getAuthHeader(), allotmentId, vacateDate);
        } catch (error) {
            setGlobalRoomData(originalData);
            throw error;
        }
    }, [getAuthHeader, globalRoomData, updateLocalState, setGlobalRoomData]);

    const reserveBed = useCallback(async (reservationData: Partial<Reservation>) => {
        const tempId = `temp-res-${Date.now()}`;
        const optimisticReservation: Reservation = {
            reservationId: tempId,
            ...reservationData,
            reservationStatus: 'ACTIVE',
        } as Reservation;
        
        const originalData = globalRoomData;
        if (originalData) {
            updateLocalState(prev => ({ ...prev, reservations: [...prev.reservations, optimisticReservation] }));
        }

        try {
            await api.createReservation(getAuthHeader(), reservationData);
            await fetchGlobalRoomData();
        } catch (error) {
            if (originalData) setGlobalRoomData(originalData);
            throw error;
        }
    }, [getAuthHeader, globalRoomData, updateLocalState, fetchGlobalRoomData, setGlobalRoomData]);

    const cancelReservation = useCallback(async (reservationId: string) => {
        const originalData = globalRoomData;
        if (!originalData) return;

        updateLocalState(prev => ({ ...prev, reservations: prev.reservations.filter(r => r.reservationId !== reservationId) }));

        try {
            await api.cancelReservation(getAuthHeader(), reservationId);
        } catch (error) {
            setGlobalRoomData(originalData);
            throw error;
        }
    }, [getAuthHeader, globalRoomData, updateLocalState, setGlobalRoomData]);
    
    const toggleMaintenance = useCallback(async (type: 'Room' | 'Bed', id: string, status: boolean) => {
        const originalData = globalRoomData;
        if (!originalData) return;
        
        updateLocalState(prev => {
            if (type === 'Room') {
                return { ...prev, rooms: prev.rooms.map(r => r.roomId === id ? { ...r, isUnderMaintenance: status } : r) };
            } else { // Bed
                return { ...prev, beds: prev.beds.map(b => b.bedId === id ? { ...b, isUnderMaintenance: status } : b) };
            }
        });

        try {
            await api.toggleMaintenance(getAuthHeader(), type, id, status);
        } catch (error) {
            setGlobalRoomData(originalData);
            throw error;
        }
    }, [getAuthHeader, globalRoomData, updateLocalState, setGlobalRoomData]);

    // Infrastructure actions with mandatory post-commit refresh
    const createFlat = useCallback(async (flatData: Partial<Flat>) => {
        await api.createFlat(getAuthHeader(), flatData);
        await fetchGlobalRoomData(flatData.buildingId);
    }, [getAuthHeader, fetchGlobalRoomData]);

    const updateFlat = useCallback(async (flatData: Flat) => {
        await api.updateFlat(getAuthHeader(), flatData);
        await fetchGlobalRoomData(flatData.buildingId);
    }, [getAuthHeader, fetchGlobalRoomData]);

    const deleteFlat = useCallback(async (flatId: string) => {
        await api.deleteFlat(getAuthHeader(), flatId);
        await fetchGlobalRoomData();
    }, [getAuthHeader, fetchGlobalRoomData]);

    const createRoom = useCallback(async (roomData: Partial<Room>): Promise<Room> => {
        const createdRoom = await api.createRoom(getAuthHeader(), roomData);
        await fetchGlobalRoomData(roomData.buildingId);
        return createdRoom;
    }, [getAuthHeader, fetchGlobalRoomData]);

    const updateRoom = useCallback(async (roomData: Room) => {
        await api.updateRoom(getAuthHeader(), roomData);
        await fetchGlobalRoomData(roomData.buildingId);
    }, [getAuthHeader, fetchGlobalRoomData]);

    const deleteRoom = useCallback(async (roomId: string) => {
        await api.deleteRoom(getAuthHeader(), roomId);
        await fetchGlobalRoomData();
    }, [getAuthHeader, fetchGlobalRoomData]);

    const createBed = useCallback(async (bedData: Partial<Bed>) => {
        await api.createBed(getAuthHeader(), bedData);
        await fetchGlobalRoomData();
    }, [getAuthHeader, fetchGlobalRoomData]);

    const deleteBed = useCallback(async (bedId: string) => {
        await api.deleteBed(getAuthHeader(), bedId);
        await fetchGlobalRoomData();
    }, [getAuthHeader, fetchGlobalRoomData]);

    return {
        data: globalRoomData || { flats: [], rooms: [], beds: [], allotments: [], reservations: [] },
        loading,
        fetchDashboardData: fetchGlobalRoomData,
        allotBed,
        vacateBed,
        reserveBed,
        cancelReservation,
        toggleMaintenance,
        createFlat,
        updateFlat,
        deleteFlat,
        createRoom,
        updateRoom,
        deleteRoom,
        createBed,
        deleteBed,
    };
};
