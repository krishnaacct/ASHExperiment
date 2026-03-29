
import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollableXContainerProps {
    children: React.ReactNode;
    className?: string;
}

export const ScrollableXContainer: React.FC<ScrollableXContainerProps> = ({ children, className = '' }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScrollability = () => {
        const el = scrollContainerRef.current;
        if (el) {
            setCanScrollLeft(el.scrollLeft > 0);
            // Allow a small buffer (1px) for calculation precision
            setCanScrollRight(Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth);
        }
    };

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (el) {
            checkScrollability();
            window.addEventListener('resize', checkScrollability);
            el.addEventListener('scroll', checkScrollability);
            
            // Check immediately and after a short delay for render
            const timeout = setTimeout(checkScrollability, 200);

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
            const scrollAmount = 300; 
            el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className={`relative group/x-scroll flex items-center min-w-0 ${className}`}>
            {/* Left Button */}
            <div className={`absolute left-0 z-20 h-full flex items-center transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 {/* Gradient Fade for visual separation */}
                 <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--background)] to-transparent pointer-events-none" />
                 
                 <button 
                    onClick={() => scroll('left')} 
                    className="relative z-30 p-1.5 rounded-full bg-[var(--popover-background)] shadow-md border border-[var(--border)] text-[var(--primary-color)] hover:scale-110 transition-transform -ml-2"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5px]" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto scrollbar-hide flex items-center no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {children}
            </div>

            {/* Right Button */}
            <div className={`absolute right-0 z-20 h-full flex items-center transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 {/* Gradient Fade for visual separation */}
                 <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--background)] to-transparent pointer-events-none" />

                 <button 
                    onClick={() => scroll('right')} 
                    className="relative z-30 p-1.5 rounded-full bg-[var(--popover-background)] shadow-md border border-[var(--border)] text-[var(--primary-color)] hover:scale-110 transition-transform -mr-2"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="w-5 h-5 stroke-[2.5px]" />
                </button>
            </div>
        </div>
    );
};
