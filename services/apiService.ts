
import { User, Session, Setting, MessageTemplate, Permission, SuperMasterRecord, NotificationRecipient, MasterDataItem, SearchResults, AppModuleConfig, KeyMetrics, ActivityLog, PermissionDefinition, Person, RoomDashboardData, Allotment, Reservation, Flat, Room, Bed, AuditRecord, AIResult, LogicOutcome, BatchResult, PhysioSession, PhysioQueueItem, PhysioRegisterData, PhysioAnalyticsData, VitalsRecord, VitalsQueueItem, VitalsReportData, PermissionMatrixData, PermissionChange, VitalsAnalyticsResponse, InventoryItem, RoomStandard, InventoryAuditEvent, InventoryAuditRecord } from '../types';

// ============================================================================
// API CONFIGURATION
// ============================================================================

// 1. PRODUCTION URL (Live App)
const PROD_URL = import.meta.env.VITE_GAS_PROD_URL || '';

// 2. STAGING URL (Development App)
const STAGING_URL = import.meta.env.VITE_GAS_STAGING_URL || ''; 

const getBackendUrl = () => {
    const hostname = window.location.hostname;
    
    // AI Studio Preview environments should use STAGING URL
    if (hostname.startsWith('ais-dev-') || hostname.startsWith('ais-pre-')) {
        console.log(`[API] Detected AI Studio Preview Environment (${hostname}). Using STAGING URL.`);
        return STAGING_URL;
    }

    if (hostname.endsWith('run.app') || hostname.endsWith('firebaseapp.com') || hostname.endsWith('web.app')) {
        console.log(`[API] Detected Production Environment (${hostname}). Using PROD URL.`);
        return PROD_URL;
    }
    console.log(`[API] Detected Development Environment (${hostname}). Using STAGING URL.`);
    return STAGING_URL;
};

const GAS_WEB_APP_URL = getBackendUrl();

// ============================================================================

const READ_ONLY_ACTIONS = new Set([
    'getPublicBranding',
    'getUsers',
    'getAllUsers',
    'getSettings',
    'getMessageTemplates',
    'getUserPermissions',
    'getPermissionsForUsers',
    'getAllUserPermissionsMatrix',
    'getPermissionDefinitions',
    'getSuperMasterRecord',
    'getMasterData',
    'getAllMasterDataItems',
    'getNotificationRecipients',
    'globalSearch',
    'getAppConfiguration',
    'getAllAppModules',
    'getKeyMetrics',
    'getRecentActivity',
    'findUserPage',
    'validateSmrUniqueness',
    'getPeople',
    'getAllPeople',
    'getUnassignedPeople',
    'findPersonPage',
    'getRoomDashboardData',
    'getFlats',
    'getRooms',
    'getBeds',
    'getAuditWorklist',
    'getBatchCandidates',
    'getAIACConfig',
    'getReportData',
    'getAccountSubmissionSettings',
    'getAccountSubmissionStats',
    'getAccountSubmissionRecords',
    'getAllAccountSubmissions',
    'getVouchingStatsSettings',
    'getVouchingOwnershipMaps',
    'getAuditSettings',
    'getPhysioWorklist',
    'getPhysioLastSession',
    'getPhysioRegister',
    'getPhysioAnalytics',
    'getVitalsWorklist',
    'getVitalsLastSession',
    'getVitalsReports',
    'getVitalsAnalytics',
    'getPatientVitalsHistory',
    'getInventoryItems',
    'getRoomStandards',
    'getRoomExpectedInventory',
    'getAuditEvents',
    'getEventWorklist',
    'getDataSources',
    'getDataSourceSchema',
    'getSavedReports',
    'executeSavedReport'
]);

async function callApi<T>(action: string, payload: object = {}, sessionId: string | null = null): Promise<T> {
    const isReadOnly = READ_ONLY_ACTIONS.has(action);
    const method = isReadOnly ? 'GET' : 'POST';
    
    let url = GAS_WEB_APP_URL;
    const fetchOptions: RequestInit = {
        method,
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-store',
    };

    if (isReadOnly) {
        const params = new URLSearchParams();
        if (sessionId) params.append('sessionId', sessionId);
        params.append('action', action);
        for (const key in payload) {
            if (Object.prototype.hasOwnProperty.call(payload, key)) {
                if ((payload as any)[key] !== null && (payload as any)[key] !== undefined) {
                    params.append(key, (payload as any)[key]);
                }
            }
        }
        url += `?${params.toString()}`;
    } else {
        if (sessionId) {
            url += `?sessionId=${sessionId}`;
        }
        fetchOptions.headers = {
             'Content-Type': 'text/plain;charset=utf-8',
        };
        fetchOptions.body = JSON.stringify({ action, ...payload });
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        let errorText = 'An unknown API error occurred.';
        try {
            const text = await response.text();
            const errorJson = JSON.parse(text);
            if (errorJson && errorJson.error) {
                errorText = errorJson.error;
            } else {
                 errorText = text || `API request failed with status ${response.status}`;
            }
        } catch (e) {
            errorText = `API request failed with status ${response.status}`;
        }
        if (errorText.includes('Authentication failed') || errorText.includes('Invalid or expired session')) {
             window.dispatchEvent(new Event('session-expired'));
        }
        throw new Error(errorText);
    }
    
    const result = await response.json();
    if (result && result.error) {
        if (result.error.includes('Authentication failed') || result.error.includes('Invalid or expired session')) {
             window.dispatchEvent(new Event('session-expired'));
        }
        throw new Error(result.error);
    }
    return result as T;
}

export const getPublicBranding = (): Promise<{ appName: string, appTagline: string, appIcon: string, appIconUrl: string, primaryColor: string }> => {
    return callApi('getPublicBranding', {}, null);
};

export const requestOtp = (mobileNumber: string): Promise<{ success: boolean }> => {
    return callApi('requestOtp', { mobileNumber });
};

export const verifyOtp = (mobileNumber: string, otp: string): Promise<Session> => {
    return callApi('verifyOtp', { mobileNumber, otp });
};

export const logout = (sessionId: string): Promise<void> => {
    return callApi('logout', {}, sessionId);
};

export const getUsers = (sessionId: string, page: number, pageSize: number): Promise<{ users: User[], total: number }> => {
    return callApi('getUsers', { page, pageSize }, sessionId);
};

export const getAllUsers = (sessionId: string): Promise<User[]> => {
    return callApi('getAllUsers', {}, sessionId);
};

export const createUser = (sessionId: string, newUser: Partial<User>): Promise<User> => {
    return callApi('createUser', { newUser }, sessionId);
};

export const updateUser = (sessionId: string, updatedUser: User): Promise<User> => {
    return callApi('updateUser', { updatedUser }, sessionId);
};

export const updateMyProfile = (sessionId: string, profileData: Partial<User>): Promise<void> => {
    return callApi('updateMyProfile', { profileData }, sessionId);
};

export const deleteUser = (sessionId: string, userId: string): Promise<void> => {
    return callApi('deleteUser', { userId }, sessionId);
};

export const getSettings = (sessionId: string): Promise<Setting[]> => {
    return callApi('getSettings', {}, sessionId);
};

export const updateSettings = (sessionId: string, newSettings: Setting[]): Promise<void> => {
    return callApi('updateSettings', { newSettings }, sessionId);
};

export const getMessageTemplates = (sessionId: string): Promise<MessageTemplate[]> => {
    return callApi('getMessageTemplates', {}, sessionId);
};

export const updateMessageTemplates = (sessionId: string, newTemplates: MessageTemplate[]): Promise<void> => {
    return callApi('updateMessageTemplates', { newTemplates }, sessionId);
};

export const sendTemplatedNotification = (sessionId: string, templateId: string, data: Record<string, string>, recipientUserIds: string[], adminUser: Session, moduleName: string | null = null): Promise<void> => {
    return callApi('sendTemplatedNotification', { templateId, data, recipientUserIds, adminUser, moduleName }, sessionId);
}

export const getUserPermissions = (sessionId: string, userId: string): Promise<Permission[]> => {
    return callApi('getUserPermissions', { userId }, sessionId);
};

export const getPermissionsForUsers = (sessionId: string, userIds: string[]): Promise<Record<string, Permission[]>> => {
    return callApi('getPermissionsForUsers', { userIds: userIds.join(',') }, sessionId);
};

export const getAllUserPermissionsMatrix = (sessionId: string): Promise<PermissionMatrixData> => {
    return callApi('getAllUserPermissionsMatrix', {}, sessionId);
};

export const getPermissionDefinitions = (sessionId: string): Promise<PermissionDefinition[]> => {
    return callApi('getPermissionDefinitions', {}, sessionId);
};

export const updateUserPermissions = (sessionId: string, userId: string, permissions: Permission[]): Promise<void> => {
    return callApi('updateUserPermissions', { userId, permissions }, sessionId);
};

export const bulkUpdatePermissionsMatrix = (sessionId: string, changes: PermissionChange[]): Promise<void> => {
    return callApi('bulkUpdatePermissionsMatrix', { changes }, sessionId);
};

export const getSuperMasterRecord = (sessionId: string): Promise<SuperMasterRecord[]> => {
    return callApi('getSuperMasterRecord', {}, sessionId);
};

export const getMasterData = (sessionId: string): Promise<MasterDataItem[]> => {
    return callApi('getMasterData', {}, sessionId);
}

export const getAllMasterDataItems = (sessionId: string): Promise<MasterDataItem[]> => {
    return callApi('getAllMasterDataItems', {}, sessionId);
};

export const getNotificationRecipients = (sessionId: string): Promise<NotificationRecipient[]> => {
    return callApi('getNotificationRecipients', {}, sessionId);
};

export const updateSingleMessageTemplate = (sessionId: string, template: MessageTemplate): Promise<void> => {
    return callApi('updateSingleMessageTemplate', { template }, sessionId);
};

export const sendPreviewNotification = (sessionId: string, templateId: string): Promise<void> => {
    return callApi('sendPreviewNotification', { templateId }, sessionId);
};

export const queueManualNotification = (sessionId: string, templateId: string, recipientIds: string[]): Promise<void> => {
    return callApi('queueManualNotification', { templateId, recipientIds }, sessionId);
};

export const testTelegramGroup = (sessionId: string, groupId: string): Promise<{ success: boolean; error?: string }> => {
    return callApi('testTelegramGroup', { groupId }, sessionId);
};

export const globalSearch = (sessionId: string, searchTerm: string): Promise<SearchResults> => {
    return callApi('globalSearch', { searchTerm }, sessionId);
};

export const getAppConfiguration = (sessionId: string): Promise<{ appModules: AppModuleConfig[], permissions: Permission[] }> => {
    return callApi('getAppConfiguration', {}, sessionId);
};

export const getAllAppModules = (sessionId: string): Promise<AppModuleConfig[]> => {
    return callApi('getAllAppModules', {}, sessionId);
};

export const updateAppModules = (sessionId: string, modules: AppModuleConfig[]): Promise<{ success: boolean }> => {
    return callApi('updateAppModules', { modules }, sessionId);
};

export const getKeyMetrics = (sessionId: string): Promise<KeyMetrics> => {
    return callApi('getKeyMetrics', {}, sessionId);
};

export const getRecentActivity = (sessionId: string): Promise<ActivityLog[]> => {
    return callApi('getRecentActivity', {}, sessionId);
};

export const findUserPage = (sessionId: string, userId: string, pageSize: number): Promise<{ page: number }> => {
    return callApi('findUserPage', { userId, pageSize }, sessionId);
};

export const validateSmrUniqueness = (sessionId: string, property: 'fieldId' | 'fieldName', value: string, currentFieldId: string | null): Promise<{ isUnique: boolean; message?: string }> => {
    return callApi('validateSmrUniqueness', { property, value, currentFieldId: currentFieldId || '' }, sessionId);
};

export const createSmrField = (sessionId: string, newField: Omit<SuperMasterRecord, 'fieldId'>): Promise<SuperMasterRecord> => {
    return callApi('createSmrField', { newField }, sessionId);
};

export const updateSmrField = (sessionId: string, updatedField: SuperMasterRecord): Promise<SuperMasterRecord> => {
    return callApi('updateSmrField', { updatedField }, sessionId);
};

export const deleteSmrField = (sessionId: string, fieldId: string): Promise<{ success: boolean }> => {
    return callApi('deleteSmrField', { fieldId }, sessionId);
};

export const createMasterDataItem = (sessionId: string, newItem: Omit<MasterDataItem, 'masterId'>): Promise<MasterDataItem> => {
    return callApi('createMasterDataItem', { newItem }, sessionId);
};

export const updateMasterDataItem = (sessionId: string, updatedItem: MasterDataItem): Promise<MasterDataItem> => {
    return callApi('updateMasterDataItem', { updatedItem }, sessionId);
};

export const deleteMasterDataItem = (sessionId: string, masterId: string): Promise<{ success: boolean }> => {
    return callApi('deleteMasterDataItem', { masterId }, sessionId);
};

export const getPeople = (sessionId: string, page: number, pageSize: number): Promise<{ people: Person[], total: number }> => {
    return callApi('getPeople', { page, pageSize }, sessionId);
};

export const getAllPeople = (sessionId: string): Promise<Person[]> => {
    return callApi('getAllPeople', {}, sessionId);
};

export const getUnassignedPeople = (sessionId: string): Promise<Person[]> => {
    return callApi('getUnassignedPeople', {}, sessionId);
};

export const createPerson = (sessionId: string, newPerson: Partial<Person>): Promise<Person> => {
    return callApi('createPerson', { newPerson }, sessionId);
};

export const updatePerson = (sessionId: string, updatedPerson: Person): Promise<Person> => {
    return callApi('updatePerson', { updatedPerson }, sessionId);
};

export const deletePerson = (sessionId: string, personId: string): Promise<void> => {
    return callApi('deletePerson', { personId }, sessionId);
};

export const findPersonPage = (sessionId: string, personId: string, pageSize: number): Promise<{ page: number }> => {
    return callApi('findPersonPage', { personId, pageSize }, sessionId);
};

export const bulkUpdatePeople = (sessionId: string, personIds: string[], fieldName: string, value: any): Promise<{ success: boolean, count: number }> => {
    return callApi('bulkUpdatePeople', { personIds, fieldName, value }, sessionId);
};

export const getRoomDashboardData = (sessionId: string, buildingId: string | null = null): Promise<RoomDashboardData> => {
    return callApi('getRoomDashboardData', { buildingId }, sessionId);
};

export const createAllotment = (sessionId: string, allotmentData: Partial<Allotment>): Promise<void> => {
    return callApi('createAllotment', { allotmentData }, sessionId);
};

export const vacateAllotment = (sessionId: string, allotmentId: string, vacateDate: string): Promise<void> => {
    return callApi('vacateAllotment', { allotmentId, vacateDate }, sessionId);
};

export const createReservation = (sessionId: string, reservationData: Partial<Reservation>): Promise<void> => {
    return callApi('createReservation', { reservationData }, sessionId);
};

export const cancelReservation = (sessionId: string, reservationId: string): Promise<void> => {
    return callApi('cancelReservation', { reservationId }, sessionId);
};

export const getFlats = (sessionId: string): Promise<Flat[]> => {
    return callApi('getFlats', {}, sessionId);
};

export const createFlat = (sessionId: string, flatData: Partial<Flat>): Promise<Flat> => {
    return callApi('createFlat', { flatData }, sessionId);
};

export const updateFlat = (sessionId: string, flatData: Flat): Promise<Flat> => {
    return callApi('updateFlat', { flatData }, sessionId);
};

export const deleteFlat = (sessionId: string, flatId: string): Promise<void> => {
    return callApi('deleteFlat', { flatId }, sessionId);
};

export const getRooms = (sessionId: string): Promise<Room[]> => {
    return callApi('getRooms', {}, sessionId);
};

export const createRoom = (sessionId: string, roomData: Partial<Room>): Promise<Room> => {
    return callApi('createRoom', { roomData }, sessionId);
};

export const updateRoom = (sessionId: string, roomData: Room): Promise<Room> => {
    return callApi('updateRoom', { roomData }, sessionId);
};

export const deleteRoom = (sessionId: string, roomId: string): Promise<void> => {
    return callApi('deleteRoom', { roomId }, sessionId);
};

export const getBeds = (sessionId: string): Promise<Bed[]> => {
    return callApi('getBeds', {}, sessionId);
};

export const createBed = (sessionId: string, bedData: Partial<Bed>): Promise<Bed> => {
    return callApi('createBed', { bedData }, sessionId);
};

export const updateBed = (sessionId: string, bedData: Bed): Promise<Bed> => {
    return callApi('updateBed', { bedData }, sessionId);
};

export const deleteBed = (sessionId: string, bedId: string): Promise<void> => {
    return callApi('deleteBed', { bedId }, sessionId);
};

export const toggleMaintenance = (sessionId: string, type: 'Room' | 'Bed', id: string, status: boolean): Promise<void> => {
    return callApi('toggleMaintenance', { type, id, status }, sessionId);
};

export const getAIACConfig = (sessionId: string): Promise<{ worklist: AuditRecord[], failureReasons: MasterDataItem[] }> => {
    return callApi('getAIACConfig', {}, sessionId);
};

export const processDocument = (sessionId: string, recId: string): Promise<{ success: boolean, aiResult: AIResult, logicOutcome: LogicOutcome }> => {
    return callApi('processDocument', { recId }, sessionId);
};

export const recalculateLogic = (sessionId: string, recId: string): Promise<{ success: boolean, logicOutcome: LogicOutcome }> => {
    return callApi('recalculateLogic', { recId }, sessionId);
};

export const saveExaminerVerdict = (sessionId: string, verdictData: { recId: string, docName: string, verdictStatus: string, examinerJson: AIResult, examinerRemarks: string }): Promise<void> => {
    return callApi('saveExaminerVerdict', { verdictData }, sessionId);
};

export const getBatchCandidates = (sessionId: string, limit: number, statuses: string): Promise<string[]> => {
    return callApi('getBatchCandidates', { limit, mode: statuses }, sessionId);
};

export const processBatch = (sessionId: string, recIds: string[]): Promise<BatchResult[]> => {
    return callApi('processBatch', { recIds }, sessionId);
};

export const sanitizeBatch = (sessionId: string, recIds: string[]): Promise<BatchResult[]> => {
    return callApi('sanitizeBatch', { recIds }, sessionId);
};

export const getReportData = (sessionId: string, reportType: string, eventIds?: string[]): Promise<any> => {
    return callApi('getReportData', { reportType, eventIds: eventIds?.join(',') }, sessionId);
};

export const getAccountSubmissionSettings = (sessionId: string): Promise<any> => {
    return callApi('getAccountSubmissionSettings', {}, sessionId);
};

export const syncAccountSubmissions = (sessionId: string): Promise<{ success: boolean, message: string, synced: boolean }> => {
    return callApi('syncAccountSubmissions', {}, sessionId);
};

export const updateAccountSubmissionSettings = (sessionId: string, settings: any): Promise<{ success: boolean }> => {
    return callApi('updateAccountSubmissionSettings', { settings }, sessionId);
};

export const getAccountSubmissionStats = (sessionId: string): Promise<{ totalUnits: number, completedMonths: string[], monthCounts: Record<string, { submitted: number, pending: number }> }> => {
    return callApi('getAccountSubmissionStats', {}, sessionId);
};

export const getAccountSubmissionRecords = (sessionId: string, page: number, pageSize: number, month: string, statusFilter: string): Promise<{ records: any[], total: number }> => {
    return callApi('getAccountSubmissionRecords', { page, pageSize, month, statusFilter }, sessionId);
};

export const getAllAccountSubmissions = (sessionId: string): Promise<any[]> => {
    return callApi('getAllAccountSubmissions', {}, sessionId);
};

export const triggerAutoSyncCheck = (sessionId: string): Promise<{ success: boolean, message: string }> => {
    return callApi('triggerAutoSyncCheck', {}, sessionId);
};

// --- NEW: Vouching Stats Actions ---
export const getVouchingStatsSettings = (sessionId: string): Promise<any> => {
    return callApi('getVouchingStatsSettings', {}, sessionId);
};

export const syncVouchingStats = (sessionId: string): Promise<{ success: boolean, message: string, synced: boolean }> => {
    return callApi('syncVouchingStats', {}, sessionId);
};

export const updateVouchingStatsSettings = (sessionId: string, settings: any): Promise<{ success: boolean }> => {
    return callApi('updateVouchingStatsSettings', { settings }, sessionId);
};

export const triggerVouchingAutoSyncCheck = (sessionId: string): Promise<{ success: boolean, message: string }> => {
    return callApi('triggerVouchingAutoSyncCheck', {}, sessionId);
};

export const getVouchingOwnershipMaps = (sessionId: string): Promise<any[]> => {
    return callApi('getVouchingOwnershipMaps', {}, sessionId);
};

export const saveVouchingOwnershipMap = (sessionId: string, mapData: any): Promise<any> => {
    return callApi('saveVouchingOwnershipMap', { mapData }, sessionId);
};

export const deleteVouchingOwnershipMap = (sessionId: string, mapId: string): Promise<{ success: boolean, message: string }> => {
    return callApi('deleteVouchingOwnershipMap', { mapId }, sessionId);
};

export const getAuditSettings = (sessionId: string): Promise<any> => {
    return callApi('getAuditSettings', {}, sessionId);
};

export const syncAuditData = (sessionId: string): Promise<{ success: boolean, message: string, synced: boolean }> => {
    return callApi('syncAuditData', {}, sessionId);
};

export const updateAuditSettings = (sessionId: string, settings: any): Promise<{ success: boolean }> => {
    return callApi('updateAuditSettings', { settings }, sessionId);
};

export const getPhysioWorklist = (sessionId: string): Promise<PhysioQueueItem[]> => {
    return callApi('getPhysioWorklist', {}, sessionId);
};

export const getPhysioLastSession = (sessionId: string, personId: string): Promise<Partial<PhysioSession>> => {
    return callApi('getPhysioLastSession', { personId }, sessionId);
};

export const logPhysioSession = (sessionId: string, sessionData: Partial<PhysioSession>): Promise<void> => {
    return callApi('logPhysioSession', { sessionData }, sessionId);
};

export const deletePhysioSession = (sessionId: string, physioSessionId: string): Promise<void> => {
    return callApi('deletePhysioSession', { physioSessionId }, sessionId);
}

export const getPhysioRegister = (sessionId: string, period: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'All'): Promise<PhysioRegisterData> => {
    return callApi('getPhysioRegister', { period }, sessionId);
};

export const getPhysioAnalytics = (sessionId: string, month: number, year: number): Promise<PhysioAnalyticsData> => {
    return callApi('getPhysioAnalytics', { month, year }, sessionId);
};

export const getVitalsWorklist = (sessionId: string): Promise<VitalsQueueItem[]> => {
    return callApi('getVitalsWorklist', {}, sessionId);
};

export const getVitalsLastSession = (sessionId: string, personId: string): Promise<Partial<VitalsRecord>> => {
    return callApi('getVitalsLastSession', { personId }, sessionId);
};

export const logVitalsSession = (sessionId: string, vitalsData: Partial<VitalsRecord>): Promise<void> => {
    return callApi('logVitalsSession', { vitalsData }, sessionId);
};

export const deleteVitalsSession = (sessionId: string, vitalsId: string): Promise<void> => {
    return callApi('deleteVitalsSession', { vitalsId }, sessionId);
};

export const getVitalsReports = (sessionId: string, period: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'All'): Promise<VitalsReportData> => {
    return callApi('getVitalsReports', { period }, sessionId);
};

export const getVitalsAnalytics = (sessionId: string, filters: any): Promise<VitalsAnalyticsResponse> => {
    return callApi('getVitalsAnalytics', { filters: JSON.stringify(filters) }, sessionId);
};

export const getPatientVitalsHistory = (sessionId: string, personId: string): Promise<VitalsRecord[]> => {
    return callApi('getPatientVitalsHistory', { personId }, sessionId);
};

export const getInventoryItems = (sessionId: string): Promise<InventoryItem[]> => {
    return callApi('getInventoryItems', {}, sessionId);
};

export const createInventoryItem = (sessionId: string, item: Partial<InventoryItem>): Promise<InventoryItem> => {
    return callApi('createInventoryItem', { item }, sessionId);
};

export const updateInventoryItem = (sessionId: string, item: InventoryItem): Promise<InventoryItem> => {
    return callApi('updateInventoryItem', { item }, sessionId);
};

export const deleteInventoryItem = (sessionId: string, itemId: string): Promise<void> => {
    return callApi('deleteInventoryItem', { itemId }, sessionId);
};

export const getRoomStandards = (sessionId: string): Promise<RoomStandard[]> => {
    return callApi('getRoomStandards', {}, sessionId);
};

export const createRoomStandard = (sessionId: string, standard: Partial<RoomStandard>): Promise<RoomStandard> => {
    return callApi('createRoomStandard', { standard }, sessionId);
};

export const updateRoomStandard = (sessionId: string, standard: RoomStandard): Promise<RoomStandard> => {
    return callApi('updateRoomStandard', { standard }, sessionId);
};

export const deleteRoomStandard = (sessionId: string, standardId: string): Promise<void> => {
    return callApi('deleteRoomStandard', { standardId }, sessionId);
};

export const getRoomExpectedInventory = (sessionId: string, roomId: string): Promise<any[]> => {
    return callApi('getRoomExpectedInventory', { roomId }, sessionId);
};

export const submitRoomAudit = (sessionId: string, auditPayload: any): Promise<void> => {
    return callApi('submitRoomAudit', { auditPayload }, sessionId);
};

export const saveUserViewPreference = (sessionId: string, moduleId: string, config: any): Promise<{ success: boolean; viewPreferences: string }> => {
    return callApi('saveUserViewPreference', { moduleId, config }, sessionId);
};

export const getAuditEvents = (sessionId: string, status: string): Promise<InventoryAuditEvent[]> => {
    return callApi('getAuditEvents', { status }, sessionId);
};

export const createAuditEvent = (sessionId: string, config: any): Promise<InventoryAuditEvent> => {
    return callApi('createAuditEvent', { config }, sessionId);
};

export const closeAuditEvent = (sessionId: string, eventId: string): Promise<void> => {
    return callApi('closeAuditEvent', { eventId }, sessionId);
};

export const reopenAuditEvent = (sessionId: string, eventId: string): Promise<void> => {
    return callApi('reopenAuditEvent', { eventId }, sessionId);
};

// NEW: DELETE AUDIT EVENT
export const deleteAuditEvent = (sessionId: string, eventId: string, forceDelete: boolean): Promise<void> => {
    return callApi('deleteAuditEvent', { eventId, forceDelete }, sessionId);
};

export const getEventWorklist = (sessionId: string, eventId: string): Promise<InventoryAuditRecord[]> => {
    return callApi('getEventWorklist', { eventId }, sessionId);
};

export const saveAuditRecord = (sessionId: string, record: Partial<InventoryAuditRecord>): Promise<void> => {
    return callApi('saveAuditRecord', { record }, sessionId);
};

export const getDataSources = (sessionId: string): Promise<any[]> => {
    return callApi('getDataSources', {}, sessionId);
};

export const getDataSourceSchema = (sessionId: string, sourceId: string): Promise<any[]> => {
    return callApi('getDataSourceSchema', { sourceId }, sessionId);
};

export const createDataSource = (sessionId: string, newSource: any): Promise<any> => {
    return callApi('createDataSource', { newSource }, sessionId);
};

export const updateDataSource = (sessionId: string, updatedSource: any): Promise<any> => {
    return callApi('updateDataSource', { updatedSource }, sessionId);
};

export const deleteDataSource = (sessionId: string, sourceId: string): Promise<void> => {
    return callApi('deleteDataSource', { sourceId }, sessionId);
};

export const syncDataSource = (sessionId: string, sourceId: string): Promise<any> => {
    return callApi('syncDataSource', { sourceId }, sessionId);
};

export const saveDataSourceSchema = (sessionId: string, sourceId: string, schemaRows: any[]): Promise<any> => {
    return callApi('saveDataSourceSchema', { sourceId, schemaRows }, sessionId);
};

export const getSavedReports = (sessionId: string): Promise<any[]> => {
    return callApi('getSavedReports', {}, sessionId);
};

export const saveReportConfig = (sessionId: string, reportConfig: any): Promise<any> => {
    return callApi('saveReportConfig', { reportConfig }, sessionId);
};

export const deleteSavedReport = (sessionId: string, reportId: string): Promise<void> => {
    return callApi('deleteSavedReport', { reportId }, sessionId);
};

export const executeSavedReport = (sessionId: string, reportId: string, filters?: any[]): Promise<{ data: any[], config: any }> => {
    return callApi('executeSavedReport', { reportId, filters }, sessionId);
};

export const sendReportPdfToUser = (sessionId: string, reportId: string): Promise<{ success: boolean, message: string }> => {
    return callApi('sendReportPdfToUser', { reportId }, sessionId);
};
