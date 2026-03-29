import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number | 'all') => void;
    showAll: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
    currentPage,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    showAll
}) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
    const endItem = showAll ? totalItems : Math.min(currentPage * pageSize, totalItems);

    const [jumpToPage, setJumpToPage] = useState(String(currentPage));

    useEffect(() => {
        setJumpToPage(String(currentPage));
    }, [currentPage]);

    const handleJump = () => {
        const page = parseInt(jumpToPage, 10);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
            if (page !== currentPage) {
                onPageChange(page);
            }
        } else {
            // Revert to current page if input is invalid
            setJumpToPage(String(currentPage));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleJump();
            // Prevent form submission if it's inside one
            e.preventDefault();
        }
    };

    if (totalItems === 0) {
        return null;
    }
    
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-[var(--border)] bg-[var(--card-footer-background)] text-sm text-[var(--foreground-muted)] gap-4 flex-wrap">
            <div className="flex items-center">
                <span className="mr-4 font-semibold">Rows per page:</span>
                <select
                    value={showAll ? 'all' : pageSize}
                    onChange={(e) => onPageSizeChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="bg-[var(--card-background)] border border-[var(--border)] rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] font-bold text-[var(--foreground)]"
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value="all">All</option>
                </select>
            </div>
            <div className="flex items-center gap-4">
                <span className="whitespace-nowrap font-bold text-[var(--foreground)]">
                    {totalItems > 0 ? `${startItem}–${endItem}` : '0'} of {totalItems}
                </span>
                <div className="flex items-center space-x-1">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="p-0 h-9 w-9 shadow-sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1 || showAll}
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={24} strokeWidth={2.5} />
                    </Button>
                    
                    <div className="flex items-center text-sm">
                        <input
                            type="number"
                            value={jumpToPage}
                            onChange={(e) => setJumpToPage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleJump}
                            disabled={showAll || totalPages <= 1}
                            className="w-12 text-center bg-[var(--card-background)] border border-[var(--border)] rounded-md px-1 py-1 font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] disabled:bg-[var(--input-disabled-background)] disabled:border-[var(--input-disabled-border)] disabled:text-[var(--input-disabled-foreground)] disabled:cursor-not-allowed"
                            aria-label="Jump to page"
                        />
                        <span className="text-[var(--foreground-muted)] ml-2 font-medium">of {totalPages}</span>
                    </div>

                    <Button
                        variant="secondary"
                        size="sm"
                        className="p-0 h-9 w-9 shadow-sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages || showAll}
                        aria-label="Next page"
                    >
                        <ChevronRight size={24} strokeWidth={2.5} />
                    </Button>
                </div>
            </div>
        </div>
    );
};