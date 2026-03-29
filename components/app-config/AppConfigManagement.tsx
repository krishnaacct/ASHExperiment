import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../hooks/useData';
import { AppModuleConfig } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { Plus, GripVertical, AlertTriangle, Eye, LayoutTemplate, ListTree } from 'lucide-react';
import AppConfigForm from './AppConfigForm';
import PermissionSimulator from './PermissionSimulator';
import FormLayoutManager from './FormLayoutManager'; // New Import

interface NavItem extends AppModuleConfig {
    children: NavItem[];
}

type Tab = 'modules' | 'layouts';

const AppConfigManagement: React.FC = () => {
    const { allAppModules, fetchAllAppModules, updateAllAppModules, loading } = useData();
    const [localModules, setLocalModules] = useState<AppModuleConfig[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingModule, setEditingModule] = useState<AppModuleConfig | null>(null);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('modules');

    // State for drag-and-drop
    const [draggedItem, setDraggedItem] = useState<AppModuleConfig | null>(null);
    const [dragOverItem, setDragOverItem] = useState<AppModuleConfig | null>(null);

    useEffect(() => {
        fetchAllAppModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setLocalModules(allAppModules);
    }, [allAppModules]);

    const navTree = useMemo(() => {
        const tree: NavItem[] = [];
        const map = new Map<string, NavItem>();
        
        localModules.forEach(mod => map.set(mod.moduleId, { ...mod, children: [] }));
        
        localModules.forEach(mod => {
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
    }, [localModules]);

    const handleToggleActive = (moduleId: string) => {
        setLocalModules(prev => prev.map(mod => mod.moduleId === moduleId ? { ...mod, isActive: !mod.isActive } : mod));
        setIsDirty(true);
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            await updateAllAppModules(localModules);
            toast('Configuration saved successfully!', 'success');
            setIsDirty(false);
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to save configuration', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const openAddForm = () => {
        setEditingModule(null);
        setIsFormOpen(true);
    };

    const openEditForm = (module: AppModuleConfig) => {
        setEditingModule(module);
        setIsFormOpen(true);
    };

    const handleFormSave = (savedModule: AppModuleConfig) => {
        if (editingModule) { // Editing existing
            setLocalModules(prev => prev.map(m => m.moduleId === savedModule.moduleId ? savedModule : m));
        } else { // Adding new
            setLocalModules(prev => [...prev, savedModule]);
        }
        setIsDirty(true);
        setIsFormOpen(false);
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, item: AppModuleConfig) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLLIElement>, item: AppModuleConfig) => {
        e.preventDefault();
        if (draggedItem?.parentModuleId === item.parentModuleId) {
            setDragOverItem(item);
        }
    };
    
    const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropTarget: AppModuleConfig) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.moduleId === dropTarget.moduleId || draggedItem.parentModuleId !== dropTarget.parentModuleId) {
            return;
        }

        const items = [...localModules];
        const draggedIndex = items.findIndex(i => i.moduleId === draggedItem.moduleId);
        const targetIndex = items.findIndex(i => i.moduleId === dropTarget.moduleId);
        
        // Remove dragged item from its original position
        const [movedItem] = items.splice(draggedIndex, 1);
        // Insert it at the target position
        items.splice(targetIndex, 0, movedItem);

        // Re-calculate SortOrder for the affected sibling group
        const parentId = draggedItem.parentModuleId;
        const siblings = items.filter(i => i.parentModuleId === parentId);
        siblings.forEach((sibling, index) => {
            const originalItemIndex = items.findIndex(i => i.moduleId === sibling.moduleId);
            items[originalItemIndex].sortOrder = (index + 1) * 10;
        });

        setLocalModules(items);
        setIsDirty(true);
        setDraggedItem(null);
        setDragOverItem(null);
    };

    const renderModuleItem = (item: NavItem) => (
        <li
            key={item.moduleId}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragOver={(e) => handleDragOver(e, item)}
            onDrop={(e) => handleDrop(e, item)}
            className={`flex items-center p-3 rounded-lg group transition-all duration-200 ${
                item.moduleType === 'CATEGORY' ? 'bg-[var(--card-inset-background)] mt-4' : 'bg-[var(--card-background)] hover:bg-[var(--list-item-hover-background)]'
            } ${
                draggedItem?.moduleId === item.moduleId ? 'opacity-50' : ''
            } ${
                dragOverItem?.moduleId === item.moduleId ? 'ring-2 ring-[var(--primary-color)]' : ''
            }`}
        >
            <GripVertical className="h-5 w-5 text-[var(--foreground-muted)] mr-3 cursor-move" />
            <div className="flex-grow">
                <p className={`font-semibold ${item.moduleType === 'CATEGORY' ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)]'}`}>{item.displayName}</p>
                <p className="text-xs text-[var(--foreground-muted)] font-mono">{item.moduleId}</p>
            </div>
            <div className="flex items-center space-x-4">
                <Button variant="secondary" size="sm" onClick={() => openEditForm(item)}>Edit</Button>
                <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors cursor-pointer ${item.isActive ? 'bg-[var(--primary-color)]' : 'bg-[var(--input)]'}`} onClick={() => handleToggleActive(item.moduleId)}>
                    <span className={`inline-block w-4 h-4 transform bg-[var(--card-background)] rounded-full transition-transform ${item.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
            </div>
        </li>
    );

    const renderModuleStructureTab = () => (
        <Card>
            {loading && !localModules.length ? (
                <p className="p-4">Loading configuration...</p>
            ) : (
                <ul className="space-y-2 p-4">
                    {navTree.map(category => (
                        <React.Fragment key={category.moduleId}>
                            {renderModuleItem(category)}
                            {category.children.length > 0 && (
                                <ul className="pl-8 pt-2 space-y-2 border-l-2 border-[var(--border)] ml-4">
                                    {category.children.map(child => renderModuleItem(child))}
                                </ul>
                            )}
                        </React.Fragment>
                    ))}
                </ul>
            )}
        </Card>
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">App Configuration</h1>
                <div className="flex items-center space-x-2">
                     <Button variant="secondary" onClick={() => setIsSimulatorOpen(true)} size="md">
                        <Eye className="mr-2 h-5 w-5" /> Simulate Permissions
                    </Button>
                    {activeTab === 'modules' && (
                        <Button onClick={openAddForm} size="md">
                            <Plus className="mr-2 h-5 w-5" /> Add New Item
                        </Button>
                    )}
                    {activeTab === 'modules' && isDirty && (
                        <Button onClick={handleSaveChanges} isLoading={isSaving} disabled={!isDirty}>Save Changes</Button>
                    )}
                </div>
            </div>

            <div className="mb-6">
                <div className="inline-flex rounded-lg bg-[var(--tab-background)] p-1 space-x-1">
                    <button onClick={() => setActiveTab('modules')} className={`${activeTab === 'modules' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}>
                        <ListTree className="w-4 h-4 mr-2" /> Module Structure
                    </button>
                    <button onClick={() => setActiveTab('layouts')} className={`${activeTab === 'layouts' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}>
                        <LayoutTemplate className="w-4 h-4 mr-2" /> Form Layouts
                    </button>
                </div>
            </div>
            
            {activeTab === 'modules' && isDirty && (
                <div className="mb-4 p-4 bg-[var(--toast-warning-background)] text-[var(--toast-warning-foreground)] rounded-lg flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-3" />
                    You have unsaved changes. Click "Save Changes" to apply them. Changes will reflect for all users upon their next login or refresh.
                </div>
            )}

            {activeTab === 'modules' && renderModuleStructureTab()}
            {activeTab === 'layouts' && <FormLayoutManager />}
            

            {isFormOpen && (
                <AppConfigForm
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSave={handleFormSave}
                    existingModule={editingModule}
                    allModules={localModules}
                />
            )}

            <PermissionSimulator 
                isOpen={isSimulatorOpen}
                onClose={() => setIsSimulatorOpen(false)}
            />
        </div>
    );
};

export default AppConfigManagement;
