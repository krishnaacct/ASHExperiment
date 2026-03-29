import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { usePeople } from '../../hooks/usePeople';
import { useAuth } from '../../hooks/useAuth';
import { Person } from '../../types';
import PeopleList from './PeopleList';
import PersonDetails from './PersonDetails';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, Users2, CheckSquare, Edit } from 'lucide-react';
import { Input } from '../ui/Input';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';
import { SurfaceLoader } from '../common/SurfaceLoader';
import { PaginationControls } from '../common/PaginationControls';
import { toast } from '../ui/Toast';
import BulkUpdateModal from './BulkUpdateModal';

interface PeopleManagementProps {
    initialSelectedPersonId?: string | null;
}

const PeopleManagement: React.FC<PeopleManagementProps> = ({ initialSelectedPersonId = null }) => {
    const { hasPermission } = useAuth();
    const { people, totalPeople, loading, fetchPeople, addPerson, updatePerson, deletePerson, findPersonPage, bulkUpdate } = usePeople();
    
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);
    const [showAll, setShowAll] = useState(false);

    // Bulk Action State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const fetchData = useCallback(() => {
        const pageToFetch = showAll ? 1 : currentPage;
        const sizeToFetch = showAll ? 10000 : pageSize;
        fetchPeople(pageToFetch, sizeToFetch);
    }, [fetchPeople, currentPage, pageSize, showAll]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Clear selection when page or search changes to avoid confusion
    useEffect(() => {
        setSelectedIds(new Set());
    }, [currentPage, searchTerm, pageSize, showAll]);

    useEffect(() => {
        if (initialSelectedPersonId && findPersonPage) {
            findPersonPage(initialSelectedPersonId, pageSize).then(({ page }) => {
                if (page && page !== currentPage) {
                    setCurrentPage(page);
                }
                setSelectedPersonId(initialSelectedPersonId);
                setIsAddingNew(false);
            }).catch(error => {
                console.error("Failed to find person page:", error);
                toast("Could not locate the selected person.", "error");
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSelectedPersonId]);

    const handleSelectPerson = (person: Person) => {
        setSelectedPersonId(person.personId);
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setSelectedPersonId(null);
        setIsAddingNew(true);
    };

    const handleCancel = () => {
        setSelectedPersonId(null);
        setIsAddingNew(false);
    };

    const handleSaveOrDelete = () => {
        fetchData(); // Refetch current page
        setSelectedPersonId(null);
        setIsAddingNew(false);
    }
    
    const handleToggleSelect = (personId: string, isSelected: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (isSelected) next.add(personId);
            else next.delete(personId);
            return next;
        });
    };

    const handleSelectAll = (isSelected: boolean) => {
        if (isSelected) {
            const allIds = filteredPeople.map(p => p.personId);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkUpdateConfirm = async (fieldName: string, value: any) => {
        try {
            const result = await bulkUpdate(Array.from(selectedIds), fieldName, value);
            toast(`Updated ${result.count} records successfully.`, 'success');
            setIsBulkModalOpen(false);
            fetchData();
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Bulk update failed.', 'error');
        }
    };

    const handlePageSizeChange = (newSize: number | 'all') => {
        if (newSize === 'all') {
            setShowAll(true);
        } else {
            setShowAll(false);
            setPageSize(newSize);
            setCurrentPage(1);
        }
    };

    const selectedPerson = useMemo(() => people.find(p => p.personId === selectedPersonId), [people, selectedPersonId]);

    const filteredPeople = useMemo(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return people.filter(person =>
            (person.name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
            (person.primaryMobile || '').toString().toLowerCase().includes(lowerCaseSearchTerm) ||
            (person.telegramId || '').toString().toLowerCase().includes(lowerCaseSearchTerm)
        );
    }, [people, searchTerm]);
    
    if (loading && totalPeople === 0) {
        return (
            <div>
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-[var(--foreground)]">People Management</h1>
                    {hasPermission('people_add') && (
                        <Button disabled size="md">
                            <Plus className="mr-2 h-5 w-5" /> Add New Person
                        </Button>
                    )}
                </div>
                <WorkstationSkeleton type="list-detail" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">People Management</h1>
                {hasPermission('people_add') && (
                    <Button onClick={handleAddNew} size="md">
                        <Plus className="mr-2 h-5 w-5" /> Add New Person
                    </Button>
                )}
            </div>
            
            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && hasPermission('people_edit') && (
                <div className="mb-4 p-3 bg-[var(--accent-background)] border border-[var(--primary-color)] rounded-lg flex items-center justify-between shadow-sm animate-fade-in-down">
                    <div className="flex items-center text-[var(--primary-color)] font-semibold">
                        <CheckSquare className="h-5 w-5 mr-2" />
                        {selectedIds.size} Person(s) Selected
                    </div>
                    <Button onClick={() => setIsBulkModalOpen(true)} size="sm" variant="primary">
                        <Edit className="h-4 w-4 mr-2" /> Bulk Update
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 h-fit flex flex-col relative overflow-hidden">
                    {loading && <SurfaceLoader label="Refreshing people..." />}
                    <div className='p-4 border-b border-[var(--border)]'>
                        <Input
                            placeholder="Search current page..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <PeopleList 
                        people={filteredPeople} 
                        selectedPerson={selectedPerson} 
                        onSelectPerson={handleSelectPerson} 
                        loading={loading}
                        selectedIds={selectedIds}
                        onToggleSelection={handleToggleSelect}
                        onSelectAll={handleSelectAll}
                    />
                    <PaginationControls
                        currentPage={currentPage}
                        pageSize={pageSize}
                        totalItems={totalPeople}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={handlePageSizeChange}
                        showAll={showAll}
                    />
                </Card>
                <div className="lg:col-span-2">
                    {selectedPersonId || isAddingNew ? (
                        <PersonDetails
                            key={selectedPersonId || 'new-person'}
                            person={isAddingNew ? null : selectedPerson}
                            onSave={handleSaveOrDelete}
                            onDelete={handleSaveOrDelete}
                            onCancel={handleCancel}
                            addPerson={addPerson}
                            updatePerson={updatePerson}
                            deletePerson={deletePerson}
                        />
                    ) : (
                         <Card>
                            <div className="flex flex-col items-center justify-center h-full p-20 text-center bg-[var(--placeholder-background)] rounded-2xl">
                                <Users2 className="h-16 w-16 mx-auto mb-4 text-[var(--foreground-muted)]" />
                                <h3 className="text-lg font-medium text-[var(--foreground)]">Select a person to view details</h3>
                                <p className="text-sm mt-2 text-[var(--foreground-muted)]">Or click "Add New Person" to create a new one.</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
            
            {isBulkModalOpen && (
                <BulkUpdateModal
                    isOpen={isBulkModalOpen}
                    onClose={() => setIsBulkModalOpen(false)}
                    selectedCount={selectedIds.size}
                    onConfirm={handleBulkUpdateConfirm}
                />
            )}
        </div>
    );
};

export default PeopleManagement;