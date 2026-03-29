import React, { useState, useEffect, useMemo } from 'react';
import { User, Permission, SuperMasterRecord, PermissionDefinition, Person } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { DynamicFormEngine } from '../common/DynamicFormEngine';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Checkbox } from '../ui/Checkbox';
import { useSMR } from '../../hooks/useSMR';
import { usePermissions } from '../../hooks/usePermissions';
import { Select } from '../ui/Select';
import { AlertTriangle, UserPlus } from 'lucide-react';

interface UserDetailsProps {
    user: User | null; // null means we are adding a new user
    permissions: Permission[]; // New: Permissions are now passed as a prop
    unassignedPeople: Person[]; // New: Pre-fetched list of people
    onSave: () => void;
    onDelete: () => void;
    onCancel: () => void;
    // Functions passed down from useUsers hook via parent
    addUser: (user: Partial<User>) => Promise<User>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    updateUserPermissions: (userId: string, permissions: Permission[]) => Promise<void>;
    allUsersForNotifications: User[];
}

const userOnlyFieldNames = ['roleLabel', 'activeStatus', 'mobileFavorites'];

const UserDetails: React.FC<UserDetailsProps> = ({ 
    user, 
    permissions,
    unassignedPeople,
    onSave, 
    onDelete, 
    onCancel,
    addUser,
    updateUser,
    deleteUser,
    updateUserPermissions,
}) => {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [userPermissions, setUserPermissions] = useState<Set<Permission>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

    const { user: currentUser, hasPermission, refreshSessionData } = useAuth();
    const { superMasterRecord } = useSMR();
    const { permissionDefinitions, loading: permissionsLoading } = usePermissions();

    const isAddingNew = user === null;
    const isEditing = !isAddingNew;
    const canEditUser = hasPermission('users_edit');
    const canEditPermissions = hasPermission('permissions_edit');

    const groupedPermissions = useMemo(() => {
        return permissionDefinitions.reduce((acc, perm) => {
            const category = perm.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(perm);
            return acc;
        }, {} as Record<string, PermissionDefinition[]>);
    }, [permissionDefinitions]);

    useEffect(() => {
        setUserPermissions(new Set(permissions || []));
    }, [permissions]);

    useEffect(() => {
        if (isAddingNew) {
            // This runs when switching to "add new" mode OR when a person is selected.
            const defaultData: Record<string, any> = {};
            const fields = superMasterRecord.filter(f => userOnlyFieldNames.includes(f.fieldName));
            fields.forEach(field => {
                defaultData[field.fieldName] = field.defaultValue === 'TRUE' ? true : (field.defaultValue || '');
            });

            if (selectedPerson) {
                // When a person is selected, add their data to the form for display
                const personFields = superMasterRecord.filter(f => ['primaryMobile', 'telegramId', 'name'].includes(f.fieldName));
                personFields.forEach(field => {
                   if (field.fieldName === 'primaryMobile') {
                       defaultData[field.fieldName] = selectedPerson.primaryMobile || '';
                   } else if (field.fieldName === 'name') {
                        defaultData[field.fieldName] = selectedPerson.name || '';
                   }
                   else {
                       defaultData[field.fieldName] = selectedPerson[field.fieldName] || '';
                   }
                });
            }
            
            setFormData(defaultData);
        } else {
            // This is for edit mode
            if (user) {
                setFormData(user);
            } else {
                setFormData({});
                setSelectedPerson(null);
            }
        }
    }, [user, isAddingNew, superMasterRecord, selectedPerson]);
    
    const handleFormChange = (fieldName: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    const handlePermissionChange = (permissionName: string, checked: boolean) => {
        setUserPermissions(prev => {
            const newPerms = new Set(prev);
            if (checked) newPerms.add(permissionName);
            else newPerms.delete(permissionName);
            return newPerms;
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setIsLoading(true);
        try {
            if (isEditing && user) {
                if(!canEditUser) {
                    toast('You do not have permission to edit users.', 'error');
                    setIsLoading(false);
                    return;
                }
                const updatedUserData: User = { 
                    userId: user.userId,
                    ...formData
                } as User;
                await updateUser(updatedUserData);
                if(canEditPermissions) {
                    await updateUserPermissions(user.userId, Array.from(userPermissions));
                    if (currentUser && user.userId === currentUser.userId) {
                        toast('Permissions updated. Refreshing your session...', 'info');
                        await refreshSessionData();
                    }
                }
                toast('User updated successfully', 'success');
            } else { // Adding new user
                 if(!hasPermission('users_add') || !selectedPerson) {
                    toast('Please select a person to grant user access.', 'error');
                    setIsLoading(false);
                    return;
                }
                // NEW VALIDATION LOGIC
                if (!selectedPerson.primaryMobile || !selectedPerson.telegramId) {
                    let missing = [];
                    if (!selectedPerson.primaryMobile) missing.push("Primary Mobile");
                    if (!selectedPerson.telegramId) missing.push("Telegram ID");
                    toast(`Cannot create user. The selected person is missing: ${missing.join(', ')}.`, 'error');
                    setIsLoading(false);
                    return;
                }
                const newUserData = { ...formData, personId: selectedPerson.personId };
                await addUser(newUserData);
                toast('User access granted successfully', 'success');
            }
            onSave();
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to save user', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!isEditing || !user || !hasPermission('users_delete')) return;

        setIsLoading(true);
        try {
            await deleteUser(user.userId);
            toast('User deleted successfully', 'success');
            onDelete();
        } catch (error) {
            toast('Failed to delete user', 'error');
        } finally {
            setIsLoading(false);
            setDeleteConfirmOpen(false);
        }
    };

    const { groupedFields, groupOrder } = useMemo(() => {
        const moduleDataScope = "Users";
        let fields = superMasterRecord.filter(field => {
            if (isAddingNew) {
                // In "add" mode, show user-specific fields AND the informational person fields
                return userOnlyFieldNames.includes(field.fieldName) || ['primaryMobile', 'telegramId', 'name'].includes(field.fieldName);
            }
            // In "edit" mode, show all fields for the "Users" module
            try {
                const modules = JSON.parse(field.modules || '[]');
                return Array.isArray(modules) && modules.includes(moduleDataScope);
            } catch { return false; }
        });

        if (isAddingNew) {
            fields = fields.filter(field => !field.isPrimaryKey);
        }

        // 1. SORT FIRST
        fields.sort((a, b) => {
            let sortA = Infinity, sortB = Infinity;
            try { if (a.sortOrders) sortA = JSON.parse(a.sortOrders)[moduleDataScope] || Infinity; } catch {}
            try { if (b.sortOrders) sortB = JSON.parse(b.sortOrders)[moduleDataScope] || Infinity; } catch {}
            return sortA - sortB;
        });

        // 2. THEN GROUP
        const groups: Record<string, SuperMasterRecord[]> = { '__ungrouped__': [] };
        const order: string[] = ['__ungrouped__'];

        fields.forEach(field => {
            const groupName = field.groupName || '__ungrouped__';
            if (!groups[groupName]) {
                groups[groupName] = [];
                order.push(groupName);
            }
            groups[groupName].push(field);
        });
        
        const finalOrder = order.filter(g => groups[g] && groups[g].length > 0);

        return { groupedFields: groups, groupOrder: finalOrder };
    }, [superMasterRecord, isAddingNew]);

    const isFieldDisabled = (field: SuperMasterRecord): boolean => {
        if (isAddingNew) {
            return ['primaryMobile', 'telegramId', 'name'].includes(field.fieldName);
        }
        // Core identity fields are read-only in this module
        return !userOnlyFieldNames.includes(field.fieldName);
    };

    if (isAddingNew) {
        if (!selectedPerson) {
            return (
                <Card>
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">Add New User (Step 1 of 2)</h2>
                         <Select
                            label="Select a person to grant user access:"
                            value={selectedPerson?.personId || ''}
                            onChange={value => {
                                const person = unassignedPeople.find(p => p.personId === value);
                                setSelectedPerson(person || null);
                            }}
                            options={unassignedPeople.map(p => ({ 
                                value: p.personId, 
                                label: p.name || p.personId
                            }))}
                        />
                         <p className="text-sm text-gray-500 mt-2">If the person is not in this list, first add them in the "People" module.</p>
                    </div>
                     <div className="px-6 py-4 bg-[var(--card-footer-background)] border-t border-[var(--border)] flex justify-end">
                        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                    </div>
                </Card>
            );
        }
    }

    if (isEditing && !user) {
        return <Card><div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading user details...</div></Card>;
    }

    const formIsLoading = isLoading || permissionsLoading;
    const constructedName = isAddingNew ? selectedPerson?.name || '' : user?.name;

    return (
        <>
            <form onSubmit={handleSave}>
                <Card>
                    <div className="p-6 space-y-6">
                        {isEditing && (
                            <div className="p-3 bg-[var(--toast-info-background)] text-[var(--toast-info-foreground)] rounded-lg flex items-start space-x-3 text-sm">
                                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <span>Core identity details (name, contact info) are managed in the <strong>People</strong> module.</span>
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-[var(--foreground)]">{isAddingNew ? `Grant User Access: ${constructedName}` : `Edit User: ${user?.name}`}</h2>
                        
                        {groupOrder.map((groupName) => {
                            const fields = groupedFields[groupName];
                            if (!fields || fields.length === 0) return null;
                            const isUngrouped = groupName === '__ungrouped__';
                            
                            return (
                                <fieldset key={groupName} className={!isUngrouped ? "border-t border-[var(--border)] pt-4" : ""}>
                                    {!isUngrouped && <legend className="text-lg font-semibold text-[var(--foreground)] py-2">{groupName}</legend>}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <DynamicFormEngine
                                            moduleName="Users"
                                            fieldNames={fields.map(f => f.fieldName)}
                                            formData={formData as Record<string, string | boolean>}
                                            onFormChange={handleFormChange}
                                            disabled={formIsLoading || (isEditing && !canEditUser)}
                                            isEditing={isEditing}
                                            isFieldDisabled={isFieldDisabled}
                                        />
                                    </div>
                                </fieldset>
                            );
                        })}
                        
                        {isEditing && hasPermission('permissions_view') && (
                            <div>
                                <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">Permissions</h3>
                                <div className="space-y-4 p-4 border border-[var(--border)] rounded-lg bg-[var(--card-inset-background)] max-h-80 overflow-y-auto">
                                    {Object.keys(groupedPermissions).sort().map(category => (
                                        <div key={category}>
                                            <p className="font-bold text-[var(--foreground)]">{category}</p>
                                            <div className="mt-2 space-y-2 pl-2">
                                                {groupedPermissions[category].map(permission => (
                                                    <div key={permission.permissionId}>
                                                        <Checkbox
                                                            id={`perm-${permission.permissionName}`}
                                                            checked={userPermissions.has(permission.permissionName)}
                                                            onChange={(e) => handlePermissionChange(permission.permissionName, e.target.checked)}
                                                            disabled={!canEditPermissions || formIsLoading}
                                                            label={(
                                                                <span className="text-sm text-[var(--foreground)]">
                                                                    {permission.description}
                                                                    <span className="block text-xs text-[var(--foreground-muted)] font-mono">({permission.permissionName})</span>
                                                                </span>
                                                            )}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-4 bg-[var(--card-footer-background)] border-t border-[var(--border)] flex justify-between items-center">
                        <div>
                            {isEditing && hasPermission('users_delete') && (
                                <Button type="button" variant="danger" onClick={() => setDeleteConfirmOpen(true)} disabled={formIsLoading} isLoading={isLoading && isDeleteConfirmOpen}>Delete</Button>
                            )}
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="secondary" onClick={onCancel} disabled={formIsLoading}>Cancel</Button>
                            <Button type="submit" isLoading={isLoading && !isDeleteConfirmOpen} disabled={formIsLoading || (!hasPermission('users_add') && isAddingNew) || (!canEditUser && isEditing)}>
                                {isAddingNew ? 'Create User' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </form>

            {isEditing && user && (
                <ConfirmModal
                    isOpen={isDeleteConfirmOpen}
                    onClose={() => setDeleteConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Confirm Deletion"
                    message={`Are you sure you want to delete the user "${user.name}"? This action cannot be undone.`}
                    isLoading={isLoading}
                />
            )}
        </>
    );
};

export default UserDetails;
