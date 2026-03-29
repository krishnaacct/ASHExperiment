
import React, { useEffect, useState, useMemo } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { useSMR } from '../../hooks/useSMR';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { RoomStandard, InventoryItem } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, Edit, Trash2, Search, ChevronDown, ChevronRight, ArrowUpDown, Layers, RefreshCw, X, Info, HelpCircle, Printer, AlertTriangle } from 'lucide-react';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { DynamicFormEngine } from '../common/DynamicFormEngine';
import { ConfirmModal } from '../ui/ConfirmModal';
import { SurfaceLoader } from '../common/SurfaceLoader';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';
import { TableColumnFilter } from '../reports/TableColumnFilter';
import { toast } from '../ui/Toast';

type SortCriterion = {
    key: string;
    direction: 'asc' | 'desc';
};

const RoomStandardsManager: React.FC = () => {
    const { standards, items, loading, fetchStandards, fetchItems, createStandard, updateStandard, deleteStandard, isSaving } = useInventory();
    const { superMasterRecord } = useSMR();
    const { mastersData } = useData();
    const { hasPermission } = useAuth();
    
    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStandard, setEditingStandard] = useState<RoomStandard | null>(null);
    const [formData, setFormData] = useState<Partial<RoomStandard>>({});
    const [standardToDelete, setStandardToDelete] = useState<RoomStandard | null>(null);

    // List Control State
    const [isGrouped, setIsGrouped] = useState(true);
    const [sorts, setSorts] = useState<SortCriterion[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Residential'])); 
    
    // Column Filtering State
    const [columnFilters, setColumnFilters] = useState<Record<string, string[] | undefined>>({});

    const canEdit = hasPermission('room_standards_edit');

    useEffect(() => {
        fetchStandards();
        if (items.length === 0) fetchItems();
    }, [fetchStandards, fetchItems, items.length]);

    const itemOptions = useMemo(() => {
        return items
            .filter(i => String(i.isActive).toLowerCase() === 'true')
            .map(i => ({ value: i.itemId, label: i.itemName }))
            .sort((a,b) => a.label.localeCompare(b.label));
    }, [items]);

    const subTypeOptions = useMemo(() => {
        return mastersData
            .filter(m => m.masterName === 'RoomSubTypes' && m.isActive)
            .map(m => ({ value: String(m.value), label: m.label }))
            .sort((a,b) => a.label.localeCompare(b.label));
    }, [mastersData]);

    const itemMap = useMemo(() => new Map(items.map(i => [i.itemId, i])), [items]);
    const washroomTypeMap = useMemo(() => {
        const map = new Map<string, string>();
        mastersData.filter(m => m.masterName === 'WashroomTypes').forEach(m => map.set(String(m.value), m.label));
        return map;
    }, [mastersData]);
    const subTypeMap = useMemo(() => {
        const map = new Map<string, string>();
        subTypeOptions.forEach(m => map.set(m.value, m.label));
        return map;
    }, [subTypeOptions]);

    const requestSort = (key: string) => {
        setSorts(prev => {
            const existingIdx = prev.findIndex(s => s.key === key);
            let newSorts = [...prev];
            
            if (existingIdx !== -1) {
                // Cycle: Asc -> Desc -> Off
                if (newSorts[existingIdx].direction === 'asc') {
                    newSorts[existingIdx].direction = 'desc';
                } else {
                    newSorts.splice(existingIdx, 1);
                }
            } else {
                newSorts.push({ key, direction: 'asc' });
            }
            return newSorts;
        });
    };

    const handleFilterChange = (key: string, selectedValues: string[] | undefined) => {
        setColumnFilters(prev => {
            const next = { ...prev };
            if (selectedValues === undefined) delete next[key];
            else next[key] = selectedValues;
            return next;
        });
    };

    const processedStandards = useMemo(() => {
        let list = [...standards];
        
        // Enrich list with item names and CATEGORIES for filtering/sorting
        const enrichedList = list.map(std => {
            const item = itemMap.get(std.itemId);
            return {
                ...std,
                _itemName: item?.itemName || 'Unknown',
                _category: item?.category || 'Uncategorized',
                _basis: std.basis || item?.basis || 'Unspecified'
            };
        });

        let filtered = enrichedList;

        // 1. Global Search
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(std => {
                return std.roomType.toLowerCase().includes(lowerSearch) ||
                       std._itemName.toLowerCase().includes(lowerSearch) ||
                       std._category.toLowerCase().includes(lowerSearch);
            });
        }

        // 2. Column Filtering
        filtered = filtered.filter(std => {
            return Object.keys(columnFilters).every(key => {
                const allowedValues = columnFilters[key];
                if (!allowedValues) return true;

                // Handle special case for roomSubType which is a JSON array
                if (key === 'roomSubType') {
                    try {
                        const parsed = JSON.parse(std.roomSubType || '[]');
                        return Array.isArray(parsed) && parsed.some(val => allowedValues.includes(val));
                    } catch {
                        return allowedValues.includes(std.roomSubType || '');
                    }
                }

                const itemVal = std[key as keyof typeof std] === null || std[key as keyof typeof std] === undefined 
                    ? '' 
                    : String(std[key as keyof typeof std]);
                
                return allowedValues.includes(itemVal);
            });
        });

        // 3. Multi-Level Sort
        if (sorts.length > 0) {
            filtered.sort((a, b) => {
                for (const criterion of sorts) {
                    const key = criterion.key;
                    let aVal = a[key as keyof typeof a];
                    let bVal = b[key as keyof typeof b];

                    if (key === 'itemId') {
                        aVal = a._itemName;
                        bVal = b._itemName;
                    } else if (key === 'basis') {
                        aVal = a._basis;
                        bVal = b._basis;
                    } else if (key === '_category') {
                        aVal = a._category;
                        bVal = b._category;
                    }

                    const comparison = String(aVal || '').localeCompare(String(bVal || ''), undefined, { numeric: true });
                    if (comparison !== 0) {
                        return criterion.direction === 'asc' ? comparison : -comparison;
                    }
                }
                return 0;
            });
        }

        return filtered;
    }, [standards, searchTerm, itemMap, sorts, columnFilters]);

    const groupedStandards = useMemo(() => {
        if (!isGrouped) return { 'All Rules': processedStandards };
        
        const groups: Record<string, any[]> = {};
        processedStandards.forEach(std => {
            if (!groups[std.roomType]) groups[std.roomType] = [];
            groups[std.roomType].push(std);
        });
        return groups;
    }, [processedStandards, isGrouped]);

    const sortedGroupKeys = useMemo(() => Object.keys(groupedStandards).sort(), [groupedStandards]);

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group);
            else next.add(group);
            return next;
        });
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast("Popups blocked. Please allow popups to print.", "error");
            return;
        }

        const tableBodyHtml = document.getElementById('standards-table-body')?.innerHTML || '';
        
        const content = `
            <html>
            <head>
                <title>Inventory Standards Report</title>
                <style>
                    body { font-family: system-ui, sans-serif; padding: 20px; color: #111; }
                    h1 { font-size: 24px; margin-bottom: 5px; }
                    .meta { color: #666; font-size: 14px; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
                    th { background-color: #f9fafb; font-weight: 800; text-transform: uppercase; }
                    .group-header { background-color: #eff6ff; font-weight: bold; color: #1d4ed8; }
                    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #eee; margin-right: 4px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <h1>Inventory Standards Report</h1>
                <div class="meta">Generated on: ${new Date().toLocaleString()}</div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            ${!isGrouped ? '<th>Room Type</th>' : ''}
                            <th>Applicable Functions</th>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Washrooms</th>
                            <th>Qty</th>
                            <th>Basis</th>
                        </tr>
                    </thead>
                    <tbody>${tableBodyHtml.replace(/<button.*?<\/button>/g, '').replace(/<svg.*?<\/svg>/g, '')}</tbody>
                </table>
                <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
            </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
    };

    const openAddForm = () => {
        setEditingStandard(null);
        setFormData({ standardQuantity: 1, roomSubType: '[]', targetWashroomTypes: '[]' });
        setIsFormOpen(true);
    };

    const openEditForm = (std: RoomStandard) => {
        setEditingStandard(std);
        setFormData(std);
        setIsFormOpen(true);
    };

    const handleFormChange = (field: string, value: any) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'itemId') {
                const newItem = itemMap.get(value);
                if (newItem && newItem.basis !== 'Per_Washroom') delete next.targetWashroomTypes;
            }
            return next;
        });
    };
    
    const selectedItemInForm = useMemo(() => formData.itemId ? itemMap.get(formData.itemId) : null, [formData.itemId, itemMap]);

    // --- CONFLICT & VALIDATION LOGIC ---
    
    const currentBasis = useMemo(() => formData.basis || selectedItemInForm?.basis, [formData.basis, selectedItemInForm]);

    const validationError = useMemo(() => {
        if (!formData.roomType || !formData.itemId || !formData.standardQuantity) return "Please fill required fields.";
        
        try {
            const subs = JSON.parse(formData.roomSubType || '[]');
            if (subs.length === 0) return "Please select at least one Applicable Function.";
        } catch { return "Please select at least one Applicable Function."; }

        if (currentBasis === 'Per_Washroom') {
            try {
                const wts = JSON.parse(formData.targetWashroomTypes || '[]');
                if (wts.length === 0) return "Please select at least one Washroom Type.";
            } catch { return "Please select at least one Washroom Type."; }
        }

        return null;
    }, [formData, currentBasis]);

    const conflictMessage = useMemo(() => {
        if (!formData.roomType || !formData.itemId || !currentBasis) return null;
        
        let incomingSubTypes: string[] = [];
        try { incomingSubTypes = JSON.parse(formData.roomSubType || '[]'); } catch { return null; }
        if (incomingSubTypes.length === 0) return null;

        const otherStandards = standards.filter(s => 
            s.standardId !== editingStandard?.standardId &&
            s.roomType === formData.roomType &&
            s.itemId === formData.itemId
        );

        for (const existing of otherStandards) {
            const existingItem = itemMap.get(existing.itemId);
            const existingBasis = existing.basis || existingItem?.basis;

            if (existingBasis === currentBasis) {
                try {
                    const existingSubTypes: string[] = JSON.parse(existing.roomSubType || '[]');
                    const overlap = incomingSubTypes.filter(t => existingSubTypes.includes(t));
                    if (overlap.length > 0) {
                        const labels = overlap.map(t => subTypeMap.get(t) || t).join(', ');
                        return `Overlap Conflict: '${labels}' already have a standard for this Item and Basis.`;
                    }
                } catch { continue; }
            }
        }
        return null;
    }, [formData, standards, currentBasis, editingStandard, subTypeMap, itemMap]);


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validationError || conflictMessage) {
            toast(validationError || conflictMessage || "Validation failed.", "error");
            return;
        }
        try {
            if (editingStandard) await updateStandard(formData as RoomStandard);
            else await createStandard(formData);
            setIsFormOpen(false);
        } catch {}
    };

    const handleConfirmDelete = async () => {
        if (!standardToDelete) return;
        try {
            await deleteStandard(standardToDelete.standardId);
            setStandardToDelete(null);
        } catch {}
    };

    const fieldNames = useMemo(() => {
        const availableNames = superMasterRecord.filter(f => {
            try { return JSON.parse(f.modules).includes("RoomStandards"); } catch { return false; }
        }).map(f => f.fieldName);

        // MANUAL FIX: itemId and basis on top as requested by user
        const order = ['itemId', 'basis', 'roomType', 'roomSubType', 'standardQuantity', 'targetWashroomTypes'];
        const showWashroomTypes = currentBasis === 'Per_Washroom';

        return order.filter(name => {
            if (name === 'targetWashroomTypes' && !showWashroomTypes) return false;
            return availableNames.includes(name);
        });
    }, [superMasterRecord, currentBasis]);

    const renderMultiBadges = (jsonStr: string | undefined, map: Map<string, string>, colorType: 'teal' | 'indigo') => {
        if (!jsonStr) return <span className="text-gray-400">-</span>;
        try {
            const arr = JSON.parse(jsonStr);
            if (!Array.isArray(arr) || arr.length === 0) return <Badge variant="secondary">All</Badge>;
            
            const baseClass = colorType === 'teal' 
                ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-800'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800';

            return (
                <div className="flex flex-wrap gap-1">
                    {arr.map(val => (
                        <span key={val} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border shadow-sm badge ${baseClass}`}>
                            {map.get(val) || val.replace(/_/g, ' ')}
                        </span>
                    ))}
                </div>
            );
        } catch { return <span className="text-gray-400">-</span>; }
    };

    const renderBasis = (basis: string, isOverride: boolean = false) => {
        let variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' = 'secondary';
        switch (basis) {
            case 'Per_Bed': variant = 'primary'; break;
            case 'Per_Room': variant = 'success'; break;
            case 'Per_Person': variant = 'secondary'; break;
            case 'Per_Washroom': variant = 'danger'; break;
        }
        return (
            <div className="flex flex-col gap-0.5 items-start">
                <Badge variant={variant}>{basis.replace(/_/g, ' ')}</Badge>
                {isOverride && <span className="text-[8px] font-black text-blue-500 uppercase">Override</span>}
            </div>
        );
    };

    // Helper for Basis Descriptions
    const getBasisDescription = (basis: string) => {
        switch(basis) {
            case 'Per_Bed': return "Quantity is multiplied by the number of beds in the room.";
            case 'Per_Person': return "Quantity is multiplied by the room capacity (people).";
            case 'Per_Room': return "Fixed quantity per room, regardless of size.";
            case 'Per_Washroom': return "Quantity is multiplied by the number of washrooms in the room.";
            default: return "";
        }
    };

    // Helper for SubType Filtering Data
    const subTypeFilterData = useMemo(() => {
        const uniqueSubTypes = new Set<string>();
        standards.forEach(std => {
            try {
                const arr = JSON.parse(std.roomSubType || '[]');
                if (Array.isArray(arr)) arr.forEach(val => uniqueSubTypes.add(val));
            } catch {
                if (std.roomSubType) uniqueSubTypes.add(std.roomSubType);
            }
        });
        return Array.from(uniqueSubTypes).map(val => ({ roomSubType: val }));
    }, [standards]);

    let rowCounter = 0; // Global counter for sequential numbering

    return (
        <div className="space-y-4">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-[var(--card-background)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search rules..." className="pl-9 h-10 text-sm" />
                    </div>
                    <div className="pt-1">
                         <Checkbox id="group-toggle" label="Group by Room Type" checked={isGrouped} onChange={e => setIsGrouped(e.target.checked)} />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={handlePrint} title="Print / Export PDF">
                        <Printer size={16} className="mr-2" /> Print PDF
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => fetchStandards(true)} isLoading={loading} title="Refresh">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    {canEdit && (
                        <Button onClick={openAddForm} size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Standard
                        </Button>
                    )}
                </div>
            </div>

            <Card className="relative overflow-hidden min-h-[300px]">
                {loading && <SurfaceLoader label="Loading Standards..." />}
                <ScrollableTableContainer>
                    <table className="min-w-full divide-y divide-[var(--border)]">
                        <thead className="bg-[var(--card-inset-background)] sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider w-10">#</th>
                                {!isGrouped && (
                                     <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--foreground)]" onClick={() => requestSort('roomType')}>
                                                Type {sorts.find(s => s.key === 'roomType')?.direction === 'asc' ? <ChevronDown size={12}/> : <ArrowUpDown size={12}/>}
                                            </div>
                                            <TableColumnFilter columnKey="roomType" data={standards} currentFilter={columnFilters.roomType} onFilterChange={handleFilterChange} />
                                        </div>
                                    </th>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider whitespace-nowrap">
                                    <div className="flex items-center justify-between">
                                        <span>Applicable Functions</span>
                                        <TableColumnFilter columnKey="roomSubType" data={subTypeFilterData} currentFilter={columnFilters.roomSubType} onFilterChange={handleFilterChange} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider whitespace-nowrap">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--foreground)]" onClick={() => requestSort('itemId')}>
                                            Item {sorts.find(s => s.key === 'itemId')?.direction === 'asc' ? <ChevronDown size={12}/> : <ArrowUpDown size={12}/>}
                                        </div>
                                        <TableColumnFilter columnKey="_itemName" data={processedStandards} currentFilter={columnFilters._itemName} onFilterChange={handleFilterChange} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider whitespace-nowrap">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--foreground)]" onClick={() => requestSort('_category')}>
                                            Category {sorts.find(s => s.key === '_category')?.direction === 'asc' ? <ChevronDown size={12}/> : <ArrowUpDown size={12}/>}
                                        </div>
                                        <TableColumnFilter columnKey="_category" data={processedStandards} currentFilter={columnFilters._category} onFilterChange={handleFilterChange} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider whitespace-nowrap">
                                    <div className="flex items-center justify-between">
                                        <span>Washrooms</span>
                                        <TableColumnFilter columnKey="targetWashroomTypes" data={standards} currentFilter={columnFilters.targetWashroomTypes} onFilterChange={handleFilterChange} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider whitespace-nowrap">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--foreground)]" onClick={() => requestSort('standardQuantity')}>
                                            Qty {sorts.find(s => s.key === 'standardQuantity')?.direction === 'asc' ? <ChevronDown size={12}/> : <ArrowUpDown size={12}/>}
                                        </div>
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider whitespace-nowrap">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--foreground)]" onClick={() => requestSort('basis')}>
                                            Basis {sorts.find(s => s.key === 'basis')?.direction === 'asc' ? <ChevronDown size={12}/> : <ArrowUpDown size={12}/>}
                                        </div>
                                        <TableColumnFilter columnKey="_basis" data={processedStandards} currentFilter={columnFilters._basis} onFilterChange={handleFilterChange} />
                                    </div>
                                </th>
                                {canEdit && <th className="px-6 py-3 text-right text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--card-background)]" id="standards-table-body">
                            {sortedGroupKeys.map(group => {
                                const isExpanded = expandedGroups.has(group);
                                const groupStandards = groupedStandards[group];
                                if (groupStandards.length === 0) return null;

                                return (
                                    <React.Fragment key={group}>
                                        {isGrouped && (
                                            <tr className="bg-[var(--card-inset-background)] cursor-pointer hover:bg-[var(--list-item-hover-background)] border-b border-[var(--border)] group-header" onClick={() => toggleGroup(group)}>
                                                <td colSpan={canEdit ? 9 : 8} className="px-4 py-2">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        {group} <span className="text-xs font-normal text-[var(--foreground-muted)] ml-1">({groupStandards.length})</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {(isGrouped ? isExpanded : true) && groupStandards.map((std) => {
                                            rowCounter++;
                                            const item = itemMap.get(std.itemId);
                                            const appliedBasis = std.basis || item?.basis;
                                            const isOverride = !!std.basis && std.basis !== item?.basis;
                                            return (
                                                <tr key={std.standardId} className="hover:bg-[var(--list-item-hover-background)] border-b border-[var(--border)]">
                                                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{rowCounter}</td>
                                                    {!isGrouped && <td className="px-6 py-3 whitespace-nowrap text-xs font-bold text-[var(--foreground)]">{std.roomType}</td>}
                                                    <td className="px-6 py-3 max-w-[200px]">{renderMultiBadges(std.roomSubType, subTypeMap, 'teal')}</td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-[var(--foreground)]">{item?.itemName || 'Unknown Item'}</td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-[var(--foreground-muted)] italic">{item?.category || 'Uncategorized'}</td>
                                                    <td className="px-6 py-3">{renderMultiBadges(std.targetWashroomTypes, washroomTypeMap, 'indigo')}</td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono">{std.standardQuantity}</td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-xs">
                                                        {appliedBasis ? renderBasis(appliedBasis, isOverride) : '-'}
                                                    </td>
                                                    {canEdit && (
                                                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => openEditForm(std)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"><Edit size={16} /></button>
                                                                <button onClick={() => setStandardToDelete(std)} className="p-1.5 hover:bg-red-50 text-red-600 rounded"><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                            {sortedGroupKeys.length === 0 && (
                                <tr>
                                    <td colSpan={canEdit ? 9 : 8} className="p-12 text-center text-gray-400 text-sm italic">
                                        No standards found matching your current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollableTableContainer>
            </Card>

            {isFormOpen && (
                <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingStandard ? `Edit Standard` : 'Add Room Standard'}>
                    <form onSubmit={handleSave} className="space-y-4">
                        <DynamicFormEngine 
                            moduleName="RoomStandards"
                            fieldNames={fieldNames}
                            formData={formData as Record<string, any>}
                            onFormChange={handleFormChange}
                            disabled={isSaving}
                            isEditing={!!editingStandard}
                            lookupData={{ 'InventoryItems': itemOptions, 'RoomSubTypes': subTypeOptions }}
                            mandatoryOverrides={{ targetWashroomTypes: currentBasis === 'Per_Washroom' }}
                        />
                        
                        {/* ITEM BASIS HINT & OVERRIDE BADGE */}
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            {selectedItemInForm && (
                                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg shadow-sm">
                                    <Info size={16} className="text-blue-500" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-blue-700 dark:text-blue-300 font-black uppercase">Default Rule (from Master)</span>
                                        <span className="text-xs text-blue-800 dark:text-blue-200">
                                            <strong>{selectedItemInForm.basis.replace(/_/g, ' ')}</strong>: {getBasisDescription(selectedItemInForm.basis)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {formData.basis && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg shadow-sm">
                                    <HelpCircle size={16} className="text-amber-500" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-black uppercase tracking-widest">Active Override Strategy</span>
                                        <span className="text-xs text-amber-800 dark:text-amber-200">
                                            Applying <strong>{formData.basis.replace(/_/g, ' ')}</strong> logic. {getBasisDescription(formData.basis)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {conflictMessage && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg shadow-sm animate-pulse">
                                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-red-700 dark:text-red-400 font-black uppercase tracking-widest">Logic Warning</span>
                                        <span className="text-xs text-red-800 dark:text-red-300 font-medium">
                                            {conflictMessage}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                            <Button type="submit" isLoading={isSaving} disabled={isSaving || !!validationError || !!conflictMessage}>Save</Button>
                        </div>
                    </form>
                </Modal>
            )}

            <ConfirmModal 
                isOpen={!!standardToDelete}
                onClose={() => setStandardToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Standard"
                message={`Are you sure?`}
                isLoading={isSaving}
                confirmText="Delete"
            />
        </div>
    );
};

export default RoomStandardsManager;
