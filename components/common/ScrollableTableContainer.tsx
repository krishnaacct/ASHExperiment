
import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollableTableContainerProps {
    children: React.ReactNode;
    className?: string;
    innerId?: string;
    scrollableClassName?: string;
}

export const ScrollableTableContainer: React.FC<ScrollableTableContainerProps> = ({ children, className = '', innerId, scrollableClassName = '' }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScrollability = () => {
        const el = scrollContainerRef.current;
        if (el) {
            setCanScrollLeft(el.scrollLeft > 1);
            // Allow a small buffer (2px) for calculation precision
            setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
        }
    };

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (el) {
            checkScrollability();
            window.addEventListener('resize', checkScrollability);
            el.addEventListener('scroll', checkScrollability);
            
            // Initial check might need a slight delay for content to render
            const timeout = setTimeout(checkScrollability, 100);

            return () => {
                window.removeEventListener('resize', checkScrollability);
                el.removeEventListener('scroll', checkScrollability);
                clearTimeout(timeout);
            };
        }
    }, [children]);

    const scroll = (direction: 'left' | 'right') => {
        const el = scrollContainerRef.current;
        if (el) {
            const scrollAmount = direction === 'left' ? -el.clientWidth * 0.7 : el.clientWidth * 0.7;
            el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className={`relative group/table-scroll flex-1 min-h-0 flex flex-col ${className}`}>
            {/* Left Scroll Button Area */}
            <div className="absolute inset-y-0 left-0 w-12 z-20 pointer-events-none">
                <div className={`sticky top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}>
                    <button 
                        onClick={() => scroll('left')} 
                        className="pointer-events-auto p-2 rounded-full bg-[var(--popover-background)] shadow-lg border border-[var(--border)] text-[var(--primary-color)] hover:scale-110 transition-transform -ml-6"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="h-6 w-6 stroke-[3px]" />
                    </button>
                </div>
            </div>

            {/* Scrollable Area */}
            <div 
                id={innerId}
                ref={scrollContainerRef}
                className={`flex-1 overflow-auto h-full max-h-full ${scrollableClassName}`}
            >
                {children}
            </div>

            {/* Right Scroll Button Area */}
            <div className="absolute inset-y-0 right-0 w-12 z-20 pointer-events-none">
                 <div className={`sticky top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}>
                    <button 
                        onClick={() => scroll('right')} 
                        className="pointer-events-auto p-2 rounded-full bg-[var(--popover-background)] shadow-lg border border-[var(--border)] text-[var(--primary-color)] hover:scale-110 transition-transform -mr-6"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="h-6 w-6 stroke-[3px]" />
                    </button>
                </div>
            </div>
        </div>
    );
};
