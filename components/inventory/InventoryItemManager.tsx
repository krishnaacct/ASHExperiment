
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { useSMR } from '../../hooks/useSMR';
import { useAuth } from '../../hooks/useAuth';
import { InventoryItem } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, Edit, Trash2, Search, Layers, X, GripVertical, ArrowUpDown, ChevronDown, ChevronRight, RefreshCw, Maximize2, Minimize2, Save, Cloud, Download } from 'lucide-react';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { DynamicFormEngine } from '../common/DynamicFormEngine';
import { ConfirmModal } from '../ui/ConfirmModal';
import { SurfaceLoader } from '../common/SurfaceLoader';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox';
import { TableColumnFilter } from '../reports/TableColumnFilter';
import { saveUserViewPreference } from '../../services/apiService';
import { toast } from '../ui/Toast';

// --- Types & Interfaces ---

type SortCriterion = {
    key: string;
    direction: 'asc' | 'desc';
};

interface ViewConfig {
    sorts: SortCriterion[];
    groupBy: string[];
    visibleColumns: string[];
    expandedPaths: string[]; // Persist open groups
    columnWidths: Record<string, number>; // New: Store column widths
}

const InventoryItemManager: React.FC = () => {
    const { items, loading, fetchItems, createItem, updateItem, deleteItem, isSaving } = useInventory();
    const { superMasterRecord } = useSMR();
    const { hasPermission, user, updateSession } = useAuth();
    
    // --- State Management ---

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [formData, setFormData] = useState<Partial<InventoryItem>>({});
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
    
    const [isSavingView, setIsSavingView] = useState(false);
    
    // Filter State (Transient)
    const [filters, setFilters] = useState<Record<string, string[] | undefined>>({});

    // Resizing State
    const [resizingColumn, setResizingColumn] = useState<{ key: string; startX: number; startWidth: number } | null>(null);

    // View Configuration (Initialized from Cloud)
    const [viewConfig, setViewConfig] = useState<ViewConfig>(() => {
        try {
            if (user?.viewPreferences) {
                const prefs = JSON.parse(user.viewPreferences);
                if (prefs['inventory_manager']) {
                    // Merge with defaults to ensure new properties (like columnWidths) exist if loading old config
                    return { 
                        sorts: [], 
                        groupBy: [], 
                        visibleColumns: [], 
                        expandedPaths: [], 
                        columnWidths: {},
                        ...prefs['inventory_manager'] 
                    };
                }
            }
            return { sorts: [], groupBy: [], visibleColumns: [], expandedPaths: [], columnWidths: {} };
        } catch {
            return { sorts: [], groupBy: [], visibleColumns: [], expandedPaths: [], columnWidths: {} };
        }
    });

    const canEdit = hasPermission('inventory_items_edit');

    // --- Effects ---

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);
    
    // Resizing Logic Effect
    useEffect(() => {
        if (!resizingColumn) return;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.pageX - resizingColumn.startX;
            const newWidth = Math.max(80, resizingColumn.startWidth + delta); // Minimum width of 80px
            
            setViewConfig(prev => ({
                ...prev,
                columnWidths: {
                    ...prev.columnWidths,
                    [resizingColumn.key]: newWidth
                }
            }));
        };

        const handleMouseUp = () => {
            setResizingColumn(null);
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize'; // Force cursor during drag

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [resizingColumn]);

    // Check if a saved view exists in the user session
    const savedViewExists = useMemo(() => {
        try {
            if (user?.viewPreferences) {
                const prefs = JSON.parse(user.viewPreferences);
                return !!prefs['inventory_manager'];
            }
        } catch { return false; }
        return false;
    }, [user?.viewPreferences]);

    // Handle Cloud Save
    const handleSaveView = async () => {
        if (!user?.sessionId) return;
        setIsSavingView(true);
        try {
            const response = await saveUserViewPreference(user.sessionId, 'inventory_manager', viewConfig);
            if (response.success) {
                toast('View saved to cloud!', 'success');
                // Update local session so we don't revert on navigation
                updateSession({ viewPreferences: response.viewPreferences });
            }
        } catch (e) {
            toast('Failed to save view.', 'error');
        } finally {
            setIsSavingView(false);
        }
    };

    // Handle Load View
    const handleLoadView = () => {
        if (user?.viewPreferences) {
            try {
                const prefs = JSON.parse(user.viewPreferences);
                if (prefs['inventory_manager']) {
                    setViewConfig({ 
                        sorts: [], 
                        groupBy: [], 
                        visibleColumns: [], 
                        expandedPaths: [], 
                        columnWidths: {}, 
                        ...prefs['inventory_manager'] 
                    });
                    setFilters({}); // Clear transient filters to match strict saved view state
                    setSearchTerm('');
                    toast('Saved view loaded.', 'success');
                }
            } catch (e) {
                console.error(e);
                toast('Failed to load saved view.', 'error');
            }
        }
    };

    // --- Column Definitions ---

    const allColumns = useMemo(() => {
        const smrFields = superMasterRecord.filter(f => {
            try { return JSON.parse(f.modules).includes("InventoryMaster"); } catch { return false; }
        }).filter(f => !f.isPrimaryKey);

        return smrFields.map(f => ({
            key: f.fieldName,
            label: f.displayName,
            isSortable: true,
            isGroupable: ['lookup', 'boolean', 'text'].includes(f.dataType)
        }));
    }, [superMasterRecord]);

    // Initialize visible columns if empty
    useEffect(() => {
        if (viewConfig.visibleColumns.length === 0 && allColumns.length > 0) {
            const defaultCols = allColumns.map(c => c.key);
            setViewConfig(prev => ({ ...prev, visibleColumns: defaultCols }));
        }
    }, [allColumns.length, viewConfig.visibleColumns.length]);

    const visibleColumnDefs = useMemo(() => {
        return allColumns.filter(c => viewConfig.visibleColumns.includes(c.key));
    }, [allColumns, viewConfig.visibleColumns]);


    // --- Data Processing Pipeline ---

    const processedItems = useMemo(() => {
        let data = [...items];

        // 1. Global Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            data = data.filter(item => 
                Object.values(item).some(val => String(val).toLowerCase().includes(lower))
            );
        }

        // 2. Column Filters
        data = data.filter(item => {
            return Object.keys(filters).every(key => {
                const allowedValues = filters[key];
                if (!allowedValues) return true;
                const itemVal = item[key as keyof InventoryItem] === null || item[key as keyof InventoryItem] === undefined ? '' : String(item[key as keyof InventoryItem]);
                return allowedValues.includes(itemVal);
            });
        });

        // 3. Multi-Level Sort
        if (viewConfig.sorts.length > 0) {
            data.sort((a, b) => {
                for (const criterion of viewConfig.sorts) {
                    const aVal = String(a[criterion.key as keyof InventoryItem] || '');
                    const bVal = String(b[criterion.key as keyof InventoryItem] || '');
                    
                    const comparison = aVal.localeCompare(bVal, undefined, { numeric: true });
                    
                    if (comparison !== 0) {
                        return criterion.direction === 'asc' ? comparison : -comparison;
                    }
                }
                return 0;
            });
        } else {
             // Default fallback sort
             data.sort((a, b) => a.itemName.localeCompare(b.itemName));
        }

        return data;
    }, [items, searchTerm, filters, viewConfig.sorts]);


    // --- Handlers: View Manipulation ---

    const handleSort = (key: string) => {
        setViewConfig(prev => {
            const existingIdx = prev.sorts.findIndex(s => s.key === key);
            let newSorts = [...prev.sorts];
            
            if (existingIdx !== -1) {
                // Cycle: Asc -> Desc -> Remove
                if (newSorts[existingIdx].direction === 'asc') {
                    newSorts[existingIdx].direction = 'desc';
                } else {
                    newSorts.splice(existingIdx, 1);
                }
            } else {
                newSorts.push({ key, direction: 'asc' });
            }
            return { ...prev, sorts: newSorts };
        });
    };

    const handleFilterChange = (key: string, selectedValues: string[] | undefined) => {
        setFilters(prev => {
            const next = { ...prev };
            if (selectedValues === undefined) delete next[key];
            else next[key] = selectedValues;
            return next;
        });
    };

    const handleVisibleColumnsChange = (selected: string[]) => {
        if (selected.length > 0) {
            setViewConfig(prev => ({ ...prev, visibleColumns: selected }));
        }
    };

    const handleResizeStart = (e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        const currentWidth = viewConfig.columnWidths?.[key] || 200; // Default width
        setResizingColumn({ key, startX: e.pageX, startWidth: currentWidth });
    };

    // --- Handlers: Grouping & Expansion ---

    const handleColumnDragStart = (e: React.DragEvent, key: string) => {
        e.dataTransfer.setData("columnKey", key);
    };

    const handleGroupDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const key = e.dataTransfer.getData("columnKey");
        if (key && !viewConfig.groupBy.includes(key)) {
            setViewConfig(prev => ({ ...prev, groupBy: [...prev.groupBy, key] }));
        }
    };

    const removeGroup = (key: string) => {
        setViewConfig(prev => ({ ...prev, groupBy: prev.groupBy.filter(k => k !== key) }));
    };

    const togglePath = (path: string) => {
        setViewConfig(prev => {
            const next = new Set(prev.expandedPaths);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return { ...prev, expandedPaths: Array.from(next) };
        });
    };

    const expandAll = () => {
        if (viewConfig.groupBy.length === 0) return;
        
        const allPaths = new Set<string>();

        const recurse = (data: InventoryItem[], depth: number, parentPath: string) => {
            if (depth >= viewConfig.groupBy.length) return;
            
            const groupKey = viewConfig.groupBy[depth];
            const groups = data.reduce((acc, item) => {
                const val = String(item[groupKey as keyof InventoryItem] || 'Unknown');
                if (!acc[val]) acc[val] = [];
                acc[val].push(item);
                return acc;
            }, {} as Record<string, InventoryItem[]>);

            Object.entries(groups).forEach(([keyVal, groupItems]) => {
                const currentPath = parentPath ? `${parentPath}::${keyVal}` : keyVal;
                allPaths.add(currentPath);
                recurse(groupItems, depth + 1, currentPath);
            });
        };

        recurse(processedItems, 0, '');
        setViewConfig(prev => ({ ...prev, expandedPaths: Array.from(allPaths) }));
    };

    const collapseAll = () => {
        setViewConfig(prev => ({ ...prev, expandedPaths: [] }));
    };


    // --- Handlers: CRUD ---

    const openAddForm = () => {
        setEditingItem(null);
        setFormData({ isActive: true });
        setIsFormOpen(true);
    };

    const openEditForm = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData(item);
        setIsFormOpen(true);
    };

    const handleFormChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await updateItem(formData as InventoryItem);
            } else {
                await createItem(formData);
            }
            setIsFormOpen(false);
        } catch (error) {
             // Toast handled by hook
        }
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteItem(itemToDelete.itemId);
            setItemToDelete(null);
        } catch (error) {
             // Toast handled by hook
        }
    };

    // SMR Setup for Form
    const formFields = useMemo(() => {
        return superMasterRecord.filter(f => {
            try { return JSON.parse(f.modules).includes("InventoryMaster"); } catch { return false; }
        }).filter(f => !f.isPrimaryKey);
    }, [superMasterRecord]);
    
    const formFieldNames = formFields.map(f => f.fieldName);


    // --- Render Logic (Recursive) ---

    const renderRows = (data: InventoryItem[], depth: number, parentPath: string = '') => {
        // BASE CASE: Render Items
        if (depth >= viewConfig.groupBy.length) {
            return data.map((item) => (
                <tr key={item.itemId} className="hover:bg-[var(--list-item-hover-background)] border-b border-[var(--border)] group">
                    {visibleColumnDefs.map(col => {
                        const val = item[col.key as keyof InventoryItem];
                        return (
                            <td 
                                key={col.key} 
                                className="px-6 py-3 whitespace-nowrap text-sm text-[var(--foreground)]"
                                style={{ width: viewConfig.columnWidths[col.key] || 200 }} // Apply width to data cells too for consistency
                            >
                                {col.key === 'isActive' ? (
                                     <Badge variant={String(val).toLowerCase() === 'true' ? 'success' : 'secondary'}>
                                        {String(val).toLowerCase() === 'true' ? 'Active' : 'Inactive'}
                                    </Badge>
                                ) : (
                                    col.key === 'basis' ? <Badge variant="secondary">{String(val).replace(/_/g, ' ')}</Badge> : String(val)
                                )}
                            </td>
                        );
                    })}
                    {/* Action buttons always visible as requested */}
                    {canEdit && (
                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                                <button onClick={() => openEditForm(item)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 transition-colors">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => setItemToDelete(item)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </td>
                    )}
                </tr>
            ));
        }

        // RECURSIVE CASE: Render Group Header
        const groupKey = viewConfig.groupBy[depth];
        const colLabel = allColumns.find(c => c.key === groupKey)?.label || groupKey;
        
        const groups = data.reduce((acc, item) => {
            const val = String(item[groupKey as keyof InventoryItem] || 'Unknown');
            if (!acc[val]) acc[val] = [];
            acc[val].push(item);
            return acc;
        }, {} as Record<string, InventoryItem[]>);

        const sortedKeys = Object.keys(groups).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));

        return sortedKeys.map(keyVal => {
            const currentPath = parentPath ? `${parentPath}::${keyVal}` : keyVal;
            const isExpanded = viewConfig.expandedPaths.includes(currentPath);
            const indent = depth * 24;

            return (
                <React.Fragment key={currentPath}>
                    <tr 
                        className="bg-[var(--accent-background)] cursor-pointer hover:bg-[var(--list-item-hover-background)] border-b border-[var(--border)] transition-colors"
                        onClick={() => togglePath(currentPath)}
                    >
                         <td colSpan={visibleColumnDefs.length + (canEdit ? 1 : 0)} className="py-2.5 text-sm text-[var(--primary-color)] font-bold" style={{ paddingLeft: `${16 + indent}px` }}>
                             <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="w-4 h-4" strokeWidth={3} /> : <ChevronRight className="w-4 h-4" strokeWidth={3} />}
                                <span className="text-[var(--foreground-muted)] font-medium uppercase text-xs tracking-wider">{colLabel}:</span>
                                {keyVal.replace(/_/g, ' ')}
                                <Badge variant="primary" className="ml-2 text-[10px] h-5 px-1.5 rounded-md">{groups[keyVal].length}</Badge>
                            </div>
                        </td>
                    </tr>
                    {isExpanded && renderRows(groups[keyVal], depth + 1, currentPath)}
                </React.Fragment>
            );
        });
    };

    return (
        <div className="space-y-4">
            {/* --- Control Ribbon --- */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-[var(--card-background)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search..."
                            className="pl-9 h-10 text-sm"
                        />
                    </div>
                    {/* Column Chooser */}
                    <div className="w-48">
                         <MultiSelectCombobox 
                            label=""
                            options={allColumns.map(c => ({ value: c.key, label: c.label }))} 
                            selectedValues={viewConfig.visibleColumns} 
                            onChange={handleVisibleColumnsChange}
                            placeholder="Columns"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* View Controls */}
                    {viewConfig.groupBy.length > 0 && (
                        <div className="flex gap-1 mr-2 border-r border-[var(--border)] pr-3">
                            <Button variant="secondary" size="sm" onClick={expandAll} title="Expand All Groups">
                                <Maximize2 size={16} />
                            </Button>
                             <Button variant="secondary" size="sm" onClick={collapseAll} title="Collapse All Groups">
                                <Minimize2 size={16} />
                            </Button>
                        </div>
                    )}

                    <Button variant="secondary" size="sm" onClick={() => fetchItems()} isLoading={loading} title="Refresh Data">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    
                    {savedViewExists && (
                        <Button variant="secondary" size="sm" onClick={handleLoadView} title="Load saved view configuration">
                            <Download className="w-4 h-4 mr-2" /> Load Saved
                        </Button>
                    )}
                    
                    {(viewConfig.sorts.length > 0 || viewConfig.groupBy.length > 0 || searchTerm || Object.keys(viewConfig.columnWidths).length > 0) && (
                        <>
                            <Button variant="secondary" size="sm" onClick={handleSaveView} isLoading={isSavingView} title="Save current view to cloud">
                                <Cloud className="w-4 h-4 mr-2" /> Save View
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => {
                                setSearchTerm('');
                                setViewConfig({ sorts: [], groupBy: [], visibleColumns: viewConfig.visibleColumns, expandedPaths: [], columnWidths: {} });
                                setFilters({});
                            }} title="Reset View">
                                Reset
                            </Button>
                        </>
                    )}
                    
                    {canEdit && (
                        <Button onClick={openAddForm} size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    )}
                </div>
            </div>

            <Card className="relative overflow-hidden min-h-[400px] flex flex-col">
                {loading && <SurfaceLoader label="Loading Inventory..." />}
                
                {/* --- Group By Drop Zone --- */}
                <div 
                    className={`p-3 border-b border-[var(--border)] bg-[var(--card-inset-background)] flex flex-wrap items-center gap-2 min-h-[52px] transition-colors`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleGroupDrop}
                >
                    <Layers className="w-4 h-4 text-[var(--foreground-muted)]" />
                    <span className="text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest mr-2">Group By:</span>
                    
                    {viewConfig.groupBy.length === 0 && <span className="text-xs text-gray-400 italic">Drag column headers here to group</span>}
                    
                    {viewConfig.groupBy.map(key => (
                        <Badge key={key} variant="primary" className="pl-2 pr-1 py-1 flex items-center gap-1 cursor-default shadow-sm border border-blue-200 dark:border-blue-800">
                            {allColumns.find(c => c.key === key)?.label || key}
                            <button onClick={() => removeGroup(key)} className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"><X className="w-3 h-3" /></button>
                        </Badge>
                    ))}
                </div>

                <ScrollableTableContainer className="flex-grow">
                    <table className="min-w-full divide-y divide-[var(--border)]">
                        <thead className="bg-[var(--card-inset-background)] sticky top-0 z-10 shadow-sm">
                            <tr>
                                {visibleColumnDefs.map(col => {
                                    const sort = viewConfig.sorts.find(s => s.key === col.key);
                                    // Use stored width or default to 200
                                    const width = viewConfig.columnWidths[col.key] || 200;

                                    return (
                                        <th 
                                            key={col.key} 
                                            className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider whitespace-nowrap group cursor-grab active:cursor-grabbing border-b border-[var(--border)] select-none relative"
                                            draggable
                                            onDragStart={(e) => handleColumnDragStart(e, col.key)}
                                            style={{ width: width, minWidth: 80 }}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div 
                                                    className="flex items-center gap-1 hover:text-[var(--primary-color)] transition-colors cursor-pointer"
                                                    onClick={() => handleSort(col.key)}
                                                >
                                                    <GripVertical className="w-3 h-3 text-gray-300 mr-1 opacity-50 group-hover:opacity-100" />
                                                    {col.label}
                                                    {sort && (
                                                        <ArrowUpDown className={`w-3 h-3 ${sort.direction === 'asc' ? 'rotate-0' : 'rotate-180'} text-[var(--primary-color)] transition-transform`} />
                                                    )}
                                                </div>
                                                {/* FIX: Cast items to InventoryItem[] to resolve indexing errors */}
                                                <TableColumnFilter
                                                    columnKey={col.key}
                                                    data={items as InventoryItem[]}
                                                    currentFilter={filters[col.key]}
                                                    onFilterChange={handleFilterChange}
                                                />
                                            </div>
                                            {/* Resize Handle */}
                                            <div
                                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 z-20 transition-colors"
                                                onMouseDown={(e) => handleResizeStart(e, col.key)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </th>
                                    );
                                })}
                                {canEdit && <th className="px-6 py-3 text-right text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider border-b border-[var(--border)] w-[100px]">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--card-background)] divide-y divide-[var(--border)]">
                             {processedItems.length > 0 ? (
                                renderRows(processedItems, 0)
                             ) : (
                                <tr>
                                    <td colSpan={visibleColumnDefs.length + (canEdit ? 1 : 0)} className="px-6 py-12 text-center text-[var(--foreground-muted)]">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="w-8 h-8 opacity-20" />
                                            <p>No items found matching criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                </ScrollableTableContainer>
            </Card>

            {isFormOpen && (
                <Modal
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    title={editingItem ? `Edit Item` : 'Add Inventory Item'}
                >
                    <form onSubmit={handleSave} className="space-y-4">
                        <DynamicFormEngine 
                            moduleName="InventoryMaster"
                            fieldNames={formFieldNames}
                            formData={formData as Record<string, any>}
                            onFormChange={handleFormChange}
                            disabled={isSaving}
                            isEditing={!!editingItem}
                        />
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                            <Button type="submit" isLoading={isSaving}>Save</Button>
                        </div>
                    </form>
                </Modal>
            )}

            <ConfirmModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Item"
                message={`Are you sure you want to delete "${itemToDelete?.itemName}"? This will be blocked if it is used in any Room Standards.`}
                isLoading={isSaving}
                confirmText="Delete"
            />
        </div>
    );
};

export default InventoryItemManager;
