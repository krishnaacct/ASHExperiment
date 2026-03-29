
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { Checkbox } from '../ui/Checkbox';

interface TableColumnFilterProps {
    columnKey: string;
    data: any[];
    currentFilter: string[] | undefined;
    onFilterChange: (key: string, selectedValues: string[] | undefined) => void;
    // Optional formatter for display values
    displayFormatter?: (value: any) => string;
}

export const TableColumnFilter: React.FC<TableColumnFilterProps> = ({
    columnKey,
    data,
    currentFilter,
    onFilterChange,
    displayFormatter = (v) => String(v),
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const wrapperRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Calculate unique values from the dataset for this column
    const options = useMemo(() => {
        const uniqueValues = new Set<string>();
        data.forEach(item => {
            let val = item[columnKey];
            if (val === null || val === undefined) val = '';
            uniqueValues.add(String(val));
        });
        return Array.from(uniqueValues).sort();
    }, [data, columnKey]);

    // Local state for the checkbox selection while the menu is open
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            // Initialize local selection from prop. If undefined, it means ALL are selected.
            if (currentFilter) {
                setSelected(new Set(currentFilter));
            } else {
                setSelected(new Set(options));
            }
        }
    }, [isOpen, currentFilter, options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                wrapperRef.current && !wrapperRef.current.contains(event.target as Node) &&
                menuRef.current && !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerSearch = searchTerm.toLowerCase();
        return options.filter(opt => {
            const label = opt === '' ? '(Blanks)' : opt;
            return label.toLowerCase().includes(lowerSearch);
        });
    }, [options, searchTerm]);

    const handleApply = () => {
        // If all options are selected, we can clear the filter to save state/processing
        if (selected.size === options.length) {
            onFilterChange(columnKey, undefined);
        } else {
            onFilterChange(columnKey, Array.from(selected));
        }
        setIsOpen(false);
    };

    const handleToggle = (value: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });
    };

    const handleSelectAll = (select: boolean) => {
        if (select) {
            // Select all visible options
            setSelected(prev => {
                const next = new Set(prev);
                filteredOptions.forEach(opt => next.add(opt));
                return next;
            });
        } else {
            // Deselect all visible options
             setSelected(prev => {
                const next = new Set(prev);
                filteredOptions.forEach(opt => next.delete(opt));
                return next;
            });
        }
    };
    
    // Position menu
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
             // Adjust positioning if close to right edge
            let left = rect.left;
            if (window.innerWidth - rect.left < 250) {
                left = rect.right - 250;
            }
            setMenuPosition({
                top: rect.bottom + window.scrollY + 5,
                left: left + window.scrollX,
            });
        }
    }, [isOpen]);

    const isActive = currentFilter !== undefined;

    return (
        <div ref={wrapperRef} className="inline-block ml-2 relative" onClick={(e) => e.stopPropagation()}>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`p-1 rounded hover:bg-[var(--list-item-hover-background)] focus:outline-none transition-colors ${isActive ? 'text-[var(--primary-color)]' : 'text-[var(--foreground-muted)]'}`}
                title="Filter"
            >
                <Filter className={`w-3 h-3 ${isActive ? 'fill-current' : ''}`} />
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    className="fixed z-50 w-64 bg-[var(--popover-background)] border border-[var(--border)] rounded-lg shadow-xl flex flex-col"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                    <div className="p-2 border-b border-[var(--border)]">
                        <div className="relative mb-2">
                             <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--foreground-muted)]" />
                             <input
                                type="text"
                                className="w-full text-xs pl-7 pr-2 py-1.5 border border-[var(--input)] rounded bg-[var(--card-background)] text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary-color)] outline-none"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => handleSelectAll(true)} className="text-xs text-[var(--primary-color)] hover:underline">Select All</button>
                            <button onClick={() => handleSelectAll(false)} className="text-xs text-[var(--foreground-muted)] hover:text-red-500 hover:underline">Clear</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto max-h-48 p-2 space-y-1">
                        {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                            <div key={opt} className="flex items-center">
                                <Checkbox
                                    id={`filter-${columnKey}-${opt}`}
                                    checked={selected.has(opt)}
                                    onChange={() => handleToggle(opt)}
                                    label={<span className="text-xs text-[var(--foreground)] truncate">{opt === '' ? '(Blanks)' : opt}</span>}
                                />
                            </div>
                        )) : (
                            <div className="text-center text-xs text-[var(--foreground-muted)] py-4">No matches</div>
                        )}
                    </div>
                    
                    <div className="p-2 border-t border-[var(--border)] flex justify-end space-x-2">
                         <button 
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1.5 text-xs font-medium text-[var(--foreground)] bg-[var(--secondary-background)] border border-[var(--secondary-border)] rounded hover:bg-[var(--secondary-hover-background)]"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleApply}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--primary-color)] rounded hover:bg-[var(--primary-color-hover)]"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
