import React, { useState, useEffect, useMemo } from 'react';
import { Person, SuperMasterRecord } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { DynamicFormEngine } from '../common/DynamicFormEngine';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useSMR } from '../../hooks/useSMR';
import { usePeople } from '../../hooks/usePeople'; // Import the new hook

interface PersonDetailsProps {
    person: Person | null;
    onSave: () => void;
    onDelete: () => void;
    onCancel: () => void;
    addPerson: (person: Partial<Person>) => Promise<Person>;
    updatePerson: (person: Person) => Promise<void>;
    deletePerson: (personId: string) => Promise<void>;
}

const PersonDetails: React.FC<PersonDetailsProps> = ({ 
    person, 
    onSave, 
    onDelete, 
    onCancel,
    addPerson,
    updatePerson,
    deletePerson
}) => {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const { hasPermission } = useAuth();
    const { superMasterRecord } = useSMR();
    const { getAllPeople } = usePeople(); // Use the hook to get the fetch function
    const [allPeople, setAllPeople] = useState<Person[]>([]); // Local state for the list
    const [isPeopleLoading, setIsPeopleLoading] = useState(false);

    const isEditing = person !== null;
    const canEditPerson = hasPermission('people_edit');
    const canAddPerson = hasPermission('people_add');
    const canDeletePerson = hasPermission('people_delete');

    useEffect(() => {
        // Fetch the list of all people when the component mounts
        // This is needed for the 'Partner ID' dropdown.
        setIsPeopleLoading(true);
        getAllPeople().then(setAllPeople).finally(() => setIsPeopleLoading(false));
    }, [getAllPeople]);

    const peopleOptions = useMemo(() => {
        return allPeople
            .filter(p => p.personId !== person?.personId) // Don't allow selecting self as partner
            .map(p => ({
                value: p.personId,
                label: p.name || 'Unnamed Person'
            }));
    }, [allPeople, person]);

    const personFormFields = useMemo(() => {
        const moduleDataScope = "People";
        let fields = superMasterRecord
            .filter(field => {
                try {
                    const modules = JSON.parse(field.modules || '[]');
                    return Array.isArray(modules) && modules.includes(moduleDataScope);
                } catch { return false; }
            });

        if (!isEditing) {
            fields = fields.filter(field => !field.isPrimaryKey);
        }

        fields.sort((a, b) => {
            let sortOrderA = Infinity, sortOrderB = Infinity;
            try {
                if (a.sortOrders) {
                    const orders = JSON.parse(a.sortOrders || '{}');
                    if (orders[moduleDataScope] !== undefined) sortOrderA = orders[moduleDataScope];
                }
            } catch {}
            try {
                if (b.sortOrders) {
                    const orders = JSON.parse(b.sortOrders || '{}');
                    if (orders[moduleDataScope] !== undefined) sortOrderB = orders[moduleDataScope];
                }
            } catch {}
            if (sortOrderA !== Infinity || sortOrderB !== Infinity) return sortOrderA - sortOrderB;
            return a.displayName.localeCompare(b.displayName);
        });

        return fields;
    }, [superMasterRecord, isEditing]);

    const groupedFormFields = useMemo(() => {
        const groups: Record<string, SuperMasterRecord[]> = { __ungrouped__: [] };
        personFormFields.forEach(field => {
            const groupName = field.groupName || '__ungrouped__';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(field);
        });
        return groups;
    }, [personFormFields]);

    useEffect(() => {
        if (isEditing && !person) {
            setIsLoading(true);
            return;
        }

        if (person) {
            const initialData: Record<string, any> = {};
            personFormFields.forEach(field => {
                 if (field.fieldName === 'name') {
                    initialData[field.fieldName] = person.name || `${person.firstName} ${person.lastName}`.trim();
                } else {
                    initialData[field.fieldName] = person[field.fieldName] ?? field.defaultValue ?? '';
                }
            });
            setFormData(initialData);
        } else {
            const defaultData: Record<string, any> = {};
            personFormFields.forEach(field => {
                defaultData[field.fieldName] = field.defaultValue === 'TRUE' ? true : (field.defaultValue || '');
            });
            setFormData(defaultData);
        }
        setIsLoading(false);
    }, [person, isEditing, personFormFields]);
    
    const handleFormChange = (fieldName: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setIsLoading(true);
        try {
            if (isEditing && person) {
                if(!canEditPerson) {
                    toast('You do not have permission to edit people.', 'error');
                    return;
                }
                const updatedPersonData: Person = { 
                    personId: person.personId,
                    ...formData
                } as Person;
                await updatePerson(updatedPersonData);
                toast('Person updated successfully', 'success');
            } else {
                 if(!canAddPerson) {
                    toast('You do not have permission to add people.', 'error');
                    return;
                }
                await addPerson(formData);
                toast('Person added successfully', 'success');
            }
            onSave();
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to save person', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!isEditing || !person || !canDeletePerson) return;

        setIsLoading(true);
        try {
            await deletePerson(person.personId);
            toast('Person deleted successfully', 'success');
            onDelete();
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to delete person', 'error');
        } finally {
            setIsLoading(false);
            setDeleteConfirmOpen(false);
        }
    };
    
    if (isEditing && !person) {
        return <Card><div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading person details...</div></Card>;
    }

    const personName = person?.name || `${person?.firstName} ${person?.lastName}`.trim();

    return (
        <>
            <form onSubmit={handleSave}>
                <Card>
                    <div className="p-6 space-y-6">
                        <h2 className="text-2xl font-bold text-[var(--foreground)]">{isEditing ? `Edit Person: ${personName}` : 'Add New Person'}</h2>
                        
                        {Object.keys(groupedFormFields).map((groupName) => {
                            const fields = groupedFormFields[groupName];
                            if (fields.length === 0) return null;
                            const isUngrouped = groupName === '__ungrouped__';
                            
                            return (
                                <fieldset key={groupName} className={!isUngrouped ? "border-t border-[var(--border)] pt-4" : ""}>
                                    {!isUngrouped && <legend className="text-lg font-semibold text-[var(--foreground)] py-2">{groupName}</legend>}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <DynamicFormEngine
                                            moduleName="People"
                                            fieldNames={fields.map(f => f.fieldName)}
                                            formData={formData as Record<string, string | boolean>}
                                            onFormChange={handleFormChange}
                                            disabled={isLoading || (isEditing && !canEditPerson)}
                                            isEditing={isEditing}
                                            lookupData={{ 'People': peopleOptions }}
                                            lookupLoading={{ 'People': isPeopleLoading }}
                                        />
                                    </div>
                                </fieldset>
                            );
                        })}
                    </div>
                    <div className="px-6 py-4 bg-[var(--card-footer-background)] border-t border-[var(--border)] flex justify-between items-center">
                        <div>
                            {isEditing && canDeletePerson && (
                                <Button type="button" variant="danger" onClick={() => setDeleteConfirmOpen(true)} disabled={isLoading} isLoading={isLoading && isDeleteConfirmOpen}>Delete</Button>
                            )}
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>Cancel</Button>
                            <Button type="submit" isLoading={isLoading && !isDeleteConfirmOpen} disabled={isLoading || (!canAddPerson && !isEditing) || (!canEditPerson && isEditing)}>
                                {isEditing ? 'Save Changes' : 'Create Person'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </form>

            {isEditing && person && (
                <ConfirmModal
                    isOpen={isDeleteConfirmOpen}
                    onClose={() => setDeleteConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Confirm Deletion"
                    message={`Are you sure you want to delete "${personName}"? This will also remove any roles (like User access) assigned to them. This action cannot be undone.`}
                    isLoading={isLoading}
                />
            )}
        </>
    );
};

export default PersonDetails;