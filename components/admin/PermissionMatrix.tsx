
import React, { useState, useMemo } from 'react';
import { usePermissionMatrix } from '../../hooks/usePermissionMatrix';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox';
import { Save, RotateCcw, Minus, Plus, Square, CheckSquare } from 'lucide-react';
import { SurfaceLoader } from '../common/SurfaceLoader';
import { PermissionDefinition } from '../../types';
import { useAuth } from '../../hooks/useAuth';

// Helper to generate short codes
const getShortCode = (permName: string) => {
    if (permName.endsWith('_view')) return 'Vw';
    if (permName.endsWith('_edit')) return 'Ed';
    if (permName.endsWith('_add')) return 'Ad';
    if (permName.endsWith('_delete')) return 'Dl';
    if (permName.endsWith('_allot')) return 'Al';
    if (permName.endsWith('_vacate')) return 'Vc';
    if (permName.endsWith('_move')) return 'Mv';
    if (permName.endsWith('_reserve')) return 'Rs';
    
    // Fallback: take first 2 letters of last segment
    const parts = permName.split('_');
    const last = parts[parts.length - 1];
    return last.substring(0, 2).toUpperCase().charAt(0) + last.substring(1, 2);
};

// Suffix for filtering
const getSuffix = (permName: string) => {
    const parts = permName.split('_');
    return parts.length > 1 ? parts[parts.length - 1] : 'other';
};

const PermissionMatrix: React.FC = () => {
    const { 
        matrixData, localPermissions, pendingChanges, loading, isSaving, 
        togglePermission, saveChanges, resetChanges, setBatchPermissions, setBatchUserPermissions 
    } = usePermissionMatrix();
    const { hasPermission } = useAuth();
    const canEdit = hasPermission('permissions_edit');

    const [userFilter, setUserFilter] = useState<string[]>([]);
    const [actionFilter, setActionFilter] = useState<string[]>([]);
    const [moduleFilter, setModuleFilter] = useState<string[]>([]); 
    const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

    // --- Derived Data ---
    const users = useMemo(() => {
        if (!matrixData) return [];
        let list = matrixData.users;
        if (userFilter.length > 0) {
            list = list.filter(u => userFilter.includes(u.userId));
        }
        return list.sort((a,b) => a.name.localeCompare(b.name));
    }, [matrixData, userFilter]);

    // Compute all available modules for the filter dropdown
    const availableModules = useMemo(() => {
        if (!matrixData) return [];
        const mods = new Set(matrixData.permissions.map(p => p.category || 'Other'));
        return Array.from(mods).sort().map(m => ({ value: m, label: m }));
    }, [matrixData]);

    const groupedPermissions = useMemo(() => {
        if (!matrixData) return {};
        const groups: Record<string, PermissionDefinition[]> = {};
        
        matrixData.permissions.forEach(p => {
            const cat = p.category || 'Other';

            // Apply Module Filter
            if (moduleFilter.length > 0 && !moduleFilter.includes(cat)) {
                return;
            }

            // Apply Action Filter
            if (actionFilter.length > 0) {
                const suffix = getSuffix(p.permissionName);
                if (!actionFilter.includes(suffix)) return;
            }

            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });
        
        return groups;
    }, [matrixData, actionFilter, moduleFilter]);

    // Safely get module names that actually have visible permissions
    const moduleNames = useMemo(() => Object.keys(groupedPermissions).sort(), [groupedPermissions]);

    // --- Handlers ---
    const toggleModuleCollapse = (moduleName: string) => {
        setCollapsedModules(prev => {
            // FIX: Use `new Set(prev)` instead of `{...prev}` to correctly clone a Set
            const next = new Set(prev);
            if (next.has(moduleName)) next.delete(moduleName);
            else next.add(moduleName);
            return next;
        });
    };
    
    const toggleColumn = (perm: PermissionDefinition) => {
        if (!canEdit) return;
        // Check state of visible users
        const allChecked = users.every(u => (localPermissions[u.userId] || []).includes(perm.permissionName));
        setBatchPermissions(users.map(u => u.userId), perm.permissionName, !allChecked);
    };

    const toggleRow = (userId: string) => {
         if (!canEdit) return;
         // Toggle all VISIBLE permissions for this user
         const visiblePerms = (Object.values(groupedPermissions).flat() as PermissionDefinition[]).map(p => p.permissionName);
         const userPerms = localPermissions[userId] || [];
         
         const allVisibleChecked = visiblePerms.every(p => userPerms.includes(p));
         setBatchUserPermissions(userId, visiblePerms, !allVisibleChecked);
    };


    // --- Options for Filters ---
    const userOptions = useMemo(() => (matrixData?.users || []).map(u => ({ value: u.userId, label: u.name })), [matrixData]);
    const actionOptions = useMemo(() => {
        if (!matrixData) return [];
        const suffixes = new Set(matrixData.permissions.map(p => getSuffix(p.permissionName)));
        return Array.from(suffixes).map((s: any) => {
            const str = String(s);
            return { value: str, label: str.charAt(0).toUpperCase() + str.slice(1) };
        });
    }, [matrixData]);

    if (loading && !matrixData) return <SurfaceLoader label="Loading Matrix..." />;

    return (
        <div className="flex flex-col h-full space-y-4">
             <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Permission Matrix</h1>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-xs text-[var(--foreground-muted)]">
                    <div className="flex items-center"><span className="font-bold mr-1">Vw:</span>View</div>
                    <div className="flex items-center"><span className="font-bold mr-1">Ed:</span>Edit</div>
                    <div className="flex items-center"><span className="font-bold mr-1">Ad:</span>Add</div>
                    <div className="flex items-center"><span className="font-bold mr-1">Dl:</span>Delete</div>
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden relative">
                 {/* Filters */}
                <div className="p-4 border-b border-[var(--border)] flex flex-wrap gap-4 bg-[var(--card-inset-background)]">
                    <div className="w-64">
                         <MultiSelectCombobox 
                            label="Filter Users" 
                            options={userOptions} 
                            selectedValues={userFilter} 
                            onChange={setUserFilter}
                            placeholder="All Users"
                        />
                    </div>
                    <div className="w-64">
                        <MultiSelectCombobox 
                            label="Filter Modules" 
                            options={availableModules} 
                            selectedValues={moduleFilter} 
                            onChange={setModuleFilter}
                            placeholder="All Modules"
                        />
                    </div>
                    <div className="w-64">
                         <MultiSelectCombobox 
                            label="Filter Actions" 
                            options={actionOptions} 
                            selectedValues={actionFilter} 
                            onChange={setActionFilter}
                            placeholder="All Actions"
                        />
                    </div>
                </div>

                {/* Matrix Container */}
                <div className="flex-1 overflow-auto">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-[var(--card-background)] sticky top-0 z-20 shadow-sm">
                            {/* Row 1: Modules */}
                            <tr>
                                <th className="sticky left-0 z-30 bg-[var(--card-background)] border-b border-r border-[var(--border)] p-2 min-w-[200px] text-left">
                                    <span className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider">User / Module</span>
                                </th>
                                {moduleNames.map(modName => {
                                    const perms = groupedPermissions[modName] || [];
                                    if (perms.length === 0) return null;

                                    const isCollapsed = collapsedModules.has(modName);
                                    const colSpan = isCollapsed ? 1 : perms.length;
                                    
                                    return (
                                        <th 
                                            key={modName} 
                                            colSpan={colSpan}
                                            className={`border-b border-r border-[var(--border)] p-1 text-center bg-[var(--card-inset-background)] ${isCollapsed ? 'w-8 min-w-[2rem] max-w-[2rem]' : ''}`}
                                            title={modName}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => toggleModuleCollapse(modName)} className="p-0.5 hover:bg-black/10 rounded">
                                                    {isCollapsed ? <Plus size={12} /> : <Minus size={12} />}
                                                </button>
                                                {!isCollapsed && <span className="text-xs font-bold text-[var(--foreground)] whitespace-nowrap">{modName}</span>}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                            {/* Row 2: Short Codes */}
                            <tr>
                                <th className="sticky left-0 z-30 bg-[var(--card-background)] border-b border-r border-[var(--border)] p-2 text-left bg-[var(--card-inset-background)]">
                                     <span className="text-xs italic text-[var(--foreground-muted)]">Click name to select row</span>
                                </th>
                                {moduleNames.map(modName => {
                                    const perms = groupedPermissions[modName] || [];
                                    if (perms.length === 0) return null;

                                    const isCollapsed = collapsedModules.has(modName);

                                    // FIX: Minimized placeholder cell for collapsed headers
                                    if (isCollapsed) {
                                        return <th key={`${modName}-collapsed`} className="border-b border-r border-[var(--border)] p-1 w-8 bg-gray-100 dark:bg-slate-800"></th>;
                                    }

                                    return perms.map(p => (
                                        <th 
                                            key={p.permissionId} 
                                            className="border-b border-r border-[var(--border)] p-1 w-10 text-center cursor-pointer hover:bg-[var(--list-item-hover-background)] group relative"
                                            onClick={() => toggleColumn(p)}
                                            title={p.description}
                                        >
                                            <span className="text-xs font-mono font-bold text-[var(--foreground-muted)] group-hover:text-[var(--primary-color)]">
                                                {getShortCode(p.permissionName)}
                                            </span>
                                        </th>
                                    ));
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {users.map(u => (
                                <tr key={u.userId} className="hover:bg-[var(--list-item-hover-background)]">
                                    {/* User Name Cell */}
                                    <td 
                                        className="sticky left-0 z-10 bg-[var(--card-background)] border-r border-[var(--border)] p-2 cursor-pointer group"
                                        onClick={() => toggleRow(u.userId)}
                                    >
                                        <div className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary-color)] truncate max-w-[200px]">{u.name}</div>
                                        <div className="text-[10px] text-[var(--foreground-muted)] truncate">{u.roleLabel}</div>
                                    </td>
                                    
                                    {/* Permission Cells */}
                                    {moduleNames.map(modName => {
                                        const perms = groupedPermissions[modName] || [];
                                        if (perms.length === 0) return null;

                                        const isCollapsed = collapsedModules.has(modName);

                                        // FIX: Minimized placeholder cell for collapsed content
                                        if (isCollapsed) {
                                             return <td key={`${u.userId}-${modName}-collapsed`} className="border-r border-[var(--border)] bg-gray-50/50 dark:bg-slate-800/50 w-8"></td>;
                                        }

                                        return perms.map(p => {
                                            const isChecked = (localPermissions[u.userId] || []).includes(p.permissionName);
                                            const isChanged = pendingChanges.has(`${u.userId}::${p.permissionName}`);
                                            
                                            // FIX: Using Icon instead of Checkbox component to ensure 0 ghosting
                                            return (
                                                <td 
                                                    key={`${u.userId}-${p.permissionId}`} 
                                                    className={`border-r border-[var(--border)] p-1 text-center cursor-pointer hover:bg-[var(--accent-background)] transition-colors ${isChanged ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                                                    onClick={() => canEdit && togglePermission(u.userId, p.permissionName)}
                                                >
                                                    <div className="flex justify-center">
                                                        {isChecked ? (
                                                            <CheckSquare 
                                                                size={18} 
                                                                className={canEdit ? "text-[var(--primary-color)]" : "text-gray-400"} 
                                                                strokeWidth={2.5}
                                                            />
                                                        ) : (
                                                            <Square 
                                                                size={18} 
                                                                className="text-gray-300 dark:text-gray-600" 
                                                                strokeWidth={1.5} 
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        });
                                    })}
                                </tr>
                            ))}
                             {users.length === 0 && (
                                <tr><td colSpan={100} className="p-8 text-center text-gray-400">No users match the filter.</td></tr>
                             )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Action Footer */}
            {pendingChanges.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[var(--popover-background)] border border-[var(--border)] shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4">
                    <span className="text-sm font-bold text-[var(--foreground)]">{pendingChanges.size} Unsaved Changes</span>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <Button variant="secondary" size="sm" onClick={resetChanges} disabled={isSaving}>
                        <RotateCcw size={16} className="mr-2" /> Reset
                    </Button>
                    <Button variant="primary" size="sm" onClick={saveChanges} isLoading={isSaving}>
                        <Save size={16} className="mr-2" /> Save Changes
                    </Button>
                </div>
            )}
        </div>
    );
};

export default PermissionMatrix;
