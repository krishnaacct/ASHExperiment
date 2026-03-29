import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Button } from '../ui/Button';
import { LogOut, Menu, X, Search, RefreshCw, AlertTriangle, Maximize, Minimize } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Badge } from '../ui/Badge';

interface HeaderProps {
    isMobile: boolean;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    moduleName: string;
    onProfileClick?: () => void;
    onFocusToggle?: () => void;
    isFocusMode?: boolean;
}

const IndianFlagIcon = () => (
    <svg width="24" height="16" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm shadow-sm">
        <rect width="18" height="4" fill="#FF9933"/>
        <rect y="4" width="18" height="4" fill="#FFFFFF"/>
        <rect y="8" width="18" height="4" fill="#138808"/>
        <circle cx="9" cy="6" r="1.2" stroke="#000080" strokeWidth="0.3"/>
        <path d="M9 4.8V7.2M7.8 6H10.2M8.15 5.15L9.85 6.85M8.15 6.85L9.85 5.15" stroke="#000080" strokeWidth="0.2"/>
    </svg>
);

const Header: React.FC<HeaderProps> = ({ isMobile, isSidebarOpen, toggleSidebar, moduleName, onProfileClick, onFocusToggle, isFocusMode }) => {
    const { user, logout, refreshSessionData, isRefreshing, isSimulating, resetPermissions, hasPermission } = useAuth();
    const { openSearch, fetchAllAppModules, fetchAllMasterDataItems } = useData();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Patriotic Days: Jan 26 (Republic Day) or Aug 15 (Independence Day)
    const isPatrioticDay = useMemo(() => {
        const now = new Date();
        const month = now.getMonth();
        const date = now.getDate();
        return (month === 0 && date === 26) || (month === 7 && date === 15);
    }, []);

    // Dynamic Top Strip Style with Travelling Glow Effect
    const topStripStyles: React.CSSProperties = useMemo(() => {
        if (isPatrioticDay) {
            // Hard-edged Tricolour Gradient with subtle gold/white glow (Static)
            return {
                background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%, #138808 100%)',
                boxShadow: '0 1px 8px rgba(255, 165, 0, 0.4)'
            };
        }

        // Travelling Glow Effect
        return {
            // 1. The "Base" Line: Solid color at 40% opacity (calculated via color-mix)
            backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 60%)', 
            
            // 2. The "Comet" Gradient: Transparent -> Solid Primary -> Transparent
            backgroundImage: 'linear-gradient(90deg, transparent 0%, var(--primary-color) 50%, transparent 100%)',
            
            // 3. Size: The comet is 50% the width of the screen, so it looks like a moving beam
            backgroundSize: '50% 100%',
            backgroundRepeat: 'no-repeat',
            
            // 4. Animation: Moves the background from left to right continuously
            animation: 'header-shine 3s linear infinite',
            
            // 5. Glow: A static glow around the whole strip
            boxShadow: '0 0 10px 0px var(--primary-color)'
        };
    }, [isPatrioticDay]);

    const handleLogout = () => {
        setIsLoggingOut(true);
        logout();
    };

    const handleRefresh = async () => {
        await refreshSessionData();
        if (hasPermission('app_config_edit')) {
            await fetchAllAppModules();
        }
        if (hasPermission('masters_edit')) {
            await fetchAllMasterDataItems();
        }
    };

    return (
        <>
        {/* Inject Keyframes for the travelling shine */}
        <style>{`
            @keyframes header-shine {
                0% { background-position: -50% 0; }
                100% { background-position: 150% 0; }
            }
        `}</style>

        {isSimulating && (
            <div className="bg-[var(--warning-banner-background)] text-[var(--warning-banner-foreground)] text-center py-2 px-4 font-semibold text-sm flex items-center justify-center sticky top-0 z-20 shadow-md">
                <AlertTriangle className="h-5 w-5 mr-2 animate-pulse" />
                <span>You are in Permission Simulation Mode.</span>
                <button onClick={resetPermissions} className="ml-4 font-black underline hover:text-[var(--warning-banner-foreground-hover)] decoration-2">
                    Exit Simulation
                </button>
            </div>
        )}
        
        <header className="flex-shrink-0 flex items-center justify-between p-4 bg-[var(--header-background)] backdrop-blur-md border-b border-[var(--border)] z-10 sticky top-0 shadow-sm">
            {/* Permanent Top Highlight Strip */}
            <div 
                className="absolute top-0 left-0 right-0 h-[2px] z-[60]" 
                style={topStripStyles}
            />

            <div className="flex items-center">
                 <Button 
                    variant="secondary" 
                    size="sm"
                    className="mr-3 p-0 h-10 w-10 border-[var(--border)] shadow-sm"
                    onClick={toggleSidebar}
                    aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    {isSidebarOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
                </Button>
                <div className="flex items-center">
                    <h1 className="text-xl font-black tracking-tight text-[var(--foreground)] hidden sm:block uppercase">{moduleName}</h1>
                    
                    {isPatrioticDay && (
                        <div className="ml-3 hidden md:flex items-center p-1 bg-white dark:bg-slate-800 rounded-md border border-[var(--border)] shadow-sm animate-pulse">
                            <IndianFlagIcon />
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
                 <Button onClick={openSearch} variant="secondary" size="sm" className="p-0 h-10 w-10 border-[var(--border)] shadow-sm" aria-label="Search">
                    <Search size={24} strokeWidth={2.5} />
                </Button>

                <Button 
                    onClick={onFocusToggle} 
                    variant="secondary" 
                    size="sm" 
                    className={`p-0 h-10 w-10 border-[var(--border)] shadow-sm transition-colors ${isFocusMode ? 'text-[var(--primary-color)] bg-[var(--accent-background)] border-[var(--primary-color)]/20' : ''}`} 
                    aria-label="Toggle Full Screen Focus"
                    title="Toggle Full Screen Focus"
                >
                    {isFocusMode ? <Minimize size={24} strokeWidth={2.5} /> : <Maximize size={24} strokeWidth={2.5} />}
                </Button>
                
                <button
                    onClick={onProfileClick}
                    disabled={!onProfileClick}
                    className="flex items-center space-x-3 rounded-xl p-1.5 -m-1.5 hover:bg-[var(--interactive-hover-background)] transition-all group"
                    aria-label="Open My Profile"
                >
                    <div className="text-right hidden lg:block">
                        <p className="font-black text-sm text-[var(--foreground)] group-hover:text-[var(--primary-color)] transition-colors uppercase tracking-tight leading-none">{user?.name}</p>
                        <p className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider mt-1">{user?.roleLabel}</p>
                    </div>
                    <div className="relative">
                        <div className={`bg-[var(--primary-color)] rounded-full w-10 h-10 flex items-center justify-center text-[var(--primary-foreground)] font-black ring-2 ring-white dark:ring-slate-800 shadow-md group-hover:ring-[var(--primary-color)] transition-all`}>
                            {user?.name?.charAt(0)}
                        </div>
                    </div>
                </button>

                <div className="w-px h-8 bg-[var(--border)] mx-1 hidden sm:block"></div>

                <ThemeToggle />
                
                <Button 
                    onClick={handleRefresh} 
                    variant="secondary" 
                    size="sm" 
                    className="p-0 h-10 w-10 border-[var(--border)] shadow-sm" 
                    aria-label="Refresh data" 
                    isLoading={isRefreshing}
                >
                    <RefreshCw size={24} strokeWidth={2.5} className={isRefreshing ? 'animate-spin' : ''} />
                </Button>
                
                <Button 
                    onClick={handleLogout} 
                    variant="secondary" 
                    size="sm" 
                    className="p-0 h-10 w-10 border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm" 
                    aria-label="Logout" 
                    isLoading={isLoggingOut}
                >
                    <LogOut size={24} strokeWidth={2.5} />
                </Button>
            </div>
        </header>
        </>
    );
};

export default Header;