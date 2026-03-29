
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { SkeletonLoader } from './SkeletonLoader';

interface SelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

interface SelectProps {
    label?: React.ReactNode; // Updated to support ReactNode
    id?: string;
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
    required?: boolean;
    placeholder?: string;
    loading?: boolean;
}

export const Select: React.FC<SelectProps> = ({ 
    label, 
    id, 
    options, 
    value, 
    onChange, 
    disabled, 
    className, 
    required, 
    placeholder = '-- Select an option --',
    loading = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    
    const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setHighlightedIndex(value ? filteredOptions.findIndex(o => o.value === value) : 0);
            inputRef.current?.focus();
        } else {
            setSearchTerm('');
        }
    }, [isOpen, value]);
    
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const el = listRef.current.querySelector(`#option-${id}-${highlightedIndex}`);
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex, id]);


    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(option => option.label.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

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
                    if (selected && !selected.disabled) {
                        handleSelect(selected.value);
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
            <div className={`relative ${className}`}>
                {label && <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">{label}</label>}
                <SkeletonLoader className="h-12 w-full rounded-lg" />
            </div>
        );
    }

    const buttonClasses = `flex items-center justify-between w-full px-4 py-3 text-base text-left bg-[var(--card-background)] border border-[var(--input)] rounded-lg shadow-sm placeholder-[var(--placeholder-foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--primary-color-focus-ring)] focus:border-[var(--primary-color)] transition-all duration-300 ${disabled ? 'bg-[var(--input-disabled-background)] border-[var(--input-disabled-border)] text-[var(--input-disabled-foreground)] cursor-not-allowed' : ''}`;

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                    {label}{required && <span className="text-red-500 ml-1 font-bold">*</span>}
                </label>
            )}
            <button
                type="button"
                id={id}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={buttonClasses}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={`flex items-center truncate ${!selectedOption ? 'text-[var(--placeholder-foreground)]' : (disabled ? 'text-[var(--input-disabled-foreground)]' : 'text-[var(--foreground)]')}`}>
                    {selectedOption?.icon && <span className="mr-2">{selectedOption.icon}</span>}
                    {selectedOption?.label || placeholder}
                </span>
                <div className="flex items-center flex-shrink-0">
                    {value && !required && !disabled && (
                        <span
                            onClick={(e) => { e.stopPropagation(); onChange(''); }}
                            className="p-1 rounded-full hover:bg-[var(--list-item-hover-background)] mr-1"
                            aria-label="Clear selection"
                        >
                            <X className="h-4 w-4 text-[var(--foreground-muted)]" />
                        </span>
                    )}
                    <ChevronDown className={`h-5 w-5 ${disabled ? 'text-[var(--input-disabled-foreground)]' : 'text-[var(--placeholder-foreground)]'} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && (
                 <div className="absolute z-10 w-full mt-1 bg-[var(--popover-background)] border border-[var(--border)] rounded-lg shadow-lg flex flex-col max-h-60" onKeyDown={handleKeyDown}>
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
                    <ul ref={listRef} className="flex-1 overflow-auto" role="listbox">
                        {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
                            <li
                                key={option.value}
                                id={`option-${id}-${index}`}
                                onClick={() => !option.disabled && handleSelect(option.value)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`px-3 py-2 text-base flex items-center justify-between ${
                                    option.disabled 
                                    ? 'text-[var(--input-disabled-foreground)] cursor-not-allowed' 
                                    : 'text-[var(--popover-foreground)] cursor-pointer'
                                } ${highlightedIndex === index ? 'bg-[var(--list-item-hover-background)]' : ''}`}
                                role="option"
                                aria-selected={value === option.value}
                                aria-disabled={option.disabled}
                            >
                                <span className="flex items-center">
                                    {option.icon && <span className="mr-2">{option.icon}</span>}
                                    {option.label}
                                </span>
                                {value === option.value && <Check className="h-5 w-5 text-[var(--primary-color)]" />}
                            </li>
                        )) : (
                             <li className="px-3 py-2 text-center text-[var(--foreground-muted)]">No options found.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
