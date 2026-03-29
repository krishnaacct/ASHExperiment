import { useState, useCallback, useEffect } from 'react';
import { InventoryItem, RoomStandard, InventoryAuditEvent, InventoryAuditRecord } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';
import { toast } from '../components/ui/Toast';

// Module-level cache to persist data for the life of the workstation session
let cachedItems: InventoryItem[] | null = null;
let cachedStandards: RoomStandard[] | null = null;

export const useInventory = () => {
    const { user: currentUser } = useAuth();
    const [items, setItems] = useState<InventoryItem[]>(cachedItems || []);
    const [standards, setStandards] = useState<RoomStandard[]>(cachedStandards || []);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchItems = useCallback(async (force = false) => {
        if (!currentUser) return;
        
        // Return cached data instantly if available and not forced
        if (!force && cachedItems) {
            setItems(cachedItems);
            return;
        }
        
        setLoading(true);
        try {
            const data = await api.getInventoryItems(getAuthHeader());
            cachedItems = data;
            setItems(data);
        } catch (error) {
            console.error("Failed to fetch inventory items:", error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    const createItem = useCallback(async (item: Partial<InventoryItem>) => {
        setIsSaving(true);
        try {
            const created = await api.createInventoryItem(getAuthHeader(), item);
            cachedItems = [...(cachedItems || []), created].sort((a, b) => a.itemName.localeCompare(b.itemName));
            setItems(cachedItems);
            toast('Item created successfully', 'success');
            return created;
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to create item", "error");
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const updateItem = useCallback(async (item: InventoryItem) => {
        setIsSaving(true);
        try {
            const updated = await api.updateInventoryItem(getAuthHeader(), item);
            cachedItems = (cachedItems || []).map(i => i.itemId === updated.itemId ? updated : i);
            setItems(cachedItems);
            toast('Item updated successfully', 'success');
            return updated;
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to update item", "error");
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const deleteItem = useCallback(async (itemId: string) => {
        setIsSaving(true);
        try {
            await api.deleteInventoryItem(getAuthHeader(), itemId);
            cachedItems = (cachedItems || []).filter(i => i.itemId !== itemId);
            setItems(cachedItems);
            toast('Item deleted successfully', 'success');
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to delete item", "error");
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const fetchStandards = useCallback(async (force = false) => {
        if (!currentUser) return;

        // Return cached data instantly if available and not forced
        if (!force && cachedStandards) {
            setStandards(cachedStandards);
            return;
        }

        setLoading(true);
        try {
            const data = await api.getRoomStandards(getAuthHeader());
            cachedStandards = data;
            setStandards(data);
        } catch (error) {
            console.error("Failed to fetch room standards:", error);
            setStandards([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);
    
    const createStandard = useCallback(async (standard: Partial<RoomStandard>) => {
        setIsSaving(true);
        try {
            const created = await api.createRoomStandard(getAuthHeader(), standard);
            cachedStandards = [...(cachedStandards || []), created];
            setStandards(cachedStandards);
            toast('Standard created successfully', 'success');
            return created;
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to create standard", "error");
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const updateStandard = useCallback(async (standard: RoomStandard) => {
        setIsSaving(true);
        try {
            const updated = await api.updateRoomStandard(getAuthHeader(), standard);
            cachedStandards = (cachedStandards || []).map(s => s.standardId === updated.standardId ? updated : s);
            setStandards(cachedStandards);
            toast('Standard updated successfully', 'success');
            return updated;
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to update standard", "error");
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const deleteStandard = useCallback(async (standardId: string) => {
        setIsSaving(true);
        try {
            await api.deleteRoomStandard(getAuthHeader(), standardId);
            cachedStandards = (cachedStandards || []).filter(s => s.standardId !== standardId);
            setStandards(cachedStandards);
            toast('Standard deleted successfully', 'success');
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to delete standard", "error");
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    // Clear cache on logout
    useEffect(() => {
        if (!currentUser) {
            cachedItems = null;
            cachedStandards = null;
        }
    }, [currentUser]);

    const fetchExpectedInventory = useCallback(async (roomId: string) => {
        try {
            return await api.getRoomExpectedInventory(getAuthHeader(), roomId);
        } catch (error) {
            console.error("Failed to fetch expected inventory", error);
            return [];
        }
    }, [getAuthHeader]);

    const submitAudit = useCallback(async (auditPayload: any) => {
        setIsSaving(true);
        try {
            await api.submitRoomAudit(getAuthHeader(), auditPayload);
            toast('Audit submitted successfully!', 'success');
            return true;
        } catch (error) {
             toast(error instanceof Error ? error.message : "Failed to submit audit", "error");
             return false;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const fetchAuditEvents = useCallback(async () => {
        try {
            return await api.getAuditEvents(getAuthHeader(), 'ALL');
        } catch (error) {
            console.error("Failed to fetch audit events", error);
            return [];
        }
    }, [getAuthHeader]);

    const createAuditEvent = useCallback(async (config: any) => {
        setIsSaving(true);
        try {
            const event = await api.createAuditEvent(getAuthHeader(), config);
            toast('Audit Event Started!', 'success');
            return event;
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to create event", "error");
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const closeAuditEvent = useCallback(async (eventId: string) => {
        setIsSaving(true);
        try {
            await api.closeAuditEvent(getAuthHeader(), eventId);
            toast('Audit Event Closed.', 'success');
        } catch (error) {
            toast("Failed to close event", "error");
            throw error; 
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const reopenAuditEvent = useCallback(async (eventId: string) => {
        setIsSaving(true);
        try {
            await api.reopenAuditEvent(getAuthHeader(), eventId);
        } catch (error) {
            toast("Failed to reopen event", "error");
            throw error; 
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const deleteAuditEvent = useCallback(async (eventId: string, forceDelete: boolean) => {
        setIsSaving(true);
        try {
            await api.deleteAuditEvent(getAuthHeader(), eventId, forceDelete);
            toast('Audit Event deleted successfully', 'success');
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to delete event", "error");
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [getAuthHeader]);

    const fetchEventWorklist = useCallback(async (eventId: string) => {
        try {
            return await api.getEventWorklist(getAuthHeader(), eventId);
        } catch (error) {
            console.error("Failed to fetch worklist", error);
            return [];
        }
    }, [getAuthHeader]);

    const saveAuditRecord = useCallback(async (record: any) => {
        try {
            await api.saveAuditRecord(getAuthHeader(), record);
        } catch (error) {
            console.error("Failed to save record", error);
            toast("Failed to save check. Please retry.", "error");
        }
    }, [getAuthHeader]);

    return {
        items,
        standards,
        loading,
        isSaving,
        fetchItems,
        fetchStandards,
        createItem,
        updateItem,
        deleteItem,
        createStandard,
        updateStandard,
        deleteStandard,
        fetchExpectedInventory,
        submitAudit,
        fetchAuditEvents,
        createAuditEvent,
        closeAuditEvent,
        reopenAuditEvent,
        deleteAuditEvent,
        fetchEventWorklist,
        saveAuditRecord
    };
};