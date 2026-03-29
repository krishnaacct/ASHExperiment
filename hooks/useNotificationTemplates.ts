import { useState, useCallback } from 'react';
import { MessageTemplate, NotificationRecipient } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './useAuth';

export const useNotificationTemplates = () => {
    const { user: currentUser } = useAuth();
    const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
    const [notificationRecipients, setNotificationRecipients] = useState<NotificationRecipient[]>([]);
    const [loading, setLoading] = useState(false);

    const getAuthHeader = useCallback(() => {
        if (!currentUser?.sessionId) throw new Error("Not authenticated");
        return currentUser.sessionId;
    }, [currentUser]);

    const fetchMessageTemplates = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const fetchedTemplates = await api.getMessageTemplates(getAuthHeader());
            setMessageTemplates(fetchedTemplates);
        } catch (error) {
            console.error("Failed to fetch message templates:", error);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getAuthHeader]);

    const fetchNotificationRecipients = useCallback(async () => {
        if (!currentUser) return;
        // This can load in parallel without its own loading flag
        try {
            const fetchedRecipients = await api.getNotificationRecipients(getAuthHeader());
            setNotificationRecipients(fetchedRecipients);
        } catch (error) {
            console.error("Failed to fetch notification recipients:", error);
        }
    }, [currentUser, getAuthHeader]);

    const updateSingleMessageTemplate = useCallback(async (template: MessageTemplate) => {
        await api.updateSingleMessageTemplate(getAuthHeader(), template);
        // Optimistically update local state for a faster UI response
        setMessageTemplates(prev => prev.map(t => t.templateId === template.templateId ? template : t));
    }, [getAuthHeader]);

    const sendPreviewNotification = useCallback(async (templateId: string) => {
        await api.sendPreviewNotification(getAuthHeader(), templateId);
    }, [getAuthHeader]);

    const queueManualNotification = useCallback(async (templateId: string, recipientIds: string[]) => {
        await api.queueManualNotification(getAuthHeader(), templateId, recipientIds);
    }, [getAuthHeader]);

    return {
        messageTemplates,
        notificationRecipients,
        loading,
        fetchMessageTemplates,
        fetchNotificationRecipients,
        updateSingleMessageTemplate,
        sendPreviewNotification,
        queueManualNotification,
    };
};