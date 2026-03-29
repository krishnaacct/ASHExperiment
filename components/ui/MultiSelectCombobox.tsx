
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { Badge } from './Badge';
import { Checkbox } from './Checkbox';
import { SkeletonLoader } from './SkeletonLoader';

interface Option {
    value: string;
    label: string;
    disabled?: boolean;
}

interface MultiSelectComboboxProps {
    label: string;
    options: Option[];
    selectedValues: string[];
    onChange: (selected: string[]) => void;
    disabled?: boolean;
    loading?: boolean;
    placeholder?: string;
    required?: boolean;
}

export const MultiSelectCombobox: React.FC<MultiSelectComboboxProps> = ({
    label,
    options,
    selectedValues,
    onChange,
    disabled = false,
    loading = false,
    placeholder = 'Select options...',
    required = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
                menuRef.current && !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    useEffect(() => {
        if (isOpen) {
            setHighlightedIndex(0);
            inputRef.current?.focus();
            
            const calculatePosition = () => {
                if (!buttonRef.current) return;
                const rect = buttonRef.current.getBoundingClientRect();
                setMenuPosition({
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                });
            };

            calculatePosition();
            window.addEventListener('scroll', calculatePosition, true);
            window.addEventListener('resize', calculatePosition);

            return () => {
                window.removeEventListener('scroll', calculatePosition, true);
                window.removeEventListener('resize', calculatePosition);
            };
        } else {
            setSearchTerm('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const el = listRef.current.querySelector(`#msc-option-${highlightedIndex}`);
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex]);

    const handleToggleOption = (value: string) => {
        const option = options.find(o => o.value === value);
        if (option?.disabled) return;

        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newSelected);
    };

    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    const selectedOptions = useMemo(() => 
        options.filter(opt => selectedValues.includes(opt.value)),
        [options, selectedValues]
    );

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowercasedFilter = searchTerm.toLowerCase();
        return options.filter(option =>
            option.label.toLowerCase().includes(lowercasedFilter)
        );
    }, [options, searchTerm]);
    
    useEffect(() => {
      setHighlightedIndex(0);
    }, [searchTerm]);


    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0) {
                    const selected = filteredOptions[highlightedIndex];
                    if (selected) {
                        handleToggleOption(selected.value);
                    }
                }
                break;
            case 'Escape':
                e.stopPropagation(); // Stop event bubbling to prevent Dashboard from catching it
                setIsOpen(false);
                break;
        }
    };


    if (loading) {
        return (
            <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">{label}</label>
                <SkeletonLoader className="h-12 w-full rounded-lg" />
            </div>
        );
    }
    
    const buttonClasses = `flex items-center justify-between w-full p-2 text-left bg-[var(--card-background)] border border-[var(--input)] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color-focus-ring)] disabled:bg-[var(--card-footer-background)] disabled:cursor-not-allowed min-h-[52px]`;
    
    const portalEl = document.getElementById('portal-root');

    const menuContent = (
         <div
            ref={menuRef}
            style={{
                position: 'absolute',
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                width: `${menuPosition.width}px`,
            }}
            className="z-50 mt-1 bg-[var(--popover-background)] border border-[var(--border)] rounded-md shadow-lg flex flex-col max-h-60"
            onKeyDown={handleKeyDown}
        >
            <div className="relative p-2 border-b border-[var(--border)]">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
                 <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full h-10 pl-8 pr-4 text-sm border-0 focus:ring-0 bg-transparent text-[var(--popover-foreground)]"
                />
            </div>
            <ul ref={listRef} className="flex-1 overflow-auto py-1" role="listbox">
                {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
                    <li
                        key={option.value}
                        id={`msc-option-${index}`}
                        onClick={() => handleToggleOption(option.value)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`px-3 py-2 text-sm ${
                            option.disabled 
                            ? 'text-[var(--input-disabled-foreground)] cursor-not-allowed'
                            : 'text-[var(--popover-foreground)] cursor-pointer'
                        } ${highlightedIndex === index ? 'bg-[var(--list-item-hover-background)]' : ''}`}
                        role="option"
                        aria-selected={selectedValues.includes(option.value)}
                    >
                       <Checkbox
                            id={`msc-${option.value}`}
                            checked={selectedValues.includes(option.value)}
                            readOnly
                            disabled={option.disabled}
                            label={option.label}
                        />
                    </li>
                )) : (
                     <li className="px-3 py-2 text-sm text-center text-[var(--foreground-muted)]">No results found.</li>
                )}
            </ul>
        </div>
    );

    return (
        <div className="relative">
            <label className={`block text-sm font-medium mb-2 ${disabled ? 'text-[var(--input-disabled-foreground)]' : 'text-[var(--foreground-muted)]'}`}>
                {label}
                {required && <span className="text-red-500 ml-1 font-bold">*</span>}
            </label>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={buttonClasses}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="flex flex-wrap gap-1 flex-grow">
                    {selectedOptions.length > 0 ? (
                        selectedOptions.map(opt => (
                            <Badge key={opt.value} variant="primary" className="flex items-center gap-1 cursor-default">
                                {opt.label}
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleToggleOption(opt.value); }}
                                        className="-mr-1 p-0.5 rounded-full hover:bg-black/20"
                                        aria-label={`Remove ${opt.label}`}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-[var(--placeholder-foreground)] px-2">{placeholder}</span>
                    )}
                </span>
                 <div className="flex items-center flex-shrink-0">
                    {selectedValues.length > 0 && !disabled && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="p-1 rounded-full hover:bg-[var(--list-item-hover-background)] mr-1"
                            aria-label="Clear all selections"
                        >
                            <X className="h-4 w-4 text-[var(--foreground-muted)]" />
                        </button>
                    )}
                    <ChevronDown className={`h-5 w-5 text-[var(--placeholder-foreground)] transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
                </div>
            </button>
            {isOpen && portalEl && createPortal(menuContent, portalEl)}
        </div>
    );
};
