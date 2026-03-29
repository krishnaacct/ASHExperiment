import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { SearchResultItem } from '../../types';
/* FIX: Added XCircle to the imports from lucide-react to fix the 'Cannot find name' error. */
import { Search, X, Loader, CornerDownLeft, XCircle } from 'lucide-react';
import { ICONS } from '../dashboard/modules';

interface GlobalSearchProps {
    onResultClick: (item: SearchResultItem) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onResultClick }) => {
    const { closeSearch, performSearch, searchResults, searchLoading } = useData();
    const { user } = useAuth();
    const { appModules = [] } = user || {};
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto-focus the input when the component mounts
        inputRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeSearch();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeSearch]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(searchTerm);
    };

    const getIconForItem = (item: SearchResultItem) => {
        const moduleConfig = appModules.find(m => m.componentKey === item.module);
        if (moduleConfig && ICONS[moduleConfig.iconName]) {
            return React.cloneElement(ICONS[moduleConfig.iconName] as React.ReactElement<any>, { className: 'h-5 w-5 text-[var(--primary-color)]' });
        }
        return <div className="h-5 w-5" />;
    };

    const hasResults = searchResults && Object.keys(searchResults).length > 0;

    return (
        <div 
            className="fixed inset-0 bg-[var(--modal-overlay-background)] z-50 flex justify-center p-4 pt-[10vh] sm:pt-[20vh] animate-in fade-in duration-300"
            onClick={closeSearch}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="w-full max-w-xl bg-[var(--popover-background)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 h-fit max-h-[70vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <form onSubmit={handleSearch}>
                    <div className="relative border-b border-[var(--border)]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={2.5} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Type to search..."
                            className="w-full h-20 pl-16 pr-20 text-xl border-0 focus:ring-0 bg-transparent text-[var(--popover-foreground)] font-bold placeholder-gray-400 dark:placeholder-gray-600"
                        />
                         <button
                            type="button"
                            onClick={closeSearch}
                            className="absolute right-5 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[var(--list-item-hover-background)] text-[var(--foreground-muted)] hover:text-red-500 transition-colors"
                            aria-label="Close search"
                        >
                            <X className="h-6 w-6" strokeWidth={2.5} />
                        </button>
                    </div>
                </form>

                <div className="flex-1 overflow-y-auto p-3">
                    {searchLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-[var(--foreground-muted)] space-y-4">
                            <Loader className="animate-spin h-10 w-10 text-[var(--primary-color)]" /> 
                            <span className="font-black uppercase tracking-widest text-xs">Scanning Database...</span>
                        </div>
                    ) : (
                        searchResults ? (
                            hasResults ? (
                                <div className="space-y-4 pb-4">
                                    {Object.keys(searchResults).map((category) => {
                                        const items = searchResults[category];
                                        return (
                                        <div key={category} className="space-y-1">
                                            <h3 className="px-4 py-2 text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-[0.2em]">{category}</h3>
                                            <div className="space-y-1">
                                                {items.map(item => (
                                                    <button 
                                                        key={item.id}
                                                        onClick={() => onResultClick(item)}
                                                        className="w-full flex items-center justify-between p-4 text-left rounded-xl hover:bg-[var(--list-item-hover-background)] transition-all group"
                                                    >
                                                        <div className="flex items-center">
                                                            <div className="mr-4 bg-[var(--card-footer-background)] p-3 rounded-xl text-[var(--primary-color)] shadow-sm group-hover:bg-[var(--primary-color)] group-hover:text-white transition-colors">
                                                                 {getIconForItem(item)}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-[var(--foreground)] uppercase tracking-tight">{item.title}</p>
                                                                <p className="text-xs font-bold text-[var(--foreground-muted)] mt-0.5">{item.subtitle}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-[10px] font-black uppercase text-[var(--primary-color)]">Select</span>
                                                            <CornerDownLeft className="h-5 w-5 text-[var(--primary-color)]" strokeWidth={3} />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center p-12 text-[var(--foreground-muted)]">
                                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl mb-4 max-w-xs mx-auto">
                                        <XCircle className="w-10 h-10 mx-auto text-red-400 mb-2" />
                                        <p className="font-bold">No results found for</p>
                                        <p className="font-mono text-red-500 mt-1">"{searchTerm}"</p>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="text-center p-16 text-[var(--foreground-muted)] flex flex-col items-center">
                                <div className="p-5 bg-[var(--card-inset-background)] rounded-full mb-4 shadow-inner">
                                    <Search className="w-10 h-10 text-[var(--primary-color)] opacity-20" />
                                </div>
                                <p className="font-bold text-lg uppercase tracking-tighter">Global Search</p>
                                <p className="text-xs font-medium max-w-xs mt-2 leading-relaxed">Type at least 3 characters to find users, residents, or other records across all modules.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;