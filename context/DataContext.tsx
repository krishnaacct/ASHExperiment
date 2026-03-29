

import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { User, Setting, MessageTemplate, Permission, SuperMasterRecord, NotificationRecipient, MasterDataItem, SearchResults, AppModuleConfig, KeyMetrics, ActivityLog, RoomDashboardData } from '../types';
import * as api from '../services/apiService';
import { useAuth } from '../hooks/useAuth';
import { applyTheme } from '../utils/theme';

interface DataContextType {
    settings: Setting[];
    superMasterRecord: SuperMasterRecord[];
    mastersData: MasterDataItem[];
    loading: boolean;
    fetchSettings: () => Promise<void>;
    fetchSuperMasterRecord: () => Promise<void>;
    forceSMRRefetch: () => void;
    fetchMasterData: () => Promise<void>;
    forceMasterDataRefetch: () => void;
    sendTemplatedNotification: (templateId: string, data: Record<string, string>, recipientUserIds: string[], moduleName?: string | null) => Promise<void>;
    // Global Search
    isSearchOpen: boolean;
    openSearch: () => void;
    closeSearch: () => void;
    performSearch: (term: string) => Promise<void>;
    clearSearch: () => void;
    searchResults: SearchResults | null;
    searchLoading: boolean;
    // App Configuration (Admin)
    allAppModules: AppModuleConfig[];
    fetchAllAppModules: () => Promise<void>;
    updateAllAppModules: (modules: AppModuleConfig[]) => Promise<void>;
    // V4.0 Dashboard Widgets
    keyMetrics: KeyMetrics | null;
    recentActivity: ActivityLog[];
    fetchKeyMetrics: () => Promise<void>;
    fetchRecentActivity: () => Promise<void>;
    // New for Admin Refresh
    allMasterDataItems: MasterDataItem[];
    fetchAllMasterDataItems: () => Promise<void>;
    // GLOBAL ROOM BACKBONE
    globalRoomData: RoomDashboardData | null;
    isRoomDataLoading: boolean;
    fetchGlobalRoomData: (buildingId?: string | null) => Promise<void>;
    setGlobalRoomData: (data: RoomDashboardData) => void;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, refreshSessionData } = useAuth();
    const [settings, setSettings] = useState<Setting[]>([]);
    const [superMasterRecord, setSuperMasterRecord] = useState<SuperMasterRecord[]>([]);
    const [mastersData, setMastersData] = useState<MasterDataItem[]>([]);
    const [allAppModules, setAllAppModules] = useState<AppModuleConfig[]>([]);
    const [allMasterDataItems, setAllMasterDataItems] = useState<MasterDataItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Global Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

    // V4.0 Dashboard State
    const [keyMetrics, setKeyMetrics] = useState<KeyMetrics | null>(null);
    const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

    // Global Room Backbone
    const [globalRoomData, setGlobalRoomDataState] = useState<RoomDashboardData | null>(null);
    const [isRoomDataLoading, setIsRoomDataLoading] = useState(false);

    const getAuthHeader = () => {
      if (!user?.sessionId) throw new Error("Not authenticated");
      return user.sessionId;
    }

    const fetchGlobalRoomData = useCallback(async (buildingId: string | null = null) => {
        if (!user) return;
        setIsRoomDataLoading(true);
        try {
            const result = await api.getRoomDashboardData(getAuthHeader(), buildingId);
            setGlobalRoomDataState(result);
        } catch (error) {
            console.error("Failed to fetch global room data:", error);
        } finally {
            setIsRoomDataLoading(false);
        }
    }, [user]);

    const setGlobalRoomData = useCallback((data: RoomDashboardData) => {
        setGlobalRoomDataState(data);
    }, []);

    const fetchSettings = useCallback(async () => {
        if (!user) return;
        try {
            const fetchedSettings = await api.getSettings(getAuthHeader());
            setSettings(fetchedSettings);

            const primaryColorSetting = fetchedSettings.find(s => s.settingName === 'primaryColor');
            const primaryColor = primaryColorSetting?.settingValue || '#3b82f6';
            applyTheme(primaryColor);
            localStorage.setItem('primaryColor', primaryColor);
            
        } catch (error) {
            console.error("Failed to fetch settings:", error);
        }
    }, [user]);
    
    const fetchSuperMasterRecord = useCallback(async () => {
        if (!user || superMasterRecord.length > 0) return; // Idempotent check
        setLoading(true);
        try {
            const fetchedSmr = await api.getSuperMasterRecord(getAuthHeader());
            setSuperMasterRecord(fetchedSmr);
        } catch (error) {
            console.error("Failed to fetch SMR:", error);
        } finally {
            setLoading(false);
        }
    }, [user, superMasterRecord]);

    const forceSMRRefetch = useCallback(() => {
        setSuperMasterRecord([]);
    }, []);

    const fetchMasterData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const fetchedMasters = await api.getMasterData(getAuthHeader());
            setMastersData(fetchedMasters);
        } catch (error) {
            console.error("Failed to fetch master data:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const forceMasterDataRefetch = useCallback(async () => {
        if (!user) return;
        setMastersData([]); // Clear existing data
        await fetchMasterData(); // Fetch fresh data
    }, [user, fetchMasterData]);

    const sendTemplatedNotification = async (templateId: string, data: Record<string, string>, recipientUserIds: string[], moduleName: string | null = null) => {
        if (!user) throw new Error("Cannot send notification without a logged-in user session.");
        await api.sendTemplatedNotification(getAuthHeader(), templateId, data, recipientUserIds, user, moduleName);
    };

    // --- Global Search Functions ---
    const openSearch = useCallback(() => setIsSearchOpen(true), []);
    const closeSearch = useCallback(() => setIsSearchOpen(false), []);
    const clearSearch = useCallback(() => {
        setSearchResults(null);
        closeSearch();
    }, [closeSearch]);
    
    const performSearch = async (term: string) => {
        if (term.length < 3) {
            setSearchResults(null);
            return;
        }
        setSearchLoading(true);
        try {
            const results = await api.globalSearch(getAuthHeader(), term);
            setSearchResults(results);
        } catch (error) {
            console.error("Search failed:", error);
            setSearchResults({}); // Set to empty object on error
        } finally {
            setSearchLoading(false);
        }
    };
    
    // --- App Configuration Functions (Admin) ---
    const fetchAllAppModules = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const fetchedModules = await api.getAllAppModules(getAuthHeader());
            setAllAppModules(fetchedModules);
        } catch (error) {
            console.error("Failed to fetch all app modules:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const fetchAllMasterDataItems = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const fetchedMasters = await api.getAllMasterDataItems(getAuthHeader());
            setAllMasterDataItems(fetchedMasters);
        } catch (error) {
            console.error("Failed to fetch all master data items:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const updateAllAppModules = async (modules: AppModuleConfig[]) => {
        await api.updateAppModules(getAuthHeader(), modules);
        await fetchAllAppModules();
        await refreshSessionData();
    };

    // --- V4.0 Dashboard Widget Functions ---
    const fetchKeyMetrics = useCallback(async () => {
        if (!user) return;
        try {
            const metrics = await api.getKeyMetrics(getAuthHeader());
            setKeyMetrics(metrics);
        } catch (error) {
            console.error("Failed to fetch key metrics:", error);
        }
    }, [user]);

    const fetchRecentActivity = useCallback(async () => {
        if (!user) return;
        try {
            const activity = await api.getRecentActivity(getAuthHeader());
            setRecentActivity(activity);
        } catch (error) {
            console.error("Failed to fetch recent activity:", error);
        }
    }, [user]);


    useEffect(() => {
        if (user) {
            // Fetch foundational data. SMR is now fetched on-demand by components that need it.
            fetchSettings();
            fetchMasterData();
        } else {
            // Clear all data on logout
            setSettings([]);
            setSuperMasterRecord([]);
            setMastersData([]);
            setAllAppModules([]);
            setAllMasterDataItems([]);
            setKeyMetrics(null);
            setRecentActivity([]);
            setGlobalRoomDataState(null);
            clearSearch();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, clearSearch]);

    const value = {
        settings,
        superMasterRecord,
        mastersData,
        loading,
        fetchSettings,
        fetchSuperMasterRecord,
        forceSMRRefetch,
        fetchMasterData,
        forceMasterDataRefetch,
        sendTemplatedNotification,
        isSearchOpen,
        openSearch,
        closeSearch,
        performSearch,
        clearSearch,
        searchResults,
        searchLoading,
        allAppModules,
        fetchAllAppModules,
        updateAllAppModules,
        keyMetrics,
        recentActivity,
        fetchKeyMetrics,
        fetchRecentActivity,
        allMasterDataItems,
        fetchAllMasterDataItems,
        globalRoomData,
        isRoomDataLoading,
        fetchGlobalRoomData,
        setGlobalRoomData
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};