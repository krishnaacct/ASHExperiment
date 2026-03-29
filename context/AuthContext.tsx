
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session, Permission } from '../types';
import * as api from '../services/apiService';
import { toast } from '../components/ui/Toast';

interface AuthContextType {
    user: Session | null;
    loading: boolean;
    login: (mobileNumber: string, otp: string) => Promise<void>;
    logout: () => void;
    hasPermission: (permission: Permission) => boolean;
    requestOtp: (mobileNumber: string) => Promise<boolean>;
    refreshSessionData: () => Promise<void>;
    isRefreshing: boolean;
    // New function to allow partial updates to the session
    updateSession: (updatedData: Partial<Session>) => void;
    // V3.1 Permission Simulation
    isSimulating: boolean;
    simulatePermissions: (permissions: Permission[]) => void;
    resetPermissions: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [simulatedPermissions, setSimulatedPermissions] = useState<Permission[] | null>(null);

    useEffect(() => {
        const storedSession = localStorage.getItem('session');
        if (storedSession) {
            try {
                const session: Session = JSON.parse(storedSession);
                setUser(session);
            } catch (error) {
                console.error("Failed to parse session from localStorage", error);
                localStorage.removeItem('session');
            }
        }
        setLoading(false);
    }, []);

    const logout = useCallback(() => {
        if (user) {
            api.logout(user.sessionId).catch(console.error);
        }
        setUser(null);
        setSimulatedPermissions(null); // Ensure simulation is cleared on logout
        localStorage.removeItem('session');
    }, [user]);

    // --- SESSION EXPIRY INTERCEPTOR ---
    useEffect(() => {
        const handleSessionExpired = () => {
            if (user) {
                // Clear state immediately
                setUser(null);
                setSimulatedPermissions(null);
                localStorage.removeItem('session');
                // Show user-facing feedback
                toast('Your session has expired. Please log in again.', 'error');
            }
        };

        window.addEventListener('session-expired', handleSessionExpired);
        return () => window.removeEventListener('session-expired', handleSessionExpired);
    }, [user]);

    // --- PROACTIVE EXPIRY CHECK ---
    useEffect(() => {
        const checkExpiry = () => {
            if (user && user.expirationTimestamp) {
                const expiryTime = new Date(user.expirationTimestamp).getTime();
                const now = new Date().getTime();
                
                // Add a small buffer (e.g., 5 seconds) to be safe
                if (now > expiryTime - 5000) {
                     window.dispatchEvent(new Event('session-expired'));
                }
            }
        };

        // Check when window gains focus (e.g. returning to tab or unlocking phone)
        window.addEventListener('focus', checkExpiry);
        
        // Also check immediately if user changes (e.g. on mount/login)
        checkExpiry();

        return () => window.removeEventListener('focus', checkExpiry);
    }, [user]);


    const requestOtp = async (mobileNumber: string): Promise<boolean> => {
        try {
            await api.requestOtp(mobileNumber);
            return true;
        } catch (error) {
            console.error(error);
            // Re-throw the error so the UI can display the specific message from backend
            throw error;
        }
    };

    const login = async (mobileNumber: string, otp: string) => {
        try {
            const session = await api.verifyOtp(mobileNumber, otp);
            setUser(session);
            localStorage.setItem('session', JSON.stringify(session));
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const refreshSessionData = useCallback(async () => {
        if (!user) return;
        setIsRefreshing(true);
        try {
            const { appModules, permissions } = await api.getAppConfiguration(user.sessionId);
            const updatedUser = { ...user, appModules, permissions };
            setUser(updatedUser);
            localStorage.setItem('session', JSON.stringify(updatedUser));
            toast('Session data refreshed!', 'success');
        } catch (error) {
            console.error("Failed to refresh session data:", error);
            toast('Failed to refresh configuration.', 'error');
        } finally {
            setIsRefreshing(false);
        }
    }, [user]);

    const updateSession = (updatedData: Partial<Session>) => {
        if (!user) return;
        const newSession = { ...user, ...updatedData };
        setUser(newSession);
        localStorage.setItem('session', JSON.stringify(newSession));
    };

    const hasPermission = useCallback((permission: Permission): boolean => {
        // If simulation is active, check against the simulated permissions list.
        if (simulatedPermissions) {
            return simulatedPermissions.includes(permission);
        }
        // V.Final Fix: Explicitly check if `user.permissions` is an array before calling .includes()
        // This is more robust than optional chaining if the value could be something other than an array or undefined (like null).
        return Array.isArray(user?.permissions) && user.permissions.includes(permission);
    }, [user, simulatedPermissions]);

    const simulatePermissions = (permissions: Permission[]) => {
        setSimulatedPermissions(permissions);
        toast('Permission simulation started.', 'info');
    };

    const resetPermissions = () => {
        setSimulatedPermissions(null);
        toast('Permission simulation ended.', 'success');
    };

    const value = { 
        user, 
        loading, 
        login, 
        logout, 
        hasPermission, 
        requestOtp, 
        refreshSessionData, 
        isRefreshing,
        updateSession,
        isSimulating: simulatedPermissions !== null,
        simulatePermissions,
        resetPermissions,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
