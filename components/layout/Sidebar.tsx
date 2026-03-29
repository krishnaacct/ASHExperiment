import React, { useMemo, useState, useEffect } from 'react';
import { AppModuleConfig } from '../../types';
import { ShieldCheck, ChevronDown } from 'lucide-react';
import { ICONS } from '../dashboard/modules';
import { useData } from '../../hooks/useData';

interface SidebarProps {
    isSidebarOpen: boolean;
    setSidebarOpen: (isOpen: boolean) => void;
    isMobile: boolean;
    activeModuleId: string;
    onModuleSelect: (id: string) => void;
    accessibleModules: AppModuleConfig[];
}

interface NavItem extends AppModuleConfig {
    children: NavItem[];
}

const buildNavTree = (modules: AppModuleConfig[]): NavItem[] => {
    const tree: NavItem[] = [];
    const map = new Map<string, NavItem>();
    
    modules.forEach(mod => map.set(mod.moduleId, { ...mod, children: [] }));
    
    modules.forEach(mod => {
        if (mod.parentModuleId && map.has(mod.parentModuleId)) {
            map.get(mod.parentModuleId)?.children.push(map.get(mod.moduleId)!);
        } else {
            tree.push(map.get(mod.moduleId)!);
        }
    });
    
    const sortByOrder = (a: NavItem, b: NavItem) => a.sortOrder - b.sortOrder;
    tree.sort(sortByOrder);
    tree.forEach(node => {
        if (node.children.length > 0) {
            node.children.sort(sortByOrder);
        }
    });

    return tree;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, setSidebarOpen, isMobile, activeModuleId, onModuleSelect, accessibleModules }) => {
    const { settings } = useData();
    const navTree = useMemo(() => buildNavTree(accessibleModules), [accessibleModules]);
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
    const [logoError, setLogoError] = useState(false);

    const { appName, appIcon, appIconUrl } = useMemo(() => {
        const name = settings.find(s => s.settingName === 'appName')?.settingValue || 'Care Portal';
        const iconName = settings.find(s => s.settingName === 'appIcon')?.settingValue || 'ShieldCheck';
        // Default to relative path if no setting exists
        const url = settings.find(s => s.settingName === 'appIconUrl')?.settingValue || './logo192.png';
        const iconComponent = ICONS[iconName] || <ShieldCheck />;
        return { appName: name, appIcon: iconComponent, appIconUrl: url };
    }, [settings]);

    useEffect(() => {
        setLogoError(false); // Reset error state when URL changes
    }, [appIconUrl]);

    useEffect(() => {
        const activeModule = accessibleModules.find(m => m.moduleId === activeModuleId);
        if (activeModule?.parentModuleId) {
            setOpenCategories(prev => new Set(prev).add(activeModule.parentModuleId!));
        }
    }, [activeModuleId, accessibleModules]);

    const toggleCategory = (categoryId: string) => {
        setOpenCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    const handleNavigation = (id: string) => {
        onModuleSelect(id); // Use the new handler
        if (isMobile) {
            setSidebarOpen(false);
        }
    };
    
    const NavItemLink: React.FC<{ item: NavItem }> = ({ item }) => (
         <button
            onClick={() => handleNavigation(item.moduleId)}
            className={`relative flex items-center w-full px-3 py-2.5 text-left rounded-lg transition-colors duration-200 ${isSidebarOpen ? '' : 'justify-center'} ${
                activeModuleId === item.moduleId ? 'bg-[var(--sidebar-active-background)] text-[var(--sidebar-foreground)]' : 'text-[var(--sidebar-muted-foreground)] hover:bg-[var(--sidebar-hover-background)] hover:text-[var(--sidebar-foreground)]'
            }`}
            title={isSidebarOpen ? '' : item.displayName}
        >
            {activeModuleId === item.moduleId && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-[var(--primary-color)] rounded-r-full"></span>
            )}
            {/* FIX: Cast ICONS[item.iconName] to React.ReactElement<any> to resolve property errors in cloneElement */}
            {ICONS[item.iconName] && React.cloneElement(ICONS[item.iconName] as React.ReactElement<any>, { className: `h-6 w-6 ${isSidebarOpen ? 'mr-3' : ''}` })}
            {isSidebarOpen && <span className="flex-1">{item.displayName}</span>}
        </button>
    );

    const sidebarContent = (
        <div 
            className={`bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)] flex flex-col transition-all duration-300 ease-in-out h-full ${isSidebarOpen ? 'w-64' : 'w-20'}`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="h-16 flex items-center justify-center font-bold border-b border-[var(--sidebar-border)] flex-shrink-0 px-4">
                 {appIconUrl && !logoError ? (
                    <img 
                        src={appIconUrl} 
                        alt="App Logo" 
                        className={`h-8 w-8 object-contain transition-all duration-300 ${isSidebarOpen ? 'mr-3' : 'mr-0'}`}
                        onError={() => setLogoError(true)}
                    />
                 ) : (
                    /* CAST: Cast appIcon to React.ReactElement<any> to resolve property errors in cloneElement */
                    React.cloneElement(appIcon as React.ReactElement<any>, { className: `text-[var(--primary-color)] transition-all duration-300 h-8 w-8 ${isSidebarOpen ? 'mr-3' : 'mr-0'}` })
                 )}
                 {isSidebarOpen && <span className="text-xl truncate">{appName}</span>}
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navTree.map((item) => {
                    if (item.moduleType === 'CATEGORY' && item.children.length > 0) {
                        const isOpen = openCategories.has(item.moduleId);
                        return (
                            <div key={item.moduleId}>
                                {isSidebarOpen ? (
                                    <>
                                        <button onClick={() => toggleCategory(item.moduleId)} className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-[var(--sidebar-muted-foreground)] uppercase tracking-wider hover:bg-[var(--sidebar-hover-background)] rounded-lg">
                                            <span>{item.displayName}</span>
                                            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isOpen && (
                                            <div className="pl-3 mt-1 space-y-1">
                                                {item.children.map(child => <NavItemLink key={child.moduleId} item={child} />)}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                     <>
                                        <div className="my-2 border-t border-[var(--sidebar-border)]"></div>
                                        {item.children.map(child => <NavItemLink key={child.moduleId} item={child} />)}
                                     </>
                                )}
                            </div>
                        )
                    }
                    if (item.moduleType === 'MODULE') {
                        return <NavItemLink key={item.moduleId} item={item} />
                    }
                    return null;
                })}
            </nav>
        </div>
    );

    if (isMobile) {
        return (
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarOpen(false)}
            >
                <div className={`fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    {sidebarContent}
                </div>
            </div>
        );
    }

    return sidebarContent;
};

export default Sidebar;