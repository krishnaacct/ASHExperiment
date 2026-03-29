
import React, { useState, useMemo, useEffect } from 'react';
import { useMasters } from '../../hooks/useMasters';
import { MasterDataItem } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '../ui/Toast';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import MasterDataForm from './MasterDataForm';
import { ConfirmModal } from '../ui/ConfirmModal';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';

const MastersManagement: React.FC = () => {
    const { masterDataItems, loading, fetchMasterDataItems, isSaving, createMasterDataItem, updateMasterDataItem, deleteMasterDataItem } = useMasters();
    const [filter, setFilter] = useState<string>('');
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<MasterDataItem | null>(null);

    useEffect(() => {
        fetchMasterDataItems();
    }, [fetchMasterDataItems]);

    const filterOptions = useMemo(() => {
        const uniqueNames = [...new Set(masterDataItems.map(item => item.masterName))];
        return uniqueNames.sort().map(name => ({ value: name, label: name }));
    }, [masterDataItems]);

    const filteredData = useMemo(() => {
        if (!filter) return masterDataItems;
        return masterDataItems.filter(item => item.masterName === filter);
    }, [masterDataItems, filter]);

    const handleAddNew = () => {
        setEditingItem(null);
        setIsFormOpen(true);
    };

    const handleEdit = (item: MasterDataItem) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleDeleteRequest = (item: MasterDataItem) => {
        setItemToDelete(item);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteMasterDataItem(itemToDelete.masterId);
            toast('Item deleted successfully', 'success');
            setItemToDelete(null);
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to delete item', 'error');
        }
    };

    const handleSave = async (itemData: MasterDataItem) => {
        try {
            if (editingItem) {
                await updateMasterDataItem(itemData);
                toast('Item updated successfully', 'success');
            } else {
                await createMasterDataItem(itemData);
                toast('Item created successfully', 'success');
            }
            setIsFormOpen(false);
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to save item', 'error');
        }
    };

    if (loading && !masterDataItems.length) {
        return <WorkstationSkeleton type="list-detail" />;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                 <h1 className="text-3xl font-bold text-[var(--foreground)]">Masters Management</h1>
                 <Button onClick={handleAddNew} size="md">
                    <Plus size={24} strokeWidth={2.5} className="mr-2" /> Add New Item
                </Button>
            </div>
           
            <Card>
                 <div className="p-4 border-b border-[var(--border)]">
                    <Select
                        label="Filter by Master Name:"
                        value={filter}
                        onChange={setFilter}
                        options={filterOptions}
                        className="w-full sm:w-72"
                        required={false}
                    />
                </div>
                
                <ScrollableTableContainer>
                    <table className="min-w-full divide-y divide-[var(--border)]">
                        <thead className="bg-[var(--card-inset-background)]">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Label</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Master Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--card-background)] divide-y divide-[var(--border)]">
                            {filteredData.map((item) => (
                                <tr key={item.masterId}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-[var(--foreground)]">{item.label}</div>
                                        <div className="text-xs text-[var(--foreground-muted)] font-mono">{item.masterId}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[var(--foreground-muted)]">{item.value}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><Badge variant="primary">{item.masterName}</Badge></td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant={item.isActive ? 'success' : 'danger'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <Button variant="secondary" size="sm" onClick={() => handleEdit(item)} className="p-0 h-9 w-9 shadow-sm" title="Edit">
                                                <Edit size={24} strokeWidth={2.5} />
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => handleDeleteRequest(item)} className="p-0 h-9 w-9 shadow-sm" title="Delete">
                                                <Trash2 size={24} strokeWidth={2.5} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredData.length === 0 && !loading && (
                        <p className="p-6 text-center text-[var(--foreground-muted)]">No items found for this filter.</p>
                    )}
                </ScrollableTableContainer>
            </Card>

            {isFormOpen && (
                <MasterDataForm 
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSave={handleSave}
                    existingItem={editingItem}
                    isSaving={isSaving}
                />
            )}

            {itemToDelete && (
                 <ConfirmModal
                    isOpen={!!itemToDelete}
                    onClose={() => setItemToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Confirm Deletion"
                    message={`Are you sure you want to delete the item "${itemToDelete.label}"? This may affect dropdowns that use this value.`}
                    isLoading={isSaving}
                />
            )}
        </div>
    );
};

export default MastersManagement;
