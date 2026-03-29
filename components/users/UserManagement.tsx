import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';
import UserList from './UserList';
import UserDetails from './UserDetails';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, Users } from 'lucide-react';
import { Input } from '../ui/Input';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';
import { SurfaceLoader } from '../common/SurfaceLoader';
import { PaginationControls } from '../common/PaginationControls';
import { toast } from '../ui/Toast';

interface UserManagementProps {
    initialSelectedUserId?: string | null;
}

const UserManagement: React.FC<UserManagementProps> = ({ initialSelectedUserId = null }) => {
    const { hasPermission } = useAuth();
    const { users, totalUsers, loading, permissionsMap, unassignedPeople, fetchUsers, fetchUnassignedPeople, addUser, updateUser, deleteUser, updateUserPermissions, getAllUsers, findUserPage } = useUsers();
    
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsersForNotifications, setAllUsersForNotifications] = useState<User[]>([]);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [showAll, setShowAll] = useState(false);

    const fetchData = useCallback(() => {
        const pageToFetch = showAll ? 1 : currentPage;
        const sizeToFetch = showAll ? 10000 : pageSize;
        fetchUsers(pageToFetch, sizeToFetch);
        // Also fetch data needed for sub-components, like the "Add" form
        if (hasPermission('users_add')) {
            fetchUnassignedPeople();
        }
    }, [fetchUsers, currentPage, pageSize, showAll, hasPermission, fetchUnassignedPeople]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        // Fetch all users for the notification system when the component loads, if the user has permission to add new users.
        if (hasPermission('users_add')) {
            getAllUsers().then(setAllUsersForNotifications);
        }
    }, [getAllUsers, hasPermission]);


    // This effect handles navigating to a specific user from an external source (like global search)
    useEffect(() => {
        if (initialSelectedUserId && findUserPage) {
            // Asynchronously find out which page the user is on.
            findUserPage(initialSelectedUserId, pageSize).then(({ page }) => {
                if (page && page !== currentPage) {
                    // If the user is on a different page, change to that page.
                    // This will trigger the main data fetching useEffect.
                    setCurrentPage(page);
                }
                // In either case, set the selected user ID so the details pane can show a loading state
                // and then render the user once the data arrives.
                setSelectedUserId(initialSelectedUserId);
                setIsAddingNew(false);
            }).catch(error => {
                console.error("Failed to find user page:", error);
                toast("Could not locate the selected user.", "error");
            });
        }
    // This effect should only run when the initial user ID from props changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSelectedUserId]);

    const handleSelectUser = (user: User) => {
        setSelectedUserId(user.userId);
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setSelectedUserId(null);
        setIsAddingNew(true);
    };

    const handleCancel = () => {
        setSelectedUserId(null);
        setIsAddingNew(false);
    };

    const handleSaveOrDelete = () => {
        fetchData();
        setSelectedUserId(null);
        setIsAddingNew(false);
    }
    
    const handlePageSizeChange = (newSize: number | 'all') => {
        if (newSize === 'all') {
            if (totalUsers > 200) {
                 toast('Loading all users may impact performance.', 'info');
            }
            setShowAll(true);
        } else {
            setShowAll(false);
            setPageSize(newSize);
            setCurrentPage(1);
        }
    };

    const selectedUser = useMemo(() => users.find(u => u.userId === selectedUserId), [users, selectedUserId]);

    const filteredUsers = useMemo(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return users.filter(user =>
            (user.name || '').toString().toLowerCase().includes(lowerCaseSearchTerm) ||
            (user.primaryMobile || '').toString().toLowerCase().includes(lowerCaseSearchTerm) ||
            (user.roleLabel || '').toString().toLowerCase().includes(lowerCaseSearchTerm)
        );
    }, [users, searchTerm]);
    
    if (loading && totalUsers === 0) {
        return (
            <div>
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-[var(--foreground)]">User Management</h1>
                    {hasPermission('users_add') && (
                        <Button disabled size="md">
                            <Plus size={24} strokeWidth={2.5} className="mr-2" /> Add New User
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
                <h1 className="text-3xl font-bold text-[var(--foreground)]">User Management</h1>
                {hasPermission('users_add') && (
                    <Button onClick={handleAddNew} size="md">
                        <Plus size={24} strokeWidth={2.5} className="mr-2" /> Add New User
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 h-fit flex flex-col relative overflow-hidden">
                    {loading && <SurfaceLoader label="Refreshing users..." />}
                    <div className='p-4 border-b border-[var(--border)]'>
                        <Input
                            placeholder="Search current page..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <UserList users={filteredUsers} selectedUser={selectedUser} onSelectUser={handleSelectUser} loading={loading} />
                    <PaginationControls
                        currentPage={currentPage}
                        pageSize={pageSize}
                        totalItems={totalUsers}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={handlePageSizeChange}
                        showAll={showAll}
                    />
                </Card>
                <div className="lg:col-span-2">
                    {selectedUserId || isAddingNew ? (
                        <UserDetails
                            key={selectedUserId || 'new-user'}
                            user={isAddingNew ? null : selectedUser}
                            permissions={selectedUser ? permissionsMap[selectedUser.userId] : []}
                            unassignedPeople={unassignedPeople}
                            onSave={handleSaveOrDelete}
                            onDelete={handleSaveOrDelete}
                            onCancel={handleCancel}
                            // Pass down functions from the useUsers hook
                            addUser={addUser}
                            updateUser={updateUser}
                            deleteUser={deleteUser}
                            updateUserPermissions={updateUserPermissions}
                            allUsersForNotifications={allUsersForNotifications}
                        />
                    ) : (
                         <Card>
                            <div className="flex flex-col items-center justify-center h-full p-20 text-center bg-[var(--placeholder-background)] rounded-2xl">
                                <Users className="h-16 w-16 mx-auto mb-4 text-[var(--foreground-muted)]" />
                                <h3 className="text-lg font-medium text-[var(--foreground)]">Select a user to view details</h3>
                                <p className="text-sm mt-2 text-[var(--foreground-muted)]">Or click "Add New User" to create a new one.</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;