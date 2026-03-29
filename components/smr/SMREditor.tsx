
import React, { useState, useMemo, useEffect } from 'react';
import { useSMREditor } from '../../hooks/useSMREditor';
import { SuperMasterRecord } from '../../types';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Plus, Edit, Trash2, Lock, Copy, ChevronDown, ArrowUpDown } from 'lucide-react';
import { toast } from '../ui/Toast';
import SMREditorForm from './SMREditorForm';
import { ConfirmModal } from '../ui/ConfirmModal';
import { InstructionModal } from './InstructionModal';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { useData } from '../../hooks/useData';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';
import { SurfaceLoader } from '../common/SurfaceLoader';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';

type SortConfig = {
    key: keyof SuperMasterRecord;
    direction: 'ascending' | 'descending';
} | null;

const UNASSIGNED_GROUP_KEY = 'Fields Without Assigned Module';

const SMREditor: React.FC = () => {
    const { smrData, loading, fetchSMR, createField, updateField, deleteField } = useSMREditor();
    const { forceSMRRefetch } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingField, setEditingField] = useState<SuperMasterRecord | null>(null);
    const [clonedInitialData, setClonedInitialData] = useState<SuperMasterRecord | null>(null);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [fieldToDelete, setFieldToDelete] = useState<SuperMasterRecord | null>(null);
    const [deleteMessage, setDeleteMessage] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [instructionModalContent, setInstructionModalContent] = useState<{ title: string; content: React.ReactNode, type: 'info' | 'warning' } | null>(null);

    const [filters, setFilters] = useState({ dataType: '', module: '' });
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [isGrouped, setIsGrouped] = useState(false);
    const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchSMR();
    }, [fetchSMR]);
    
    const { dataTypeOptions, moduleOptions } = useMemo(() => {
        const dts = [...new Set(smrData.map(r => r.dataType))].sort();
        const mods = [...new Set(smrData.flatMap(r => {
            try { return JSON.parse(r.modules); } catch { return []; }
        }))].sort();
        return {
            dataTypeOptions: dts.map(dt => ({ value: dt, label: dt })),
            moduleOptions: mods.map(mod => ({ value: mod, label: mod })),
        };
    }, [smrData]);

    const displayRecords = useMemo(() => {
        let records = [...smrData];
        
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            records = records.filter(record =>
                Object.values(record).some(value =>
                    String(value).toLowerCase().includes(lowercasedFilter)
                )
            );
        }
        if (filters.dataType) {
            records = records.filter(r => r.dataType === filters.dataType);
        }
        if (filters.module) {
            records = records.filter(r => {
                try { return JSON.parse(r.modules).includes(filters.module); } catch { return false; }
            });
        }

        if (sortConfig !== null) {
            records.sort((a, b) => {
                const key = sortConfig.key;
                if (a[key] < b[key]) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (a[key] > b[key]) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return records;
    }, [smrData, searchTerm, filters, sortConfig]);

    const groupedRecords = useMemo(() => {
        if (!isGrouped) return null;
        return displayRecords.reduce((acc, record) => {
            try {
                const modules = JSON.parse(record.modules);
                if (Array.isArray(modules) && modules.length > 0) {
                    modules.forEach((mod: string) => {
                        if (!acc[mod]) acc[mod] = [];
                        acc[mod].push(record);
                    });
                } else {
                    if (!acc[UNASSIGNED_GROUP_KEY]) acc[UNASSIGNED_GROUP_KEY] = [];
                    acc[UNASSIGNED_GROUP_KEY].push(record);
                }
            } catch {
                if (!acc[UNASSIGNED_GROUP_KEY]) acc[UNASSIGNED_GROUP_KEY] = [];
                acc[UNASSIGNED_GROUP_KEY].push(record);
            }
            return acc;
        }, {} as Record<string, SuperMasterRecord[]>);
    }, [displayRecords, isGrouped]);

    const handleFilterChange = (filterType: 'dataType' | 'module', value: string) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
    };

    const requestSort = (key: keyof SuperMasterRecord) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const toggleAccordion = (moduleId: string) => {
        setOpenAccordions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(moduleId)) newSet.delete(moduleId);
            else newSet.add(moduleId);
            return newSet;
        });
    };

    const handleAddNew = () => {
        setEditingField(null);
        setClonedInitialData(null);
        setIsFormOpen(true);
    };

    const handleEdit = (field: SuperMasterRecord) => {
        setEditingField(field);
        setClonedInitialData(null);
        setIsFormOpen(true);
    };

    const handleClone = (field: SuperMasterRecord) => {
        setEditingField(null);
        setClonedInitialData({ ...field, fieldId: '', fieldName: '' });
        setIsFormOpen(true);
    };

    const handleDeleteRequest = (field: SuperMasterRecord) => {
        let message = `Are you sure you want to delete the field "${field.fieldName}"? This action cannot be undone.`;
        try {
            const modules = JSON.parse(field.modules || '[]');
            if(modules.length > 0) {
                message += ` This field is currently used in the '${modules.join(', ')}' form(s). Deleting it will remove the input from these forms.`;
            }
        } catch {}

        setDeleteMessage(message);
        setFieldToDelete(field);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!fieldToDelete) return;
        setIsSaving(true);
        try {
            await deleteField(fieldToDelete.fieldId);
            forceSMRRefetch();
            toast('Field deleted successfully', 'success');
            const modules: string[] = JSON.parse(fieldToDelete.modules || '[]');
            setInstructionModalContent({
                title: 'Action Recommended: Clean Up Your Google Sheet',
                type: 'warning',
                content: (
                    <>
                        <p>The SMR field <strong>{fieldToDelete.fieldName}</strong> has been deleted from the application's configuration. The UI will no longer use this field.</p>
                        <p>It is recommended that you now manually delete the column named <code>{fieldToDelete.fieldName}</code> from the following sheet(s):</p>
                        <ul className="list-disc list-inside bg-gray-100 dark:bg-slate-700 p-2 rounded-md">
                            {modules.map((mod: string) => <li key={mod}>{mod} Sheet</li>)}
                        </ul>
                        <p><strong>Warning:</strong> This will permanently delete all data stored in that column.</p>
                    </>
                )
            });

            setDeleteConfirmOpen(false);
            setFieldToDelete(null);
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to delete field', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSave = async (fieldData: SuperMasterRecord) => {
        setIsSaving(true);
        try {
            if (editingField) {
                await updateField(fieldData);
                toast('Field updated successfully', 'success');
            } else {
                await createField(fieldData);
                toast('Field created successfully', 'success');
                const modules: string[] = JSON.parse(fieldData.modules || '[]');
                if (modules.length > 0) {
                    setInstructionModalContent({
                        title: 'Action Required: Update Your Google Sheet',
                        type: 'info',
                        content: (
                            <>
                                <p>The SMR field <strong>{fieldData.fieldName}</strong> has been created. To make it functional, you must now manually add a new column to the corresponding Google Sheet(s).</p>
                                <p>Based on your selection, please add a column to the following sheet(s):</p>
                                <ul className="list-disc list-inside bg-gray-100 dark:bg-slate-700 p-2 rounded-md">
                                    {modules.map((mod: string) => <li key={mod}>{mod} Sheet</li>)}
                                </ul>
                                <p>The new column header <strong>must</strong> be the `camelCase` `fieldName`: <code>{fieldData.fieldName}</code></p>
                            </>
                        )
                    });
                }
            }
            forceSMRRefetch();
            setIsFormOpen(false);
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to save field', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const renderTable = (records: SuperMasterRecord[]) => (
        <ScrollableTableContainer>
            <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--card-inset-background)]">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <button onClick={() => requestSort('fieldName')} className="flex items-center">
                                Field Name <ArrowUpDown className="ml-2 h-4 w-4" />
                            </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                             <button onClick={() => requestSort('displayName')} className="flex items-center">
                                Display Name <ArrowUpDown className="ml-2 h-4 w-4" />
                            </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <button onClick={() => requestSort('dataType')} className="flex items-center">
                                Data Type <ArrowUpDown className="ml-2 h-4 w-4" />
                            </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-[var(--card-background)] divide-y divide-[var(--border)]">
                    {records.map((record) => (
                        <tr key={record.fieldId}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    {!!record.isSystemLocked && <span title="System-Locked Field" className="mr-2 flex-shrink-0"><Lock size={24} strokeWidth={2.5} className="text-blue-500" /></span>}
                                    <div>
                                        <div className="text-sm font-mono text-[var(--foreground)]">{record.fieldName}</div>
                                        <div className="text-xs text-[var(--foreground-muted)]">{record.fieldId}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-normal max-w-sm">
                                <div className="text-sm font-medium text-[var(--foreground)]">{record.displayName}</div>
                                {record.groupName && (
                                     <div className="text-xs text-[var(--foreground-muted)] mt-1">
                                        Group: <Badge variant="secondary">{record.groupName}</Badge>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant="secondary">{record.dataType}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                    <Button variant="secondary" size="sm" onClick={() => handleClone(record)} className="p-0 h-9 w-9 shadow-sm" title="Clone">
                                        <Copy size={24} strokeWidth={2.5} />
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => handleEdit(record)} className="p-0 h-9 w-9 shadow-sm" title="Edit">
                                        <Edit size={24} strokeWidth={2.5} />
                                    </Button>
                                    <Button 
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleDeleteRequest(record)} 
                                        className="p-0 h-9 w-9 shadow-sm"
                                        disabled={!!record.isSystemLocked}
                                        title={record.isSystemLocked ? 'This is a system-locked field and cannot be deleted.' : 'Delete'}
                                    >
                                        <Trash2 size={24} strokeWidth={2.5} />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {records.length === 0 && <p className="p-6 text-center text-[var(--foreground-muted)]">No records found for the current filters.</p>}
        </ScrollableTableContainer>
    );

    const renderGroupedView = () => {
        if (!groupedRecords) return null;
        const moduleNames = Object.keys(groupedRecords).filter(name => name !== UNASSIGNED_GROUP_KEY).sort();
        if (groupedRecords[UNASSIGNED_GROUP_KEY]) {
            moduleNames.push(UNASSIGNED_GROUP_KEY);
        }

        return (
            <div className="space-y-2 p-4">
                {moduleNames.map(moduleName => {
                    const isOpen = openAccordions.has(moduleName);
                    return (
                        <div key={moduleName} className="bg-[var(--card-inset-background)] rounded-lg shadow-sm border border-[var(--border)]">
                            <button
                                type="button"
                                onClick={() => toggleAccordion(moduleName)}
                                className="w-full flex justify-between items-center p-4 text-left bg-[var(--card-inset-background)] hover:bg-[var(--list-item-hover-background)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] rounded-lg"
                            >
                                <h2 className="text-lg font-bold text-[var(--foreground)]">{moduleName}</h2>
                                <ChevronDown size={24} strokeWidth={2.5} className={`text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && <div className="bg-[var(--card-background)] rounded-b-lg">{renderTable(groupedRecords[moduleName])}</div>}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading && !smrData.length) {
        return <WorkstationSkeleton type="list-detail" />;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                 <h1 className="text-3xl font-bold text-[var(--foreground)]">SMR Editor</h1>
                 <Button onClick={handleAddNew} size="md">
                    <Plus size={24} strokeWidth={2.5} className="mr-2" /> Add New Field
                </Button>
            </div>
           
            <Card className="relative">
                {loading && <SurfaceLoader label="Updating records..." />}
                 <div className="p-4 border-b border-[var(--border)] space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
                    <Input
                        placeholder="Search all fields..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-auto"
                    />
                    <div className="flex items-center gap-4 flex-wrap">
                        <Select label="Data Type" value={filters.dataType} onChange={v => handleFilterChange('dataType', v)} options={dataTypeOptions} required={false} className="min-w-[150px]" />
                        <Select label="Module" value={filters.module} onChange={v => handleFilterChange('module', v)} options={moduleOptions} required={false} className="min-w-[150px]" />
                        <div className="pt-6">
                          <Checkbox id="group-toggle" label="Group by Module" checked={isGrouped} onChange={e => setIsGrouped(e.target.checked)} />
                        </div>
                    </div>
                </div>
                {isGrouped ? renderGroupedView() : renderTable(displayRecords)}
            </Card>

            {isFormOpen && (
                <SMREditorForm 
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSave={handleSave}
                    existingField={editingField}
                    initialData={clonedInitialData}
                    isSaving={isSaving}
                />
            )}

            {fieldToDelete && (
                 <ConfirmModal
                    isOpen={isDeleteConfirmOpen}
                    onClose={() => setDeleteConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Confirm Deletion"
                    message={deleteMessage}
                    isLoading={isSaving}
                />
            )}

            {instructionModalContent && (
                <InstructionModal
                    isOpen={!!instructionModalContent}
                    onClose={() => setInstructionModalContent(null)}
                    title={instructionModalContent.title}
                    type={instructionModalContent.type}
                >
                    {instructionModalContent.content}
                </InstructionModal>
            )}
        </div>
    );
};

export default SMREditor;
