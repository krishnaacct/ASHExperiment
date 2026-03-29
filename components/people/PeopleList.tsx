import React, { useMemo } from 'react';
import { Person } from '../../types';
import { Badge } from '../ui/Badge';
import { useSMR } from '../../hooks/useSMR';
import { Checkbox } from '../ui/Checkbox';
import { GripVertical } from 'lucide-react';

interface PeopleListProps {
    people: Person[];
    selectedPerson: Person | null | undefined;
    onSelectPerson: (person: Person) => void;
    loading: boolean;
    // New Props for Bulk Selection
    selectedIds: Set<string>;
    onToggleSelection: (personId: string, isSelected: boolean) => void;
    onSelectAll: (isSelected: boolean) => void;
}

const PeopleList: React.FC<PeopleListProps> = ({ 
    people, selectedPerson, onSelectPerson, loading,
    selectedIds, onToggleSelection, onSelectAll 
}) => {
    const { superMasterRecord } = useSMR();

    const textColumns = useMemo(() => {
        const moduleDataScope = "People";
        if (!superMasterRecord || superMasterRecord.length === 0) {
            return [];
        }
        return superMasterRecord
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
                
                if (orderA !== Infinity || orderB !== Infinity) return orderA - orderB;
                return a.displayName.localeCompare(b.displayName);
            });
    }, [superMasterRecord]);

    const getFieldValue = (person: Person, fieldName: string) => {
        return person[fieldName] || '';
    };

    const allSelected = people.length > 0 && people.every(p => selectedIds.has(p.personId));

    return (
        <div className="relative flex-grow">
            {/* Header with Select All */}
            <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--card-inset-background)] flex items-center">
                <Checkbox 
                    checked={allSelected} 
                    onChange={(e) => onSelectAll(e.target.checked)} 
                    id="select-all-people"
                />
                <span className="ml-3 text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-[0.15em]">Select All Page</span>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-350px)]">
                <ul role="list" className="divide-y divide-[var(--border)]">
                    {people.map((person) => (
                        <li key={person.personId} className="flex group/row">
                             <div className="flex items-center px-4 py-4 bg-[var(--card-background)]">
                                <Checkbox 
                                    checked={selectedIds.has(person.personId)}
                                    onChange={(e) => onToggleSelection(person.personId, e.target.checked)}
                                    id={`select-${person.personId}`}
                                />
                            </div>
                            <button
                                onClick={() => onSelectPerson(person)}
                                className={`flex items-center w-full text-left p-4 pl-0 transition-colors duration-150 ${
                                    selectedPerson?.personId === person.personId
                                        ? 'bg-[var(--list-item-active-background)]'
                                        : 'hover:bg-[var(--list-item-hover-background)]'
                                }`}
                            >
                                <GripVertical className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                                <div className="flex items-center space-x-4 flex-1">
                                    <div className={`flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-tr from-[var(--primary-color)] to-purple-400 flex items-center justify-center text-white font-black shadow-md`}>
                                        {(person.name || ' ').charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {textColumns.length > 0 ? (
                                            textColumns.map((col, index) => (
                                                <p 
                                                    key={col.fieldId} 
                                                    className={`${index === 0 ? 'text-sm font-black text-[var(--foreground)] uppercase tracking-tight' : 'text-xs font-bold text-[var(--foreground-muted)]'} truncate`}
                                                >
                                                    {String(getFieldValue(person, col.fieldName))}
                                                </p>
                                            ))
                                        ) : (
                                            <p className="text-sm font-black text-[var(--foreground)] truncate uppercase">{person.name || ''}</p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        </li>
                    ))}
                     {people.length === 0 && !loading && (
                        <li className="p-12 text-center text-sm font-medium text-[var(--foreground-muted)] italic">No records matching search.</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default PeopleList;