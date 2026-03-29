import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../hooks/useData';
import { useSMR } from '../../hooks/useSMR';
import { useSMREditor } from '../../hooks/useSMREditor';
import { SuperMasterRecord } from '../../types';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GripVertical, AlertTriangle } from 'lucide-react';
import { toast } from '../ui/Toast';

// Define the structure for the layout state
type LayoutState = Record<string, SuperMasterRecord[]>;

const FormLayoutManager: React.FC = () => {
    const { allAppModules, forceSMRRefetch } = useData();
    const { superMasterRecord } = useSMR();
    const { updateField } = useSMREditor();
    const [selectedModule, setSelectedModule] = useState<string>('');
    
    // Original data for comparison on save
    const [originalFields, setOriginalFields] = useState<SuperMasterRecord[]>([]);
    
    // 'Draft' state for the layout
    const [layout, setLayout] = useState<LayoutState>({});
    const [groupOrder, setGroupOrder] = useState<string[]>([]);

    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Drag-and-drop state for fields
    const [draggedItem, setDraggedItem] = useState<{ item: SuperMasterRecord; sourceGroup: string } | null>(null);
    const [dragOverData, setDragOverData] = useState<{ group: string; index?: number } | null>(null);

    // New drag-and-drop state for groups
    const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);


    const moduleOptions = useMemo(() => {
        return allAppModules
            .filter(m => m.moduleType === 'MODULE' && m.componentKey !== 'placeholder' && m.componentKey !== 'dashboard')
            .map(m => {
                const dataScopeName = m.componentKey.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
                return { value: dataScopeName, label: m.displayName };
            })
            .sort((a,b) => a.label.localeCompare(b.label));
    }, [allAppModules]);

    useEffect(() => {
        if (selectedModule) {
            // 1. Fetch
            const moduleFields = superMasterRecord.filter(field => {
                try { return JSON.parse(field.modules).includes(selectedModule); } catch { return false; }
            });
            setOriginalFields(JSON.parse(JSON.stringify(moduleFields))); // Deep copy for later comparison

            // 2. Sort
            moduleFields.sort((a, b) => {
                let sortA = Infinity, sortB = Infinity;
                try { if (a.sortOrders) sortA = JSON.parse(a.sortOrders)[selectedModule] || Infinity; } catch {}
                try { if (b.sortOrders) sortB = JSON.parse(b.sortOrders)[selectedModule] || Infinity; } catch {}
                return sortA - sortB;
            });

            // 3. Group
            const grouped: LayoutState = { '__ungrouped__': [] };
            const orderedGroups: string[] = ['__ungrouped__'];

            moduleFields.forEach(field => {
                const groupName = field.groupName || '__ungrouped__';
                if (!grouped[groupName]) {
                    grouped[groupName] = [];
                    orderedGroups.push(groupName);
                }
                grouped[groupName].push(field);
            });
            
            setLayout(grouped);
            setGroupOrder(orderedGroups);
            setIsDirty(false);
        } else {
            setOriginalFields([]);
            setLayout({});
            setGroupOrder([]);
        }
    }, [selectedModule, superMasterRecord]);

    const handleFieldDragStart = (e: React.DragEvent<HTMLDivElement>, item: SuperMasterRecord, sourceGroup: string) => {
        setDraggedItem({ item, sourceGroup });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, group: string, index?: number) => {
        e.preventDefault();
        setDragOverData({ group, index });
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOverData(null);
    };

    const handleFieldDrop = (e: React.DragEvent<HTMLDivElement>, targetGroup: string, targetIndex: number = -1) => {
        e.preventDefault();
        if (targetIndex !== -1) e.stopPropagation();
        
        if (!draggedItem) return;

        const { item: dragged, sourceGroup } = draggedItem;
        const newLayout = { ...layout };

        // Remove from source
        newLayout[sourceGroup] = newLayout[sourceGroup].filter(f => f.fieldId !== dragged.fieldId);

        // Add to destination
        if (!newLayout[targetGroup]) newLayout[targetGroup] = [];

        if (targetIndex === -1) { // Dropped on group container
            newLayout[targetGroup] = [...newLayout[targetGroup], dragged];
        } else { // Dropped on an item
            newLayout[targetGroup].splice(targetIndex, 0, dragged);
        }
        
        setLayout(newLayout);
        setIsDirty(true);
        setDraggedItem(null);
        setDragOverData(null);
    };

    // --- New Group Drag Handlers ---
    const handleGroupDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedGroupIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleGroupDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        if (draggedGroupIndex === null || draggedGroupIndex === dropIndex) return;

        const newGroupOrder = [...groupOrder];
        const [movedGroup] = newGroupOrder.splice(draggedGroupIndex, 1);
        newGroupOrder.splice(dropIndex, 0, movedGroup);

        setGroupOrder(newGroupOrder);
        setIsDirty(true);
        setDraggedGroupIndex(null);
    };


    const handleSaveLayout = async () => {
        if (!selectedModule) return;
        setIsSaving(true);
        try {
            const promises: Promise<any>[] = [];
            // Re-flatten the entire layout based on the new group AND field order.
            const newFlattenedLayout = groupOrder.flatMap(groupName => 
                layout[groupName].map(field => ({ ...field, groupName: groupName === '__ungrouped__' ? '' : groupName }))
            );

            newFlattenedLayout.forEach((field, index) => {
                const originalField = originalFields.find(f => f.fieldId === field.fieldId);
                if (!originalField) return;

                // Recalculate sort order based on new absolute position.
                const newSortOrder = (index + 1) * 10;
                const currentSortOrders = originalField.sortOrders ? JSON.parse(originalField.sortOrders) : {};
                
                let needsUpdate = false;
                const updatedField = { ...originalField };

                // Check if sort order or group name has changed.
                if (currentSortOrders[selectedModule] !== newSortOrder || (originalField.groupName || '') !== field.groupName) {
                    const newSortOrders = { ...currentSortOrders, [selectedModule]: newSortOrder };
                    updatedField.sortOrders = JSON.stringify(newSortOrders);
                    updatedField.groupName = field.groupName;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    promises.push(updateField(updatedField));
                }
            });

            await Promise.all(promises);
            toast('Layout saved successfully!', 'success');
            forceSMRRefetch();
            setIsDirty(false);
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to save layout', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
             {isDirty && (
                <div className="mb-4 p-4 bg-[var(--toast-warning-background)] text-[var(--toast-warning-foreground)] rounded-lg flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-3" />
                    You have unsaved changes. Click "Save Layout" to apply them.
                </div>
            )}
            <Card>
                <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                     <Select
                        label="Select a module to configure its form layout:"
                        value={selectedModule || ''}
                        onChange={(value) => setSelectedModule(value)}
                        options={moduleOptions}
                        className="w-full sm:w-72"
                    />
                    {isDirty && <Button onClick={handleSaveLayout} isLoading={isSaving} disabled={!isDirty}>Save Layout</Button>}
                </div>
                {!selectedModule ? (
                    <p className="p-6 text-center text-gray-500">Please select a module to begin.</p>
                ) : (
                    <div className="p-4 space-y-6">
                        {groupOrder.map((groupName, groupIndex) => (
                            <div 
                                key={groupName}
                                draggable
                                onDragStart={(e) => handleGroupDragStart(e, groupIndex)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleGroupDrop(e, groupIndex)}
                                onDragLeave={handleDragLeave}
                                className={`p-4 rounded-lg border-2 border-dashed transition-all duration-200 ${dragOverData?.group === groupName ? 'border-[var(--primary-color)] bg-[var(--accent-background)]' : 'border-[var(--border)] bg-[var(--card-inset-background)]'} ${draggedGroupIndex === groupIndex ? 'opacity-50' : ''}`}
                            >
                                <div className="flex items-center mb-4 cursor-move">
                                    <GripVertical className="h-5 w-5 text-gray-400 mr-2" />
                                    <p className="font-semibold text-gray-600 dark:text-gray-300">{groupName === '__ungrouped__' ? 'Ungrouped Fields' : groupName}</p>
                                </div>
                                <div 
                                    className="space-y-2"
                                    onDragOver={(e) => handleDragOver(e, groupName)}
                                    onDrop={(e) => handleFieldDrop(e, groupName)}
                                >
                                    {layout[groupName]?.map((field, index) => (
                                        <div 
                                            key={field.fieldId}
                                            draggable
                                            onDragStart={(e) => handleFieldDragStart(e, field, groupName)}
                                            onDragOver={(e) => handleDragOver(e, groupName, index)}
                                            onDrop={(e) => handleFieldDrop(e, groupName, index)}
                                            className={`flex items-center p-3 rounded-lg bg-[var(--card-background)] border border-[var(--border)] group cursor-move ${draggedItem?.item.fieldId === field.fieldId ? 'opacity-50' : ''}`}
                                        >
                                            <GripVertical className="h-5 w-5 text-gray-400 mr-3" />
                                            <div className="flex-grow">
                                                <p className="font-medium text-[var(--foreground)]">{field.displayName}</p>
                                                <p className="text-xs text-[var(--foreground-muted)] font-mono">{field.fieldName}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {layout[groupName]?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Drop fields here</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default FormLayoutManager;