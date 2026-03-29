import React, { useMemo } from 'react';
import { User } from '../../types';
import { Badge } from '../ui/Badge';
import { useSMR } from '../../hooks/useSMR';

interface UserListProps {
    users: User[];
    selectedUser: User | null | undefined;
    onSelectUser: (user: User) => void;
    loading: boolean;
}

const UserList: React.FC<UserListProps> = ({ users, selectedUser, onSelectUser, loading }) => {
    const { superMasterRecord } = useSMR();

    const { textColumns, statusColumn } = useMemo(() => {
        const moduleDataScope = "Users";
        if (!superMasterRecord || superMasterRecord.length === 0) {
            return { textColumns: [], statusColumn: null };
        }

        const listColumns = superMasterRecord
            .filter(field => {
                try {
                    return field.displayInList && JSON.parse(field.modules).includes(moduleDataScope);
                } catch { return false; }
            })
            .sort((a, b) => {
                let orderA = Infinity, orderB = Infinity;
                try {
                    if (a.sortOrders) orderA = JSON.parse(a.sortOrders)[moduleDataScope] ?? Infinity;
                } catch {}
                 try {
                    if (b.sortOrders) orderB = JSON.parse(b.sortOrders)[moduleDataScope] ?? Infinity;
                } catch {}
                
                if (orderA !== Infinity || orderB !== Infinity) {
                    return orderA - orderB;
                }
                return a.displayName.localeCompare(b.displayName);
            });
        
        const status = listColumns.find(c => c.dataType === 'boolean');
        const texts = listColumns.filter(c => c.dataType !== 'boolean');

        return { textColumns: texts, statusColumn: status };
    }, [superMasterRecord]);


    return (
        <div className="relative flex-grow">
            <div className="overflow-y-auto max-h-[calc(100vh-350px)]">
                <ul role="list" className="divide-y divide-[var(--border)]">
                    {users.map((user) => (
                        <li key={user.userId}>
                            <button
                                onClick={() => onSelectUser(user)}
                                className={`block w-full text-left p-4 transition-colors duration-150 ${
                                    selectedUser?.userId === user.userId
                                        ? 'bg-[var(--list-item-active-background)]'
                                        : 'hover:bg-[var(--list-item-hover-background)]'
                                }`}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className={`flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-tr from-[var(--primary-color)] to-purple-400 flex items-center justify-center text-white font-bold`}>
                                        {user.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {textColumns.length > 0 ? (
                                            textColumns.map((col, index) => (
                                                <p 
                                                    key={col.fieldId} 
                                                    className={`${index === 0 ? 'text-sm font-medium text-[var(--foreground)]' : 'text-sm text-[var(--foreground-muted)]'} truncate`}
                                                >
                                                    {String(user[col.fieldName] || '')}
                                                </p>
                                            ))
                                        ) : (
                                            <p className="text-sm font-medium text-[var(--foreground)] truncate">{user.name}</p>
                                        )}
                                    </div>
                                    {statusColumn && (
                                        <div>
                                            <Badge variant={user[statusColumn.fieldName] ? 'success' : 'danger'}>
                                                {user[statusColumn.fieldName] ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </button>
                        </li>
                    ))}
                     {users.length === 0 && !loading && (
                        <li className="p-6 text-center text-sm text-[var(--foreground-muted)]">No users found on this page.</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default UserList;